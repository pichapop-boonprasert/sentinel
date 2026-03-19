import { IFileNavigationHandler, IScanResultsAggregator } from '../scan-results/types';
import { InlineHighlighter } from '../ui/inline-highlighter';
/**
 * Handles file navigation from scan results.
 * Opens files, positions cursor at findings, and triggers highlighting.
 *
 * Implements IFileNavigationHandler interface.
 *
 * Validates: Requirements 2.1, 2.2, 2.3
 */
export declare class FileNavigationHandler implements IFileNavigationHandler {
    private aggregator;
    private highlighter;
    constructor(aggregator: IScanResultsAggregator, highlighter: InlineHighlighter);
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
    navigateToFile(filePath: string): Promise<void>;
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
    navigateToLine(filePath: string, lineNumber: number): Promise<void>;
    /**
     * Triggers highlighting for all findings in the specified file.
     * Uses the InlineHighlighter to apply visual decorations.
     *
     * @param filePath - Relative path to the file from workspace root
     *
     * Validates: Requirements 2.3
     */
    highlightFindings(filePath: string): void;
    /**
     * Finds the line number of the first finding (smallest line number).
     *
     * @param findings - Array of findings for a file
     * @returns The smallest line number among findings
     */
    private getFirstFindingLine;
    /**
     * Resolves a relative file path to a VS Code URI.
     *
     * @param filePath - Relative path from workspace root
     * @returns VS Code URI or undefined if no workspace is open
     */
    private resolveFileUri;
    /**
     * Handles file access errors with appropriate user feedback.
     *
     * @param error - The error that occurred
     * @param filePath - The file path that caused the error
     */
    private handleFileAccessError;
    /**
     * Handles navigation errors with appropriate user feedback.
     *
     * @param error - The error that occurred
     * @param filePath - The file path that caused the error
     */
    private handleNavigationError;
}
/**
 * Creates a new FileNavigationHandler instance.
 *
 * @param aggregator - The scan results aggregator for getting findings
 * @param highlighter - The inline highlighter for applying decorations
 * @returns A new FileNavigationHandler instance
 */
export declare function createFileNavigationHandler(aggregator: IScanResultsAggregator, highlighter: InlineHighlighter): FileNavigationHandler;
//# sourceMappingURL=file-navigation-handler.d.ts.map