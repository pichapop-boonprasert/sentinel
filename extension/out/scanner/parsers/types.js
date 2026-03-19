"use strict";
/**
 * Common types and interfaces for language-specific parsers.
 *
 * @module scanner/parsers/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCodeLocation = createCodeLocation;
exports.extractSurroundingCode = extractSurroundingCode;
exports.extractComments = extractComments;
/**
 * Helper function to create a CodeLocation
 */
function createCodeLocation(filePath, startLine, startColumn, endLine, endColumn) {
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
function extractSurroundingCode(lines, lineNumber, contextLines = 2) {
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
function extractComments(lines, lineNumber, lookBackLines = 5) {
    const comments = [];
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
//# sourceMappingURL=types.js.map