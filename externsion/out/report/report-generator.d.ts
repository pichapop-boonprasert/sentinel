/**
 * Report Generator for creating and exporting masking reports
 *
 * Generates comprehensive reports of detected sensitive fields,
 * supports multiple export formats, and provides clipboard functionality.
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
import { IReportGenerator, Report, ReportOptions, Suggestion, ExportFormat } from '../types';
/**
 * Clipboard interface for abstraction (allows mocking in tests)
 */
export interface ClipboardService {
    writeText(text: string): Promise<void>;
}
/**
 * Default clipboard service - throws error as it needs to be provided by the IDE
 */
export declare const defaultClipboardService: ClipboardService;
/**
 * ReportGenerator class for creating and exporting masking reports
 */
export declare class ReportGenerator implements IReportGenerator {
    private suggestions;
    private workspacePath;
    private clipboardService;
    /**
     * Creates a new ReportGenerator
     * @param workspacePath - Path to the workspace root
     * @param clipboardService - Optional clipboard service for testing
     */
    constructor(workspacePath?: string, clipboardService?: ClipboardService);
    /**
     * Sets the suggestions to include in reports
     * @param suggestions - Array of suggestions
     */
    setSuggestions(suggestions: Suggestion[]): void;
    /**
     * Gets the current suggestions
     */
    getSuggestions(): Suggestion[];
    /**
     * Generates a summary report of all findings
     *
     * Validates: Requirements 9.1, 9.3, 9.4
     *
     * @param options - Report generation options for filtering
     * @returns Promise resolving to the generated report
     */
    generateReport(options?: ReportOptions): Promise<Report>;
    /**
     * Filters suggestions based on report options
     *
     * Validates: Requirements 9.4
     */
    private filterSuggestions;
    /**
     * Creates report findings from suggestions
     *
     * Validates: Requirements 9.3
     */
    private createFindings;
    /**
     * Calculates summary statistics for the report
     */
    private calculateSummary;
    /**
     * Exports report to specified format
     *
     * Validates: Requirements 9.2
     *
     * @param report - Report to export
     * @param format - Export format (json, csv, markdown)
     * @returns Formatted report string
     */
    exportReport(report: Report, format: ExportFormat): string;
    /**
     * Exports report to JSON format
     */
    private exportToJson;
    /**
     * Exports report to CSV format
     */
    private exportToCsv;
    /**
     * Escapes a value for CSV
     */
    private escapeCsv;
    /**
     * Exports report to Markdown format
     */
    private exportToMarkdown;
    /**
     * Copies suggestion list to clipboard
     *
     * Validates: Requirements 9.5
     *
     * @param suggestions - Suggestions to copy
     */
    copyToClipboard(suggestions: Suggestion[]): Promise<void>;
    /**
     * Formats suggestions as a simple text list (for clipboard or display)
     * @param suggestions - Suggestions to format
     * @returns Formatted text
     */
    formatSuggestionsAsText(suggestions: Suggestion[]): string;
}
/**
 * Creates a new ReportGenerator instance
 */
export declare function createReportGenerator(workspacePath?: string, clipboardService?: ClipboardService): ReportGenerator;
//# sourceMappingURL=report-generator.d.ts.map