"use strict";
/**
 * Scanner component for parsing source files and extracting field declarations.
 * Implements resilient scanning with graceful error handling.
 *
 * @module scanner/scanner
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scanner = exports.defaultLogger = void 0;
exports.createSyntaxError = createSyntaxError;
exports.createFileNotFoundError = createFileNotFoundError;
exports.createPermissionDeniedError = createPermissionDeniedError;
exports.createFileTooLargeError = createFileTooLargeError;
exports.createUnsupportedLanguageError = createUnsupportedLanguageError;
exports.scanMultipleFiles = scanMultipleFiles;
exports.getSuccessfulScans = getSuccessfulScans;
exports.getFailedScans = getFailedScans;
exports.collectAllErrors = collectAllErrors;
exports.collectAllFields = collectAllFields;
const language_support_1 = require("./language-support");
const parsers_1 = require("./parsers");
/**
 * Default console logger implementation
 */
exports.defaultLogger = {
    warn: (message, details) => console.warn(`[Scanner] ${message}`, details ?? ''),
    error: (message, details) => console.error(`[Scanner] ${message}`, details ?? ''),
    info: (message, details) => console.info(`[Scanner] ${message}`, details ?? ''),
};
/**
 * Creates a ScanError object for syntax errors
 */
function createSyntaxError(filePath, message, line) {
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
function createFileNotFoundError(filePath) {
    return {
        filePath,
        message: `File not found: ${filePath}`,
        recoverable: true, // Recoverable - remove from queue and continue
    };
}
/**
 * Creates a ScanError object for permission denied errors
 */
function createPermissionDeniedError(filePath) {
    return {
        filePath,
        message: `Permission denied: ${filePath}`,
        recoverable: true, // Recoverable - skip file and continue
    };
}
/**
 * Creates a ScanError object for file too large errors
 */
function createFileTooLargeError(filePath, actualSize, maxSize) {
    return {
        filePath,
        message: `File too large: ${actualSize} bytes exceeds maximum ${maxSize} bytes`,
        recoverable: true, // Recoverable - skip file and continue
    };
}
/**
 * Creates a ScanError object for unsupported language errors
 */
function createUnsupportedLanguageError(filePath) {
    return {
        filePath,
        message: `Unsupported file type: ${filePath}`,
        recoverable: true, // Recoverable - skip file silently
    };
}
/**
 * Determines if an error is a file not found error
 */
function isFileNotFoundError(error) {
    if (error instanceof Error) {
        const nodeError = error;
        return nodeError.code === 'ENOENT';
    }
    return false;
}
/**
 * Determines if an error is a permission denied error
 */
function isPermissionDeniedError(error) {
    if (error instanceof Error) {
        const nodeError = error;
        return nodeError.code === 'EACCES' || nodeError.code === 'EPERM';
    }
    return false;
}
/**
 * Scanner implementation with resilient error handling.
 * Handles syntax errors, file access errors, and other issues gracefully.
 */
class Scanner {
    logger;
    fileReader;
    defaultMaxFileSizeBytes = 1024 * 1024; // 1MB default
    progressCallback = null;
    cpuThrottleMs = 0; // Delay between files for CPU throttling
    scanFrequencyMs = 0; // Minimum time between scans
    constructor(fileReader, logger = exports.defaultLogger) {
        this.fileReader = fileReader;
        this.logger = logger;
    }
    /**
     * Sets the progress callback for workspace scanning.
     * @param callback - Function to call with progress updates
     */
    setProgressCallback(callback) {
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
    setCpuThrottle(maxCpuPercent) {
        // Convert CPU percentage to delay between files
        // Lower CPU% = longer delay
        // 100% = no delay, 50% = 10ms delay, 25% = 30ms delay, etc.
        const clampedPercent = Math.max(1, Math.min(100, maxCpuPercent));
        this.cpuThrottleMs = Math.round((100 - clampedPercent) / 3);
    }
    /**
     * Gets the current CPU throttle delay in milliseconds.
     */
    getCpuThrottleMs() {
        return this.cpuThrottleMs;
    }
    /**
     * Sets the minimum time between scans.
     *
     * Validates: Requirements 8.6
     *
     * @param frequencyMs - Minimum milliseconds between scans
     */
    setScanFrequency(frequencyMs) {
        this.scanFrequencyMs = Math.max(0, frequencyMs);
    }
    /**
     * Gets the current scan frequency in milliseconds.
     */
    getScanFrequency() {
        return this.scanFrequencyMs;
    }
    /**
     * Checks if a file type is supported for scanning
     */
    isSupported(filePath) {
        return (0, language_support_1.isSupported)(filePath);
    }
    /**
     * Scans a single file and extracts field declarations.
     * Handles errors gracefully and returns them in the ScanResult.
     *
     * @param filePath - Path to the file to scan
     * @returns Promise resolving to ScanResult with fields and any errors
     */
    async scanFile(filePath) {
        const startTime = performance.now();
        const errors = [];
        const fields = [];
        try {
            // Check if file type is supported
            if (!this.isSupported(filePath)) {
                // Unsupported language - skip silently (no user feedback per design)
                return this.createScanResult(filePath, fields, [], startTime);
            }
            // Get the appropriate parser
            const language = (0, language_support_1.getLanguage)(filePath);
            if (!language) {
                return this.createScanResult(filePath, fields, [], startTime);
            }
            const parser = (0, parsers_1.getParser)(language);
            if (!parser) {
                const error = createUnsupportedLanguageError(filePath);
                return this.createScanResult(filePath, fields, [error], startTime);
            }
            // Read file content
            let sourceCode;
            try {
                sourceCode = await this.fileReader.readFile(filePath);
            }
            catch (readError) {
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
                }
                else {
                    this.logger.error(`Parse error in ${filePath}`, {
                        message: error.message,
                        line: error.line,
                    });
                }
            }
            return this.createScanResult(filePath, fields, errors, startTime);
        }
        catch (unexpectedError) {
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
    async *scanWorkspace(options) {
        const { includePatterns, excludePatterns, maxFileSizeBytes, onDemand, } = options;
        // Discover all files matching the patterns
        let filePaths;
        try {
            filePaths = await this.fileReader.listFiles(includePatterns, excludePatterns);
        }
        catch (error) {
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
    reportProgress(progress) {
        if (this.progressCallback) {
            try {
                this.progressCallback(progress);
            }
            catch (error) {
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
    yieldControl() {
        return new Promise(resolve => setImmediate(resolve));
    }
    /**
     * Throttles execution by waiting for specified milliseconds.
     * Used for CPU usage control.
     *
     * Validates: Requirements 8.3
     */
    throttle(ms) {
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
    async scanFileWithSizeCheck(filePath, maxFileSizeBytes = this.defaultMaxFileSizeBytes) {
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
        }
        catch (error) {
            const scanError = this.handleFileReadError(filePath, error);
            return this.createScanResult(filePath, [], [scanError], startTime);
        }
    }
    /**
     * Parses source code with error handling.
     * Catches parse exceptions and converts them to ScanErrors.
     */
    parseWithErrorHandling(parser, sourceCode, filePath) {
        try {
            const result = parser.parse(sourceCode, filePath);
            return {
                fields: result.fields,
                errors: result.errors,
            };
        }
        catch (parseError) {
            // Parser threw an exception - create a syntax error
            const error = parseError;
            const scanError = createSyntaxError(filePath, `Parse error: ${error.message}`, error.loc?.line);
            return {
                fields: [],
                errors: [scanError],
            };
        }
    }
    /**
     * Handles file read errors and converts them to appropriate ScanErrors.
     */
    handleFileReadError(filePath, error) {
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
    handleUnexpectedError(filePath, error) {
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
    createScanResult(filePath, fields, errors, startTime) {
        return {
            filePath,
            fields,
            errors,
            duration: performance.now() - startTime,
        };
    }
}
exports.Scanner = Scanner;
/**
 * Scans multiple files and collects all results.
 * Continues scanning even if some files have errors.
 *
 * @param scanner - The scanner instance to use
 * @param filePaths - Array of file paths to scan
 * @returns Promise resolving to array of ScanResults
 */
async function scanMultipleFiles(scanner, filePaths) {
    const results = [];
    for (const filePath of filePaths) {
        const result = await scanner.scanFile(filePath);
        results.push(result);
    }
    return results;
}
/**
 * Filters scan results to get only successful scans (no errors).
 */
function getSuccessfulScans(results) {
    return results.filter(result => result.errors.length === 0);
}
/**
 * Filters scan results to get only scans with errors.
 */
function getFailedScans(results) {
    return results.filter(result => result.errors.length > 0);
}
/**
 * Collects all errors from multiple scan results.
 */
function collectAllErrors(results) {
    return results.flatMap(result => result.errors);
}
/**
 * Collects all fields from multiple scan results.
 */
function collectAllFields(results) {
    return results.flatMap(result => result.fields);
}
//# sourceMappingURL=scanner.js.map