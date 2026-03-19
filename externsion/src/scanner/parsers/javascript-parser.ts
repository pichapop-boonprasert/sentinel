/**
 * JavaScript/TypeScript parser for extracting field declarations.
 * Uses @babel/parser for AST parsing.
 * 
 * Supports:
 * - Variable declarations (const, let, var)
 * - Class properties and methods
 * - Object properties
 * - Function parameters
 * - Interface/Type properties (TypeScript)
 * 
 * @module scanner/parsers/javascript-parser
 */

import * as babelParser from '@babel/parser';
import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { FieldDeclaration, ScanError } from '../../types';
import {
  ILanguageParser,
  ParseResult,
  createCodeLocation,
  extractSurroundingCode,
  extractComments,
} from './types';

export class JavaScriptParser implements ILanguageParser {
  readonly language: string = 'javascript';

  parse(sourceCode: string, filePath: string): ParseResult {
    const fields: FieldDeclaration[] = [];
    const errors: ScanError[] = [];
    const lines = sourceCode.split('\n');
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');

    let ast: t.File;
    try {
      ast = babelParser.parse(sourceCode, {
        sourceType: 'module',
        plugins: [
          'jsx',
          ...(isTypeScript ? ['typescript' as const] : []),
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
        ],
        errorRecovery: true,
      });
    } catch (error) {
      const err = error as Error & { loc?: { line: number } };
      errors.push({
        filePath,
        message: `Parse error: ${err.message}`,
        line: err.loc?.line,
        recoverable: true, // Syntax errors are recoverable - scanner can continue with other files
      });
      return { fields, errors };
    }

    // Helper to get parent scope from path
    const getParentScope = (path: NodePath): string => {
      const scopes: string[] = [];
      let current: NodePath | null = path.parentPath;
      
      while (current) {
        if (current.isClassDeclaration() && current.node.id) {
          scopes.unshift(`class:${current.node.id.name}`);
        } else if (current.isFunctionDeclaration() && current.node.id) {
          scopes.unshift(`function:${current.node.id.name}`);
        } else if (current.isClassMethod() && t.isIdentifier(current.node.key)) {
          scopes.unshift(`method:${current.node.key.name}`);
        } else if (current.isTSInterfaceDeclaration() && current.node.id) {
          scopes.unshift(`interface:${current.node.id.name}`);
        } else if (current.isTSTypeAliasDeclaration() && current.node.id) {
          scopes.unshift(`type:${current.node.id.name}`);
        }
        current = current.parentPath;
      }
      
      return scopes.length > 0 ? scopes.join('.') : 'module';
    };

    const createField = (
      name: string,
      type: string | null,
      loc: t.SourceLocation,
      path: NodePath
    ): FieldDeclaration => {
      return {
        name,
        type,
        location: createCodeLocation(
          filePath,
          loc.start.line,
          loc.start.column,
          loc.end.line,
          loc.end.column
        ),
        context: {
          surroundingCode: extractSurroundingCode(lines, loc.start.line),
          comments: extractComments(lines, loc.start.line),
          parentScope: getParentScope(path),
          usageContexts: [],
        },
      };
    };

    traverse(ast, {
      // Variable declarations: const x = ..., let y = ..., var z = ...
      VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => {
        const node = path.node;
        if (t.isIdentifier(node.id)) {
          const name = node.id.name;
          const loc = node.loc;
          if (loc) {
            const typeAnnotation = this.extractTypeAnnotation(node.id);
            fields.push(createField(name, typeAnnotation, loc, path));
          }
        }
        // Handle destructuring: const { a, b } = obj
        if (t.isObjectPattern(node.id)) {
          this.extractFromObjectPattern(node.id, filePath, lines, path, fields, createField);
        }
        // Handle array destructuring: const [a, b] = arr
        if (t.isArrayPattern(node.id)) {
          this.extractFromArrayPattern(node.id, filePath, lines, path, fields, createField);
        }
      },

      // Class properties
      ClassProperty: (path: NodePath<t.ClassProperty>) => {
        const node = path.node;
        if (t.isIdentifier(node.key)) {
          const name = node.key.name;
          const loc = node.loc;
          if (loc) {
            const typeAnnotation = this.extractTypeFromClassProperty(node);
            fields.push(createField(name, typeAnnotation, loc, path));
          }
        }
      },

      // Class private properties
      ClassPrivateProperty: (path: NodePath<t.ClassPrivateProperty>) => {
        const node = path.node;
        if (t.isPrivateName(node.key)) {
          const name = `#${node.key.id.name}`;
          const loc = node.loc;
          if (loc) {
            fields.push(createField(name, null, loc, path));
          }
        }
      },

      // Object properties in object literals
      ObjectProperty: (path: NodePath<t.ObjectProperty>) => {
        const node = path.node;
        // Only capture if parent is an ObjectExpression (not destructuring)
        if (t.isObjectExpression(path.parent)) {
          if (t.isIdentifier(node.key) || t.isStringLiteral(node.key)) {
            const name = t.isIdentifier(node.key) ? node.key.name : node.key.value;
            const loc = node.loc;
            if (loc) {
              fields.push(createField(name, null, loc, path));
            }
          }
        }
      },

      // Function parameters
      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        const node = path.node;
        this.extractFunctionParams(node.params, filePath, lines, path, fields, createField);
      },

      // Arrow functions and function expressions
      ArrowFunctionExpression: (path: NodePath<t.ArrowFunctionExpression>) => {
        this.extractFunctionParams(path.node.params, filePath, lines, path, fields, createField);
      },

      FunctionExpression: (path: NodePath<t.FunctionExpression>) => {
        this.extractFunctionParams(path.node.params, filePath, lines, path, fields, createField);
      },

      // Class methods
      ClassMethod: (path: NodePath<t.ClassMethod>) => {
        const node = path.node;
        this.extractFunctionParams(node.params, filePath, lines, path, fields, createField);
      },

      // TypeScript interface properties
      TSPropertySignature: (path: NodePath<t.TSPropertySignature>) => {
        const node = path.node;
        if (t.isIdentifier(node.key)) {
          const name = node.key.name;
          const loc = node.loc;
          if (loc) {
            const typeAnnotation = this.extractTSTypeAnnotation(node.typeAnnotation);
            fields.push(createField(name, typeAnnotation, loc, path));
          }
        }
      },
    });

