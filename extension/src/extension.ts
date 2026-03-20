import * as vscode from "vscode";
import { LoggingAnalyzer } from "./analyzers/loggingAnalyzer";
import { PatternMatcher } from "./patterns/patternMatcher";
import { ConfigurationManager } from "./config/configurationManager";
import { DiagnosticGenerator } from "./diagnostics/diagnosticGenerator";
import { SensitivePattern } from "./patterns/types";

const DIAGNOSTIC_SOURCE = "PII Checker";

// Instantiate shared components
const loggingAnalyzer = new LoggingAnalyzer();
const patternMatcher = new PatternMatcher();
const configurationManager = new ConfigurationManager();
const diagnosticGenerator = new DiagnosticGenerator();

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

let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;

// File extensions for workspace-wide scanning (.NET and JSON only)
const SUPPORTED_FILE_GLOBS = [
  "**/*.json",
  "**/*.cs",
  "**/*.vb",
  "**/*.cshtml",
  "**/*.razor",
];

const WORKSPACE_SCAN_GLOB = "{" + SUPPORTED_FILE_GLOBS.join(",") + "}";
const WORKSPACE_EXCLUDE_GLOB = "{**/node_modules/**,**/bin/**,**/obj/**,**/out/**,**/.git/**}";

/**
 * Analyze a file by URI — opens it as a text document and runs analysis.
 * Used for workspace-wide scanning of files that are not currently open.
 */
async function analyzeFileByUri(uri: vscode.Uri): Promise<void> {
  try {
    const doc = await vscode.workspace.openTextDocument(uri);
    analyzeDocument(doc);
  } catch {
    // File may be binary or inaccessible — skip silently
  }
}

/**
 * Scan the entire workspace for supported files and analyze them.
 */
