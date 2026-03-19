/**
 * Categories of sensitive data patterns
 */
export type MaskingPatternType = 'pii' | 'credentials' | 'financial' | 'health' | 'custom';
/**
 * Priority levels for suggestions
 */
export type Priority = 'high' | 'medium' | 'low';
/**
 * Status of a suggestion in its lifecycle
 */
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'deferred';
/**
 * Export format options for reports and configurations
 */
export type ExportFormat = 'json' | 'csv' | 'markdown';
/**
 * Plugin error codes for different error categories
 */
export declare enum PluginErrorCode {
    SCAN_SYNTAX_ERROR = 1001,
    SCAN_FILE_NOT_FOUND = 1002,
    SCAN_PERMISSION_DENIED = 1003,
    SCAN_FILE_TOO_LARGE = 1004,
    ANALYZE_PATTERN_INVALID = 2001,
    ANALYZE_SERVICE_UNAVAILABLE = 2002,
    ANALYZE_TIMEOUT = 2003,
    CONFIG_CORRUPTED = 3001,
    CONFIG_INVALID_JSON = 3002,
    CONFIG_SCHEMA_INVALID = 3003,
    CONFIG_PERMISSION_DENIED = 3004,
    REPORT_GENERATION_FAILED = 4001,
    REPORT_EXPORT_FAILED = 4002
}
/**
 * Represents a location within a source code file
 */
export interface CodeLocation {
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}
/**
 * Usage context for a field - where and how it's used in code
 */
export interface UsageContext {
    type: 'logging' | 'serialization' | 'api_response' | 'storage' | 'display' | 'other';
    location: CodeLocation;
    risk: 'high' | 'medium' | 'low';
}
/**
 * Context information surrounding a field declaration
 */
export interface FieldContext {
    surroundingCode: string;
    comments: string[];
    parentScope: string;
    usageContexts: UsageContext[];
}
/**
 * Represents a field/variable declaration extracted from source code
 */
export interface FieldDeclaration {
    name: string;
    type: string | null;
    location: CodeLocation;
    context: FieldContext;
}
/**
 * Error information from scanning operations
 */
export interface ScanError {
    filePath: string;
    message: string;
    line?: number;
    recoverable: boolean;
}
/**
 * Result of scanning a single file
 */
export interface ScanResult {
    filePath: string;
    fields: FieldDeclaration[];
    errors: ScanError[];
    duration: number;
}
/**
 * Options for configuring scan operations
 */
export interface ScanOptions {
    includePatterns: string[];
    excludePatterns: string[];
    maxFileSizeBytes: number;
    onDemand: boolean;
}
/**
 * Definition of a masking pattern for detecting sensitive data
 */
export interface MaskingPattern {
    id: string;
    name: string;
    type: MaskingPatternType;
    fieldNamePatterns: RegExp[];
    valuePatterns: RegExp[];
    contextIndicators: string[];
}
/**
 * Result of analyzing a field for sensitivity
 */
export interface AnalysisResult {
    field: FieldDeclaration;
    isSensitive: boolean;
    confidenceScore: number;
    detectedPatterns: MaskingPatternType[];
    reasoning: string;
    priority: Priority;
}
/**
 * User feedback for improving detection accuracy
 */
export interface UserFeedback {
    fieldName: string;
    expectedSensitive: boolean;
    actualSensitive: boolean;
    patternType: MaskingPatternType | null;
    context: string;
}
/**
 * Recommended action for masking a field
 */
export interface MaskingAction {
    type: 'mask' | 'encrypt' | 'redact' | 'hash';
    description: string;
}
/**
 * A suggestion for masking a sensitive field
 */
export interface Suggestion {
    id: string;
    field: FieldDeclaration;
    confidenceScore: number;
    patternType: MaskingPatternType;
    status: SuggestionStatus;
    recommendedAction: MaskingAction;
    createdAt: Date;
    reviewedAt: Date | null;
}
/**
 * Filter criteria for querying suggestions
 */
export interface SuggestionFilter {
    patternTypes?: MaskingPatternType[];
    minConfidence?: number;
    status?: SuggestionStatus[];
    filePath?: string;
}
/**
 * User decision on a suggestion
 */
export interface UserDecision {
    action: 'accept' | 'reject' | 'defer';
    applyToSimilar?: boolean;
    notes?: string;
}
/**
 * Input for adding a custom field to masking list
 */
export interface CustomFieldInput {
    fieldName: string;
    filePath: string;
    patternType: MaskingPatternType;
    notes?: string;
}
/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcuts {
    acceptSuggestion: string;
    rejectSuggestion: string;
    deferSuggestion: string;
    openPanel: string;
}
/**
 * Plugin settings configuration
 */
export interface PluginSettings {
    scanOnSave: boolean;
    scanOnOpen: boolean;
    maxCpuPercent: number;
    scanFrequencyMs: number;
    cacheEnabled: boolean;
    cacheTtlMs: number;
    onDemandThreshold: number;
    keyboardShortcuts: KeyboardShortcuts;
}
/**
 * Entry for a field that has been accepted for masking
 */
export interface MaskedFieldEntry {
    fieldName: string;
    filePath: string;
    patternType: MaskingPatternType;
    addedAt: Date;
    addedBy: string;
}
/**
 * Entry for a field that has been rejected from masking
 */
export interface RejectedFieldEntry {
    fieldName: string;
    filePath: string;
    reason: string;
    rejectedAt: Date;
}
/**
 * Complete masking configuration
 */
