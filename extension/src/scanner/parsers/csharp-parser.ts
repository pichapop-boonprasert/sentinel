/**
 * C# parser for extracting field declarations.
 * Uses regex-based parsing for C# source files.
 * 
 * Supports:
 * - Class fields (with modifiers like public, private, protected, internal)
 * - Properties (with get/set accessors)
 * - Local variables
 * - Method parameters
 * - Record components (C# 9+)
 * 
 * @module scanner/parsers/csharp-parser
 */

import { FieldDeclaration, ScanError } from '../../types';
import {
  ILanguageParser,
  ParseResult,
  createCodeLocation,
  extractSurroundingCode,
} from './types';

export class CSharpParser implements ILanguageParser {
  readonly language = 'csharp';

  // C# modifiers
  private static readonly MODIFIERS = '(?:public|private|protected|internal|static|readonly|const|volatile|virtual|override|abstract|sealed|new|extern|unsafe|partial|async)';
  
  // Common C# types (including nullable types)
  private static readonly TYPE_PATTERN = '(?:[A-Z]\\w*(?:<[^>]+>)?(?:\\[\\])*\\??|int\\??|long\\??|short\\??|byte\\??|float\\??|double\\??|decimal\\??|bool\\??|char\\??|string\\??|void|object\\??|dynamic\\??|var)';

  parse(sourceCode: string, filePath: string): ParseResult {
    const fields: FieldDeclaration[] = [];
    const errors: ScanError[] = [];
    const lines = sourceCode.split('\n');

    // Track current scope
    let currentClass: string | null = null;
    let currentMethod: string | null = null;
    let currentRecord: string | null = null;
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

      // Detect class/struct/interface/record declarations
      const classMatch = trimmedLine.match(/(?:class|struct|interface|record)\s+(\w+)/);
      if (classMatch) {
        currentClass = classMatch[1];
        classStartDepth = braceDepth;
        
        // Extract record components if it's a record
        if (trimmedLine.includes('record')) {
          currentRecord = classMatch[1];
          this.extractRecordComponents(trimmedLine, filePath, lineNumber, line, lines, currentRecord, fields);
        }
      }

      // Detect method declarations
      const methodMatch = trimmedLine.match(
        new RegExp(`(?:${CSharpParser.MODIFIERS}\\s+)*(?:${CSharpParser.TYPE_PATTERN}\\s+)(\\w+)\\s*\\(([^)]*)\\)`)
      );
      if (methodMatch && !trimmedLine.includes('new ') && currentClass && !trimmedLine.includes('=>')) {
        currentMethod = methodMatch[1];
        methodStartDepth = braceDepth;
        
        // Extract method parameters
        const params = methodMatch[2];
        if (params) {
          this.extractMethodParams(params, filePath, lineNumber, line, lines, currentClass, currentMethod, fields);
        }
      }

      // Update brace depth BEFORE checking scope exits
      // This fixes Allman brace style support where opening brace is on a new line
      braceDepth += openBraces - closeBraces;

      // Check if we've exited the current method (only on closing braces)
      if (methodStartDepth >= 0 && braceDepth <= methodStartDepth && closeBraces > 0) {
        currentMethod = null;
        methodStartDepth = -1;
      }

      // Check if we've exited the current class (only on closing braces)
      if (classStartDepth >= 0 && braceDepth <= classStartDepth && closeBraces > 0) {
        currentClass = null;
        currentRecord = null;
        classStartDepth = -1;
      }

      // Detect property declarations (class-level)
      if (currentClass && !currentMethod) {
        const propertyMatch = this.matchPropertyDeclaration(trimmedLine);
        if (propertyMatch) {
          fields.push(this.createFieldDeclaration(
            propertyMatch.name,
            propertyMatch.type,
            filePath,
            lineNumber,
            line,
            lines,
            `class:${currentClass}`
          ));
          continue;
        }

        // Detect field declarations (class-level)
        const fieldMatch = this.matchFieldDeclaration(trimmedLine);
        if (fieldMatch) {
          for (const field of fieldMatch) {
            fields.push(this.createFieldDeclaration(
              field.name,
              field.type,
              filePath,
              lineNumber,
              line,
              lines,
              `class:${currentClass}`
            ));
          }
          continue;
        }
      }

      // Detect local variable declarations (method-level)
      if (currentMethod) {
        const localVarMatch = this.matchLocalVariable(trimmedLine);
        if (localVarMatch) {
          for (const variable of localVarMatch) {
            fields.push(this.createFieldDeclaration(
              variable.name,
              variable.type,
              filePath,
              lineNumber,
              line,
              lines,
              `class:${currentClass}.method:${currentMethod}`
            ));
          }
        }
      }
    }

