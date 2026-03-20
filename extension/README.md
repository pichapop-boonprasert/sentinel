# Sentinel

VS Code / Kiro IDE extension that detects potential PII and sensitive fields in JSON keys and logging statements, with inline warnings and quick-fix suggestions.

## How it works

Simply open any source file, start coding, and you will start seeing issues reported by Sentinel. Issues are highlighted in your code and also listed in the 'Problems' panel.

You can access the detailed rule description directly from your editor, using the provided contextual menu. Hover over a highlighted field to see the warning message, compliance context (GDPR, HIPAA, PCI-DSS, etc.), and remediation advice. Use Quick Fix (`Ctrl + .` / `Cmd + .`) to apply masking or suppress the warning.

Sentinel works in two passes:
1. Scans your code for sensitive field names (PII, financial, health, credentials) across properties, variables, parameters, and string literals.
2. Analyzes logging statements to detect when sensitive fields are logged without proper masking — only flagging fields that actually appear in logging calls.

The extension activates on startup and performs a workspace-wide scan across all supported files. As you edit, it re-analyzes in real time. A status bar indicator shows `PII: {activeFileCount} / {totalWorkspaceCount}` so you always know where you stand.

## Features

- Inline diagnostics (squiggly underlines) on sensitive field names
- Detects PII, Financial, Health, and Credential data patterns
- Logging statement analysis for unmasked sensitive data
- Hover pop-up with warning message and remediation advice
- Quick-fix code actions to mask data or suppress warnings
- Fully configurable patterns, logging methods, and severity
- Real-time configuration updates (no restart required)
- Works in JSON, C#, TypeScript, JavaScript, and more

## Install & Run

```bash
cd extension
npm install
npm run compile
```

Press `F5` in VS Code/Kiro to launch the Extension Development Host.

## Keyboard Shortcuts

| Action | Mac | Windows/Linux |
|--------|-----|---------------|
| Open Settings | `Cmd + ,` | `Ctrl + ,` |
| Open Command Palette | `Cmd + Shift + P` | `Ctrl + Shift + P` |
| Quick Fix (on warning) | `Cmd + .` | `Ctrl + .` |
| Show Problems Panel | `Cmd + Shift + M` | `Ctrl + Shift + M` |
| Go to Next Problem | `F8` | `F8` |
| Go to Previous Problem | `Shift + F8` | `Shift + F8` |

**Tips:**
- Type `PII Checker` in Command Palette to find extension commands
- Search `piiJsonChecker` in Settings to configure the extension
- Click on a warning squiggle and press Quick Fix to see masking options

## Configuration

All settings are under `piiJsonChecker.*` in VS Code settings.

### Category Toggles

Enable or disable detection for specific data categories:

| Setting | Default | Description |
|---------|---------|-------------|
| `piiJsonChecker.categories.pii` | `true` | Personal Identifiable Information (names, emails, SSN) |
| `piiJsonChecker.categories.financial` | `true` | Financial data (credit cards, bank accounts, CVV) |
| `piiJsonChecker.categories.health` | `true` | Health information (patient IDs, diagnoses) |
| `piiJsonChecker.categories.credentials` | `true` | Credentials (passwords, API keys, tokens) |

### Custom Patterns (Additive Mode)

Add your own field names to detect. These are **added to** the built-in patterns:

```json
{
  "piiJsonChecker.customPatterns.pii": ["employeeId", "staffNumber", "membershipId"],
  "piiJsonChecker.customPatterns.financial": ["invoiceNumber", "transactionId"],
  "piiJsonChecker.customPatterns.health": ["allergyInfo", "bloodType"],
  "piiJsonChecker.customPatterns.credentials": ["serviceKey", "authCode"]
}
```

Supported naming formats: `camelCase`, `snake_case`, `kebab-case`, `PascalCase`

### Excluded Patterns

Remove specific patterns from detection (useful for false positives):

```json
{
  "piiJsonChecker.excludedPatterns": ["displayName", "userName", "publicKey"]
}
```

### Logging Functions (Replace Mode)

Configure which logging methods trigger detection. When set, this **replaces** the defaults:

```json
{
  "piiJsonChecker.loggingFunctions": ["MyLogger.Log", "customLog", "audit"]
}
```

**Default logging functions (when not configured):**
- .NET: `LogInformation`, `LogWarning`, `LogError`, `LogDebug`, `Console.WriteLine`, etc.
- JavaScript: `console.log`, `console.info`, `console.warn`, `console.error`, etc.

Leave empty to use defaults. Set to `[]` to disable logging detection entirely.

### Masking Patterns (Additive Mode)

Add custom masking function patterns:

```json
{
  "piiJsonChecker.maskingPatterns": [".sanitize(", ".encrypt(", ".redact("]
}
```

### General Settings

| Setting | Default | Options | Description |
|---------|---------|---------|-------------|
| `piiJsonChecker.severity` | `Warning` | `Error`, `Warning`, `Information`, `Hint` | Diagnostic severity level |
| `piiJsonChecker.enableLoggingDetection` | `true` | `true`, `false` | Enable/disable logging statement analysis |

## Configuration Examples

### Example 1: Add Custom PII Fields

```json
{
  "piiJsonChecker.customPatterns.pii": [
    "employeeId",
    "staffNumber", 
    "visitorName",
    "guestEmail"
  ]
}
```

### Example 2: Disable Financial Detection

```json
{
  "piiJsonChecker.categories.financial": false
}
```

### Example 3: Custom Logging Functions Only

```json
{
  "piiJsonChecker.loggingFunctions": [
    "Logger.Info",
    "Logger.Warn",
    "Logger.Error",
    "Audit.Log"
  ]
}
```

### Example 4: Suppress False Positives

```json
{
  "piiJsonChecker.excludedPatterns": [
    "displayName",
    "publicKey",
    "firstName_label"
  ]
}
```

### Example 5: Strict Mode (Errors)

```json
{
  "piiJsonChecker.severity": "Error"
}
```

## Configuration Behavior

| Setting Type | Behavior | Description |
|--------------|----------|-------------|
| `customPatterns.*` | **Additive** | Added to built-in patterns |
| `excludedPatterns` | **Removes** | Removes patterns from detection |
| `loggingFunctions` | **Replace** | Replaces defaults when configured |
| `maskingPatterns` | **Additive** | Added to built-in masking patterns |

## Invalid Configuration Handling

If you provide invalid configuration values:
- Invalid entries are skipped
- Valid entries continue to work
- A notification appears with details
- Check the "PII Checker" output channel for specifics

## Package as VSIX

```bash
npm install -g @vscode/vsce
vsce package
```

Install the `.vsix` via **Extensions → Install from VSIX**.
