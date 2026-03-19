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
/**
 * Supported file extensions mapped to their language identifiers
 */
export declare const SUPPORTED_EXTENSIONS: ReadonlyMap<string, string>;
/**
 * Array of all supported file extensions
 */
export declare const SUPPORTED_EXTENSION_LIST: readonly string[];
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
export declare function isSupported(filePath: string): boolean;
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
export declare function getLanguage(filePath: string): string | null;
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
export declare function getExtension(filePath: string): string;
//# sourceMappingURL=language-support.d.ts.map