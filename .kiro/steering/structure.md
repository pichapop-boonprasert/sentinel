# Project Structure

```
extension/                    # VS Code extension (TypeScript)
├── src/
│   ├── extension.ts          # Entry point: activation, document routing, JSON/code analyzers, code actions, status bar, notifications
│   ├── analyzers/
│   │   └── loggingAnalyzer.ts    # Detects unmasked PII in logging calls (LoggingAnalyzer class)
│   ├── config/
│   │   └── configurationManager.ts  # Reads VS Code workspace settings (ConfigurationManager class)
│   ├── diagnostics/
│   │   └── diagnosticGenerator.ts   # Creates VS Code Diagnostic objects with compliance info (DiagnosticGenerator class)
│   └── patterns/
│       ├── types.ts              # Core types: SensitivePattern, PatternCategory enum, CATEGORY_COMPLIANCE, DIAGNOSTIC_CODES
│       ├── defaultPatterns.ts    # Built-in pattern definitions by category (DEFAULT_PATTERNS constant)
│       ├── patternMatcher.ts     # Normalizes identifiers and matches against patterns (PatternMatcher class + normalize function)
│       └── patternRegistry.ts    # Standalone registry: merges defaults + custom patterns, handles exclusions (PatternRegistry class)
├── test-samples/             # Sample files for manual testing
├── out/                      # Compiled JS output
├── logo.png                  # Extension icon (referenced in package.json as "icon")
├── LICENSE                   # MIT license
├── package.json              # Extension manifest (name: sentinel, publisher: dandadan-beun-beun-beun)
└── tsconfig.json

project/                      # Demo ASP.NET Core Web API (intentionally insecure)
├── Controllers/              # API controllers (Users, Payments, Patients)
├── Models/                   # Data models with sensitive fields
├── Services/                 # Business logic with bad logging practices
├── Program.cs                # App entry point
└── SensitiveDataDemo.csproj
```

## Architecture Notes

- `extension.ts` is the orchestrator: it wires up event listeners, routes documents to the inline JSON analyzer (`analyzeJson`) or code analyzer (`analyzeDotNet`), manages workspace-wide scanning, and hosts the `PiiCodeActionProvider`.
- JSON analysis scans for quoted keys matching sensitive patterns. Code analysis uses regex patterns to detect properties, fields, variables, parameters, attribute values, and string literals.
- Pattern matching is normalized (camelCase, snake_case, kebab-case all resolve to the same form) via `patternMatcher.ts`. Both `PatternMatcher` (used at runtime) and `PatternRegistry` (standalone registry class) share the same normalization logic.
- `configurationManager.ts` reads live VS Code settings and produces effective patterns (defaults + custom − excluded, filtered by enabled categories). `patternRegistry.ts` is a standalone registry class with the same merging logic but independent of VS Code APIs.
- Logging analysis is two-pass: first collect all PII field diagnostics from `analyzeDotNet`, then use `LoggingAnalyzer` to find unmasked sensitive fields in logging calls. Only PII field diagnostics whose identifiers also appear unmasked in logging are kept — fields that are never logged are suppressed.
- Diagnostic codes are category-specific (`pii-field-personal`, `pii-field-financial`, etc.) and drive the quick-fix code action behavior. Logging diagnostics use `pii-logging-unmasked`.
- `LoggingAnalyzer` recognizes .NET logging functions (Console, Debug, Trace, ILogger, Serilog), JS/TS console methods, and short method names (`.Info()`, `.Warn()`, etc.). Masking detection covers `Mask`, `Redact`, `Anonymize`, `Hash` functions and mask string literals (`***`, `[REDACTED]`, `[MASKED]`, etc.).
