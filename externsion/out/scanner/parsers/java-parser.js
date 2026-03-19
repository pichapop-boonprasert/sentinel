"use strict";
/**
 * Java parser for extracting field declarations.
 * Uses regex-based parsing for Java source files.
 *
 * Supports:
 * - Class fields (instance and static)
 * - Local variables
 * - Method parameters
 * - Record components
 * - Enum constants
 *
 * @module scanner/parsers/java-parser
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaParser = void 0;
const types_1 = require("./types");
class JavaParser {
    language = 'java';
    // Java modifiers
    static MODIFIERS = '(?:public|private|protected|static|final|volatile|transient|abstract|synchronized|native|strictfp)';
    // Common Java types
    static TYPE_PATTERN = '(?:[A-Z]\\w*(?:<[^>]+>)?(?:\\[\\])*|int|long|short|byte|float|double|boolean|char|void)';
    parse(sourceCode, filePath) {
        const fields = [];
        const errors = [];
        const lines = sourceCode.split('\n');
        // Track current scope
        let currentClass = null;
        let currentMethod = null;
        let braceDepth = 0;
        let classStartDepth = -1;
        let methodStartDepth = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNumber = i + 1;
            const trimmedLine = line.trim();
            // Skip empty lines and single-line comments
            if (!trimmedLine || trimmedLine.startsWith('//')) {
                continue;
            }
            // Skip multi-line comment content (simple detection)
            if (trimmedLine.startsWith('*') && !trimmedLine.startsWith('*/')) {
                continue;
            }
            // Track brace depth for scope management
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            // Detect class/interface/enum/record declarations
            const classMatch = trimmedLine.match(/(?:class|interface|enum|record)\s+(\w+)/);
            if (classMatch) {
                currentClass = classMatch[1];
                classStartDepth = braceDepth;
                // Extract record components if it's a record
                if (trimmedLine.includes('record')) {
                    this.extractRecordComponents(trimmedLine, filePath, lineNumber, line, lines, currentClass, fields);
                }
            }
            // Detect method declarations
            const methodMatch = trimmedLine.match(new RegExp(`(?:${JavaParser.MODIFIERS}\\s+)*(?:${JavaParser.TYPE_PATTERN}\\s+)(\\w+)\\s*\\(([^)]*)\\)`));
            if (methodMatch && !trimmedLine.includes('new ') && currentClass) {
                currentMethod = methodMatch[1];
                methodStartDepth = braceDepth;
                // Extract method parameters
                const params = methodMatch[2];
                if (params) {
                    this.extractMethodParams(params, filePath, lineNumber, line, lines, currentClass, currentMethod, fields);
                }
            }
            // Update brace depth
            braceDepth += openBraces - closeBraces;
            // Check if we've exited the current method
            if (methodStartDepth >= 0 && braceDepth <= methodStartDepth) {
                currentMethod = null;
                methodStartDepth = -1;
            }
            // Check if we've exited the current class
            if (classStartDepth >= 0 && braceDepth <= classStartDepth) {
                currentClass = null;
                classStartDepth = -1;
            }
            // Detect field declarations (class-level)
            if (currentClass && !currentMethod) {
                const fieldMatch = this.matchFieldDeclaration(trimmedLine);
                if (fieldMatch) {
                    for (const field of fieldMatch) {
                        fields.push(this.createFieldDeclaration(field.name, field.type, filePath, lineNumber, line, lines, `class:${currentClass}`));
                    }
                    continue;
                }
            }
            // Detect local variable declarations (method-level)
            if (currentMethod) {
                const localVarMatch = this.matchLocalVariable(trimmedLine);
                if (localVarMatch) {
                    for (const variable of localVarMatch) {
                        fields.push(this.createFieldDeclaration(variable.name, variable.type, filePath, lineNumber, line, lines, `class:${currentClass}.method:${currentMethod}`));
                    }
                }
            }
            // Detect enum constants
            if (currentClass && trimmedLine.match(/^\w+(?:\s*\([^)]*\))?\s*[,;]?\s*$/)) {
                const enumConstMatch = trimmedLine.match(/^(\w+)(?:\s*\([^)]*\))?/);
                if (enumConstMatch && !this.isKeyword(enumConstMatch[1])) {
                    // Check if this looks like an enum constant (uppercase or mixed case, not a type declaration)
                    const name = enumConstMatch[1];
                    if (name === name.toUpperCase() || /^[A-Z][a-zA-Z0-9]*$/.test(name)) {
                        // Likely an enum constant - skip for now as they're not really "fields" in the sensitive data sense
                    }
                }
            }
        }
        return { fields, errors };
    }
    matchFieldDeclaration(line) {
        const results = [];
        // Pattern for field declarations: [modifiers] Type name [= value][, name2 [= value2]];
        const fieldPattern = new RegExp(`^(?:${JavaParser.MODIFIERS}\\s+)*(${JavaParser.TYPE_PATTERN})\\s+(\\w+(?:\\s*=\\s*[^,;]+)?(?:\\s*,\\s*\\w+(?:\\s*=\\s*[^,;]+)?)*)\\s*;?$`);
        const match = line.match(fieldPattern);
        if (match) {
            const type = match[1];
            const declarations = match[2];
            // Split multiple declarations: int a, b, c;
            const names = declarations.split(',').map(d => {
                const nameMatch = d.trim().match(/^(\w+)/);
                return nameMatch ? nameMatch[1] : null;
            }).filter((n) => n !== null);
            for (const name of names) {
                if (!this.isKeyword(name)) {
                    results.push({ name, type });
                }
            }
        }
        return results.length > 0 ? results : null;
    }
    matchLocalVariable(line) {
        const results = [];
        // Pattern for local variables: [final] Type name [= value];
        // Also handle var keyword (Java 10+)
        const localVarPattern = new RegExp(`^(?:final\\s+)?(${JavaParser.TYPE_PATTERN}|var)\\s+(\\w+)(?:\\s*=|;)`);
        const match = line.match(localVarPattern);
        if (match) {
            const type = match[1];
            const name = match[2];
            if (!this.isKeyword(name)) {
                results.push({ name, type });
            }
        }
        // Handle for-each loops: for (Type item : collection)
        const forEachMatch = line.match(/for\s*\(\s*(?:final\s+)?(\w+(?:<[^>]+>)?)\s+(\w+)\s*:/);
        if (forEachMatch) {
            const type = forEachMatch[1];
            const name = forEachMatch[2];
            if (!this.isKeyword(name)) {
                results.push({ name, type });
            }
        }
        // Handle traditional for loops: for (int i = 0; ...)
        const forLoopMatch = line.match(/for\s*\(\s*(?:final\s+)?(\w+)\s+(\w+)\s*=/);
        if (forLoopMatch) {
            const type = forLoopMatch[1];
            const name = forLoopMatch[2];
            if (!this.isKeyword(name)) {
                results.push({ name, type });
            }
        }
        return results.length > 0 ? results : null;
    }
    extractMethodParams(paramsStr, filePath, lineNumber, line, lines, currentClass, currentMethod, fields) {
        if (!paramsStr.trim())
            return;
        // Split parameters by comma, handling generics
        const params = this.splitParams(paramsStr);
        for (const param of params) {
            const trimmedParam = param.trim();
            if (!trimmedParam)
                continue;
            // Pattern: [final] [annotations] Type name
            const paramMatch = trimmedParam.match(/(?:final\s+)?(?:@\w+(?:\([^)]*\))?\s+)*(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)$/);
            if (paramMatch) {
                const type = paramMatch[1];
                const name = paramMatch[2];
                fields.push(this.createFieldDeclaration(name, type, filePath, lineNumber, line, lines, `class:${currentClass}.method:${currentMethod}`));
            }
        }
    }
    extractRecordComponents(line, filePath, lineNumber, fullLine, lines, recordName, fields) {
        // Extract components from record declaration: record Name(Type1 name1, Type2 name2)
        const recordMatch = line.match(/record\s+\w+\s*\(([^)]*)\)/);
        if (recordMatch) {
            const components = recordMatch[1];
            const params = this.splitParams(components);
            for (const param of params) {
                const trimmedParam = param.trim();
                if (!trimmedParam)
                    continue;
                const componentMatch = trimmedParam.match(/(\w+(?:<[^>]+>)?(?:\[\])*)\s+(\w+)$/);
                if (componentMatch) {
                    const type = componentMatch[1];
                    const name = componentMatch[2];
                    fields.push(this.createFieldDeclaration(name, type, filePath, lineNumber, fullLine, lines, `record:${recordName}`));
                }
            }
        }
    }
    splitParams(paramsStr) {
        const params = [];
        let current = '';
        let depth = 0;
        for (const char of paramsStr) {
            if (char === '<' || char === '(' || char === '[') {
                depth++;
                current += char;
            }
            else if (char === '>' || char === ')' || char === ']') {
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
    createFieldDeclaration(name, type, filePath, lineNumber, line, lines, parentScope) {
        const startColumn = line.indexOf(name);
        const endColumn = startColumn + name.length;
        return {
            name,
            type,
            location: (0, types_1.createCodeLocation)(filePath, lineNumber, startColumn >= 0 ? startColumn : 0, lineNumber, endColumn >= 0 ? endColumn : name.length),
            context: {
                surroundingCode: (0, types_1.extractSurroundingCode)(lines, lineNumber),
                comments: this.extractJavaComments(lines, lineNumber),
                parentScope,
                usageContexts: [],
            },
        };
    }
    extractJavaComments(lines, lineNumber) {
        const comments = [];
        // Look for comments above the line
        let inBlockComment = false;
        for (let i = lineNumber - 2; i >= Math.max(0, lineNumber - 10); i--) {
            const line = lines[i].trim();
            if (line.endsWith('*/')) {
                inBlockComment = true;
                comments.unshift(line);
                continue;
            }
            if (inBlockComment) {
                comments.unshift(line);
                if (line.startsWith('/*') || line.startsWith('/**')) {
                    inBlockComment = false;
                }
                continue;
            }
            if (line.startsWith('//')) {
                comments.unshift(line);
            }
            else if (line.startsWith('/*') || line.startsWith('/**')) {
                comments.unshift(line);
                break;
            }
            else if (line && !line.startsWith('@')) {
                // Stop at non-comment, non-annotation lines
                break;
            }
        }
        // Check for inline comment
        const currentLine = lines[lineNumber - 1];
        const inlineMatch = currentLine.match(/\/\/.*$/);
        if (inlineMatch) {
            comments.push(inlineMatch[0]);
        }
        return comments;
    }
    isKeyword(word) {
        const keywords = [
            'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
            'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
            'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
            'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
            'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
            'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
            'try', 'void', 'volatile', 'while', 'true', 'false', 'null', 'var', 'record'
        ];
        return keywords.includes(word);
    }
}
exports.JavaParser = JavaParser;
//# sourceMappingURL=java-parser.js.map