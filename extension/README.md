# PII JSON Checker

VS Code / Kiro IDE extension that detects potential PII fields (`first name`, `last name`) in JSON keys and shows inline warnings similar to SonarQube.

## Features

- Inline diagnostics (squiggly underlines) on JSON keys containing PII patterns
- Hover pop-up with warning message and remediation advice
- Quick-fix code action to suppress warnings
- Configurable patterns and severity level
- Works in both `.json` and `.jsonc` files

## Install & Run

```bash
cd pii-json-checker
npm install
npm run compile
```

Then press `F5` in VS Code/Kiro to launch the Extension Development Host and open a `.json` file.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `piiJsonChecker.patterns` | `["first_name", "firstname", ...]` | Key patterns to flag |
| `piiJsonChecker.severity` | `Warning` | `Error` / `Warning` / `Information` / `Hint` |

## Package as VSIX

```bash
npm install -g @vscode/vsce
vsce package
```

Install the `.vsix` in Kiro/VS Code via **Extensions → Install from VSIX**.
