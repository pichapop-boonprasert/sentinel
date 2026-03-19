/**
 * Parser module index - exports all language-specific parsers and factory functions.
 *
 * @module scanner/parsers
 */
export * from './types';
export { JavaScriptParser, TypeScriptParser } from './javascript-parser';
export { PythonParser } from './python-parser';
export { JavaParser } from './java-parser';
export { CSharpParser } from './csharp-parser';
export { JsonParser } from './json-parser';
import { ILanguageParser } from './types';
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
export declare function getParser(language: string): ILanguageParser | null;
/**
 * Gets all registered parsers.
 *
 * @returns Array of all available parsers
 */
export declare function getAllParsers(): ILanguageParser[];
/**
 * Gets all supported language identifiers.
 *
 * @returns Array of supported language identifiers
 */
export declare function getSupportedLanguages(): string[];
/**
 * Checks if a language is supported.
 *
 * @param language - The language identifier to check
 * @returns true if the language is supported, false otherwise
 */
export declare function isLanguageSupported(language: string): boolean;
//# sourceMappingURL=index.d.ts.map