"use strict";
/**
 * JSON parser for extracting field declarations.
 * Parses JSON configuration files to extract property names.
 *
 * Supports:
 * - Object property keys at all nesting levels
 * - Array indices (optionally)
 * - Nested object paths
 *
 * @module scanner/parsers/json-parser
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonParser = void 0;
const types_1 = require("./types");
class JsonParser {
    language = 'json';
    parse(sourceCode, filePath) {
        const fields = [];
        const errors = [];
        const lines = sourceCode.split('\n');
        try {
            // First, validate JSON
            JSON.parse(sourceCode);
        }
        catch (error) {
            const err = error;
            // Try to extract line number from error message
            const lineMatch = err.message.match(/line (\d+)/i) || err.message.match(/position (\d+)/i);
            errors.push({
                filePath,
                message: `JSON parse error: ${err.message}`,
                line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
                recoverable: false,
            });
            return { fields, errors };
        }
        // Parse JSON and extract fields with locations
        this.extractFieldsWithLocations(sourceCode, filePath, lines, fields, []);
        return { fields, errors };
    }
    extractFieldsWithLocations(sourceCode, filePath, lines, fields, pathStack) {
        // Track position in source
        let pos = 0;
        let line = 1;
        let column = 0;
        const skipWhitespace = () => {
            while (pos < sourceCode.length) {
                const char = sourceCode[pos];
                if (char === ' ' || char === '\t' || char === '\r') {
                    pos++;
                    column++;
                }
                else if (char === '\n') {
                    pos++;
                    line++;
                    column = 0;
                }
                else {
                    break;
                }
            }
        };
        const parseString = () => {
            const startLine = line;
            const startCol = column;
            pos++; // Skip opening quote
            column++;
            let value = '';
            while (pos < sourceCode.length && sourceCode[pos] !== '"') {
                if (sourceCode[pos] === '\\') {
                    pos++;
                    column++;
                    if (pos < sourceCode.length) {
                        value += sourceCode[pos];
                        pos++;
                        column++;
                    }
                }
                else {
                    if (sourceCode[pos] === '\n') {
                        line++;
                        column = 0;
                    }
                    else {
                        column++;
                    }
                    value += sourceCode[pos];
                    pos++;
                }
            }
            pos++; // Skip closing quote
            column++;
            return { value, startLine, startCol, endLine: line, endCol: column };
        };
        const parseValue = () => {
            skipWhitespace();
            if (pos >= sourceCode.length)
                return;
            const char = sourceCode[pos];
            if (char === '{') {
                parseObject();
            }
            else if (char === '[') {
                parseArray();
            }
            else if (char === '"') {
                parseString();
            }
            else {
                // Skip primitive values (numbers, booleans, null)
                while (pos < sourceCode.length && !/[\s,\]\}]/.test(sourceCode[pos])) {
                    if (sourceCode[pos] === '\n') {
                        line++;
                        column = 0;
                    }
                    else {
                        column++;
                    }
                    pos++;
                }
            }
        };
        const parseObject = () => {
            pos++; // Skip opening brace
            column++;
            skipWhitespace();
            while (pos < sourceCode.length && sourceCode[pos] !== '}') {
                skipWhitespace();
                if (sourceCode[pos] === '"') {
                    const keyInfo = parseString();
                    const key = keyInfo.value;
                    // Create field declaration for this key
                    const parentScope = pathStack.length > 0 ? pathStack.join('.') : 'root';
                    fields.push({
                        name: key,
                        type: null,
                        location: (0, types_1.createCodeLocation)(filePath, keyInfo.startLine, keyInfo.startCol, keyInfo.endLine, keyInfo.endCol),
                        context: {
                            surroundingCode: (0, types_1.extractSurroundingCode)(lines, keyInfo.startLine),
                            comments: [], // JSON doesn't support comments
                            parentScope,
                            usageContexts: [],
                        },
                    });
                    skipWhitespace();
                    if (sourceCode[pos] === ':') {
                        pos++;
                        column++;
                    }
                    skipWhitespace();
                    // Parse the value with updated path
                    pathStack.push(key);
                    parseValue();
                    pathStack.pop();
                }
                skipWhitespace();
                if (sourceCode[pos] === ',') {
                    pos++;
                    column++;
                }
                skipWhitespace();
            }
            if (sourceCode[pos] === '}') {
                pos++;
                column++;
            }
        };
        const parseArray = () => {
            pos++; // Skip opening bracket
            column++;
            let index = 0;
            skipWhitespace();
            while (pos < sourceCode.length && sourceCode[pos] !== ']') {
                skipWhitespace();
                // Optionally track array indices in path
                pathStack.push(`[${index}]`);
                parseValue();
                pathStack.pop();
                index++;
                skipWhitespace();
                if (sourceCode[pos] === ',') {
                    pos++;
                    column++;
                }
                skipWhitespace();
            }
            if (sourceCode[pos] === ']') {
                pos++;
                column++;
            }
        };
        // Start parsing
        skipWhitespace();
        if (sourceCode[pos] === '{') {
            parseObject();
        }
        else if (sourceCode[pos] === '[') {
            parseArray();
        }
    }
    /**
     * Gets the JSON value type as a string
     */
    getJsonType(value) {
        if (value === null)
            return 'null';
        if (typeof value === 'string')
            return 'string';
        if (typeof value === 'number')
            return 'number';
        if (typeof value === 'boolean')
            return 'boolean';
        if (Array.isArray(value))
            return 'array';
        if (typeof value === 'object')
            return 'object';
        return null;
    }
}
exports.JsonParser = JsonParser;
//# sourceMappingURL=json-parser.js.map