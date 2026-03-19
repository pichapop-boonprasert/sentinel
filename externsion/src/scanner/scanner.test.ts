/**
 * Tests for Scanner component error handling and resilience.
 *
 * @module scanner/scanner.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Scanner,
  IScannerLogger,
  IFileReader,
  ScanProgress,
  ScanProgressCallback,
  createSyntaxError,
  createFileNotFoundError,
  createPermissionDeniedError,
  createFileTooLargeError,
  createUnsupportedLanguageError,
  scanMultipleFiles,
  getSuccessfulScans,
  getFailedScans,
  collectAllErrors,
  collectAllFields,
} from './scanner';
import { ScanOptions, ScanResult } from '../types';

// Mock logger for testing
function createMockLogger(): IScannerLogger & {
  warnCalls: Array<{ message: string; details?: Record<string, unknown> }>;
  errorCalls: Array<{ message: string; details?: Record<string, unknown> }>;
  infoCalls: Array<{ message: string; details?: Record<string, unknown> }>;
} {
  const logger = {
    warnCalls: [] as Array<{ message: string; details?: Record<string, unknown> }>,
    errorCalls: [] as Array<{ message: string; details?: Record<string, unknown> }>,
    infoCalls: [] as Array<{ message: string; details?: Record<string, unknown> }>,
    warn(message: string, details?: Record<string, unknown>) {
      this.warnCalls.push({ message, details });
    },
    error(message: string, details?: Record<string, unknown>) {
      this.errorCalls.push({ message, details });
    },
    info(message: string, details?: Record<string, unknown>) {
      this.infoCalls.push({ message, details });
    },
  };
  return logger;
}

// Mock file reader for testing
function createMockFileReader(
  files: Map<string, string>,
  fileSizes?: Map<string, number>
): IFileReader {
  return {
    async readFile(filePath: string): Promise<string> {
      const content = files.get(filePath);
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return content;
    },
    async exists(filePath: string): Promise<boolean> {
      return files.has(filePath);
    },
    async getFileSize(filePath: string): Promise<number> {
      if (fileSizes?.has(filePath)) {
        return fileSizes.get(filePath)!;
      }
      const content = files.get(filePath);
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, stat '${filePath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return content.length;
    },
    async listFiles(_includePatterns: string[], _excludePatterns: string[]): Promise<string[]> {
      // Return all file paths from the map
      return Array.from(files.keys());
    },
  };
}

// Mock file reader with custom listFiles behavior
function createMockFileReaderWithListFiles(
  files: Map<string, string>,
  listFilesResult: string[] | Error,
  fileSizes?: Map<string, number>
): IFileReader {
  return {
    async readFile(filePath: string): Promise<string> {
      const content = files.get(filePath);
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return content;
    },
    async exists(filePath: string): Promise<boolean> {
      return files.has(filePath);
    },
    async getFileSize(filePath: string): Promise<number> {
      if (fileSizes?.has(filePath)) {
        return fileSizes.get(filePath)!;
      }
      const content = files.get(filePath);
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, stat '${filePath}'`) as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      }
      return content.length;
    },
    async listFiles(_includePatterns: string[], _excludePatterns: string[]): Promise<string[]> {
      if (listFilesResult instanceof Error) {
        throw listFilesResult;
      }
      return listFilesResult;
    },
  };
}

describe('ScanError creation utilities', () => {
  describe('createSyntaxError', () => {
    it('should create a recoverable syntax error with file path and message', () => {
      const error = createSyntaxError('test.ts', 'Unexpected token');
      
      expect(error.filePath).toBe('test.ts');
      expect(error.message).toBe('Unexpected token');
      expect(error.recoverable).toBe(true);
      expect(error.line).toBeUndefined();
    });

    it('should include line number when provided', () => {
      const error = createSyntaxError('test.ts', 'Unexpected token', 42);
      
      expect(error.line).toBe(42);
    });
  });

  describe('createFileNotFoundError', () => {
    it('should create a recoverable file not found error', () => {
      const error = createFileNotFoundError('/path/to/missing.ts');
      
      expect(error.filePath).toBe('/path/to/missing.ts');
      expect(error.message).toContain('File not found');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('createPermissionDeniedError', () => {
    it('should create a recoverable permission denied error', () => {
      const error = createPermissionDeniedError('/protected/file.ts');
      
      expect(error.filePath).toBe('/protected/file.ts');
      expect(error.message).toContain('Permission denied');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('createFileTooLargeError', () => {
    it('should create a recoverable file too large error with size info', () => {
      const error = createFileTooLargeError('large.ts', 2000000, 1000000);
      
      expect(error.filePath).toBe('large.ts');
      expect(error.message).toContain('2000000');
      expect(error.message).toContain('1000000');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('createUnsupportedLanguageError', () => {
    it('should create a recoverable unsupported language error', () => {
      const error = createUnsupportedLanguageError('styles.css');
      
      expect(error.filePath).toBe('styles.css');
      expect(error.message).toContain('Unsupported');
      expect(error.recoverable).toBe(true);
    });
  });
});

describe('Scanner', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let files: Map<string, string>;
  let scanner: Scanner;

  beforeEach(() => {
    mockLogger = createMockLogger();
    files = new Map();
  });

  describe('isSupported', () => {
    it('should return true for supported file types', () => {
      scanner = new Scanner(createMockFileReader(files), mockLogger);
      
      expect(scanner.isSupported('test.ts')).toBe(true);
      expect(scanner.isSupported('test.js')).toBe(true);
      expect(scanner.isSupported('test.py')).toBe(true);
      expect(scanner.isSupported('test.java')).toBe(true);
      expect(scanner.isSupported('test.json')).toBe(true);
    });

    it('should return false for unsupported file types', () => {
      scanner = new Scanner(createMockFileReader(files), mockLogger);
      
      expect(scanner.isSupported('test.css')).toBe(false);
      expect(scanner.isSupported('test.html')).toBe(false);
      expect(scanner.isSupported('test.md')).toBe(false);
    });
  });

  describe('scanFile - successful parsing', () => {
    it('should scan a valid TypeScript file and extract fields', async () => {
      files.set('test.ts', 'const userName: string = "test";');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('test.ts');

      expect(result.filePath).toBe('test.ts');
      expect(result.errors).toHaveLength(0);
      expect(result.fields.length).toBeGreaterThan(0);
      expect(result.fields.some(f => f.name === 'userName')).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should scan a valid JavaScript file', async () => {
      files.set('test.js', 'const password = "secret123";');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('test.js');

      expect(result.errors).toHaveLength(0);
      expect(result.fields.some(f => f.name === 'password')).toBe(true);
    });

    it('should scan a valid Python file', async () => {
      files.set('test.py', 'email_address = "test@example.com"');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('test.py');

      expect(result.errors).toHaveLength(0);
      expect(result.fields.some(f => f.name === 'email_address')).toBe(true);
    });

    it('should scan a valid JSON file', async () => {
      files.set('config.json', '{"apiKey": "abc123", "database": {"host": "localhost"}}');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('config.json');

      expect(result.errors).toHaveLength(0);
      expect(result.fields.some(f => f.name === 'apiKey')).toBe(true);
    });
  });

  describe('scanFile - syntax error handling', () => {
    it('should handle syntax errors gracefully and return error in result', async () => {
      // Invalid TypeScript with syntax error
      files.set('broken.ts', 'const x = {{{');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('broken.ts');

      expect(result.filePath).toBe('broken.ts');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].recoverable).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should log syntax errors as warnings', async () => {
      files.set('broken.ts', 'const x = {{{');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      await scanner.scanFile('broken.ts');

      // Should have logged a warning for the syntax error
      expect(mockLogger.warnCalls.length + mockLogger.errorCalls.length).toBeGreaterThan(0);
    });

    it('should continue scanning after syntax error', async () => {
      files.set('broken.ts', 'const x = {{{');
      files.set('valid.ts', 'const y = 42;');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const brokenResult = await scanner.scanFile('broken.ts');
      const validResult = await scanner.scanFile('valid.ts');

      // Broken file should have errors
      expect(brokenResult.errors.length).toBeGreaterThan(0);
      
      // Valid file should parse successfully
      expect(validResult.errors).toHaveLength(0);
      expect(validResult.fields.some(f => f.name === 'y')).toBe(true);
    });
  });

  describe('scanFile - file not found handling', () => {
    it('should handle file not found errors gracefully', async () => {
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('nonexistent.ts');

      expect(result.filePath).toBe('nonexistent.ts');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('File not found');
      expect(result.errors[0].recoverable).toBe(true);
    });

    it('should log file not found errors', async () => {
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      await scanner.scanFile('nonexistent.ts');

      expect(mockLogger.errorCalls.some(c => c.message.includes('File not found'))).toBe(true);
    });
  });

  describe('scanFile - permission denied handling', () => {
    it('should handle permission denied errors gracefully', async () => {
      const mockReader: IFileReader = {
        async readFile(filePath: string): Promise<string> {
          const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
          error.code = 'EACCES';
          throw error;
        },
        async exists(): Promise<boolean> {
          return true;
        },
        async getFileSize(): Promise<number> {
          return 100;
        },
        async listFiles(): Promise<string[]> {
          return [];
        },
      };
      scanner = new Scanner(mockReader, mockLogger);

      const result = await scanner.scanFile('protected.ts');

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Permission denied');
      expect(result.errors[0].recoverable).toBe(true);
    });

    it('should log permission denied as warning', async () => {
      const mockReader: IFileReader = {
        async readFile(): Promise<string> {
          const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
          error.code = 'EACCES';
          throw error;
        },
        async exists(): Promise<boolean> {
          return true;
        },
        async getFileSize(): Promise<number> {
          return 100;
        },
        async listFiles(): Promise<string[]> {
          return [];
        },
      };
      scanner = new Scanner(mockReader, mockLogger);

      await scanner.scanFile('protected.ts');

      expect(mockLogger.warnCalls.some(c => c.message.includes('Permission denied'))).toBe(true);
    });
  });

  describe('scanFile - unsupported file types', () => {
    it('should skip unsupported file types silently', async () => {
      files.set('styles.css', 'body { color: red; }');
      scanner = new Scanner(createMockFileReader(files), mockLogger);

      const result = await scanner.scanFile('styles.css');

      expect(result.filePath).toBe('styles.css');
      expect(result.fields).toHaveLength(0);
      expect(result.errors).toHaveLength(0); // No error for unsupported - just skip
    });
  });

  describe('scanFileWithSizeCheck', () => {
    it('should scan files within size limit', async () => {
      files.set('small.ts', 'const x = 1;');
      const fileSizes = new Map([['small.ts', 100]]);
      scanner = new Scanner(createMockFileReader(files, fileSizes), mockLogger);

      const result = await scanner.scanFileWithSizeCheck('small.ts', 1000);

      expect(result.errors).toHaveLength(0);
      expect(result.fields.length).toBeGreaterThan(0);
    });

    it('should skip files exceeding size limit', async () => {
      files.set('large.ts', 'const x = 1;');
      const fileSizes = new Map([['large.ts', 2000000]]);
      scanner = new Scanner(createMockFileReader(files, fileSizes), mockLogger);

      const result = await scanner.scanFileWithSizeCheck('large.ts', 1000000);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('too large');
      expect(result.errors[0].recoverable).toBe(true);
      expect(result.fields).toHaveLength(0);
    });

    it('should log info message for skipped large files', async () => {
      files.set('large.ts', 'const x = 1;');
      const fileSizes = new Map([['large.ts', 2000000]]);
      scanner = new Scanner(createMockFileReader(files, fileSizes), mockLogger);

      await scanner.scanFileWithSizeCheck('large.ts', 1000000);

      expect(mockLogger.infoCalls.some(c => c.message.includes('large file'))).toBe(true);
    });
  });
});

describe('Batch scanning utilities', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let files: Map<string, string>;
  let scanner: Scanner;

  beforeEach(() => {
    mockLogger = createMockLogger();
    files = new Map([
      ['valid1.ts', 'const a = 1;'],
      ['valid2.ts', 'const b = 2;'],
      ['broken.ts', 'const c = {{{'],
    ]);
    scanner = new Scanner(createMockFileReader(files), mockLogger);
  });

  describe('scanMultipleFiles', () => {
    it('should scan multiple files and return all results', async () => {
      const results = await scanMultipleFiles(scanner, ['valid1.ts', 'valid2.ts']);

      expect(results).toHaveLength(2);
      expect(results[0].filePath).toBe('valid1.ts');
      expect(results[1].filePath).toBe('valid2.ts');
    });

    it('should continue scanning after errors', async () => {
      const results = await scanMultipleFiles(scanner, ['valid1.ts', 'broken.ts', 'valid2.ts']);

      expect(results).toHaveLength(3);
      // All files should have results, even the broken one
      expect(results[0].errors).toHaveLength(0);
      expect(results[1].errors.length).toBeGreaterThan(0);
      expect(results[2].errors).toHaveLength(0);
    });
  });

  describe('getSuccessfulScans', () => {
    it('should filter to only successful scans', async () => {
      const results = await scanMultipleFiles(scanner, ['valid1.ts', 'broken.ts', 'valid2.ts']);
      const successful = getSuccessfulScans(results);

      expect(successful).toHaveLength(2);
      expect(successful.every(r => r.errors.length === 0)).toBe(true);
    });
  });

  describe('getFailedScans', () => {
    it('should filter to only failed scans', async () => {
      const results = await scanMultipleFiles(scanner, ['valid1.ts', 'broken.ts', 'valid2.ts']);
      const failed = getFailedScans(results);

      expect(failed).toHaveLength(1);
      expect(failed[0].filePath).toBe('broken.ts');
    });
  });

  describe('collectAllErrors', () => {
    it('should collect all errors from multiple results', async () => {
      const results = await scanMultipleFiles(scanner, ['valid1.ts', 'broken.ts', 'nonexistent.ts']);
      const errors = collectAllErrors(results);

      expect(errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('collectAllFields', () => {
    it('should collect all fields from multiple results', async () => {
      const results = await scanMultipleFiles(scanner, ['valid1.ts', 'valid2.ts']);
      const fields = collectAllFields(results);

      expect(fields.length).toBeGreaterThanOrEqual(2);
      expect(fields.some(f => f.name === 'a')).toBe(true);
      expect(fields.some(f => f.name === 'b')).toBe(true);
    });
  });
});

describe('Scanner resilience - Requirement 1.4', () => {
  it('should log syntax errors and continue scanning other files', async () => {
    const mockLogger = createMockLogger();
    const files = new Map([
      ['file1.ts', 'const valid1 = "test";'],
      ['file2.ts', 'const broken = {{{'],  // Syntax error
      ['file3.ts', 'const valid2 = "test";'],
    ]);
    const scanner = new Scanner(createMockFileReader(files), mockLogger);

    // Scan all files
    const results = await scanMultipleFiles(scanner, ['file1.ts', 'file2.ts', 'file3.ts']);

    // All files should have results
    expect(results).toHaveLength(3);

    // File 1 should be successful
    expect(results[0].errors).toHaveLength(0);
    expect(results[0].fields.some(f => f.name === 'valid1')).toBe(true);

    // File 2 should have errors but still return a result
    expect(results[1].errors.length).toBeGreaterThan(0);
    expect(results[1].errors[0].recoverable).toBe(true);

    // File 3 should be successful (scanning continued after error)
    expect(results[2].errors).toHaveLength(0);
    expect(results[2].fields.some(f => f.name === 'valid2')).toBe(true);

    // Error should have been logged
    expect(mockLogger.warnCalls.length + mockLogger.errorCalls.length).toBeGreaterThan(0);
  });

  it('should handle mixed error types and continue scanning', async () => {
    const mockLogger = createMockLogger();
    const files = new Map([
      ['valid.ts', 'const x = 1;'],
      ['syntax-error.ts', 'const y = {{{'],
    ]);
    
    // Create a reader that throws permission error for one file
    const mockReader: IFileReader = {
      async readFile(filePath: string): Promise<string> {
        if (filePath === 'permission-denied.ts') {
          const error = new Error('EACCES') as NodeJS.ErrnoException;
          error.code = 'EACCES';
          throw error;
        }
        const content = files.get(filePath);
        if (content === undefined) {
          const error = new Error('ENOENT') as NodeJS.ErrnoException;
          error.code = 'ENOENT';
          throw error;
        }
        return content;
      },
      async exists(filePath: string): Promise<boolean> {
        return files.has(filePath) || filePath === 'permission-denied.ts';
      },
      async getFileSize(filePath: string): Promise<number> {
        return files.get(filePath)?.length ?? 100;
      },
      async listFiles(): Promise<string[]> {
        return Array.from(files.keys());
      },
    };

    const scanner = new Scanner(mockReader, mockLogger);

    const results = await scanMultipleFiles(scanner, [
      'valid.ts',
      'syntax-error.ts',
      'permission-denied.ts',
      'not-found.ts',
    ]);

    // All files should have results
    expect(results).toHaveLength(4);

    // Valid file should succeed
    expect(results[0].errors).toHaveLength(0);

    // Syntax error file should have recoverable error
    expect(results[1].errors.length).toBeGreaterThan(0);
    expect(results[1].errors[0].recoverable).toBe(true);

    // Permission denied should have recoverable error
    expect(results[2].errors.length).toBeGreaterThan(0);
    expect(results[2].errors[0].recoverable).toBe(true);

    // Not found should have recoverable error
    expect(results[3].errors.length).toBeGreaterThan(0);
    expect(results[3].errors[0].recoverable).toBe(true);
  });
});


describe('Scanner.scanWorkspace - Requirement 1.2, 1.5', () => {
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
  });

  describe('basic workspace scanning', () => {
    it('should scan all supported files in the workspace', async () => {
      const files = new Map([
        ['src/user.ts', 'const userName = "test";'],
        ['src/config.json', '{"apiKey": "secret"}'],
        ['src/app.py', 'password = "123"'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*.ts', '**/*.json', '**/*.py'],
        excludePatterns: ['node_modules/**'],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results.some(r => r.filePath === 'src/user.ts')).toBe(true);
      expect(results.some(r => r.filePath === 'src/config.json')).toBe(true);
      expect(results.some(r => r.filePath === 'src/app.py')).toBe(true);
    });

    it('should filter out unsupported file types', async () => {
      const files = new Map([
        ['src/app.ts', 'const x = 1;'],
        ['src/styles.css', 'body { color: red; }'],
        ['src/readme.md', '# Hello'],
      ]);
      const fileList = ['src/app.ts', 'src/styles.css', 'src/readme.md'];
      const scanner = new Scanner(
        createMockFileReaderWithListFiles(files, fileList),
        mockLogger
      );

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      // Only TypeScript file should be scanned
      expect(results).toHaveLength(1);
      expect(results[0].filePath).toBe('src/app.ts');
    });

    it('should yield results as they become available (streaming)', async () => {
      const files = new Map([
        ['file1.ts', 'const a = 1;'],
        ['file2.ts', 'const b = 2;'],
        ['file3.ts', 'const c = 3;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      // Verify streaming behavior - results should be yielded one at a time
      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
        // Each result should be complete before the next is yielded
        expect(result.filePath).toBeDefined();
        expect(result.fields).toBeDefined();
        expect(result.errors).toBeDefined();
      }

      expect(results).toHaveLength(3);
    });

    it('should return empty when no supported files found', async () => {
      const files = new Map([
        ['styles.css', 'body {}'],
        ['readme.md', '# Hello'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      expect(results).toHaveLength(0);
      expect(mockLogger.infoCalls.some(c => c.message.includes('No supported files'))).toBe(true);
    });
  });

  describe('progress reporting', () => {
    it('should call progress callback with correct progress information', async () => {
      const files = new Map([
        ['file1.ts', 'const a = 1;'],
        ['file2.ts', 'const b = 2;'],
        ['file3.ts', 'const c = 3;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const progressUpdates: ScanProgress[] = [];
      scanner.setProgressCallback((progress) => {
        progressUpdates.push({ ...progress });
      });

      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      // Consume all results
      for await (const _ of scanner.scanWorkspace(options)) {
        // Just consume
      }

      // Should have progress updates for each file plus completion
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);

      // First progress should show 0 scanned
      expect(progressUpdates[0].scannedFiles).toBe(0);
      expect(progressUpdates[0].totalFiles).toBe(3);
      expect(progressUpdates[0].percentComplete).toBe(0);

      // Last progress should show 100% complete
      const lastProgress = progressUpdates[progressUpdates.length - 1];
      expect(lastProgress.percentComplete).toBe(100);
      expect(lastProgress.scannedFiles).toBe(3);
    });

    it('should include current file in progress updates', async () => {
      const files = new Map([
        ['src/user.ts', 'const userName = "test";'],
        ['src/config.ts', 'const config = {};'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const progressUpdates: ScanProgress[] = [];
      scanner.setProgressCallback((progress) => {
        progressUpdates.push({ ...progress });
      });

      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const _ of scanner.scanWorkspace(options)) {
        // Consume
      }

      // Progress updates should include current file being scanned
      const filesInProgress = progressUpdates
        .filter(p => p.currentFile !== '')
        .map(p => p.currentFile);
      
      expect(filesInProgress.length).toBeGreaterThan(0);
    });

    it('should handle progress callback errors gracefully', async () => {
      const files = new Map([
        ['file1.ts', 'const a = 1;'],
        ['file2.ts', 'const b = 2;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      // Set a callback that throws
      scanner.setProgressCallback(() => {
        throw new Error('Progress callback error');
      });

      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      // Should not throw, should continue scanning
      const results: ScanResult[] = [];
      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      // Should have logged warning about callback error
      expect(mockLogger.warnCalls.some(c => c.message.includes('Progress callback error'))).toBe(true);
    });

    it('should allow clearing progress callback', async () => {
      const files = new Map([
        ['file1.ts', 'const a = 1;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      let callCount = 0;
      scanner.setProgressCallback(() => {
        callCount++;
      });

      // Clear the callback
      scanner.setProgressCallback(null);

      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const _ of scanner.scanWorkspace(options)) {
        // Consume
      }

      expect(callCount).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle listFiles errors gracefully', async () => {
      const files = new Map<string, string>();
      const listError = new Error('Failed to list files');
      const scanner = new Scanner(
        createMockFileReaderWithListFiles(files, listError),
        mockLogger
      );

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      expect(results).toHaveLength(0);
      expect(mockLogger.errorCalls.some(c => c.message.includes('Failed to list workspace files'))).toBe(true);
    });

    it('should continue scanning after individual file errors', async () => {
      const files = new Map([
        ['valid1.ts', 'const a = 1;'],
        ['broken.ts', 'const b = {{{'],
        ['valid2.ts', 'const c = 3;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      // All files should have results
      expect(results).toHaveLength(3);
      
      // Broken file should have errors
      const brokenResult = results.find(r => r.filePath === 'broken.ts');
      expect(brokenResult?.errors.length).toBeGreaterThan(0);
      
      // Valid files should succeed
      const valid1Result = results.find(r => r.filePath === 'valid1.ts');
      const valid2Result = results.find(r => r.filePath === 'valid2.ts');
      expect(valid1Result?.errors).toHaveLength(0);
      expect(valid2Result?.errors).toHaveLength(0);
    });

    it('should skip files exceeding max size', async () => {
      const files = new Map([
        ['small.ts', 'const a = 1;'],
        ['large.ts', 'const b = 2;'],
      ]);
      const fileSizes = new Map([
        ['small.ts', 100],
        ['large.ts', 2000000],
      ]);
      const scanner = new Scanner(
        createMockFileReaderWithListFiles(files, ['small.ts', 'large.ts'], fileSizes),
        mockLogger
      );

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1000000,
        onDemand: false,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      
      // Small file should succeed
      const smallResult = results.find(r => r.filePath === 'small.ts');
      expect(smallResult?.errors).toHaveLength(0);
      
      // Large file should have size error
      const largeResult = results.find(r => r.filePath === 'large.ts');
      expect(largeResult?.errors.length).toBeGreaterThan(0);
      expect(largeResult?.errors[0].message).toContain('too large');
    });
  });

  describe('on-demand scanning mode', () => {
    it('should work in on-demand mode', async () => {
      const files = new Map([
        ['file1.ts', 'const a = 1;'],
        ['file2.ts', 'const b = 2;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const results: ScanResult[] = [];
      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: true,
      };

      for await (const result of scanner.scanWorkspace(options)) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
    });

    it('should log info about large workspace detection', async () => {
      // Create a workspace with many files
      const files = new Map<string, string>();
      const fileList: string[] = [];
      for (let i = 0; i < 1001; i++) {
        const fileName = `file${i}.ts`;
        files.set(fileName, `const x${i} = ${i};`);
        fileList.push(fileName);
      }
      
      const scanner = new Scanner(
        createMockFileReaderWithListFiles(files, fileList),
        mockLogger
      );

      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false, // Not on-demand, should log warning
      };

      // Just start the scan, don't need to consume all
      const iterator = scanner.scanWorkspace(options);
      await iterator.next();

      expect(mockLogger.infoCalls.some(c => 
        c.message.includes('Large workspace') || c.message.includes('on-demand')
      )).toBe(true);
    });
  });

  describe('logging', () => {
    it('should log scan start and completion', async () => {
      const files = new Map([
        ['file1.ts', 'const a = 1;'],
        ['file2.ts', 'const b = 2;'],
      ]);
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      const options: ScanOptions = {
        includePatterns: ['**/*.ts'],
        excludePatterns: [],
        maxFileSizeBytes: 1024 * 1024,
        onDemand: false,
      };

      for await (const _ of scanner.scanWorkspace(options)) {
        // Consume
      }

      // Should log start
      expect(mockLogger.infoCalls.some(c => c.message.includes('Starting workspace scan'))).toBe(true);
      
      // Should log completion
      expect(mockLogger.infoCalls.some(c => c.message.includes('Workspace scan complete'))).toBe(true);
    });
  });

  describe('CPU throttling - Validates: Requirements 8.3', () => {
    it('should set CPU throttle based on percentage', () => {
      const files = new Map<string, string>();
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      // 100% CPU = no throttle
      scanner.setCpuThrottle(100);
      expect(scanner.getCpuThrottleMs()).toBe(0);

      // 50% CPU = some throttle
      scanner.setCpuThrottle(50);
      expect(scanner.getCpuThrottleMs()).toBeGreaterThan(0);

      // 25% CPU = more throttle
      scanner.setCpuThrottle(25);
      expect(scanner.getCpuThrottleMs()).toBeGreaterThan(16);
    });

    it('should clamp CPU percentage to valid range', () => {
      const files = new Map<string, string>();
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      // Below minimum
      scanner.setCpuThrottle(0);
      expect(scanner.getCpuThrottleMs()).toBe(33); // (100-1)/3

      // Above maximum
      scanner.setCpuThrottle(150);
      expect(scanner.getCpuThrottleMs()).toBe(0);
    });
  });

  describe('scan frequency - Validates: Requirements 8.6', () => {
    it('should set and get scan frequency', () => {
      const files = new Map<string, string>();
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      scanner.setScanFrequency(5000);
      expect(scanner.getScanFrequency()).toBe(5000);

      scanner.setScanFrequency(0);
      expect(scanner.getScanFrequency()).toBe(0);
    });

    it('should not allow negative scan frequency', () => {
      const files = new Map<string, string>();
      const scanner = new Scanner(createMockFileReader(files), mockLogger);

      scanner.setScanFrequency(-1000);
      expect(scanner.getScanFrequency()).toBe(0);
    });
  });
});