async function scanWorkspace(): Promise<void> {
  const files = await vscode.workspace.findFiles(
    WORKSPACE_SCAN_GLOB,
    WORKSPACE_EXCLUDE_GLOB
  );
  for (const uri of files) {
    await analyzeFileByUri(uri);
  }
  updateStatusBar();
}

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection =
    vscode.languages.createDiagnosticCollection("pii-checker");

  // Status bar item to show PII count
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.command = "workbench.actions.view.problems";
  context.subscriptions.push(statusBarItem);

  // Watch for file creation/deletion in the workspace
  const fileWatcher = vscode.workspace.createFileSystemWatcher(WORKSPACE_SCAN_GLOB);

  context.subscriptions.push(
    diagnosticCollection,
    fileWatcher,

    // Open documents — re-analyze and notify
    vscode.workspace.onDidOpenTextDocument((doc) => {
      analyzeDocument(doc);
      showPiiNotification(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((e) =>
      analyzeDocument(e.document)
    ),

    // When a file is closed, keep its diagnostics (workspace-wide coverage)
    // Only update the status bar to reflect the new active file context
    vscode.workspace.onDidCloseTextDocument(() => updateStatusBar()),

    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()),

    // New file created in workspace — analyze it
    fileWatcher.onDidCreate((uri) => analyzeFileByUri(uri)),

    // File changed on disk (external edit) — re-analyze
    fileWatcher.onDidChange((uri) => analyzeFileByUri(uri)),

    // File deleted — remove its diagnostics
    fileWatcher.onDidDelete((uri) => {
      diagnosticCollection.delete(uri);
      updateStatusBar();
    })
  );

  // Analyze already-open files immediately
  vscode.workspace.textDocuments.forEach(analyzeDocument);

  // Scan the full workspace in the background
  scanWorkspace();

  // Register code action provider for all supported languages
  const documentSelectors: vscode.DocumentFilter[] = SUPPORTED_LANGUAGES.map(
    (lang) => ({ language: lang })
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      documentSelectors,
      new PiiCodeActionProvider(),
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );
}

export function deactivate() {
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
function matchesPii(identifier: string, patterns: SensitivePattern[]): SensitivePattern | null {
  return patternMatcher.matches(identifier, patterns);
}

// ---------------------------------------------------------------------------
// Document router
// ---------------------------------------------------------------------------

function analyzeDocument(document: vscode.TextDocument) {
  const lang = document.languageId;
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    return;
  }

  const config = getConfig();
  const { patterns, severity } = config;
  let diagnostics: vscode.Diagnostic[];

  if (lang === "json" || lang === "jsonc") {
    // JSON files: always show PII diagnostics on keys (no logging context)
    diagnostics = analyzeJson(document, patterns, severity);
  } else {
    // Code files: context-aware approach
    // 1. Collect all PII field diagnostics
    const piiDiags = analyzeDotNet(document, patterns, severity);

    if (config.enableLoggingDetection && LOG_LANGUAGES.includes(lang)) {
      // 2. Use LoggingAnalyzer to find unmasked sensitive fields in logging
      const loggingDiags = loggingAnalyzer.analyze(
        document,
        patterns,
        config.extraLoggingFunctions,
        config.extraMaskingPatterns
      );

      // 3. Build set of PII names that appear in unmasked logging
      const loggedPiiNames = new Set<string>();
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
    } else {
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

function analyzeJson(
  document: vscode.TextDocument,
  patterns: SensitivePattern[],
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const keyRegex = /"([^"]+)"\s*:/g;
  let match: RegExpExecArray | null;

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

function analyzeDotNet(
  document: vscode.TextDocument,
  patterns: SensitivePattern[],
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();

  // Patterns to catch in .NET files:
  // 1. Properties:       public string FirstName { get; set; }
  // 2. Fields:           private string _firstName;
  // 3. Variables:        var firstName = ...;
  // 4. Parameters:       (string firstName, ...)
  // 5. Column/JsonProp:  [Column("first_name")] or [JsonPropertyName("first_name")]
  // 6. String literals:  "first_name" or "FirstName"

  const dotnetPatterns: RegExp[] = [
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
    let match: RegExpExecArray | null;
    // Reset lastIndex for each regex
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const identifier = match[1];
      if (!identifier) { continue; }

      const matchedPattern = matchesPii(identifier, patterns);
      if (matchedPattern) {
        // Calculate position of the captured group (group 1)
        const groupStart = match.index + match[0].indexOf(identifier);
        const startPos = document.positionAt(groupStart);
        const endPos = document.positionAt(groupStart + identifier.length);
        const range = new vscode.Range(startPos, endPos);

        // Avoid duplicate diagnostics on the same range
        const isDuplicate = diagnostics.some(
          (d) => d.range.isEqual(range)
        );
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

function showPiiNotification(document: vscode.TextDocument) {
  const diags = diagnosticCollection.get(document.uri);
  const count = diags?.length ?? 0;
  if (count === 0) { return; }

  const fileName = document.uri.path.split("/").pop() ?? document.uri.fsPath;
  vscode.window
    .showWarningMessage(
      `PII Checker: Found ${count} potential PII field(s) in ${fileName}`,
      "Show Problems"
    )
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
  // Count total issues across all tracked files
  let totalCount = 0;
  diagnosticCollection.forEach((uri, diags) => {
    totalCount += diags.length;
  });

  const editor = vscode.window.activeTextEditor;
  const activeCount = editor
    ? (diagnosticCollection.get(editor.document.uri)?.length ?? 0)
    : 0;

  if (totalCount > 0) {
    statusBarItem.text = `$(warning) PII: ${activeCount} / ${totalCount}`;
    statusBarItem.tooltip = `${activeCount} issue(s) in current file, ${totalCount} total across workspace. Click to open Problems panel.`;
    statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
    statusBarItem.show();
  } else {
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
const CATEGORY_MASKING_RECOMMENDATIONS: Record<string, { maskFunction: string; description: string }> = {
  "pii-field-personal": { maskFunction: "MaskHelper.MaskPII", description: "Mask personal data" },
  "pii-field-financial": { maskFunction: "MaskHelper.MaskFinancial", description: "Mask financial data" },
  "pii-field-health": { maskFunction: "MaskHelper.MaskPHI", description: "Mask health information" },
  "pii-field-credentials": { maskFunction: "MaskHelper.Redact", description: "Redact credentials" },
};

/**
 * Helper to extract the diagnostic code value from a VS Code diagnostic.
 */
function getDiagnosticCodeValue(diag: vscode.Diagnostic): string | undefined {
  if (!diag.code) {
    return undefined;
  }
  if (typeof diag.code === "object" && "value" in diag.code) {
    return String(diag.code.value);
  }
  return String(diag.code);
}

class PiiCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diag of context.diagnostics) {
      if (diag.source !== DIAGNOSTIC_SOURCE) {
        continue;
      }

      const codeValue = getDiagnosticCodeValue(diag);
      const piiText = document.getText(diag.range);

      // For logging-unmasked diagnostics, offer wrap with generic mask
      if (codeValue === LOGGING_DIAGNOSTIC_CODE) {
        const wrapAction = new vscode.CodeAction(
          "Wrap with masking function",
          vscode.CodeActionKind.QuickFix
        );
        wrapAction.edit = new vscode.WorkspaceEdit();
        wrapAction.edit.replace(
          document.uri,
          diag.range,
          `MaskHelper.Mask(${piiText})`
        );
        wrapAction.diagnostics = [diag];
        wrapAction.isPreferred = true;
        actions.push(wrapAction);
      }

      // For category-specific field diagnostics, offer category-specific masking
      if (codeValue && CATEGORY_DIAGNOSTIC_CODES.includes(codeValue)) {
        const recommendation = CATEGORY_MASKING_RECOMMENDATIONS[codeValue];
        if (recommendation) {
          const categoryMaskAction = new vscode.CodeAction(
            `${recommendation.description} (wrap with ${recommendation.maskFunction})`,
            vscode.CodeActionKind.QuickFix
          );
          categoryMaskAction.edit = new vscode.WorkspaceEdit();
          categoryMaskAction.edit.replace(
            document.uri,
            diag.range,
            `${recommendation.maskFunction}(${piiText})`
          );
          categoryMaskAction.diagnostics = [diag];
          categoryMaskAction.isPreferred = false;
          actions.push(categoryMaskAction);
        }
      }

      // Suppress comment for all PII diagnostics (both field and logging)
      const suppressAction = new vscode.CodeAction(
        "Suppress PII warning (add comment)",
        vscode.CodeActionKind.QuickFix
      );
      const line = diag.range.start.line;
      const indent = document.lineAt(line).text.match(/^\s*/)?.[0] ?? "";

      const lang = document.languageId;
      const comment =
        lang === "vb"
          ? `${indent}' pii-checker: suppress`
          : `${indent}// pii-checker: suppress`;

      suppressAction.edit = new vscode.WorkspaceEdit();
      suppressAction.edit.insert(
        document.uri,
        new vscode.Position(line, 0),
        comment + "\n"
      );
      suppressAction.diagnostics = [diag];
      suppressAction.isPreferred = false;
      actions.push(suppressAction);
    }

    return actions;
  }
}
