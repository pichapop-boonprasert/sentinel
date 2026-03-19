/**
 * Data Masking Suggestion Plugin for Kiro IDE
 * 
 * This extension provides AI-powered detection and masking suggestions
 * for sensitive data fields in source code.
 * 
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import * as vscode from 'vscode';
import { Scanner, isSupported } from './scanner';
import { PatternMatcher, createPatternMatcher } from './analyzer/pattern-matcher';
import { ConfidenceScorer, createConfidenceScorer } from './analyzer/confidence-scorer';
import { UsageContextAnalyzer, createUsageContextAnalyzer } from './analyzer/usage-context-analyzer';
import { SuggestionEngine, createSuggestionEngine } from './suggestion-engine';
import { ConfigurationManager, createConfigurationManager, FileSystem } from './config/config-manager';
import { ReportGenerator, createReportGenerator } from './report';
import {
  SuggestionPanel,
  createSuggestionPanel,
  InlineHighlighter,
  createInlineHighlighter,
  TooltipProvider,
  createTooltipProvider,
  ProgressIndicator,
  createProgressIndicator,
} from './ui';
import {
  FieldDeclaration,
  AnalysisResult,
  Suggestion,
  Priority,
} from './types';
import { builtInPatterns } from './analyzer/patterns';

/**
 * Plugin state container
 */
interface PluginState {
  scanner: Scanner;
  patternMatcher: PatternMatcher;
  confidenceScorer: ConfidenceScorer;
  contextAnalyzer: UsageContextAnalyzer;
  suggestionEngine: SuggestionEngine;
  configManager: ConfigurationManager;
  reportGenerator: ReportGenerator;
  suggestionPanel: SuggestionPanel;
  highlighter: InlineHighlighter;
  tooltipProvider: TooltipProvider;
  progressIndicator: ProgressIndicator;
  decorationType: vscode.TextEditorDecorationType;
  statusBarItem: vscode.StatusBarItem;
}

let pluginState: PluginState | null = null;

/**
 * VS Code file system adapter
 */
function createVSCodeFileSystem(): FileSystem {
  return {
    async readFile(path: string): Promise<string> {
      const uri = vscode.Uri.file(path);
      const content = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(content).toString('utf-8');
    },
    async writeFile(path: string, content: string): Promise<void> {
      const uri = vscode.Uri.file(path);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
    },
    async exists(path: string): Promise<boolean> {
      try {
        const uri = vscode.Uri.file(path);
        await vscode.workspace.fs.stat(uri);
        return true;
      } catch {
        return false;
      }
    },
    async mkdir(path: string): Promise<void> {
      const uri = vscode.Uri.file(path);
      await vscode.workspace.fs.createDirectory(uri);
    },
    async rename(path: string, newPath: string): Promise<void> {
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
    async readFile(filePath: string): Promise<string> {
      const uri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(content).toString('utf-8');
    },
    async exists(filePath: string): Promise<boolean> {
      try {
        const uri = vscode.Uri.file(filePath);
        await vscode.workspace.fs.stat(uri);
        return true;
      } catch {
        return false;
      }
    },
    async getFileSize(filePath: string): Promise<number> {
      const uri = vscode.Uri.file(filePath);
      const stat = await vscode.workspace.fs.stat(uri);
      return stat.size;
    },
    async listFiles(includePatterns: string[], excludePatterns: string[]): Promise<string[]> {
      const files: string[] = [];
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
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('Data Masking Suggestion Plugin is now active');

  // Initialize components
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '.';
  const configPath = `${workspacePath}/.kiro/masking-config.json`;
  const userConfigPath = `${process.env.HOME}/.kiro/masking-config.json`;

  // Create file system adapter
  const fs = createVSCodeFileSystem();
  const fileReader = createVSCodeFileReader();

  // Initialize core components
  const scanner = new Scanner(fileReader);
  const patternMatcher = createPatternMatcher();
  const confidenceScorer = createConfidenceScorer();
  const contextAnalyzer = createUsageContextAnalyzer();
  const suggestionEngine = createSuggestionEngine();
  const configManager = createConfigurationManager(fs, configPath, userConfigPath);
  const reportGenerator = createReportGenerator(workspacePath);

  // Initialize UI components
  const suggestionPanel = createSuggestionPanel();
  const highlighter = createInlineHighlighter();
  const tooltipProvider = createTooltipProvider();
  const progressIndicator = createProgressIndicator();

  // Register built-in patterns
  for (const pattern of builtInPatterns) {
    patternMatcher.registerPattern(pattern);
  }

  // Create decoration type for highlighting
  const decorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    border: '1px solid #ffc107',
  });

  // Create status bar item - Validates: Requirements 4.6
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
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
  context.subscriptions.push(
    statusBarItem,
    decorationType,
  );
}

/**
 * Registers all commands
 * 
 * Validates: Requirements 7.5, 7.6
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Open suggestion panel - Validates: Requirements 7.2
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.openPanel', () => {
      openSuggestionPanel();
    })
  );

  // Scan workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.scanWorkspace', async () => {
      await scanWorkspace();
    })
  );

  // Scan current file
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.scanFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await scanFile(editor.document.uri.fsPath);
      }
    })
  );

  // Accept suggestion - Validates: Requirements 5.1
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.acceptSuggestion', async (suggestionId: string) => {
      await processSuggestionDecision(suggestionId, 'accept');
    })
  );

  // Reject suggestion - Validates: Requirements 5.2
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.rejectSuggestion', async (suggestionId: string) => {
      await processSuggestionDecision(suggestionId, 'reject');
    })
  );

  // Defer suggestion - Validates: Requirements 5.3
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.deferSuggestion', async (suggestionId: string) => {
      await processSuggestionDecision(suggestionId, 'defer');
    })
  );

  // Export report
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.exportReport', async () => {
      await exportReport();
    })
  );

  // Toggle highlighting
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.toggleHighlighting', () => {
      if (pluginState) {
        const enabled = !pluginState.highlighter.isEnabled();
        pluginState.highlighter.setEnabled(enabled);
        updateDecorations();
        vscode.window.showInformationMessage(
          `Sensitive field highlighting ${enabled ? 'enabled' : 'disabled'}`
        );
      }
    })
  );

  // Register keyboard shortcuts - Validates: Requirements 7.5
  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.acceptCurrentSuggestion', async () => {
      const suggestion = getCurrentSuggestion();
      if (suggestion) {
        await processSuggestionDecision(suggestion.id, 'accept');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.rejectCurrentSuggestion', async () => {
      const suggestion = getCurrentSuggestion();
      if (suggestion) {
        await processSuggestionDecision(suggestion.id, 'reject');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dataMasking.deferCurrentSuggestion', async () => {
      const suggestion = getCurrentSuggestion();
      if (suggestion) {
        await processSuggestionDecision(suggestion.id, 'defer');
      }
    })
  );
}


/**
 * Registers file event handlers
 * 
 * Validates: Requirements 7.3, 7.4
 */
function registerFileEventHandlers(context: vscode.ExtensionContext): void {
  // Handle file open - Validates: Requirements 7.3
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (!pluginState) return;
      
      const config = pluginState.configManager.getConfiguration();
      if (config.settings.scanOnOpen && isSupported(document.uri.fsPath)) {
        await scanFile(document.uri.fsPath);
      }
    })
  );

  // Handle file save - Validates: Requirements 7.4
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (!pluginState) return;
      
      const config = pluginState.configManager.getConfiguration();
      if (config.settings.scanOnSave && isSupported(document.uri.fsPath)) {
        await scanFile(document.uri.fsPath);
      }
    })
  );

  // Handle active editor change
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        updateDecorations();
      }
    })
  );
}

