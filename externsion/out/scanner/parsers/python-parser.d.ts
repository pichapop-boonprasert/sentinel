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
import { ILanguageParser, ParseResult } from './types';
export declare class PythonParser implements ILanguageParser {
    readonly language = "python";
    parse(sourceCode: string, filePath: string): ParseResult;
    private createFieldDeclaration;
    private extractFunctionParams;
    private splitParams;
    private getCurrentScope;
    private isControlFlow;
    private extractPythonComments;
}
//# sourceMappingURL=python-parser.d.ts.map