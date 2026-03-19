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
import { ILanguageParser, ParseResult } from './types';
export declare class JavaParser implements ILanguageParser {
    readonly language = "java";
    private static readonly MODIFIERS;
    private static readonly TYPE_PATTERN;
    parse(sourceCode: string, filePath: string): ParseResult;
    private matchFieldDeclaration;
    private matchLocalVariable;
    private extractMethodParams;
    private extractRecordComponents;
    private splitParams;
    private createFieldDeclaration;
    private extractJavaComments;
    private isKeyword;
}
//# sourceMappingURL=java-parser.d.ts.map