    return { fields, errors };
  }

  private extractTypeAnnotation(node: t.Identifier): string | null {
    if (node.typeAnnotation && t.isTSTypeAnnotation(node.typeAnnotation)) {
      return this.extractTSTypeAnnotation(node.typeAnnotation);
    }
    return null;
  }

  private extractTypeFromClassProperty(node: t.ClassProperty): string | null {
    if (node.typeAnnotation && t.isTSTypeAnnotation(node.typeAnnotation)) {
      return this.extractTSTypeAnnotation(node.typeAnnotation);
    }
    return null;
  }

  private extractTSTypeAnnotation(annotation: t.TSTypeAnnotation | null | undefined): string | null {
    if (!annotation || !t.isTSTypeAnnotation(annotation)) {
      return null;
    }
    const typeNode = annotation.typeAnnotation;
    
    if (t.isTSStringKeyword(typeNode)) return 'string';
    if (t.isTSNumberKeyword(typeNode)) return 'number';
    if (t.isTSBooleanKeyword(typeNode)) return 'boolean';
    if (t.isTSAnyKeyword(typeNode)) return 'any';
    if (t.isTSNullKeyword(typeNode)) return 'null';
    if (t.isTSUndefinedKeyword(typeNode)) return 'undefined';
    if (t.isTSVoidKeyword(typeNode)) return 'void';
    if (t.isTSTypeReference(typeNode) && t.isIdentifier(typeNode.typeName)) {
      return typeNode.typeName.name;
    }
    if (t.isTSArrayType(typeNode)) {
      const elementType = this.extractTSTypeAnnotation({ 
        type: 'TSTypeAnnotation', 
        typeAnnotation: typeNode.elementType 
      } as t.TSTypeAnnotation);
      return elementType ? `${elementType}[]` : 'array';
    }
    
    return null;
  }

  private extractFromObjectPattern(
    pattern: t.ObjectPattern,
    filePath: string,
    lines: string[],
    path: NodePath,
    fields: FieldDeclaration[],
    createField: (name: string, type: string | null, loc: t.SourceLocation, path: NodePath) => FieldDeclaration
  ): void {
    for (const prop of pattern.properties) {
      if (t.isObjectProperty(prop) && t.isIdentifier(prop.value)) {
        const name = prop.value.name;
        const loc = prop.loc;
        if (loc) {
          fields.push(createField(name, null, loc, path));
        }
      } else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
        const name = prop.argument.name;
        const loc = prop.loc;
        if (loc) {
          fields.push(createField(name, null, loc, path));
        }
      }
    }
  }

  private extractFromArrayPattern(
    pattern: t.ArrayPattern,
    filePath: string,
    lines: string[],
    path: NodePath,
    fields: FieldDeclaration[],
    createField: (name: string, type: string | null, loc: t.SourceLocation, path: NodePath) => FieldDeclaration
  ): void {
    for (const element of pattern.elements) {
      if (t.isIdentifier(element)) {
        const name = element.name;
        const loc = element.loc;
        if (loc) {
          fields.push(createField(name, null, loc, path));
        }
      }
    }
  }

  private extractFunctionParams(
    params: (t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty)[],
    filePath: string,
    lines: string[],
    path: NodePath,
    fields: FieldDeclaration[],
    createField: (name: string, type: string | null, loc: t.SourceLocation, path: NodePath) => FieldDeclaration
  ): void {
    for (const param of params) {
      if (t.isIdentifier(param)) {
        const loc = param.loc;
        if (loc) {
          const typeAnnotation = this.extractTypeAnnotation(param);
          fields.push(createField(param.name, typeAnnotation, loc, path));
        }
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        const loc = param.left.loc;
        if (loc) {
          fields.push(createField(param.left.name, null, loc, path));
        }
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        const loc = param.argument.loc;
        if (loc) {
          fields.push(createField(param.argument.name, null, loc, path));
        }
      } else if (t.isObjectPattern(param)) {
        this.extractFromObjectPattern(param, filePath, lines, path, fields, createField);
      } else if (t.isArrayPattern(param)) {
        this.extractFromArrayPattern(param, filePath, lines, path, fields, createField);
      } else if (t.isTSParameterProperty(param) && t.isIdentifier(param.parameter)) {
        const loc = param.parameter.loc;
        if (loc) {
          fields.push(createField(param.parameter.name, null, loc, path));
        }
      }
    }
  }
}

/**
 * TypeScript parser - extends JavaScript parser with TypeScript support
 */
export class TypeScriptParser extends JavaScriptParser {
  override readonly language: string = 'typescript';
}
