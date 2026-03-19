import * as vscode from "vscode";

const DIAGNOSTIC_SOURCE = "PII Checker";

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

  context.subscriptions.push(
    diagnosticCollection,
    vscode.workspace.onDidOpenTextDocument((doc) => {
      analyzeDocument(doc);
      showPiiNotification(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((e) =>
      analyzeDocument(e.document)
    ),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
      updateStatusBar();
    }),
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar())
  );

  // Analyze already-open files
  vscode.workspace.textDocuments.forEach(analyzeDocument);

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
// Configuration
// ---------------------------------------------------------------------------

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("piiJsonChecker");
  const patterns: string[] = cfg.get("patterns", [
    "first_name", "firstname", "first name",
    "last_name", "lastname", "last name",
    "firstName", "lastName",
  ]);
  const severityStr: string = cfg.get("severity", "Warning");
  const severityMap: Record<string, vscode.DiagnosticSeverity> = {
    Error: vscode.DiagnosticSeverity.Error,
    Warning: vscode.DiagnosticSeverity.Warning,
    Information: vscode.DiagnosticSeverity.Information,
    Hint: vscode.DiagnosticSeverity.Hint,
  };
  return {
    patterns,
    severity: severityMap[severityStr] ?? vscode.DiagnosticSeverity.Warning,
    enableLoggingDetection: cfg.get<boolean>("enableLoggingDetection", true),
    extraLoggingFunctions: cfg.get<string[]>("loggingFunctions", []),
    extraMaskingPatterns: cfg.get<string[]>("maskingPatterns", []),
  };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_\s]/g, "");
}

function matchesPii(identifier: string, patterns: string[]): string | null {
  const norm = normalize(identifier);
  for (const p of patterns) {
    if (norm === normalize(p) || norm.includes(normalize(p))) {
      return p;
    }
  }
  return null;
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
      // 2. Find which PII identifiers are used in unmasked logging
      const loggingDiags = analyzeLoggingContext(document, patterns, config);

      // 3. Build set of PII names that appear in unmasked logging
      const loggedPiiNames = new Set<string>();
      for (const ld of loggingDiags) {
        const piiText = document.getText(ld.range);
        loggedPiiNames.add(normalize(piiText));
      }

      // 4. Only keep pii-field diagnostics for identifiers that ARE logged
      //    If a PII identifier is never logged, suppress all warnings for it
      const filteredPiiDiags = piiDiags.filter((d) => {
        const text = document.getText(d.range);
        return loggedPiiNames.has(normalize(text));
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
  patterns: string[],
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const keyRegex = /"([^"]+)"\s*:/g;
  let match: RegExpExecArray | null;

  while ((match = keyRegex.exec(text)) !== null) {
    const key = match[1];
    const matched = matchesPii(key, patterns);
    if (matched) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length - 1);
      diagnostics.push(createDiagnostic(key, matched, new vscode.Range(startPos, endPos), severity));
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// .NET analyzer (C#, VB, Razor)
// ---------------------------------------------------------------------------

function analyzeDotNet(
  document: vscode.TextDocument,
  patterns: string[],
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

      const matched = matchesPii(identifier, patterns);
      if (matched) {
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
          diagnostics.push(createDiagnostic(identifier, matched, range, severity));
        }
      }
    }
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Logging context analyzer
// ---------------------------------------------------------------------------

const DOTNET_LOG_FUNCTIONS = [
  "Console.WriteLine", "Console.Write",
  "Debug.WriteLine", "Debug.Write", "Debug.Log",
  "Trace.WriteLine", "Trace.Write",
  "LogInformation", "LogWarning", "LogError", "LogDebug", "LogTrace", "LogCritical",
  "Log.Information", "Log.Warning", "Log.Error", "Log.Debug", "Log.Verbose", "Log.Fatal",
];

const JS_LOG_FUNCTIONS = [
  "console.log", "console.warn", "console.error",
  "console.info", "console.debug", "console.trace",
];

const SHORT_LOG_METHODS = ["Info", "Warn", "Error", "Debug", "Fatal", "Trace"];

const MASK_METHOD_PATTERNS = [
  ".Mask(", ".mask(", ".Redact(", ".redact(",
  ".Anonymize(", ".anonymize(", ".Hash(", ".hash(",
];

const MASK_STRING_LITERALS = [
  '***', '[REDACTED]', '[MASKED]', 'XXX', '****',
];

interface LoggingSpan {
  argStart: number;
  argEnd: number;
}

function findLoggingSpans(
  text: string,
  lang: string,
  extraFunctions: string[]
): LoggingSpan[] {
  const spans: LoggingSpan[] = [];
  const isJs = ["javascript", "typescript", "javascriptreact", "typescriptreact"].includes(lang);

  const funcs = [
    ...(isJs ? JS_LOG_FUNCTIONS : DOTNET_LOG_FUNCTIONS),
    ...extraFunctions,
  ];

  for (const func of funcs) {
    const escaped = func.replace(/\./g, "\\.");
    const pattern = new RegExp(`\\b${escaped}\\s*\\(`, "g");
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(text)) !== null) {
      const parenStart = text.indexOf("(", m.index);
      if (parenStart === -1) { continue; }
      const argEnd = findMatchingParen(text, parenStart);
      if (argEnd !== -1) {
        spans.push({ argStart: parenStart + 1, argEnd });
      }
    }
  }

  // Short method names (Info, Warn, etc.) require dot prefix
  if (!isJs) {
    for (const method of SHORT_LOG_METHODS) {
      const pattern = new RegExp(`\\.${method}\\s*\\(`, "g");
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const parenStart = text.indexOf("(", m.index);
        if (parenStart === -1) { continue; }
        const argEnd = findMatchingParen(text, parenStart);
        if (argEnd !== -1) {
          spans.push({ argStart: parenStart + 1, argEnd });
        }
      }
    }
  }

  return spans;
}

