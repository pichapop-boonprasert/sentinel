# Data Masking Suggestion Plugin

AI-powered detection and masking suggestions for sensitive data fields in source code. This VS Code/Kiro extension automatically identifies potentially sensitive data like PII, credentials, financial information, and health data in your codebase.

## Features

- **Automatic Detection**: Scans code for sensitive field names and patterns
- **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C#, and JSON
- **Smart Analysis**: Confidence scoring based on field names, context, and usage patterns
- **Inline Highlighting**: Visual indicators for detected sensitive fields
- **Suggestion Panel**: Centralized view of all findings with accept/reject/defer actions
- **Report Generation**: Export findings to JSON, CSV, or Markdown
- **Configurable**: Customize patterns, thresholds, and scanning behavior

## Installation

### From Source

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` in VS Code to launch the Extension Development Host

### From VSIX Package

1. Build the package:
   ```bash
   npm install -g @vscode/vsce
   vsce package
   ```
2. In VS Code: Extensions → ⋯ → Install from VSIX → Select the `.vsix` file

## Usage

### Automatic Scanning

The plugin automatically scans files when you:
- Open a file (configurable via `dataMasking.scanOnOpen`)
- Save a file (configurable via `dataMasking.scanOnSave`)

### Manual Commands

Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and type:

| Command | Description |
|---------|-------------|
| `Data Masking: Scan Workspace` | Scan all supported files in the workspace |
| `Data Masking: Scan Current File` | Scan the currently active file |
| `Data Masking: Open Suggestion Panel` | Open the suggestions sidebar |
| `Data Masking: Generate Report` | Generate a report of all findings |
| `Data Masking: Export Configuration` | Export current configuration |
| `Data Masking: Import Configuration` | Import configuration from file |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+M` / `Ctrl+Shift+M` | Open Suggestion Panel |
| `Cmd+Shift+A` / `Ctrl+Shift+A` | Accept Suggestion |
| `Cmd+Shift+R` / `Ctrl+Shift+R` | Reject Suggestion |
| `Cmd+Shift+D` / `Ctrl+Shift+D` | Defer Suggestion |

### Suggestion Panel

Click the **Data Masking** icon in the Activity Bar (left sidebar) to open the Suggestions panel. Here you can:

- View all detected sensitive fields grouped by category
- See confidence scores and recommended actions
- Accept, reject, or defer suggestions
- Filter by pattern type, confidence level, or status
- Sort by confidence, file location, or category

## What It Detects

### PII (Personally Identifiable Information)
- Email addresses
- Phone numbers
- Social Security Numbers
- Names (first, last, full)
- Physical addresses
- Date of birth

### Credentials
- Passwords
- API keys
- Access tokens
- Secret keys
- Private keys
- Authentication tokens

### Financial Data
- Credit card numbers
- Bank account numbers
- CVV/CVC codes
- Routing numbers
- Tax IDs

### Health Information
- Medical record numbers
- Patient IDs
- Diagnoses
- Prescription information
- Insurance IDs

## Configuration

Configure the extension in VS Code Settings (`Cmd+,` / `Ctrl+,`) under "Data Masking":

| Setting | Default | Description |
|---------|---------|-------------|
| `dataMasking.scanOnSave` | `true` | Automatically scan files when saved |
| `dataMasking.scanOnOpen` | `true` | Automatically scan files when opened |
| `dataMasking.maxCpuPercent` | `25` | Maximum CPU usage for background analysis |
| `dataMasking.scanFrequencyMs` | `1000` | Minimum time between scans (ms) |
| `dataMasking.cacheEnabled` | `true` | Enable caching of analysis results |
| `dataMasking.cacheTtlMs` | `300000` | Cache time-to-live (5 minutes) |
| `dataMasking.onDemandThreshold` | `1000` | File count threshold for on-demand scanning |

### Configuration File

The plugin stores workspace-specific configuration in `.kiro/masking-config.json`:

```json
{
  "version": "1.0.0",
  "maskedFields": [],
  "rejectedFields": [],
  "customPatterns": [],
  "settings": {
    "scanOnSave": true,
    "scanOnOpen": true,
    "maxCpuPercent": 25,
    "scanFrequencyMs": 1000,
    "cacheEnabled": true,
    "cacheTtlMs": 300000,
    "onDemandThreshold": 1000
  }
}
```

## Custom Patterns

Add custom detection patterns via the configuration file:

```json
{
  "customPatterns": [
    {
      "id": "custom-employee-id",
      "name": "Employee ID",
      "type": "pii",
      "fieldNamePatterns": ["employeeId", "empId", "staffNumber"],
      "valuePatterns": ["EMP-\\d{6}"],
      "contextIndicators": ["employee", "staff", "worker"]
    }
  ]
}
```

## Example

Create a file with sensitive-looking fields:

```typescript
// user-service.ts
interface User {
  userId: string;
  email: string;           // ⚠️ Detected: PII
  password: string;        // ⚠️ Detected: Credentials
  creditCardNumber: string; // ⚠️ Detected: Financial
  ssn: string;             // ⚠️ Detected: PII
  medicalRecordId: string; // ⚠️ Detected: Health
}

const apiKey = "sk-abc123"; // ⚠️ Detected: Credentials
```

The plugin will:
1. Highlight these fields in the editor
2. Show them in the Suggestion Panel
3. Provide confidence scores and recommended masking actions

## Reports

Generate reports in multiple formats:

**JSON** - Machine-readable format for integration with other tools
**CSV** - Spreadsheet-compatible for analysis
**Markdown** - Human-readable documentation

Reports include:
- Field name and location
- Pattern type and confidence score
- Current status (pending/accepted/rejected/deferred)
- Summary statistics

## Development

### Running Tests

```bash
npm test
```

### Watch Mode

```bash
npm run watch
```

### Linting

```bash
npm run lint
```

## Architecture

```
src/
├── scanner/          # File parsing and field extraction
│   ├── parsers/      # Language-specific parsers
│   └── language-support.ts
├── analyzer/         # Sensitivity detection
│   ├── patterns/     # Built-in pattern definitions
│   ├── pattern-matcher.ts
│   ├── confidence-scorer.ts
│   └── usage-context-analyzer.ts
├── suggestion-engine/ # Suggestion management
├── config/           # Configuration persistence
├── cache/            # Analysis result caching
├── report/           # Report generation
├── ui/               # VS Code UI components
└── extension.ts      # Extension entry point
```

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request
