/**
 * Scanner component for parsing source files and extracting field declarations.
 * Implements resilient scanning with graceful error handling.
 *
 * @module scanner/scanner
 */

import {
  IScanner,
  ScanResult,
  ScanOptions,
  ScanError,
  FieldDeclaration,
} from '../types';
import { isSupported, getLanguage } from './language-support';
import { getParser, ILanguageParser } from './parsers';

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
export const defaultLogger: IScannerLogger = {
  warn: (message, details) => console.warn(`[Scanner] ${message}`, details ?? ''),
  error: (message, details) => console.error(`[Scanner] ${message}`, details ?? ''),
  info: (message, details) => console.info(`[Scanner] ${message}`, details ?? ''),
};

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
export function createSyntaxError(
  filePath: string,
  message: string,
  line?: number
): ScanError {
  return {
    filePath,
    message,
    line,
    recoverable: true, // Syntax errors are recoverable - we can continue scanning other files
  };
}

/**
 * Creates a ScanError object for file not found errors
 */
export function createFileNotFoundError(filePath: string): ScanError {
  return {
    filePath,
    message: `File not found: ${filePath}`,
    recoverable: true, // Recoverable - remove from queue and continue
  };
}

/**
 * Creates a ScanError object for permission denied errors
 */
export function createPermissionDeniedError(filePath: string): ScanError {
  return {
    filePath,
    message: `Permission denied: ${filePath}`,
    recoverable: true, // Recoverable - skip file and continue
  };
}

/**
 * Creates a ScanError object for file too large errors
 */
export function createFileTooLargeError(
  filePath: string,
  actualSize: number,
  maxSize: number
): ScanError {
  return {
    filePath,
    message: `File too large: ${actualSize} bytes exceeds maximum ${maxSize} bytes`,
    recoverable: true, // Recoverable - skip file and continue
  };
}

/**
 * Creates a ScanError object for unsupported language errors
 */
export function createUnsupportedLanguageError(filePath: string): ScanError {
  return {
    filePath,
    message: `Unsupported file type: ${filePath}`,
    recoverable: true, // Recoverable - skip file silently
  };
}

/**
 * Determines if an error is a file not found error
 */
function isFileNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === 'ENOENT';
  }
  return false;
}

/**
 * Determines if an error is a permission denied error
 */
function isPermissionDeniedError(error: unknown): boolean {
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    return nodeError.code === 'EACCES' || nodeError.code === 'EPERM';
  }
  return false;
}

/**
 * Scanner implementation with resilient error handling.
 * Handles syntax errors, file access errors, and other issues gracefully.
 */
export class Scanner implements IScanner {
  private readonly logger: IScannerLogger;
  private readonly fileReader: IFileReader;
  private readonly defaultMaxFileSizeBytes: number = 1024 * 1024; // 1MB default
  private progressCallback: ScanProgressCallback | null = null;
  private cpuThrottleMs: number = 0; // Delay between files for CPU throttling
  private scanFrequencyMs: number = 0; // Minimum time between scans

  constructor(fileReader: IFileReader, logger: IScannerLogger = defaultLogger) {
    this.fileReader = fileReader;
    this.logger = logger;
  }

  /**
   * Sets the progress callback for workspace scanning.
   * @param callback - Function to call with progress updates
   */
  setProgressCallback(callback: ScanProgressCallback | null): void {
    this.progressCallback = callback;
  }

  /**
   * Configures CPU throttling for background scanning.
   * Higher values reduce CPU usage but increase scan time.
   * 
   * Validates: Requirements 8.3
   * 
   * @param maxCpuPercent - Maximum CPU percentage (1-100)
   */
  setCpuThrottle(maxCpuPercent: number): void {
    // Convert CPU percentage to delay between files
    // Lower CPU% = longer delay
    // 100% = no delay, 50% = 10ms delay, 25% = 30ms delay, etc.
    const clampedPercent = Math.max(1, Math.min(100, maxCpuPercent));
    this.cpuThrottleMs = Math.round((100 - clampedPercent) / 3);
  }

  /**
   * Gets the current CPU throttle delay in milliseconds.
   */
  getCpuThrottleMs(): number {
    return this.cpuThrottleMs;
  }

  /**
   * Sets the minimum time between scans.
   * 
   * Validates: Requirements 8.6
   * 
   * @param frequencyMs - Minimum milliseconds between scans
   */
  setScanFrequency(frequencyMs: number): void {
    this.scanFrequencyMs = Math.max(0, frequencyMs);
  }

  /**
   * Gets the current scan frequency in milliseconds.
   */
  getScanFrequency(): number {
    return this.scanFrequencyMs;
  }

  /**
   * Checks if a file type is supported for scanning
   */
  isSupported(filePath: string): boolean {
    return isSupported(filePath);
  }