/**
 * Registers hover provider
 * 
 * Validates: Requirements 4.4
 */
function registerHoverProvider(context: vscode.ExtensionContext): void {
  const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'csharp', 'json'];

  for (const language of supportedLanguages) {
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(language, {
        provideHover(document, position) {
          if (!pluginState) return null;

          const tooltip = pluginState.tooltipProvider.getTooltipAt(
            document.uri.fsPath,
            position.line + 1, // Convert to 1-indexed
            position.character
          );

          if (!tooltip) return null;

          const markdown = pluginState.tooltipProvider.generateMarkdown(tooltip);
          return new vscode.Hover(new vscode.MarkdownString(markdown, true));
        },
      })
    );
  }
}

/**
 * Scans the entire workspace
 */
async function scanWorkspace(): Promise<void> {
  if (!pluginState) return;

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  const { progressIndicator } = pluginState;

  // Get all files
  const files = await vscode.workspace.findFiles(
    '**/*.{js,ts,jsx,tsx,py,java,cs,json}',
    '**/node_modules/**'
  );

  progressIndicator.startScanning(files.length);

  const allSuggestions: Suggestion[] = [];

  for (const file of files) {
    try {
      const suggestions = await scanFile(file.fsPath, false);
      allSuggestions.push(...suggestions);
      progressIndicator.incrementFilesScanned(suggestions.length);
    } catch (error) {
      console.error(`Error scanning ${file.fsPath}:`, error);
    }
  }

  progressIndicator.complete(allSuggestions.length);
  updateDecorations();

  vscode.window.showInformationMessage(
    `Scan complete: Found ${allSuggestions.length} sensitive fields in ${files.length} files`
  );
}


/**
 * Scans a single file
 */
