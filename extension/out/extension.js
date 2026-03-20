"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const loggingAnalyzer_1 = require("./analyzers/loggingAnalyzer");
const patternMatcher_1 = require("./patterns/patternMatcher");
const configurationManager_1 = require("./config/configurationManager");
const diagnosticGenerator_1 = require("./diagnostics/diagnosticGenerator");
const DIAGNOSTIC_SOURCE = "PII Checker";
// Instantiate shared components
const loggingAnalyzer = new loggingAnalyzer_1.LoggingAnalyzer();
const patternMatcher = new patternMatcher_1.PatternMatcher();
const configurationManager = new configurationManager_1.ConfigurationManager();
const diagnosticGenerator = new diagnosticGenerator_1.DiagnosticGenerator();
const SUPPORTED_LANGUAGES = [
    "json", "jsonc",
    "csharp", "vb", "razor", "aspnetcorerazor",
    "javascript", "typescript", "javascriptreact", "typescriptreact",
];
// Languages that support logging context detection
const LOG_LANGUAGES = [
    "csharp", "vb", "razor", "aspnetcorerazor",
    "javascript", "typescript", "javascriptreact", "typescriptreact",
];
let diagnosticCollection;
let statusBarItem;
function activate(context) {
    diagnosticCollection =
        vscode.languages.createDiagnosticCollection("pii-checker");
    // Status bar item to show PII count
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = "workbench.actions.view.problems";
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(diagnosticCollection, vscode.workspace.onDidOpenTextDocument((doc) => {
        analyzeDocument(doc);
        showPiiNotification(doc);
    }), vscode.workspace.onDidChangeTextDocument((e) => analyzeDocument(e.document)), vscode.workspace.onDidCloseTextDocument((doc) => {
        diagnosticCollection.delete(doc.uri);
        updateStatusBar();
    }), vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()));
    // Analyze already-open files
    vscode.workspace.textDocuments.forEach(analyzeDocument);
    // Register code action provider for all supported languages
    const documentSelectors = SUPPORTED_LANGUAGES.map((lang) => ({ language: lang }));
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(documentSelectors, new PiiCodeActionProvider(), { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }));
}
function deactivate() {
    diagnosticCollection?.dispose();
    statusBarItem?.dispose();
}
// ---------------------------------------------------------------------------
// Configuration - now uses ConfigurationManager
// ---------------------------------------------------------------------------
function getConfig() {
    return {
        patterns: configurationManager.getEffectivePatterns(),
        severity: configurationManager.getSeverity(),
        enableLoggingDetection: configurationManager.isLoggingDetectionEnabled(),
        extraLoggingFunctions: configurationManager.getExtraLoggingFunctions(),
        extraMaskingPatterns: configurationManager.getExtraMaskingPatterns(),
    };
}
/**
 * Match an identifier against sensitive patterns using PatternMatcher.
 * Returns the matching SensitivePattern or null.
 */
