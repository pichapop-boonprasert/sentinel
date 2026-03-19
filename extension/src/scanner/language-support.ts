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

import * as path from 'path';

/**
 * Supported file extensions mapped to their language identifiers
 */
export const SUPPORTED_EXTENSIONS: ReadonlyMap<string, string> = new Map([
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
export const SUPPORTED_EXTENSION_LIST: readonly string[] = Array.from(SUPPORTED_EXTENSIONS.keys());

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
export function isSupported(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.has(ext);
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
export function getLanguage(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_EXTENSIONS.get(ext) ?? null;
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
export function getExtension(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}
