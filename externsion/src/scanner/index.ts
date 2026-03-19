// Scanner component for parsing source files

// Export language support utilities
export {
  isSupported,
  getLanguage,
  getExtension,
  SUPPORTED_EXTENSIONS,
  SUPPORTED_EXTENSION_LIST,
} from './language-support';

// Export parsers
export {
  // Types
  ILanguageParser,
  ParseResult,
  createCodeLocation,
  extractSurroundingCode,
  extractComments,
  // Parsers
  JavaScriptParser,
  TypeScriptParser,
  PythonParser,
  JavaParser,
  JsonParser,
  // Factory functions
  getParser,
  getAllParsers,
  getSupportedLanguages,
  isLanguageSupported,
} from './parsers';

// Export Scanner class and utilities
export {
  Scanner,
  IScannerLogger,
  IFileReader,
  ScanProgress,
  ScanProgressCallback,
  defaultLogger,
  // Error creation utilities
  createSyntaxError,
  createFileNotFoundError,
  createPermissionDeniedError,
  createFileTooLargeError,
  createUnsupportedLanguageError,
  // Batch scanning utilities
  scanMultipleFiles,
  getSuccessfulScans,
  getFailedScans,
  collectAllErrors,
  collectAllFields,
} from './scanner';
