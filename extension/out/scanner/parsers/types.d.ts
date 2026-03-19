/**
 * Common types and interfaces for language-specific parsers.
 *
 * @module scanner/parsers/types
 */
import { FieldDeclaration, ScanError } from '../../types';
/**
 * Result of parsing a source file
 */
export interface ParseResult {
    fields: FieldDeclaration[];
    errors: ScanError[];
}
/**
 * Interface that all language-specific parsers must implement
 */
export interface ILanguageParser {
    /**
     * The language identifier this parser handles
     */
    readonly language: string;
    /**
     * Parses source code and extracts field declarations
     * @param sourceCode - The source code to parse
     * @param filePath - The path to the file being parsed
     * @returns ParseResult containing extracted fields and any errors
     */
    parse(sourceCode: string, filePath: string): ParseResult;
}
/**
 * Helper function to create a CodeLocation
 */
export declare function createCodeLocation(filePath: string, startLine: number, startColumn: number, endLine: number, endColumn: number): {
    filePath: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
};
/**
 * Helper function to extract surrounding code context
 * @param lines - Array of source code lines
 * @param lineNumber - The line number (1-indexed) of the field
 * @param contextLines - Number of lines to include before and after
 */
export declare function extractSurroundingCode(lines: string[], lineNumber: number, contextLines?: number): string;
/**
 * Helper function to extract comments near a line
 * @param lines - Array of source code lines
 * @param lineNumber - The line number (1-indexed) of the field
 * @param lookBackLines - Number of lines to look back for comments
 */
export declare function extractComments(lines: string[], lineNumber: number, lookBackLines?: number): string[];
//# sourceMappingURL=types.d.ts.map