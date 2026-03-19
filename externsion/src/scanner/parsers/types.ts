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
export function createCodeLocation(
  filePath: string,
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number
) {
  return {
    filePath,
    startLine,
    startColumn,
    endLine,
    endColumn,
  };
}

/**
 * Helper function to extract surrounding code context
 * @param lines - Array of source code lines
 * @param lineNumber - The line number (1-indexed) of the field
 * @param contextLines - Number of lines to include before and after
 */
export function extractSurroundingCode(
  lines: string[],
  lineNumber: number,
  contextLines: number = 2
): string {
  const startIdx = Math.max(0, lineNumber - 1 - contextLines);
  const endIdx = Math.min(lines.length, lineNumber + contextLines);
  return lines.slice(startIdx, endIdx).join('\n');
}

/**
 * Helper function to extract comments near a line
 * @param lines - Array of source code lines
 * @param lineNumber - The line number (1-indexed) of the field
 * @param lookBackLines - Number of lines to look back for comments
 */
export function extractComments(
  lines: string[],
  lineNumber: number,
  lookBackLines: number = 5
): string[] {
  const comments: string[] = [];
  const startIdx = Math.max(0, lineNumber - 1 - lookBackLines);
  const endIdx = lineNumber - 1;

  for (let i = startIdx; i < endIdx; i++) {
    const line = lines[i].trim();
    // Match single-line comments
    if (line.startsWith('//') || line.startsWith('#') || line.startsWith('*')) {
      comments.push(line);
    }
    // Match multi-line comment markers
    if (line.startsWith('/*') || line.startsWith('/**') || line.startsWith('"""') || line.startsWith("'''")) {
      comments.push(line);
    }
  }

  // Also check inline comment on the same line
  const currentLine = lines[lineNumber - 1];
  if (currentLine) {
    const inlineCommentMatch = currentLine.match(/\/\/.*$|#.*$/);
    if (inlineCommentMatch) {
      comments.push(inlineCommentMatch[0]);
    }
  }

  return comments;
}
