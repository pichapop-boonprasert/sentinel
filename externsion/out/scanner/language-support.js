"use strict";
/**
 * Language support module for the Scanner component.
 * Provides file type detection for supported languages.
 *
 * Supported languages:
 * - JavaScript (.js, .jsx)
 * - TypeScript (.ts, .tsx)
 * - Python (.py)
 * - C# (.cs)
 * - Java (.java)
 * - JSON (.json)
 *
 * @module scanner/language-support
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_EXTENSION_LIST = exports.SUPPORTED_EXTENSIONS = void 0;
exports.isSupported = isSupported;
exports.getLanguage = getLanguage;
exports.getExtension = getExtension;
const path = __importStar(require("path"));
/**
 * Supported file extensions mapped to their language identifiers
 */
exports.SUPPORTED_EXTENSIONS = new Map([
    // JavaScript
    ['.js', 'javascript'],
    ['.jsx', 'javascript'],
    // TypeScript
    ['.ts', 'typescript'],
    ['.tsx', 'typescript'],
    // Python
    ['.py', 'python'],
    // C#
    ['.cs', 'csharp'],
    // Java
    ['.java', 'java'],
    // JSON
    ['.json', 'json'],
]);
/**
 * Array of all supported file extensions
 */
exports.SUPPORTED_EXTENSION_LIST = Array.from(exports.SUPPORTED_EXTENSIONS.keys());
/**
 * Checks if a file type is supported for scanning based on its file path.
 *
 * @param filePath - The path to the file to check
 * @returns true if the file extension is supported, false otherwise
 *
 * @example
 * ```typescript
 * isSupported('src/app.ts');      // true
 * isSupported('config.json');     // true
 * isSupported('styles.css');      // false
 * isSupported('README.md');       // false
 * ```
 */
function isSupported(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return exports.SUPPORTED_EXTENSIONS.has(ext);
}
/**
 * Gets the language identifier for a given file path.
 *
 * @param filePath - The path to the file
 * @returns The language identifier or null if not supported
 *
 * @example
 * ```typescript
 * getLanguage('app.ts');     // 'typescript'
 * getLanguage('main.py');    // 'python'
 * getLanguage('style.css');  // null
 * ```
 */
function getLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return exports.SUPPORTED_EXTENSIONS.get(ext) ?? null;
}
/**
 * Gets the file extension from a file path (lowercase, including the dot).
 *
 * @param filePath - The path to the file
 * @returns The lowercase file extension including the dot
 *
 * @example
 * ```typescript
 * getExtension('App.TSX');   // '.tsx'
 * getExtension('main.PY');   // '.py'
 * ```
 */
function getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}
//# sourceMappingURL=language-support.js.map