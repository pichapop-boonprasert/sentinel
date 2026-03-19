"use strict";
/**
 * Data Masking Suggestion Plugin for Kiro IDE
 *
 * This extension provides AI-powered detection and masking suggestions
 * for sensitive data fields in source code.
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const scanner_1 = require("./scanner");
const pattern_matcher_1 = require("./analyzer/pattern-matcher");
const confidence_scorer_1 = require("./analyzer/confidence-scorer");
const usage_context_analyzer_1 = require("./analyzer/usage-context-analyzer");
const suggestion_engine_1 = require("./suggestion-engine");
const config_manager_1 = require("./config/config-manager");
const report_1 = require("./report");
const ui_1 = require("./ui");
const patterns_1 = require("./analyzer/patterns");
let pluginState = null;
/**
 * VS Code file system adapter
 */
function createVSCodeFileSystem() {
    return {
        async readFile(path) {
            const uri = vscode.Uri.file(path);
            const content = await vscode.workspace.fs.readFile(uri);
            return Buffer.from(content).toString('utf-8');
        },
        async writeFile(path, content) {
            const uri = vscode.Uri.file(path);
            await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        },
        async exists(path) {
            try {
                const uri = vscode.Uri.file(path);
                await vscode.workspace.fs.stat(uri);
                return true;
            }
            catch {
                return false;
            }
        },
        async mkdir(path) {
            const uri = vscode.Uri.file(path);
            await vscode.workspace.fs.createDirectory(uri);
        },
        async rename(path, newPath) {
            const oldUri = vscode.Uri.file(path);
            const newUri = vscode.Uri.file(newPath);
            await vscode.workspace.fs.rename(oldUri, newUri);
        },
    };
}
/**
 * VS Code file reader adapter for Scanner
 */
function createVSCodeFileReader() {
    return {
        async readFile(filePath) {
            const uri = vscode.Uri.file(filePath);
            const content = await vscode.workspace.fs.readFile(uri);
            return Buffer.from(content).toString('utf-8');
        },
        async exists(filePath) {
            try {
                const uri = vscode.Uri.file(filePath);
                await vscode.workspace.fs.stat(uri);
                return true;
            }
            catch {
                return false;
            }
        },
        async getFileSize(filePath) {
            const uri = vscode.Uri.file(filePath);
            const stat = await vscode.workspace.fs.stat(uri);
            return stat.size;
        },
        async listFiles(includePatterns, excludePatterns) {
            const files = [];
            for (const pattern of includePatterns) {
                const excludeGlob = excludePatterns.length > 0
                    ? `{${excludePatterns.join(',')}}`
                    : '**/node_modules/**';
                const uris = await vscode.workspace.findFiles(pattern, excludeGlob);
                files.push(...uris.map(uri => uri.fsPath));
            }
            return files;
        },
    };
}
/**
 * Activates the extension
 *
 * Validates: Requirements 7.1
 */