function matchesPii(identifier, patterns) {
    return patternMatcher.matches(identifier, patterns);
}
// ---------------------------------------------------------------------------
// Document router
// ---------------------------------------------------------------------------
function analyzeDocument(document) {
    const lang = document.languageId;
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
        return;
    }
    const config = getConfig();
    const { patterns, severity } = config;
    let diagnostics;
    if (lang === "json" || lang === "jsonc") {
        // JSON files: always show PII diagnostics on keys (no logging context)
        diagnostics = analyzeJson(document, patterns, severity);
    }
    else {
        // Code files: context-aware approach
        // 1. Collect all PII field diagnostics
        const piiDiags = analyzeDotNet(document, patterns, severity);
        if (config.enableLoggingDetection && LOG_LANGUAGES.includes(lang)) {
            // 2. Use LoggingAnalyzer to find unmasked sensitive fields in logging
            const loggingDiags = loggingAnalyzer.analyze(document, patterns, config.extraLoggingFunctions, config.extraMaskingPatterns);
            // 3. Build set of PII names that appear in unmasked logging
            const loggedPiiNames = new Set();
            for (const ld of loggingDiags) {
                const piiText = document.getText(ld.range);
                loggedPiiNames.add(patternMatcher.normalize(piiText));
            }
            // 4. Only keep pii-field diagnostics for identifiers that ARE logged
            //    If a PII identifier is never logged, suppress all warnings for it
            const filteredPiiDiags = piiDiags.filter((d) => {
                const text = document.getText(d.range);
                return loggedPiiNames.has(patternMatcher.normalize(text));
            });
            diagnostics = [...filteredPiiDiags, ...loggingDiags];
        }
        else {
            // Logging detection disabled — show all PII diagnostics as before
            diagnostics = piiDiags;
        }
    }
    diagnosticCollection.set(document.uri, diagnostics);
    updateStatusBar();
}
// ---------------------------------------------------------------------------
// JSON analyzer
// ---------------------------------------------------------------------------
function analyzeJson(document, patterns, severity) {
    const diagnostics = [];
    const text = document.getText();
    const keyRegex = /"([^"]+)"\s*:/g;
    let match;
    while ((match = keyRegex.exec(text)) !== null) {
        const key = match[1];
        const matchedPattern = matchesPii(key, patterns);
        if (matchedPattern) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length - 1);
            const range = new vscode.Range(startPos, endPos);
            diagnostics.push(diagnosticGenerator.createFieldDiagnostic(key, matchedPattern, range, severity));
        }
    }
    return diagnostics;
}
// ---------------------------------------------------------------------------
// .NET analyzer (C#, VB, Razor)
// ---------------------------------------------------------------------------
function analyzeDotNet(document, patterns, severity) {
    const diagnostics = [];
    const text = document.getText();
    // Patterns to catch in .NET files:
    // 1. Properties:       public string FirstName { get; set; }
    // 2. Fields:           private string _firstName;
    // 3. Variables:        var firstName = ...;
    // 4. Parameters:       (string firstName, ...)
    // 5. Column/JsonProp:  [Column("first_name")] or [JsonPropertyName("first_name")]
    // 6. String literals:  "first_name" or "FirstName"
    const dotnetPatterns = [
        // Property / field / variable declarations – capture the identifier
        /\b(?:public|private|protected|internal|static|readonly|virtual|override|abstract|async)\s+[\w<>\[\]?,\s]+\s+(\w+)\s*[{;=]/g,
        // var / let declarations
        /\b(?:var|let|const)\s+(\w+)\s*[=;]/g,
        // Method parameters
        /(?:[\w<>\[\]?]+)\s+(\w+)\s*[,)]/g,
        // Attribute string values: [Column("first_name")] [JsonPropertyName("lastName")]
        /\[\s*(?:Column|JsonPropertyName|JsonProperty|DataMember|Display|MapTo)\s*\(\s*"([^"]+)"\s*\)/g,
        // String literals containing PII identifiers
        /"([^"]{2,50})"/g,
    ];
    for (const regex of dotnetPatterns) {
        let match;
        // Reset lastIndex for each regex
        regex.lastIndex = 0;
        while ((match = regex.exec(text)) !== null) {
            const identifier = match[1];
            if (!identifier) {
                continue;
            }
            const matchedPattern = matchesPii(identifier, patterns);
            if (matchedPattern) {
                // Calculate position of the captured group (group 1)
                const groupStart = match.index + match[0].indexOf(identifier);
                const startPos = document.positionAt(groupStart);
                const endPos = document.positionAt(groupStart + identifier.length);
                const range = new vscode.Range(startPos, endPos);
                // Avoid duplicate diagnostics on the same range
                const isDuplicate = diagnostics.some((d) => d.range.isEqual(range));
                if (!isDuplicate) {
                    diagnostics.push(diagnosticGenerator.createFieldDiagnostic(identifier, matchedPattern, range, severity));
                }
            }
        }
    }
    return diagnostics;
}
// ---------------------------------------------------------------------------
// Notification – shown only when a file is first opened
// ---------------------------------------------------------------------------
function showPiiNotification(document) {
    const diags = diagnosticCollection.get(document.uri);
    const count = diags?.length ?? 0;
    if (count === 0) {
        return;
    }
    const fileName = document.uri.path.split("/").pop() ?? document.uri.fsPath;
    vscode.window
        .showWarningMessage(`PII Checker: Found ${count} potential PII field(s) in ${fileName}`, "Show Problems")
        .then((action) => {
        if (action === "Show Problems") {
            vscode.commands.executeCommand("workbench.actions.view.problems");
        }
    });
}
// ---------------------------------------------------------------------------
// Status bar – shows PII count for the active file
// ---------------------------------------------------------------------------
function updateStatusBar() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        statusBarItem.hide();
        return;
    }
    const diags = diagnosticCollection.get(editor.document.uri);
    const count = diags?.length ?? 0;
    if (count > 0) {
        statusBarItem.text = `$(warning) PII: ${count} issue${count > 1 ? "s" : ""}`;
        statusBarItem.tooltip = `${count} potential PII field(s) detected. Click to open Problems panel.`;
        statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        statusBarItem.show();
    }
    else {
        statusBarItem.hide();
    }
}
// ---------------------------------------------------------------------------
// Code Action provider – quick-fix to suppress warnings
// ---------------------------------------------------------------------------
// All diagnostic codes that the PiiCodeActionProvider handles
const CATEGORY_DIAGNOSTIC_CODES = [
    "pii-field-personal",
    "pii-field-financial",
    "pii-field-health",
    "pii-field-credentials",
];
const LOGGING_DIAGNOSTIC_CODE = "pii-logging-unmasked";
// Category-specific masking recommendations
const CATEGORY_MASKING_RECOMMENDATIONS = {
    "pii-field-personal": { maskFunction: "MaskHelper.MaskPII", description: "Mask personal data" },
    "pii-field-financial": { maskFunction: "MaskHelper.MaskFinancial", description: "Mask financial data" },
    "pii-field-health": { maskFunction: "MaskHelper.MaskPHI", description: "Mask health information" },
    "pii-field-credentials": { maskFunction: "MaskHelper.Redact", description: "Redact credentials" },
};
/**
 * Helper to extract the diagnostic code value from a VS Code diagnostic.
 */
