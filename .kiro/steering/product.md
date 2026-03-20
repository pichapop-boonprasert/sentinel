# Product Overview

Sentinel (publisher: `dandadan-beun-beun-beun`, package name: `sentinel`) is a VS Code extension that detects sensitive data fields (PII, financial, health, credentials) in code and JSON files and surfaces inline diagnostics with compliance context.

## Core Capabilities

- Pattern-based detection of sensitive field names across multiple categories (PII, Financial, Health, Credentials)
- Context-aware logging analysis: flags unmasked sensitive fields inside logging calls while suppressing noise for fields that are never logged
- Workspace-wide scanning on activation — finds issues across all `.json`, `.cs`, `.vb`, `.cshtml`, `.razor` files (excludes `node_modules`, `bin`, `obj`, `out`, `.git`)
- File watcher reacts to file creation, external changes, and deletion in real time
- Notification toast on file open when PII issues are found, with "Show Problems" action
- Status bar indicator showing `PII: {activeFileCount} / {totalWorkspaceCount}` — clicks open the Problems panel
- Quick-fix code actions:
  - Category-specific masking: `MaskHelper.MaskPII`, `MaskHelper.MaskFinancial`, `MaskHelper.MaskPHI`, `MaskHelper.Redact`
  - Generic masking for logging diagnostics: `MaskHelper.Mask(field)`
  - Suppress with `// pii-checker: suppress` comment (or `' pii-checker: suppress` for VB)
- Configurable via VS Code settings: severity level, toggle categories, add custom patterns, exclude patterns, extend logging/masking functions

## Diagnostic Codes

- `pii-field-personal` — PII category field detection
- `pii-field-financial` — Financial category field detection
- `pii-field-health` — Health category field detection
- `pii-field-credentials` — Credentials category field detection
- `pii-logging-unmasked` — Sensitive field logged without masking

## Compliance Context

Each pattern category maps to regulatory frameworks:
- PII → GDPR, CCPA, PDPA
- Financial → PCI-DSS, GDPR
- Health → HIPAA, GDPR
- Credentials → SOC2, ISO27001

## Demo Project

The `project/` directory is a .NET 10 ASP.NET Core Web API (`SensitiveDataDemo`) that intentionally contains bad practices (logging PII, hardcoded secrets, plaintext passwords) to exercise the extension's detection capabilities. It is not production code.