async function scanFile(filePath: string, updateUI: boolean = true): Promise<Suggestion[]> {
  if (!pluginState) return [];

  const {
    scanner,
    patternMatcher,
    confidenceScorer,
    contextAnalyzer,
    suggestionEngine,
    configManager,
    highlighter,
    tooltipProvider,
  } = pluginState;

  // Check if file is supported
  if (!isSupported(filePath)) {
    return [];
  }

  // Scan file
  const scanResult = await scanner.scanFile(filePath);
  if (scanResult.errors.length > 0) {
    console.warn(`Scan errors in ${filePath}:`, scanResult.errors);
  }

  // Analyze fields and create suggestions
  const suggestions: Suggestion[] = [];

  for (const field of scanResult.fields) {
    // Skip if already masked or rejected
    if (configManager.isFieldMasked(field.name, filePath) ||
        configManager.isFieldRejected(field.name, filePath)) {
      continue;
    }

    // Match patterns
    const matchResult = patternMatcher.matchField(field);
    if (!matchResult.matched) continue;

    // Calculate confidence
    const scoreBreakdown = confidenceScorer.calculateScore({ field, patternMatchResult: matchResult });
    const confidenceScore = scoreBreakdown.finalScore;
    if (confidenceScore < 30) continue; // Skip low confidence

    // Analyze context
    const contextAnalysis = contextAnalyzer.analyzeField(field);

    // Determine priority based on context
    const priority: Priority = contextAnalysis.highestRisk === 'high' ? 'high' :
                               contextAnalysis.highestRisk === 'medium' ? 'medium' : 'low';

    // Create analysis result for suggestion engine
    const analysisResult: AnalysisResult = {
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
function updateDecorations(): void {
  if (!pluginState) return;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const { highlighter, decorationType } = pluginState;
  const filePath = editor.document.uri.fsPath;

  const decorations = highlighter.getDecorationsForFile(filePath);
  
  const vscodeDecorations: vscode.DecorationOptions[] = decorations.map(d => ({
    range: new vscode.Range(
      d.location.startLine - 1, // Convert to 0-indexed
      d.location.startColumn,
      d.location.endLine - 1,
      d.location.endColumn
    ),
    hoverMessage: d.hoverMessage,
  }));

  editor.setDecorations(decorationType, vscodeDecorations);
}

/**
 * Opens the suggestion panel
 */
function openSuggestionPanel(): void {
  if (!pluginState) return;

  const { suggestionPanel, suggestionEngine } = pluginState;
  
  // Update panel with current suggestions
  suggestionPanel.setSuggestions(suggestionEngine.getSuggestions());

  // Create webview panel
  const panel = vscode.window.createWebviewPanel(
    'dataMaskingSuggestions',
    'Data Masking Suggestions',
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
    }
  );

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
async function processSuggestionDecision(
  suggestionId: string,
  action: 'accept' | 'reject' | 'defer'
): Promise<void> {
  if (!pluginState) return;

  const { suggestionEngine, configManager, highlighter, tooltipProvider } = pluginState;

  const suggestion = suggestionEngine.getSuggestionById(suggestionId);
  if (!suggestion) return;

  // Process decision
  await suggestionEngine.processDecision(suggestionId, { action });

  // Record in config manager
  if (action === 'accept') {
    await configManager.addMaskedField(suggestion);
  } else if (action === 'reject') {
    await configManager.addRejectedField(suggestion);
  }

  // Record decision history
  configManager.recordDecision(suggestionId, suggestion, { action });

  // Update UI
  const allSuggestions = suggestionEngine.getSuggestions();
  highlighter.setSuggestions(allSuggestions);
  tooltipProvider.setSuggestions(allSuggestions);
  updateDecorations();

  vscode.window.showInformationMessage(
    `Suggestion ${action}ed: ${suggestion.field.name}`
  );
}

/**
 * Navigates to a suggestion's location
 */
function navigateToSuggestion(suggestionId: string): void {
  if (!pluginState) return;

  const suggestion = pluginState.suggestionEngine.getSuggestionById(suggestionId);
  if (!suggestion) return;

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
function getCurrentSuggestion(): Suggestion | null {
  if (!pluginState) return null;

  const editor = vscode.window.activeTextEditor;
  if (!editor) return null;

  const filePath = editor.document.uri.fsPath;
  const line = editor.selection.active.line + 1; // Convert to 1-indexed

  // Find the suggestion by matching the field location
  const suggestions = pluginState.suggestionEngine.getSuggestions({
    filePath,
  });

  return suggestions.find(s => 
    s.field.location.startLine <= line && 
    s.field.location.endLine >= line
  ) || null;
}

/**
 * Exports a report
 */
async function exportReport(): Promise<void> {
  if (!pluginState) return;

  const { reportGenerator, suggestionEngine } = pluginState;

  // Get format choice
  const format = await vscode.window.showQuickPick(
    ['JSON', 'CSV', 'Markdown'],
    { placeHolder: 'Select export format' }
  );

  if (!format) return;

  // Generate report
  reportGenerator.setSuggestions(suggestionEngine.getSuggestions());
  const report = await reportGenerator.generateReport();
  const exportFormat = format.toLowerCase() as 'json' | 'csv' | 'markdown';
  const content = reportGenerator.exportReport(report, exportFormat);

  // Get file extension
  const extensions: Record<string, string> = {
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
export function deactivate(): void {
  console.log('Data Masking Suggestion Plugin is now deactivated');
  pluginState = null;
}
