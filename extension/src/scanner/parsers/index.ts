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
import { JavaScriptParser, TypeScriptParser } from './javascript-parser';
import { PythonParser } from './python-parser';
import { JavaParser } from './java-parser';
import { CSharpParser } from './csharp-parser';
import { JsonParser } from './json-parser';

/**
 * Registry of available parsers by language identifier
 */
const parserRegistry: Map<string, ILanguageParser> = new Map();

// Initialize parsers
const jsParser = new JavaScriptParser();
const tsParser = new TypeScriptParser();
const pyParser = new PythonParser();
const javaParser = new JavaParser();
const csharpParser = new CSharpParser();
const jsonParser = new JsonParser();

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
export function getParser(language: string): ILanguageParser | null {
  return parserRegistry.get(language) ?? null;
}

/**
 * Gets all registered parsers.
 * 
 * @returns Array of all available parsers
 */
export function getAllParsers(): ILanguageParser[] {
  return Array.from(parserRegistry.values());
}

/**
 * Gets all supported language identifiers.
 * 
 * @returns Array of supported language identifiers
 */
export function getSupportedLanguages(): string[] {
  return Array.from(parserRegistry.keys());
}

/**
 * Checks if a language is supported.
 * 
 * @param language - The language identifier to check
 * @returns true if the language is supported, false otherwise
 */
export function isLanguageSupported(language: string): boolean {
  return parserRegistry.has(language);
}