function findMatchingParen(text: string, openPos: number): number {
  let depth = 1;
  let i = openPos + 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "(") { depth++; }
    else if (ch === ")") { depth--; }
    else if (ch === '"' || ch === "'" || ch === "`") {
      i++;
      while (i < text.length && text[i] !== ch) {
        if (text[i] === "\\") { i++; }
        i++;
      }
    }
    if (depth > 0) { i++; }
  }
  return depth === 0 ? i : -1;
}

function isMasked(
  argText: string,
  relStart: number,
  extraMaskPatterns: string[]
): boolean {
  const allMaskMethods = [...MASK_METHOD_PATTERNS, ...extraMaskPatterns];

  // Check if PII is inside a mask method call
  for (const mp of allMaskMethods) {
    const base = mp.endsWith("(") ? mp.slice(0, -1) : mp;
    const idx = argText.lastIndexOf(base, relStart);
    if (idx !== -1) {
      const afterBase = argText.indexOf("(", idx + base.length);
      if (afterBase !== -1 && afterBase <= relStart) {
        return true;
      }
    }
  }

  // Check if mask string literals appear in the same logging args
  for (const ms of MASK_STRING_LITERALS) {
    if (argText.includes(ms)) {
      return true;
    }
  }

  return false;
}

function analyzeLoggingContext(
  document: vscode.TextDocument,
  patterns: string[],
  config: ReturnType<typeof getConfig>
): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  const text = document.getText();
  const lang = document.languageId;

  const spans = findLoggingSpans(text, lang, config.extraLoggingFunctions);
  if (spans.length === 0) { return diagnostics; }

  // Scan each logging span for PII identifiers
  const piiRegex = /\b(\w+)\b/g;

  for (const span of spans) {
    const argText = text.substring(span.argStart, span.argEnd);
    piiRegex.lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = piiRegex.exec(argText)) !== null) {
      const identifier = m[1];
      const matched = matchesPii(identifier, patterns);
      if (!matched) { continue; }

      const relStart = m.index;
      if (isMasked(argText, relStart, config.extraMaskingPatterns)) {
        continue;
      }

      const absStart = span.argStart + relStart;
      const startPos = document.positionAt(absStart);
      const endPos = document.positionAt(absStart + identifier.length);
      const range = new vscode.Range(startPos, endPos);

      const isDuplicate = diagnostics.some((d) => d.range.isEqual(range));
      if (!isDuplicate) {
        diagnostics.push(createLoggingDiagnostic(identifier, matched, range));
      }
    }
  }

  return diagnostics;
}

function createLoggingDiagnostic(
  identifier: string,
  _matchedPattern: string,
  range: vscode.Range
): vscode.Diagnostic {
  const diag = new vscode.Diagnostic(
    range,
    `⚠️ PII "${identifier}" is being logged without masking. This may violate data privacy regulations (GDPR, PDPA, CCPA). Consider using a masking utility, e.g. MaskHelper.Mask(${identifier})`,
    vscode.DiagnosticSeverity.Warning
  );
  diag.source = DIAGNOSTIC_SOURCE;
  diag.code = {
    value: "pii-logging-unmasked",
    target: vscode.Uri.parse("https://en.wikipedia.org/wiki/Personal_data"),
  };
  diag.tags = [vscode.DiagnosticTag.Unnecessary];
  diag.relatedInformation = [
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(
        vscode.Uri.parse("https://en.wikipedia.org/wiki/Personal_data"),
        new vscode.Position(0, 0)
      ),
      "PII data should be masked before logging to prevent data leaks"
    ),
  ];
  return diag;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function createDiagnostic(
  identifier: string,
  matchedPattern: string,
  range: vscode.Range,
  severity: vscode.DiagnosticSeverity
): vscode.Diagnostic {
  const diag = new vscode.Diagnostic(
    range,
    `⚠️ Potential PII detected: "${identifier}" matches pattern "${matchedPattern}". This field may contain personally identifiable information. Consider encrypting, hashing, or removing this field to comply with data privacy regulations (GDPR, PDPA, CCPA).`,
    severity
  );
  diag.source = DIAGNOSTIC_SOURCE;
  diag.code = {
    value: "pii-field",
    target: vscode.Uri.parse("https://en.wikipedia.org/wiki/Personal_data"),
  };
  // Tag as "Unnecessary" so the editor fades the code (visual hint like SonarQube)
  diag.tags = [vscode.DiagnosticTag.Unnecessary];
  // Add related information pointing to privacy docs
  diag.relatedInformation = [
    new vscode.DiagnosticRelatedInformation(
      new vscode.Location(
        vscode.Uri.parse("https://en.wikipedia.org/wiki/Personal_data"),
        new vscode.Position(0, 0)
      ),
      "Learn more about PII and data privacy regulations"
    ),
  ];
  return diag;
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

      // For logging-unmasked diagnostics, offer wrap with mask
      if (
        diag.code &&
        typeof diag.code === "object" &&
        "value" in diag.code &&
        diag.code.value === "pii-logging-unmasked"
      ) {
        const piiText = document.getText(diag.range);
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

      // Suppress comment for all PII diagnostics
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
