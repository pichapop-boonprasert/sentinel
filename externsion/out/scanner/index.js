"use strict";
// Scanner component for parsing source files
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectAllFields = exports.collectAllErrors = exports.getFailedScans = exports.getSuccessfulScans = exports.scanMultipleFiles = exports.createUnsupportedLanguageError = exports.createFileTooLargeError = exports.createPermissionDeniedError = exports.createFileNotFoundError = exports.createSyntaxError = exports.defaultLogger = exports.Scanner = exports.isLanguageSupported = exports.getSupportedLanguages = exports.getAllParsers = exports.getParser = exports.JsonParser = exports.JavaParser = exports.PythonParser = exports.TypeScriptParser = exports.JavaScriptParser = exports.extractComments = exports.extractSurroundingCode = exports.createCodeLocation = exports.SUPPORTED_EXTENSION_LIST = exports.SUPPORTED_EXTENSIONS = exports.getExtension = exports.getLanguage = exports.isSupported = void 0;
// Export language support utilities
var language_support_1 = require("./language-support");
Object.defineProperty(exports, "isSupported", { enumerable: true, get: function () { return language_support_1.isSupported; } });
Object.defineProperty(exports, "getLanguage", { enumerable: true, get: function () { return language_support_1.getLanguage; } });
Object.defineProperty(exports, "getExtension", { enumerable: true, get: function () { return language_support_1.getExtension; } });
Object.defineProperty(exports, "SUPPORTED_EXTENSIONS", { enumerable: true, get: function () { return language_support_1.SUPPORTED_EXTENSIONS; } });
Object.defineProperty(exports, "SUPPORTED_EXTENSION_LIST", { enumerable: true, get: function () { return language_support_1.SUPPORTED_EXTENSION_LIST; } });
// Export parsers
var parsers_1 = require("./parsers");
Object.defineProperty(exports, "createCodeLocation", { enumerable: true, get: function () { return parsers_1.createCodeLocation; } });
Object.defineProperty(exports, "extractSurroundingCode", { enumerable: true, get: function () { return parsers_1.extractSurroundingCode; } });
Object.defineProperty(exports, "extractComments", { enumerable: true, get: function () { return parsers_1.extractComments; } });
// Parsers
Object.defineProperty(exports, "JavaScriptParser", { enumerable: true, get: function () { return parsers_1.JavaScriptParser; } });
Object.defineProperty(exports, "TypeScriptParser", { enumerable: true, get: function () { return parsers_1.TypeScriptParser; } });
Object.defineProperty(exports, "PythonParser", { enumerable: true, get: function () { return parsers_1.PythonParser; } });
Object.defineProperty(exports, "JavaParser", { enumerable: true, get: function () { return parsers_1.JavaParser; } });
Object.defineProperty(exports, "JsonParser", { enumerable: true, get: function () { return parsers_1.JsonParser; } });
// Factory functions
Object.defineProperty(exports, "getParser", { enumerable: true, get: function () { return parsers_1.getParser; } });
Object.defineProperty(exports, "getAllParsers", { enumerable: true, get: function () { return parsers_1.getAllParsers; } });
Object.defineProperty(exports, "getSupportedLanguages", { enumerable: true, get: function () { return parsers_1.getSupportedLanguages; } });
Object.defineProperty(exports, "isLanguageSupported", { enumerable: true, get: function () { return parsers_1.isLanguageSupported; } });
// Export Scanner class and utilities
var scanner_1 = require("./scanner");
Object.defineProperty(exports, "Scanner", { enumerable: true, get: function () { return scanner_1.Scanner; } });
Object.defineProperty(exports, "defaultLogger", { enumerable: true, get: function () { return scanner_1.defaultLogger; } });
// Error creation utilities
Object.defineProperty(exports, "createSyntaxError", { enumerable: true, get: function () { return scanner_1.createSyntaxError; } });
Object.defineProperty(exports, "createFileNotFoundError", { enumerable: true, get: function () { return scanner_1.createFileNotFoundError; } });
Object.defineProperty(exports, "createPermissionDeniedError", { enumerable: true, get: function () { return scanner_1.createPermissionDeniedError; } });
Object.defineProperty(exports, "createFileTooLargeError", { enumerable: true, get: function () { return scanner_1.createFileTooLargeError; } });
Object.defineProperty(exports, "createUnsupportedLanguageError", { enumerable: true, get: function () { return scanner_1.createUnsupportedLanguageError; } });
// Batch scanning utilities
Object.defineProperty(exports, "scanMultipleFiles", { enumerable: true, get: function () { return scanner_1.scanMultipleFiles; } });
Object.defineProperty(exports, "getSuccessfulScans", { enumerable: true, get: function () { return scanner_1.getSuccessfulScans; } });
Object.defineProperty(exports, "getFailedScans", { enumerable: true, get: function () { return scanner_1.getFailedScans; } });
Object.defineProperty(exports, "collectAllErrors", { enumerable: true, get: function () { return scanner_1.collectAllErrors; } });
Object.defineProperty(exports, "collectAllFields", { enumerable: true, get: function () { return scanner_1.collectAllFields; } });
//# sourceMappingURL=index.js.map