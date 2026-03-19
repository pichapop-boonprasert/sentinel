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
import { ILanguageParser, ParseResult } from './types';
export declare class JsonParser implements ILanguageParser {
    readonly language = "json";
    parse(sourceCode: string, filePath: string): ParseResult;
    private extractFieldsWithLocations;
    /**
     * Gets the JSON value type as a string
     */
    private getJsonType;
}
//# sourceMappingURL=json-parser.d.ts.map