async function activate(context) {
    console.log('Data Masking Suggestion Plugin is now active');
    // Initialize components
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.';
    const configPath = `${workspacePath}/.kiro/masking-config.json`;
    const userConfigPath = `${process.env.HOME}/.kiro/masking-config.json`;
    // Create file system adapter
    const fs = createVSCodeFileSystem();
    const fileReader = createVSCodeFileReader();
    // Initialize core components
    const scanner = new scanner_1.Scanner(fileReader);
    const patternMatcher = (0, pattern_matcher_1.createPatternMatcher)();
    const confidenceScorer = (0, confidence_scorer_1.createConfidenceScorer)();
    const contextAnalyzer = (0, usage_context_analyzer_1.createUsageContextAnalyzer)();
    const suggestionEngine = (0, suggestion_engine_1.createSuggestionEngine)();
    const configManager = (0, config_manager_1.createConfigurationManager)(fs, configPath, userConfigPath);
    const reportGenerator = (0, report_1.createReportGenerator)(workspacePath);
    // Initialize UI components
    const suggestionPanel = (0, ui_1.createSuggestionPanel)();
    const highlighter = (0, ui_1.createInlineHighlighter)();
    const tooltipProvider = (0, ui_1.createTooltipProvider)();
    const progressIndicator = (0, ui_1.createProgressIndicator)();
    // Register built-in patterns
    for (const pattern of patterns_1.builtInPatterns) {
        patternMatcher.registerPattern(pattern);
    }
    // Create decoration type for highlighting
    const decorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(255, 193, 7, 0.2)',
        border: '1px solid #ffc107',
    });
    // Create status bar item - Validates: Requirements 4.6
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'dataMasking.openPanel';
    statusBarItem.text = '$(shield) Data Masking';
    statusBarItem.tooltip = 'Click to open Data Masking Suggestion Panel';
    statusBarItem.show();
    // Store plugin state
    pluginState = {
        scanner,
        patternMatcher,
        confidenceScorer,
        contextAnalyzer,
        suggestionEngine,
        configManager,
        reportGenerator,
        suggestionPanel,
        highlighter,
        tooltipProvider,
        progressIndicator,
        decorationType,
        statusBarItem,
    };
    // Load configuration
    await configManager.load();
    // Register commands - Validates: Requirements 7.5, 7.6
    registerCommands(context);
    // Register file event handlers - Validates: Requirements 7.3, 7.4
    registerFileEventHandlers(context);
    // Register hover provider - Validates: Requirements 4.4
    registerHoverProvider(context);
    // Update progress indicator listener
    progressIndicator.onProgress((info) => {
        statusBarItem.text = info.message;
        statusBarItem.tooltip = pluginState?.progressIndicator.getTooltip() || '';
    });
    // Initial scan if configured
    const config = configManager.getConfiguration();
    if (config.settings.scanOnOpen) {
        await scanWorkspace();
    }
    // Add disposables
    context.subscriptions.push(statusBarItem, decorationType);
}
/**
 * Registers all commands
 *
 * Validates: Requirements 7.5, 7.6
 */
function registerCommands(context) {
    // Open suggestion panel - Validates: Requirements 7.2
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.openPanel', () => {
        openSuggestionPanel();
    }));
    // Scan workspace
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.scanWorkspace', async () => {
        await scanWorkspace();
    }));
    // Scan current file
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.scanFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            await scanFile(editor.document.uri.fsPath);
        }
    }));
    // Accept suggestion - Validates: Requirements 5.1
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.acceptSuggestion', async (suggestionId) => {
        await processSuggestionDecision(suggestionId, 'accept');
    }));
    // Reject suggestion - Validates: Requirements 5.2
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.rejectSuggestion', async (suggestionId) => {
        await processSuggestionDecision(suggestionId, 'reject');
    }));
    // Defer suggestion - Validates: Requirements 5.3
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.deferSuggestion', async (suggestionId) => {
        await processSuggestionDecision(suggestionId, 'defer');
    }));
    // Export report
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.exportReport', async () => {
        await exportReport();
    }));
    // Toggle highlighting
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.toggleHighlighting', () => {
        if (pluginState) {
            const enabled = !pluginState.highlighter.isEnabled();
            pluginState.highlighter.setEnabled(enabled);
            updateDecorations();
            vscode.window.showInformationMessage(`Sensitive field highlighting ${enabled ? 'enabled' : 'disabled'}`);
        }
    }));
    // Register keyboard shortcuts - Validates: Requirements 7.5
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.acceptCurrentSuggestion', async () => {
        const suggestion = getCurrentSuggestion();
        if (suggestion) {
            await processSuggestionDecision(suggestion.id, 'accept');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.rejectCurrentSuggestion', async () => {
        const suggestion = getCurrentSuggestion();
        if (suggestion) {
            await processSuggestionDecision(suggestion.id, 'reject');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dataMasking.deferCurrentSuggestion', async () => {
        const suggestion = getCurrentSuggestion();
        if (suggestion) {
            await processSuggestionDecision(suggestion.id, 'defer');
        }
    }));
}
/**
 * Registers file event handlers
 *
 * Validates: Requirements 7.3, 7.4
 */
function registerFileEventHandlers(context) {
    // Handle file open - Validates: Requirements 7.3
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async (document) => {
        if (!pluginState)
            return;
        const config = pluginState.configManager.getConfiguration();
        if (config.settings.scanOnOpen && (0, scanner_1.isSupported)(document.uri.fsPath)) {
            await scanFile(document.uri.fsPath);
        }
    }));
    // Handle file save - Validates: Requirements 7.4
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (!pluginState)
            return;
        const config = pluginState.configManager.getConfiguration();
        if (config.settings.scanOnSave && (0, scanner_1.isSupported)(document.uri.fsPath)) {
            await scanFile(document.uri.fsPath);
        }
    }));
    // Handle active editor change
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            updateDecorations();
        }
    }));
}
/**
 * Registers hover provider
 *
 * Validates: Requirements 4.4
 */
