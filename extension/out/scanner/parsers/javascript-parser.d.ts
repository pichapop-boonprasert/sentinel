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
import { ILanguageParser, ParseResult } from './types';
export declare class JavaScriptParser implements ILanguageParser {
    readonly language: string;
    parse(sourceCode: string, filePath: string): ParseResult;
    private extractTypeAnnotation;
    private extractTypeFromClassProperty;
    private extractTSTypeAnnotation;
    private extractFromObjectPattern;
    private extractFromArrayPattern;
    private extractFunctionParams;
}
/**
 * TypeScript parser - extends JavaScript parser with TypeScript support
 */
export declare class TypeScriptParser extends JavaScriptParser {
    readonly language: string;
}
//# sourceMappingURL=javascript-parser.d.ts.map