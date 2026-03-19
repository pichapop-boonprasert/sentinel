"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptParser = exports.JavaScriptParser = void 0;
const babelParser = __importStar(require("@babel/parser"));
const t = __importStar(require("@babel/types"));
const traverse_1 = __importDefault(require("@babel/traverse"));
const types_1 = require("./types");
class JavaScriptParser {
    language = 'javascript';
    parse(sourceCode, filePath) {
        const fields = [];
        const errors = [];
        const lines = sourceCode.split('\n');
        const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
        let ast;
        try {
            ast = babelParser.parse(sourceCode, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    ...(isTypeScript ? ['typescript'] : []),
                    'decorators-legacy',
                    'classProperties',
                    'classPrivateProperties',
                    'classPrivateMethods',
                ],
                errorRecovery: true,
            });
        }
        catch (error) {
            const err = error;
            errors.push({
                filePath,
                message: `Parse error: ${err.message}`,
                line: err.loc?.line,
                recoverable: true, // Syntax errors are recoverable - scanner can continue with other files
            });
            return { fields, errors };
        }
        // Helper to get parent scope from path
        const getParentScope = (path) => {
            const scopes = [];
            let current = path.parentPath;
            while (current) {
                if (current.isClassDeclaration() && current.node.id) {
                    scopes.unshift(`class:${current.node.id.name}`);
                }
                else if (current.isFunctionDeclaration() && current.node.id) {
                    scopes.unshift(`function:${current.node.id.name}`);
                }
                else if (current.isClassMethod() && t.isIdentifier(current.node.key)) {
                    scopes.unshift(`method:${current.node.key.name}`);
                }
                else if (current.isTSInterfaceDeclaration() && current.node.id) {
                    scopes.unshift(`interface:${current.node.id.name}`);
                }
                else if (current.isTSTypeAliasDeclaration() && current.node.id) {
                    scopes.unshift(`type:${current.node.id.name}`);
                }
                current = current.parentPath;
            }
            return scopes.length > 0 ? scopes.join('.') : 'module';
        };
        const createField = (name, type, loc, path) => {
            return {
                name,
                type,
                location: (0, types_1.createCodeLocation)(filePath, loc.start.line, loc.start.column, loc.end.line, loc.end.column),
                context: {
                    surroundingCode: (0, types_1.extractSurroundingCode)(lines, loc.start.line),
                    comments: (0, types_1.extractComments)(lines, loc.start.line),
                    parentScope: getParentScope(path),
                    usageContexts: [],
                },
            };
        };
        (0, traverse_1.default)(ast, {
            // Variable declarations: const x = ..., let y = ..., var z = ...
            VariableDeclarator: (path) => {
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
            ClassProperty: (path) => {
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
            ClassPrivateProperty: (path) => {
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
            ObjectProperty: (path) => {
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
            FunctionDeclaration: (path) => {
                const node = path.node;
                this.extractFunctionParams(node.params, filePath, lines, path, fields, createField);
            },
            // Arrow functions and function expressions
            ArrowFunctionExpression: (path) => {
                this.extractFunctionParams(path.node.params, filePath, lines, path, fields, createField);
            },
            FunctionExpression: (path) => {
                this.extractFunctionParams(path.node.params, filePath, lines, path, fields, createField);
            },
            // Class methods
            ClassMethod: (path) => {
                const node = path.node;
                this.extractFunctionParams(node.params, filePath, lines, path, fields, createField);
            },
            // TypeScript interface properties
            TSPropertySignature: (path) => {
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
    extractTypeAnnotation(node) {
        if (node.typeAnnotation && t.isTSTypeAnnotation(node.typeAnnotation)) {
            return this.extractTSTypeAnnotation(node.typeAnnotation);
        }
        return null;
    }
    extractTypeFromClassProperty(node) {
        if (node.typeAnnotation && t.isTSTypeAnnotation(node.typeAnnotation)) {
            return this.extractTSTypeAnnotation(node.typeAnnotation);
        }
        return null;
    }
    extractTSTypeAnnotation(annotation) {
        if (!annotation || !t.isTSTypeAnnotation(annotation)) {
            return null;
        }
        const typeNode = annotation.typeAnnotation;
        if (t.isTSStringKeyword(typeNode))
            return 'string';
        if (t.isTSNumberKeyword(typeNode))
            return 'number';
        if (t.isTSBooleanKeyword(typeNode))
            return 'boolean';
        if (t.isTSAnyKeyword(typeNode))
            return 'any';
        if (t.isTSNullKeyword(typeNode))
            return 'null';
        if (t.isTSUndefinedKeyword(typeNode))
            return 'undefined';
        if (t.isTSVoidKeyword(typeNode))
            return 'void';
        if (t.isTSTypeReference(typeNode) && t.isIdentifier(typeNode.typeName)) {
            return typeNode.typeName.name;
        }
        if (t.isTSArrayType(typeNode)) {
            const elementType = this.extractTSTypeAnnotation({
                type: 'TSTypeAnnotation',
                typeAnnotation: typeNode.elementType
            });
            return elementType ? `${elementType}[]` : 'array';
        }
        return null;
    }
    extractFromObjectPattern(pattern, filePath, lines, path, fields, createField) {
        for (const prop of pattern.properties) {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.value)) {
                const name = prop.value.name;
                const loc = prop.loc;
                if (loc) {
                    fields.push(createField(name, null, loc, path));
                }
            }
            else if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) {
                const name = prop.argument.name;
                const loc = prop.loc;
                if (loc) {
                    fields.push(createField(name, null, loc, path));
                }
            }
        }
    }
    extractFromArrayPattern(pattern, filePath, lines, path, fields, createField) {
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
    extractFunctionParams(params, filePath, lines, path, fields, createField) {
        for (const param of params) {
            if (t.isIdentifier(param)) {
                const loc = param.loc;
                if (loc) {
                    const typeAnnotation = this.extractTypeAnnotation(param);
                    fields.push(createField(param.name, typeAnnotation, loc, path));
                }
            }
            else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
                const loc = param.left.loc;
                if (loc) {
                    fields.push(createField(param.left.name, null, loc, path));
                }
            }
            else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
                const loc = param.argument.loc;
                if (loc) {
                    fields.push(createField(param.argument.name, null, loc, path));
                }
            }
            else if (t.isObjectPattern(param)) {
                this.extractFromObjectPattern(param, filePath, lines, path, fields, createField);
            }
            else if (t.isArrayPattern(param)) {
                this.extractFromArrayPattern(param, filePath, lines, path, fields, createField);
            }
            else if (t.isTSParameterProperty(param) && t.isIdentifier(param.parameter)) {
                const loc = param.parameter.loc;
                if (loc) {
                    fields.push(createField(param.parameter.name, null, loc, path));
                }
            }
        }
    }
}
exports.JavaScriptParser = JavaScriptParser;
/**
 * TypeScript parser - extends JavaScript parser with TypeScript support
 */
class TypeScriptParser extends JavaScriptParser {
    language = 'typescript';
}
exports.TypeScriptParser = TypeScriptParser;
//# sourceMappingURL=javascript-parser.js.map