export interface MaskingConfiguration {
    version: string;
    maskedFields: MaskedFieldEntry[];
    rejectedFields: RejectedFieldEntry[];
    customPatterns: MaskingPattern[];
    settings: PluginSettings;
}
/**
 * Record of a user decision for audit purposes
 */
export interface DecisionRecord {
    suggestionId: string;
    fieldName: string;
    filePath: string;
    decision: UserDecision;
    timestamp: Date;
    userId: string;
}
/**
 * Filter for querying decision history
 */
export interface HistoryFilter {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    action?: 'accept' | 'reject' | 'defer';
    filePath?: string;
}
/**
 * Options for generating reports
 */
export interface ReportOptions {
    includePatterns?: MaskingPatternType[];
    minConfidence?: number;
    includeStatus?: SuggestionStatus[];
}
/**
 * A single finding in a report
 */
export interface ReportFinding {
    fieldName: string;
    filePath: string;
    lineNumber: number;
    patternType: MaskingPatternType;
    confidenceScore: number;
    status: SuggestionStatus;
}
/**
 * Summary statistics for a report
 */
export interface ReportSummary {
    totalFields: number;
    byPatternType: Record<MaskingPatternType, number>;
    byStatus: Record<SuggestionStatus, number>;
    averageConfidence: number;
}
/**
 * Complete report of findings
 */
export interface Report {
    generatedAt: Date;
    workspacePath: string;
    totalFiles: number;
    totalSuggestions: number;
    findings: ReportFinding[];
    summary: ReportSummary;
}
/**
 * A cached analysis result entry
 */
export interface CacheEntry {
    filePath: string;
    fileHash: string;
    analysisResults: AnalysisResult[];
    cachedAt: number;
    expiresAt: number;
}
/**
 * Analysis cache configuration and storage
 */
export interface AnalysisCache {
    entries: Map<string, CacheEntry>;
    maxSize: number;
    evictionPolicy: 'lru' | 'ttl';
}
/**
 * Plugin error with code and details
 */
export interface PluginError {
    code: PluginErrorCode;
    message: string;
    details?: Record<string, unknown>;
    recoverable: boolean;
}
/**
 * Scanner component interface for parsing source files
 */
export interface IScanner {
    /**
     * Scans a single file and extracts field declarations
     * @param filePath - Path to the file to scan
     * @returns Promise resolving to extracted fields
     */
    scanFile(filePath: string): Promise<ScanResult>;
    /**
     * Scans all files in the workspace
     * @param options - Scan configuration options
     * @returns AsyncIterator for streaming results
     */
    scanWorkspace(options: ScanOptions): AsyncIterableIterator<ScanResult>;
    /**
     * Checks if a file type is supported for scanning
     * @param filePath - Path to check
     */
    isSupported(filePath: string): boolean;
}
/**
 * Analyzer component interface for detecting sensitive fields
 */
export interface IAnalyzer {
    /**
     * Analyzes fields for sensitivity
     * @param fields - Fields to analyze
     * @returns Analyzed fields with confidence scores
     */
    analyze(fields: FieldDeclaration[]): Promise<AnalysisResult[]>;
    /**
     * Registers a custom masking pattern
     * @param pattern - Custom pattern definition
     */
    registerPattern(pattern: MaskingPattern): void;
    /**
     * Records user feedback to improve detection
     * @param feedback - User feedback on a suggestion
     */
    recordFeedback(feedback: UserFeedback): void;
}
/**
 * Suggestion Engine component interface for managing suggestions
 */
export interface ISuggestionEngine {
    /**
     * Gets all current suggestions or filtered suggestions
     * @param filter - Optional filter criteria
     */
    getSuggestions(filter?: SuggestionFilter): Suggestion[];
    /**
     * Processes a user decision on a suggestion
     * @param suggestionId - ID of the suggestion
     * @param decision - User's decision
     */
    processDecision(suggestionId: string, decision: UserDecision): Promise<void>;
    /**
     * Applies a decision to similar fields across workspace
     * @param suggestionId - ID of the original suggestion
     * @param decision - Decision to apply
     * @returns Number of similar fields updated
     */
    applyToSimilar(suggestionId: string, decision: UserDecision): Promise<number>;
    /**
     * Adds a custom field to the masking list
     * @param field - Custom field input
     */
    addCustomField(field: CustomFieldInput): Promise<Suggestion>;
}
/**
 * Configuration Manager component interface for persistence
 */
export interface IConfigurationManager {
    /**
     * Loads configuration from disk
     */
    load(): Promise<MaskingConfiguration>;
    /**
     * Saves current configuration to disk
     * @param config - Configuration to save
     */
    save(config: MaskingConfiguration): Promise<void>;
    /**
     * Exports configuration to specified format
     * @param format - Export format
     */
    export(format: ExportFormat): Promise<string>;
    /**
     * Imports configuration from file
     * @param filePath - Path to import from
     */
    import(filePath: string): Promise<MaskingConfiguration>;
    /**
     * Gets decision history for audit
     * @param filter - Optional filter criteria
     */
    getDecisionHistory(filter?: HistoryFilter): DecisionRecord[];
}
/**
 * Report Generator component interface for creating reports
 */
export interface IReportGenerator {
    /**
     * Generates a summary report of all findings
     * @param options - Report generation options
     */
    generateReport(options: ReportOptions): Promise<Report>;
    /**
     * Exports report to specified format
     * @param report - Report to export
     * @param format - Export format
     */
    exportReport(report: Report, format: ExportFormat): string;
    /**
     * Copies suggestion list to clipboard
     * @param suggestions - Suggestions to copy
     */
    copyToClipboard(suggestions: Suggestion[]): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map