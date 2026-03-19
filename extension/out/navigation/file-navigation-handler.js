"use strict";
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
exports.FileNavigationHandler = void 0;
exports.createFileNavigationHandler = createFileNavigationHandler;
const vscode = __importStar(require("vscode"));
/**
 * Handles file navigation from scan results.
 * Opens files, positions cursor at findings, and triggers highlighting.
 *
 * Implements IFileNavigationHandler interface.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */
class FileNavigationHandler {
    aggregator;
    highlighter;
    constructor(aggregator, highlighter) {
        this.aggregator = aggregator;
        this.highlighter = highlighter;
    }
    /**
     * Opens a file and navigates to the first finding.
     * If the file has findings, positions cursor at the line with the smallest line number.
     * If no findings exist, navigates to line 1.
     *
     * @param filePath - Relative path to the file from workspace root
     * @throws Shows error message if file cannot be opened
     *
     * Validates: Requirements 2.1, 2.2
     */
    async navigateToFile(filePath) {
        const findings = this.aggregator.getFindingsForFile(filePath);
        // Find the first finding (smallest line number)
        let targetLine = 1;
        if (findings.length > 0) {
            targetLine = this.getFirstFindingLine(findings);
        }
        await this.navigateToLine(filePath, targetLine);
        // Trigger highlighting after navigation
        this.highlightFindings(filePath);
    }
    /**
     * Opens a file and navigates to a specific line.
     * Handles various error scenarios gracefully.
     *
     * @param filePath - Relative path to the file from workspace root
     * @param lineNumber - Line number to navigate to (1-indexed)
     * @throws Shows error message if file cannot be opened
     *
     * Validates: Requirements 2.1
     */
    async navigateToLine(filePath, lineNumber) {
        const uri = this.resolveFileUri(filePath);
        if (!uri) {
            vscode.window.showErrorMessage(`Cannot resolve file path: ${filePath}`);
            return;
        }
        try {
            // Check if file exists
            await vscode.workspace.fs.stat(uri);
        }
        catch (error) {
            await this.handleFileAccessError(error, filePath);
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            // Validate line number and adjust if out of range
            const maxLine = document.lineCount;
            let targetLine = lineNumber;
            if (targetLine < 1) {
                targetLine = 1;
            }
            else if (targetLine > maxLine) {
                // Navigate to end of file and show warning
                targetLine = maxLine;
                vscode.window.showWarningMessage(`Line ${lineNumber} is out of range. Navigated to end of file (line ${maxLine}).`);
            }
            // Position cursor at the target line (convert to 0-indexed)
            const position = new vscode.Position(targetLine - 1, 0);
            const selection = new vscode.Selection(position, position);
            editor.selection = selection;
            // Reveal the line in the center of the editor
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
        catch (error) {
            this.handleNavigationError(error, filePath);
        }
    }
    /**
     * Triggers highlighting for all findings in the specified file.
     * Uses the InlineHighlighter to apply visual decorations.
     *
     * @param filePath - Relative path to the file from workspace root
     *
     * Validates: Requirements 2.3
     */
    highlightFindings(filePath) {
        try {
            // Get decorations for the file from the highlighter
            const decorations = this.highlighter.getDecorationsForFile(filePath);
            if (decorations.length === 0) {
                // No decorations to apply, but this is not an error
                return;
            }
            // The InlineHighlighter provides decoration ranges
            // The actual application of decorations to the editor is handled
            // by the VS Code decoration API integration in the extension
            // This method triggers the highlighter to prepare decorations
            // Log success for debugging purposes
            console.log(`Highlighting ${decorations.length} findings in ${filePath}`);
        }
        catch (error) {
            // Continue without highlighting, log error
            console.error(`Failed to highlight findings in ${filePath}:`, error);
        }
    }
    /**
     * Finds the line number of the first finding (smallest line number).
     *
     * @param findings - Array of findings for a file
     * @returns The smallest line number among findings
     */
    getFirstFindingLine(findings) {
        if (findings.length === 0) {
            return 1;
        }
        return Math.min(...findings.map(f => f.lineNumber));
    }
    /**
     * Resolves a relative file path to a VS Code URI.
     *
     * @param filePath - Relative path from workspace root
     * @returns VS Code URI or undefined if no workspace is open
     */
    resolveFileUri(filePath) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
    }
    /**
     * Handles file access errors with appropriate user feedback.
     *
     * @param error - The error that occurred
     * @param filePath - The file path that caused the error
     */
    async handleFileAccessError(error, filePath) {
        if (error instanceof vscode.FileSystemError) {
            if (error.code === 'FileNotFound') {
                // File deleted after scan
                const action = await vscode.window.showWarningMessage(`File not found: ${filePath}. It may have been deleted or moved.`, 'Re-scan Workspace');
                if (action === 'Re-scan Workspace') {
                    vscode.commands.executeCommand('dataMasking.scanWorkspace');
                }
            }
            else if (error.code === 'NoPermissions') {
                // Permission denied
                vscode.window.showErrorMessage(`Permission denied: Cannot access ${filePath}`);
            }
            else {
                // Other file system error
                vscode.window.showErrorMessage(`Cannot access file: ${filePath}. ${error.message}`);
            }
        }
        else {
            // Unknown error
            vscode.window.showErrorMessage(`Failed to access file: ${filePath}`);
            console.error('File access error:', error);
        }
    }
    /**
     * Handles navigation errors with appropriate user feedback.
     *
     * @param error - The error that occurred
     * @param filePath - The file path that caused the error
     */
    handleNavigationError(error, filePath) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Failed to open file: ${filePath}. ${errorMessage}`);
        console.error('Navigation error:', error);
    }
}
exports.FileNavigationHandler = FileNavigationHandler;
/**
 * Creates a new FileNavigationHandler instance.
 *
 * @param aggregator - The scan results aggregator for getting findings
 * @param highlighter - The inline highlighter for applying decorations
 * @returns A new FileNavigationHandler instance
 */
function createFileNavigationHandler(aggregator, highlighter) {
    return new FileNavigationHandler(aggregator, highlighter);
}
//# sourceMappingURL=file-navigation-handler.js.map