function registerHoverProvider(context) {
    const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'csharp', 'json'];
    for (const language of supportedLanguages) {
        context.subscriptions.push(vscode.languages.registerHoverProvider(language, {
            provideHover(document, position) {
                if (!pluginState)
                    return null;
                const tooltip = pluginState.tooltipProvider.getTooltipAt(document.uri.fsPath, position.line + 1, // Convert to 1-indexed
                position.character);
                if (!tooltip)
                    return null;
                const markdown = pluginState.tooltipProvider.generateMarkdown(tooltip);
                return new vscode.Hover(new vscode.MarkdownString(markdown, true));
            },
        }));
    }
}
/**
 * Scans the entire workspace
 */
async function scanWorkspace() {
    if (!pluginState)
        return;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
    }
    const { progressIndicator } = pluginState;
    // Get all files
    const files = await vscode.workspace.findFiles('**/*.{js,ts,jsx,tsx,py,java,cs,json}', '**/node_modules/**');
    progressIndicator.startScanning(files.length);
    const allSuggestions = [];
    for (const file of files) {
        try {
            const suggestions = await scanFile(file.fsPath, false);
            allSuggestions.push(...suggestions);
            progressIndicator.incrementFilesScanned(suggestions.length);
        }
        catch (error) {
            console.error(`Error scanning ${file.fsPath}:`, error);
        }
    }
    progressIndicator.complete(allSuggestions.length);
    updateDecorations();
    vscode.window.showInformationMessage(`Scan complete: Found ${allSuggestions.length} sensitive fields in ${files.length} files`);
}
/**
 * Scans a single file
 */
async function scanFile(filePath, updateUI = true) {
    if (!pluginState)
        return [];
    const { scanner, patternMatcher, confidenceScorer, contextAnalyzer, suggestionEngine, configManager, highlighter, tooltipProvider, } = pluginState;
    // Check if file is supported
    if (!(0, scanner_1.isSupported)(filePath)) {
        return [];
    }
    // Scan file
    const scanResult = await scanner.scanFile(filePath);
    if (scanResult.errors.length > 0) {
        console.warn(`Scan errors in ${filePath}:`, scanResult.errors);
    }
    // Analyze fields and create suggestions
    const suggestions = [];
    for (const field of scanResult.fields) {
        // Skip if already masked or rejected
        if (configManager.isFieldMasked(field.name, filePath) ||
            configManager.isFieldRejected(field.name, filePath)) {
            continue;
        }
        // Match patterns
        const matchResult = patternMatcher.matchField(field);
        if (!matchResult.matched)
            continue;
        // Calculate confidence
        const scoreBreakdown = confidenceScorer.calculateScore({ field, patternMatchResult: matchResult });
        const confidenceScore = scoreBreakdown.finalScore;
        if (confidenceScore < 30)
            continue; // Skip low confidence
        // Analyze context
        const contextAnalysis = contextAnalyzer.analyzeField(field);
        // Determine priority based on context
        const priority = contextAnalysis.highestRisk === 'high' ? 'high' :
            contextAnalysis.highestRisk === 'medium' ? 'medium' : 'low';
        // Create analysis result for suggestion engine
        const analysisResult = {
            field,
            isSensitive: true,
            confidenceScore,
            detectedPatterns: matchResult.matchedPattern ? [matchResult.matchedPattern.type] : [],
            reasoning: matchResult.matchedPattern
                ? `Matched pattern: ${matchResult.matchedPattern.name}`
                : 'Pattern matched',
            priority,
        };
        // Create suggestion
        const suggestion = suggestionEngine.createSuggestion(analysisResult);
        suggestions.push(suggestion);
    }
    // Update UI components
    if (updateUI) {
        const allSuggestions = suggestionEngine.getSuggestions();
        highlighter.setSuggestions(allSuggestions);
        tooltipProvider.setSuggestions(allSuggestions);
        updateDecorations();
    }
    return suggestions;
}
/**
 * Updates editor decorations
 */
function updateDecorations() {
    if (!pluginState)
        return;
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const { highlighter, decorationType } = pluginState;
    const filePath = editor.document.uri.fsPath;
    const decorations = highlighter.getDecorationsForFile(filePath);
    const vscodeDecorations = decorations.map(d => ({
        range: new vscode.Range(d.location.startLine - 1, // Convert to 0-indexed
        d.location.startColumn, d.location.endLine - 1, d.location.endColumn),
        hoverMessage: d.hoverMessage,
    }));
    editor.setDecorations(decorationType, vscodeDecorations);
}
/**
 * Opens the suggestion panel
 */