    return { fields, errors };
  }

  private matchPropertyDeclaration(line: string): { name: string; type: string } | null {
    // Pattern for property declarations: [modifiers] Type Name { get; set; }
    // Also handles expression-bodied properties: Type Name => value;
    const propertyPattern = new RegExp(
      `^(?:${CSharpParser.MODIFIERS}\\s+)*(${CSharpParser.TYPE_PATTERN})\\s+(\\w+)\\s*(?:\\{|=>)`
    );
    
    const match = line.match(propertyPattern);
    if (match) {
      const type = match[1];
      const name = match[2];
      
      if (!this.isKeyword(name)) {
        return { name, type };
      }
    }

    return null;
  }

  private matchFieldDeclaration(line: string): { name: string; type: string }[] | null {
    const results: { name: string; type: string }[] = [];
    
    // Pattern for field declarations: [modifiers] Type name [= value][, name2 [= value2]];
    const fieldPattern = new RegExp(
      `^(?:${CSharpParser.MODIFIERS}\\s+)*(${CSharpParser.TYPE_PATTERN})\\s+(\\w+(?:\\s*=\\s*[^,;]+)?(?:\\s*,\\s*\\w+(?:\\s*=\\s*[^,;]+)?)*)\\s*;`
    );
    
    const match = line.match(fieldPattern);
    if (match) {
      const type = match[1];
      const declarations = match[2];
      
      // Split multiple declarations: int a, b, c;
      const names = declarations.split(',').map(d => {
        const nameMatch = d.trim().match(/^(\w+)/);
        return nameMatch ? nameMatch[1] : null;
      }).filter((n): n is string => n !== null);
      
      for (const name of names) {
        if (!this.isKeyword(name)) {
          results.push({ name, type });
        }
      }
    }

    return results.length > 0 ? results : null;
  }

  private matchLocalVariable(line: string): { name: string; type: string }[] | null {
    const results: { name: string; type: string }[] = [];
    
    // Pattern for local variables: [const] Type name [= value];
    // Also handle var keyword
    const localVarPattern = new RegExp(
      `^(?:const\\s+)?(${CSharpParser.TYPE_PATTERN})\\s+(\\w+)(?:\\s*=|;)`
    );
    
    const match = line.match(localVarPattern);
    if (match) {
      const type = match[1];
      const name = match[2];
      
      if (!this.isKeyword(name)) {
        results.push({ name, type });
      }
    }

    // Handle foreach loops: foreach (Type item in collection)
    const foreachMatch = line.match(/foreach\s*\(\s*([\w<>\[\]?]+)\s+(\w+)\s+in\s+/);
    if (foreachMatch) {
      const type = foreachMatch[1];
      const name = foreachMatch[2];
      if (!this.isKeyword(name)) {
        results.push({ name, type });
      }
    }

    // Handle traditional for loops: for (int i = 0; ...)
    const forLoopMatch = line.match(/for\s*\(\s*([\w<>\[\]?]+)\s+(\w+)\s*=/);
    if (forLoopMatch) {
      const type = forLoopMatch[1];
      const name = forLoopMatch[2];
      if (!this.isKeyword(name)) {
        results.push({ name, type });
      }
    }

    // Handle using declarations: using var stream = ...
    const usingMatch = line.match(/using\s+([\w<>\[\]?]+)\s+(\w+)\s*=/);
    if (usingMatch) {
      const type = usingMatch[1];
      const name = usingMatch[2];
      if (!this.isKeyword(name)) {
        results.push({ name, type });
      }
    }

    return results.length > 0 ? results : null;
  }

  private extractMethodParams(
    paramsStr: string,
    filePath: string,
    lineNumber: number,
    line: string,
    lines: string[],
    currentClass: string,
    currentMethod: string,
    fields: FieldDeclaration[]
  ): void {
    if (!paramsStr.trim()) return;

    // Split parameters by comma, handling generics
    const params = this.splitParams(paramsStr);

    for (const param of params) {
      const trimmedParam = param.trim();
      if (!trimmedParam) continue;

      // Pattern: [attributes] [modifiers] Type name [= default]
      // Modifiers: ref, out, in, params, this
      const paramMatch = trimmedParam.match(/(?:\[[^\]]+\]\s*)?(?:(?:ref|out|in|params|this)\s+)*([\w<>\[\]?]+)\s+(\w+)(?:\s*=.*)?$/);
      if (paramMatch) {
        const type = paramMatch[1];
        const name = paramMatch[2];

        fields.push(this.createFieldDeclaration(
          name,
          type,
          filePath,
          lineNumber,
          line,
          lines,
          `class:${currentClass}.method:${currentMethod}`
        ));
      }
    }
  }

  private extractRecordComponents(
    line: string,
    filePath: string,
    lineNumber: number,
    fullLine: string,
    lines: string[],
    recordName: string,
    fields: FieldDeclaration[]
  ): void {
    // Extract components from record declaration: record Name(Type1 name1, Type2 name2)
    const recordMatch = line.match(/record\s+\w+\s*\(([^)]*)\)/);
    if (recordMatch) {
      const components = recordMatch[1];
      const params = this.splitParams(components);

      for (const param of params) {
        const trimmedParam = param.trim();
        if (!trimmedParam) continue;

        const componentMatch = trimmedParam.match(/([\w<>\[\]?]+)\s+(\w+)$/);
        if (componentMatch) {
          const type = componentMatch[1];
          const name = componentMatch[2];

          fields.push(this.createFieldDeclaration(
            name,
            type,
            filePath,
            lineNumber,
            fullLine,
            lines,
            `record:${recordName}`
          ));
        }
      }
    }
  }

  private splitParams(paramsStr: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;

    for (const char of paramsStr) {
      if (char === '<' || char === '(' || char === '[') {
        depth++;
        current += char;
      } else if (char === '>' || char === ')' || char === ']') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        params.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      params.push(current);
    }

    return params;
  }

  private createFieldDeclaration(
    name: string,
    type: string | null,
    filePath: string,
    lineNumber: number,
    line: string,
    lines: string[],
    parentScope: string
  ): FieldDeclaration {
    const startColumn = line.indexOf(name);
    const endColumn = startColumn + name.length;

    return {
      name,
      type,
      location: createCodeLocation(
        filePath,
        lineNumber,
        startColumn >= 0 ? startColumn : 0,
        lineNumber,
        endColumn >= 0 ? endColumn : name.length
      ),
      context: {
        surroundingCode: extractSurroundingCode(lines, lineNumber),
        comments: this.extractCSharpComments(lines, lineNumber),
        parentScope,
        usageContexts: [],
      },
    };
  }

  private extractCSharpComments(lines: string[], lineNumber: number): string[] {
    const comments: string[] = [];
    
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
      
      // XML documentation comments
      if (line.startsWith('///')) {
        comments.unshift(line);
        continue;
      }
      
      if (line.startsWith('//')) {
        comments.unshift(line);
      } else if (line.startsWith('/*') || line.startsWith('/**')) {
        comments.unshift(line);
        break;
      } else if (line && !line.startsWith('[')) {
        // Stop at non-comment, non-attribute lines
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

  private isKeyword(word: string): boolean {
    const keywords = [
      'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
      'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
      'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
      'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
      'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
      'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
      'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
      'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
      'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
      'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while',
      'var', 'dynamic', 'record', 'init', 'with', 'and', 'or', 'not', 'when',
      'async', 'await', 'yield', 'partial', 'get', 'set', 'add', 'remove', 'value'
    ];
    return keywords.includes(word);
  }
}