function getDiagnosticCodeValue(diag) {
    if (!diag.code) {
        return undefined;
    }
    if (typeof diag.code === "object" && "value" in diag.code) {
        return String(diag.code.value);
    }
    return String(diag.code);
}
class PiiCodeActionProvider {
    provideCodeActions(document, _range, context) {
        const actions = [];
        for (const diag of context.diagnostics) {
            if (diag.source !== DIAGNOSTIC_SOURCE) {
                continue;
            }
            const codeValue = getDiagnosticCodeValue(diag);
            const piiText = document.getText(diag.range);
            // For logging-unmasked diagnostics, offer wrap with generic mask
            if (codeValue === LOGGING_DIAGNOSTIC_CODE) {
                const wrapAction = new vscode.CodeAction("Wrap with masking function", vscode.CodeActionKind.QuickFix);
                wrapAction.edit = new vscode.WorkspaceEdit();
                wrapAction.edit.replace(document.uri, diag.range, `MaskHelper.Mask(${piiText})`);
                wrapAction.diagnostics = [diag];
                wrapAction.isPreferred = true;
                actions.push(wrapAction);
            }
            // For category-specific field diagnostics, offer category-specific masking
            if (codeValue && CATEGORY_DIAGNOSTIC_CODES.includes(codeValue)) {
                const recommendation = CATEGORY_MASKING_RECOMMENDATIONS[codeValue];
                if (recommendation) {
                    const categoryMaskAction = new vscode.CodeAction(`${recommendation.description} (wrap with ${recommendation.maskFunction})`, vscode.CodeActionKind.QuickFix);
                    categoryMaskAction.edit = new vscode.WorkspaceEdit();
                    categoryMaskAction.edit.replace(document.uri, diag.range, `${recommendation.maskFunction}(${piiText})`);
                    categoryMaskAction.diagnostics = [diag];
                    categoryMaskAction.isPreferred = false;
                    actions.push(categoryMaskAction);
                }
            }
            // Suppress comment for all PII diagnostics (both field and logging)
            const suppressAction = new vscode.CodeAction("Suppress PII warning (add comment)", vscode.CodeActionKind.QuickFix);
            const line = diag.range.start.line;
            const indent = document.lineAt(line).text.match(/^\s*/)?.[0] ?? "";
            const lang = document.languageId;
            const comment = lang === "vb"
                ? `${indent}' pii-checker: suppress`
                : `${indent}// pii-checker: suppress`;
            suppressAction.edit = new vscode.WorkspaceEdit();
            suppressAction.edit.insert(document.uri, new vscode.Position(line, 0), comment + "\n");
            suppressAction.diagnostics = [diag];
            suppressAction.isPreferred = false;
            actions.push(suppressAction);
        }
        return actions;
    }
}
//# sourceMappingURL=extension.js.map