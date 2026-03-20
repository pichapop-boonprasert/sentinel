# Tech Stack

## VS Code Extension (`extension/`)

- Language: TypeScript (strict mode)
- Target: ES2020, CommonJS modules
- Runtime: VS Code Extension Host (VS Code ≥ 1.85)
- Build: `tsc` (TypeScript compiler)
- Package manager: npm

### Key Dependencies

- `@types/vscode` ^1.85.0
- `@types/node` ^20.0.0
- `typescript` ^5.3.0

No runtime dependencies — the extension only uses the VS Code API.

### Commands

```bash
# From extension/ directory:
npm install          # Install dependencies
npm run compile      # Build (tsc -p ./)
npm run watch        # Watch mode (tsc -watch -p ./)
```

Output goes to `extension/out/`.

## Demo .NET Project (`project/`)

- Framework: ASP.NET Core (.NET 10)
- Language: C# (nullable enabled, implicit usings)
- NuGet packages: Microsoft.AspNetCore.OpenApi 10.0.5, Swashbuckle.AspNetCore 10.1.5

### Commands

```bash
# From project/ directory:
dotnet build
dotnet run
```

## Supported Languages (Extension)

The extension activates for: `json`, `jsonc`, `csharp`, `vb`, `razor`, `aspnetcorerazor`, `javascript`, `typescript`, `javascriptreact`, `typescriptreact`.

Logging context detection is supported for all of the above except JSON.
