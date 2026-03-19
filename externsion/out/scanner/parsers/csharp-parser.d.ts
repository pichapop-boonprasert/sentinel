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
import { ILanguageParser, ParseResult } from './types';
export declare class CSharpParser implements ILanguageParser {
    readonly language = "csharp";
    private static readonly MODIFIERS;
    private static readonly TYPE_PATTERN;
    parse(sourceCode: string, filePath: string): ParseResult;
    private matchPropertyDeclaration;
    private matchFieldDeclaration;
    private matchLocalVariable;
    private extractMethodParams;
    private extractRecordComponents;
    private splitParams;
    private createFieldDeclaration;
    private extractCSharpComments;
    private isKeyword;
}
//# sourceMappingURL=csharp-parser.d.ts.map