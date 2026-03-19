"use strict";
/**
 * Parser module index - exports all language-specific parsers and factory functions.
 *
 * @module scanner/parsers
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonParser = exports.CSharpParser = exports.JavaParser = exports.PythonParser = exports.TypeScriptParser = exports.JavaScriptParser = void 0;
exports.getParser = getParser;
exports.getAllParsers = getAllParsers;
exports.getSupportedLanguages = getSupportedLanguages;
exports.isLanguageSupported = isLanguageSupported;
__exportStar(require("./types"), exports);
var javascript_parser_1 = require("./javascript-parser");
Object.defineProperty(exports, "JavaScriptParser", { enumerable: true, get: function () { return javascript_parser_1.JavaScriptParser; } });
Object.defineProperty(exports, "TypeScriptParser", { enumerable: true, get: function () { return javascript_parser_1.TypeScriptParser; } });
var python_parser_1 = require("./python-parser");
Object.defineProperty(exports, "PythonParser", { enumerable: true, get: function () { return python_parser_1.PythonParser; } });
var java_parser_1 = require("./java-parser");
Object.defineProperty(exports, "JavaParser", { enumerable: true, get: function () { return java_parser_1.JavaParser; } });
var csharp_parser_1 = require("./csharp-parser");
Object.defineProperty(exports, "CSharpParser", { enumerable: true, get: function () { return csharp_parser_1.CSharpParser; } });
var json_parser_1 = require("./json-parser");
Object.defineProperty(exports, "JsonParser", { enumerable: true, get: function () { return json_parser_1.JsonParser; } });
const javascript_parser_2 = require("./javascript-parser");
const python_parser_2 = require("./python-parser");
const java_parser_2 = require("./java-parser");
const csharp_parser_2 = require("./csharp-parser");
const json_parser_2 = require("./json-parser");
/**
 * Registry of available parsers by language identifier
 */
const parserRegistry = new Map();
// Initialize parsers
const jsParser = new javascript_parser_2.JavaScriptParser();
const tsParser = new javascript_parser_2.TypeScriptParser();
const pyParser = new python_parser_2.PythonParser();
const javaParser = new java_parser_2.JavaParser();
const csharpParser = new csharp_parser_2.CSharpParser();
const jsonParser = new json_parser_2.JsonParser();
parserRegistry.set('javascript', jsParser);
parserRegistry.set('typescript', tsParser);
parserRegistry.set('python', pyParser);
parserRegistry.set('java', javaParser);
parserRegistry.set('csharp', csharpParser);
parserRegistry.set('json', jsonParser);
/**
 * Gets a parser for the specified language.
 *
 * @param language - The language identifier (e.g., 'javascript', 'typescript', 'python', 'java', 'json')
 * @returns The parser for the language, or null if not supported
 *
 * @example
 * ```typescript
 * const parser = getParser('typescript');
 * if (parser) {
 *   const result = parser.parse(sourceCode, filePath);
 * }
 * ```
 */
function getParser(language) {
    return parserRegistry.get(language) ?? null;
}
/**
 * Gets all registered parsers.
 *
 * @returns Array of all available parsers
 */
function getAllParsers() {
    return Array.from(parserRegistry.values());
}
/**
 * Gets all supported language identifiers.
 *
 * @returns Array of supported language identifiers
 */
function getSupportedLanguages() {
    return Array.from(parserRegistry.keys());
}
/**
 * Checks if a language is supported.
 *
 * @param language - The language identifier to check
 * @returns true if the language is supported, false otherwise
 */
function isLanguageSupported(language) {
    return parserRegistry.has(language);
}
//# sourceMappingURL=index.js.map