function openSuggestionPanel() {
    if (!pluginState)
        return;
    const { suggestionPanel, suggestionEngine } = pluginState;
    // Update panel with current suggestions
    suggestionPanel.setSuggestions(suggestionEngine.getSuggestions());
    // Create webview panel
    const panel = vscode.window.createWebviewPanel('dataMaskingSuggestions', 'Data Masking Suggestions', vscode.ViewColumn.Two, {
        enableScripts: true,
    });
    panel.webview.html = suggestionPanel.generateHtml();
    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
        switch (message.type) {
            case 'accept':
                await processSuggestionDecision(message.suggestionId, 'accept');
                break;
            case 'reject':
                await processSuggestionDecision(message.suggestionId, 'reject');
                break;
            case 'defer':
                await processSuggestionDecision(message.suggestionId, 'defer');
                break;
            case 'navigate':
                navigateToSuggestion(message.suggestionId);
                break;
        }
    });
}
/**
 * Processes a suggestion decision
 */
async function processSuggestionDecision(suggestionId, action) {
    if (!pluginState)
        return;
    const { suggestionEngine, configManager, highlighter, tooltipProvider } = pluginState;
    const suggestion = suggestionEngine.getSuggestionById(suggestionId);
    if (!suggestion)
        return;
    // Process decision
    await suggestionEngine.processDecision(suggestionId, { action });
    // Record in config manager
    if (action === 'accept') {
        await configManager.addMaskedField(suggestion);
    }
    else if (action === 'reject') {
        await configManager.addRejectedField(suggestion);
    }
    // Record decision history
    configManager.recordDecision(suggestionId, suggestion, { action });
    // Update UI
    const allSuggestions = suggestionEngine.getSuggestions();
    highlighter.setSuggestions(allSuggestions);
    tooltipProvider.setSuggestions(allSuggestions);
    updateDecorations();
    vscode.window.showInformationMessage(`Suggestion ${action}ed: ${suggestion.field.name}`);
}
/**
 * Navigates to a suggestion's location
 */
function navigateToSuggestion(suggestionId) {
    if (!pluginState)
        return;
    const suggestion = pluginState.suggestionEngine.getSuggestionById(suggestionId);
    if (!suggestion)
        return;
    const { filePath, startLine, startColumn } = suggestion.field.location;
    const uri = vscode.Uri.file(filePath);
    const position = new vscode.Position(startLine - 1, startColumn);
    vscode.window.showTextDocument(uri, {
        selection: new vscode.Range(position, position),
    });
}
/**
 * Gets the suggestion at the current cursor position
 */
function getCurrentSuggestion() {
    if (!pluginState)
        return null;
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return null;
    const filePath = editor.document.uri.fsPath;
    const line = editor.selection.active.line + 1; // Convert to 1-indexed
    // Find the suggestion by matching the field location
    const suggestions = pluginState.suggestionEngine.getSuggestions({
        filePath,
    });
    return suggestions.find(s => s.field.location.startLine <= line &&
        s.field.location.endLine >= line) || null;
}
/**
 * Exports a report
 */
async function exportReport() {
    if (!pluginState)
        return;
    const { reportGenerator, suggestionEngine } = pluginState;
    // Get format choice
    const format = await vscode.window.showQuickPick(['JSON', 'CSV', 'Markdown'], { placeHolder: 'Select export format' });
    if (!format)
        return;
    // Generate report
    reportGenerator.setSuggestions(suggestionEngine.getSuggestions());
    const report = await reportGenerator.generateReport();
    const exportFormat = format.toLowerCase();
    const content = reportGenerator.exportReport(report, exportFormat);
    // Get file extension
    const extensions = {
        json: 'json',
        csv: 'csv',
        markdown: 'md',
    };
    // Save file
    const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`masking-report.${extensions[exportFormat]}`),
        filters: {
            [format]: [extensions[exportFormat]],
        },
    });
    if (uri) {
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        vscode.window.showInformationMessage(`Report exported to ${uri.fsPath}`);
    }
}
/**
 * Deactivates the extension
 */
function deactivate() {
    console.log('Data Masking Suggestion Plugin is now deactivated');
    pluginState = null;
}
//# sourceMappingURL=extension.js.map