  /**
   * Scans a single file and extracts field declarations.
   * Handles errors gracefully and returns them in the ScanResult.
   *
   * @param filePath - Path to the file to scan
   * @returns Promise resolving to ScanResult with fields and any errors
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = performance.now();
    const errors: ScanError[] = [];
    const fields: FieldDeclaration[] = [];

    try {
      // Check if file type is supported
      if (!this.isSupported(filePath)) {
        // Unsupported language - skip silently (no user feedback per design)
        return this.createScanResult(filePath, fields, [], startTime);
      }

      // Get the appropriate parser
      const language = getLanguage(filePath);
      if (!language) {
        return this.createScanResult(filePath, fields, [], startTime);
      }

      const parser = getParser(language);
      if (!parser) {
        const error = createUnsupportedLanguageError(filePath);
        return this.createScanResult(filePath, fields, [error], startTime);
      }

      // Read file content
      let sourceCode: string;
      try {
        sourceCode = await this.fileReader.readFile(filePath);
      } catch (readError) {
        const scanError = this.handleFileReadError(filePath, readError);
        return this.createScanResult(filePath, fields, [scanError], startTime);
      }

      // Parse the file
      const parseResult = this.parseWithErrorHandling(parser, sourceCode, filePath);
      
      // Collect fields and errors from parse result
      fields.push(...parseResult.fields);
      errors.push(...parseResult.errors);

      // Log any parse errors
      for (const error of parseResult.errors) {
        if (error.recoverable) {
          this.logger.warn(`Syntax error in ${filePath}`, {
            message: error.message,
            line: error.line,
          });
        } else {
          this.logger.error(`Parse error in ${filePath}`, {
            message: error.message,
            line: error.line,
          });
        }
      }

      return this.createScanResult(filePath, fields, errors, startTime);
    } catch (unexpectedError) {
      // Catch any unexpected errors and convert to ScanError
      const error = this.handleUnexpectedError(filePath, unexpectedError);
      this.logger.error(`Unexpected error scanning ${filePath}`, {
        message: error.message,
      });
      return this.createScanResult(filePath, fields, [error], startTime);
    }
  }

  /**
   * Scans all files in the workspace.
   * Yields results as they become available for streaming processing.
   * Supports on-demand scanning mode for large workspaces (1000+ files).
   *
   * @param options - Scan configuration options
   * @returns AsyncIterator for streaming results
   */
  async *scanWorkspace(options: ScanOptions): AsyncIterableIterator<ScanResult> {
    const {
      includePatterns,
      excludePatterns,
      maxFileSizeBytes,
      onDemand,
    } = options;

    // Discover all files matching the patterns
    let filePaths: string[];
    try {
      filePaths = await this.fileReader.listFiles(includePatterns, excludePatterns);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to list workspace files: ${message}`);
      return;
    }

    // Filter to only supported file types
    const supportedFiles = filePaths.filter(filePath => this.isSupported(filePath));
    const totalFiles = supportedFiles.length;

    if (totalFiles === 0) {
      this.logger.info('No supported files found in workspace');
      return;
    }

    this.logger.info(`Starting workspace scan`, { totalFiles, onDemand });

    // For on-demand mode with large workspaces, we still iterate but
    // the caller can choose to stop early or process lazily
    const isLargeWorkspace = totalFiles > 1000;
    if (isLargeWorkspace && !onDemand) {
      this.logger.info(`Large workspace detected (${totalFiles} files). Consider using on-demand scanning.`);
    }

    // Scan each file and yield results
    for (let i = 0; i < supportedFiles.length; i++) {
      const filePath = supportedFiles[i];

      // Report progress
      this.reportProgress({
        totalFiles,
        scannedFiles: i,
        currentFile: filePath,
        percentComplete: Math.round((i / totalFiles) * 100),
      });

      // Scan the file with size check
      const result = await this.scanFileWithSizeCheck(filePath, maxFileSizeBytes);
      yield result;

      // Apply CPU throttling if configured
      if (this.cpuThrottleMs > 0) {
        await this.throttle(this.cpuThrottleMs);
      }

      // In on-demand mode for large workspaces, yield control more frequently
      // to allow the consumer to process results without blocking
      if (onDemand && isLargeWorkspace && i % 10 === 0) {
        // Allow event loop to process other tasks
        await this.yieldControl();
      }
    }

    // Report completion
    this.reportProgress({
      totalFiles,
      scannedFiles: totalFiles,
      currentFile: '',
      percentComplete: 100,
    });

    this.logger.info(`Workspace scan complete`, { totalFiles, scannedFiles: totalFiles });
  }

  /**
   * Reports progress to the registered callback if one exists.
   */
  private reportProgress(progress: ScanProgress): void {
    if (this.progressCallback) {
      try {
        this.progressCallback(progress);
      } catch (error) {
        // Don't let progress callback errors interrupt scanning
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Progress callback error: ${message}`);
      }
    }
  }

  /**
   * Yields control to the event loop to prevent blocking.
   * Used in on-demand mode for large workspaces.
   */
  private yieldControl(): Promise<void> {
    return new Promise(resolve => setImmediate(resolve));
  }

  /**
   * Throttles execution by waiting for specified milliseconds.
   * Used for CPU usage control.
   * 
   * Validates: Requirements 8.3
   */
  private throttle(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scans a file with size checking.
   * Returns an error if the file exceeds the maximum size.
   *
   * @param filePath - Path to the file to scan
   * @param maxFileSizeBytes - Maximum allowed file size in bytes
   * @returns Promise resolving to ScanResult
   */
  async scanFileWithSizeCheck(
    filePath: string,
    maxFileSizeBytes: number = this.defaultMaxFileSizeBytes
  ): Promise<ScanResult> {
    const startTime = performance.now();

    try {
      // Check file size first
      const fileSize = await this.fileReader.getFileSize(filePath);
      if (fileSize > maxFileSizeBytes) {
        const error = createFileTooLargeError(filePath, fileSize, maxFileSizeBytes);
        this.logger.info(`Skipping large file: ${filePath}`, {
          size: fileSize,
          maxSize: maxFileSizeBytes,
        });
        return this.createScanResult(filePath, [], [error], startTime);
      }

      return this.scanFile(filePath);
    } catch (error) {
      const scanError = this.handleFileReadError(filePath, error);
      return this.createScanResult(filePath, [], [scanError], startTime);
    }
  }

  /**
   * Parses source code with error handling.
   * Catches parse exceptions and converts them to ScanErrors.
   */
  private parseWithErrorHandling(
    parser: ILanguageParser,
    sourceCode: string,
    filePath: string
  ): { fields: FieldDeclaration[]; errors: ScanError[] } {
    try {
      const result = parser.parse(sourceCode, filePath);
      return {
        fields: result.fields,
        errors: result.errors,
      };
    } catch (parseError) {
      // Parser threw an exception - create a syntax error
      const error = parseError as Error & { loc?: { line: number } };
      const scanError = createSyntaxError(
        filePath,
        `Parse error: ${error.message}`,
        error.loc?.line
      );
      return {
        fields: [],
        errors: [scanError],
      };
    }
  }

  /**
   * Handles file read errors and converts them to appropriate ScanErrors.
   */
  private handleFileReadError(filePath: string, error: unknown): ScanError {
    if (isFileNotFoundError(error)) {
      this.logger.error(`File not found: ${filePath}`);
      return createFileNotFoundError(filePath);
    }

    if (isPermissionDeniedError(error)) {
      this.logger.warn(`Permission denied: ${filePath}`);
      return createPermissionDeniedError(filePath);
    }

    // Generic file read error
    const message = error instanceof Error ? error.message : 'Unknown error reading file';
    return {
      filePath,
      message: `Error reading file: ${message}`,
      recoverable: true,
    };
  }

  /**
   * Handles unexpected errors during scanning.
   */
  private handleUnexpectedError(filePath: string, error: unknown): ScanError {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      filePath,
      message: `Unexpected error: ${message}`,
      recoverable: true,
    };
  }

  /**
   * Creates a ScanResult with calculated duration.
   */
  private createScanResult(
    filePath: string,
    fields: FieldDeclaration[],
    errors: ScanError[],
    startTime: number
  ): ScanResult {
    return {
      filePath,
      fields,
      errors,
      duration: performance.now() - startTime,
    };
  }
}

/**
 * Scans multiple files and collects all results.
 * Continues scanning even if some files have errors.
 *
 * @param scanner - The scanner instance to use
 * @param filePaths - Array of file paths to scan
 * @returns Promise resolving to array of ScanResults
 */
export async function scanMultipleFiles(
  scanner: Scanner,
  filePaths: string[]
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];

  for (const filePath of filePaths) {
    const result = await scanner.scanFile(filePath);
    results.push(result);
  }

  return results;
}

/**
 * Filters scan results to get only successful scans (no errors).
 */
export function getSuccessfulScans(results: ScanResult[]): ScanResult[] {
  return results.filter(result => result.errors.length === 0);
}

/**
 * Filters scan results to get only scans with errors.
 */
export function getFailedScans(results: ScanResult[]): ScanResult[] {
  return results.filter(result => result.errors.length > 0);
}

/**
 * Collects all errors from multiple scan results.
 */
export function collectAllErrors(results: ScanResult[]): ScanError[] {
  return results.flatMap(result => result.errors);
}

/**
 * Collects all fields from multiple scan results.
 */
export function collectAllFields(results: ScanResult[]): FieldDeclaration[] {
  return results.flatMap(result => result.fields);
}
