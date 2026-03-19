/**
 * Scanner component for parsing source files and extracting field declarations.
 * Implements resilient scanning with graceful error handling.
 *
 * @module scanner/scanner
 */
import { IScanner, ScanResult, ScanOptions, ScanError, FieldDeclaration } from '../types';
/**
 * Logger interface for scan error reporting
 */
export interface IScannerLogger {
    warn(message: string, details?: Record<string, unknown>): void;
    error(message: string, details?: Record<string, unknown>): void;
    info(message: string, details?: Record<string, unknown>): void;
}
/**
 * Default console logger implementation
 */
export declare const defaultLogger: IScannerLogger;
/**
 * File reader interface for abstracting file system access
 */
export interface IFileReader {
    readFile(filePath: string): Promise<string>;
    exists(filePath: string): Promise<boolean>;
    getFileSize(filePath: string): Promise<number>;
    /**
     * Lists all files in the workspace matching the given patterns.
     * @param includePatterns - Glob patterns for files to include (e.g., ['**\/*.ts', '**\/*.js'])
     * @param excludePatterns - Glob patterns for files to exclude (e.g., ['node_modules/**'])
     * @returns Promise resolving to array of file paths
     */
    listFiles(includePatterns: string[], excludePatterns: string[]): Promise<string[]>;
}
/**
 * Progress information for workspace scanning
 */
export interface ScanProgress {
    /** Total number of files to scan */
    totalFiles: number;
    /** Number of files scanned so far */
    scannedFiles: number;
    /** Current file being scanned */
    currentFile: string;
    /** Percentage complete (0-100) */
    percentComplete: number;
}
/**
 * Callback for reporting scan progress
 */
export type ScanProgressCallback = (progress: ScanProgress) => void;
/**
 * Creates a ScanError object for syntax errors
 */
export declare function createSyntaxError(filePath: string, message: string, line?: number): ScanError;
/**
 * Creates a ScanError object for file not found errors
 */
export declare function createFileNotFoundError(filePath: string): ScanError;
/**
 * Creates a ScanError object for permission denied errors
 */
export declare function createPermissionDeniedError(filePath: string): ScanError;
/**
 * Creates a ScanError object for file too large errors
 */
export declare function createFileTooLargeError(filePath: string, actualSize: number, maxSize: number): ScanError;
/**
 * Creates a ScanError object for unsupported language errors
 */
export declare function createUnsupportedLanguageError(filePath: string): ScanError;
/**
 * Scanner implementation with resilient error handling.
 * Handles syntax errors, file access errors, and other issues gracefully.
 */
export declare class Scanner implements IScanner {
    private readonly logger;
    private readonly fileReader;
    private readonly defaultMaxFileSizeBytes;
    private progressCallback;
    private cpuThrottleMs;
    private scanFrequencyMs;
    constructor(fileReader: IFileReader, logger?: IScannerLogger);
    /**
     * Sets the progress callback for workspace scanning.
     * @param callback - Function to call with progress updates
     */
    setProgressCallback(callback: ScanProgressCallback | null): void;
    /**
     * Configures CPU throttling for background scanning.
     * Higher values reduce CPU usage but increase scan time.
     *
     * Validates: Requirements 8.3
     *
     * @param maxCpuPercent - Maximum CPU percentage (1-100)
     */
    setCpuThrottle(maxCpuPercent: number): void;
    /**
     * Gets the current CPU throttle delay in milliseconds.
     */
    getCpuThrottleMs(): number;
    /**
     * Sets the minimum time between scans.
     *
     * Validates: Requirements 8.6
     *
     * @param frequencyMs - Minimum milliseconds between scans
     */
    setScanFrequency(frequencyMs: number): void;
    /**
     * Gets the current scan frequency in milliseconds.
     */
    getScanFrequency(): number;
    /**
     * Checks if a file type is supported for scanning
     */
    isSupported(filePath: string): boolean;
    /**
     * Scans a single file and extracts field declarations.
     * Handles errors gracefully and returns them in the ScanResult.
     *
     * @param filePath - Path to the file to scan
     * @returns Promise resolving to ScanResult with fields and any errors
     */
    scanFile(filePath: string): Promise<ScanResult>;
    /**
     * Scans all files in the workspace.
     * Yields results as they become available for streaming processing.
     * Supports on-demand scanning mode for large workspaces (1000+ files).
     *
     * @param options - Scan configuration options
     * @returns AsyncIterator for streaming results
     */
    scanWorkspace(options: ScanOptions): AsyncIterableIterator<ScanResult>;
    /**
     * Reports progress to the registered callback if one exists.
     */
    private reportProgress;
    /**
     * Yields control to the event loop to prevent blocking.
     * Used in on-demand mode for large workspaces.
     */
    private yieldControl;
    /**
     * Throttles execution by waiting for specified milliseconds.
     * Used for CPU usage control.
     *
     * Validates: Requirements 8.3
     */
    private throttle;
    /**
     * Scans a file with size checking.
     * Returns an error if the file exceeds the maximum size.
     *
     * @param filePath - Path to the file to scan
     * @param maxFileSizeBytes - Maximum allowed file size in bytes
     * @returns Promise resolving to ScanResult
     */
    scanFileWithSizeCheck(filePath: string, maxFileSizeBytes?: number): Promise<ScanResult>;
    /**
     * Parses source code with error handling.
     * Catches parse exceptions and converts them to ScanErrors.
     */
    private parseWithErrorHandling;
    /**
     * Handles file read errors and converts them to appropriate ScanErrors.
     */
    private handleFileReadError;
    /**
     * Handles unexpected errors during scanning.
     */
    private handleUnexpectedError;
    /**
     * Creates a ScanResult with calculated duration.
     */
    private createScanResult;
}
/**
 * Scans multiple files and collects all results.
 * Continues scanning even if some files have errors.
 *
 * @param scanner - The scanner instance to use
 * @param filePaths - Array of file paths to scan
 * @returns Promise resolving to array of ScanResults
 */
export declare function scanMultipleFiles(scanner: Scanner, filePaths: string[]): Promise<ScanResult[]>;
/**
 * Filters scan results to get only successful scans (no errors).
 */
export declare function getSuccessfulScans(results: ScanResult[]): ScanResult[];
/**
 * Filters scan results to get only scans with errors.
 */
export declare function getFailedScans(results: ScanResult[]): ScanResult[];
/**
 * Collects all errors from multiple scan results.
 */
export declare function collectAllErrors(results: ScanResult[]): ScanError[];
/**
 * Collects all fields from multiple scan results.
 */
export declare function collectAllFields(results: ScanResult[]): FieldDeclaration[];
//# sourceMappingURL=scanner.d.ts.map