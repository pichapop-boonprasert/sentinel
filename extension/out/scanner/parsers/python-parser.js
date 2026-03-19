"use strict";
/**
 * Python parser for extracting field declarations.
 * Uses regex-based parsing since we don't have a Python AST parser in JS.
 *
 * Supports:
 * - Variable assignments
 * - Class attributes
 * - Function parameters
 * - Type annotations (Python 3.5+)
 * - Dataclass fields
 *
 * @module scanner/parsers/python-parser
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonParser = void 0;
const types_1 = require("./types");
class PythonParser {
    language = 'python';
    parse(sourceCode, filePath) {
        const fields = [];
        const errors = [];
        const lines = sourceCode.split('\n');
        // Track current scope
        let currentClass = null;
        let currentFunction = null;
        let indentStack = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) {
                continue;
            }
            // Calculate indentation
            const indent = line.length - line.trimStart().length;
            // Update scope based on indentation
            while (indentStack.length > 0 && indent <= indentStack[indentStack.length - 1].indent) {
                const popped = indentStack.pop();
                if (popped?.scope.startsWith('class:')) {
                    currentClass = null;
                }
                else if (popped?.scope.startsWith('function:') || popped?.scope.startsWith('method:')) {
                    currentFunction = null;
                }
            }
            // Detect class definitions
            const classMatch = trimmedLine.match(/^class\s+(\w+)/);
            if (classMatch) {
                currentClass = classMatch[1];
                indentStack.push({ indent, scope: `class:${currentClass}` });
                continue;
            }
            // Detect function/method definitions
            const funcMatch = trimmedLine.match(/^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/);
            if (funcMatch) {
                const funcName = funcMatch[1];
                const params = funcMatch[2];
                const scopeType = currentClass ? 'method' : 'function';
                currentFunction = funcName;
                indentStack.push({ indent, scope: `${scopeType}:${funcName}` });
                // Extract function parameters
                this.extractFunctionParams(params, filePath, lineNumber, line, lines, currentClass, currentFunction, fields);
                continue;
            }
            // Detect variable assignments with type annotations
            // Pattern: name: Type = value or name: Type
            const typedAssignMatch = trimmedLine.match(/^(\w+)\s*:\s*([^=]+?)(?:\s*=|$)/);
            if (typedAssignMatch) {
                const name = typedAssignMatch[1];
                const type = typedAssignMatch[2].trim();
                // Skip 'self' and common non-field patterns
                if (name !== 'self' && name !== 'cls' && !this.isControlFlow(trimmedLine)) {
                    fields.push(this.createFieldDeclaration(name, type, filePath, lineNumber, line, lines, this.getCurrentScope(currentClass, currentFunction)));
                }
                continue;
            }
            // Detect simple variable assignments
            // Pattern: name = value (but not comparisons or augmented assignments)
            const simpleAssignMatch = trimmedLine.match(/^(\w+)\s*=\s*(?!=)/);
            if (simpleAssignMatch && !trimmedLine.includes('==')) {
                const name = simpleAssignMatch[1];
                // Skip 'self' assignments and common non-field patterns
                if (name !== 'self' && name !== 'cls' && !this.isControlFlow(trimmedLine)) {
                    fields.push(this.createFieldDeclaration(name, null, filePath, lineNumber, line, lines, this.getCurrentScope(currentClass, currentFunction)));
                }
                continue;
            }
            // Detect self.attribute assignments in methods
            const selfAttrMatch = trimmedLine.match(/^self\.(\w+)\s*(?::\s*([^=]+?))?\s*=/);
            if (selfAttrMatch && currentClass) {
                const name = selfAttrMatch[1];
                const type = selfAttrMatch[2]?.trim() || null;
                fields.push(this.createFieldDeclaration(name, type, filePath, lineNumber, line, lines, `class:${currentClass}`));
                continue;
            }
            // Detect tuple unpacking: a, b = value
            const tupleUnpackMatch = trimmedLine.match(/^(\w+(?:\s*,\s*\w+)+)\s*=/);
            if (tupleUnpackMatch) {
                const names = tupleUnpackMatch[1].split(',').map(n => n.trim());
                for (const name of names) {
                    if (name && name !== '_') {
                        fields.push(this.createFieldDeclaration(name, null, filePath, lineNumber, line, lines, this.getCurrentScope(currentClass, currentFunction)));
                    }
                }
            }
        }
        return { fields, errors };
    }
    createFieldDeclaration(name, type, filePath, lineNumber, line, lines, parentScope) {
        const startColumn = line.indexOf(name);
        const endColumn = startColumn + name.length;
        return {
            name,
            type,
            location: (0, types_1.createCodeLocation)(filePath, lineNumber, startColumn, lineNumber, endColumn),
            context: {
                surroundingCode: (0, types_1.extractSurroundingCode)(lines, lineNumber),
                comments: this.extractPythonComments(lines, lineNumber),
                parentScope,
                usageContexts: [],
            },
        };
    }
    extractFunctionParams(paramsStr, filePath, lineNumber, line, lines, currentClass, currentFunction, fields) {
        if (!paramsStr)
            return;
        // Split parameters, handling nested brackets
        const params = this.splitParams(paramsStr);
        for (const param of params) {
            const trimmedParam = param.trim();
            if (!trimmedParam)
                continue;
            // Skip self, cls, *args, **kwargs
            if (trimmedParam === 'self' || trimmedParam === 'cls')
                continue;
            if (trimmedParam.startsWith('*'))
                continue;
            // Extract parameter name and optional type
            // Pattern: name: Type = default or name: Type or name = default or name
            const paramMatch = trimmedParam.match(/^(\w+)(?:\s*:\s*([^=]+?))?(?:\s*=.*)?$/);
            if (paramMatch) {
                const name = paramMatch[1];
                const type = paramMatch[2]?.trim() || null;
                const parentScope = currentClass
                    ? `class:${currentClass}.method:${currentFunction}`
                    : `function:${currentFunction}`;
                fields.push(this.createFieldDeclaration(name, type, filePath, lineNumber, line, lines, parentScope));
            }
        }
    }
    splitParams(paramsStr) {
        const params = [];
        let current = '';
        let depth = 0;
        for (const char of paramsStr) {
            if (char === '(' || char === '[' || char === '{') {
                depth++;
                current += char;
            }
            else if (char === ')' || char === ']' || char === '}') {
                depth--;
                current += char;
            }
            else if (char === ',' && depth === 0) {
                params.push(current);
                current = '';
            }
            else {
                current += char;
            }
        }
        if (current) {
            params.push(current);
        }
        return params;
    }
    getCurrentScope(currentClass, currentFunction) {
        if (currentClass && currentFunction) {
            return `class:${currentClass}.method:${currentFunction}`;
        }
        if (currentClass) {
            return `class:${currentClass}`;
        }
        if (currentFunction) {
            return `function:${currentFunction}`;
        }
        return 'module';
    }
    isControlFlow(line) {
        const controlKeywords = ['if', 'elif', 'else', 'for', 'while', 'with', 'try', 'except', 'finally', 'return', 'yield', 'raise', 'assert'];
        const firstWord = line.trim().split(/\s+/)[0];
        return controlKeywords.includes(firstWord);
    }
    extractPythonComments(lines, lineNumber) {
        const comments = [];
        // Look for comments above the line
        for (let i = lineNumber - 2; i >= Math.max(0, lineNumber - 6); i--) {
            const line = lines[i].trim();
            if (line.startsWith('#')) {
                comments.unshift(line);
            }
            else if (line.startsWith('"""') || line.startsWith("'''")) {
                // Docstring
                comments.unshift(line);
                break;
            }
            else if (line && !line.startsWith('#')) {
                break;
            }
        }
        // Check for inline comment
        const currentLine = lines[lineNumber - 1];
        const inlineMatch = currentLine.match(/#.*$/);
        if (inlineMatch) {
            comments.push(inlineMatch[0]);
        }
        return comments;
    }
}
exports.PythonParser = PythonParser;
//# sourceMappingURL=python-parser.js.map