/**
 * Pattern definition types for sensitive data detection
 */
import { MaskingPattern, MaskingPatternType } from '../../types';
/**
 * Creates a MaskingPattern with the given parameters
 */
export declare function createPattern(id: string, name: string, type: MaskingPatternType, fieldNamePatterns: RegExp[], valuePatterns: RegExp[], contextIndicators: string[]): MaskingPattern;
/**
 * Pattern collection interface for organizing patterns by category
 */
export interface PatternCollection {
    type: MaskingPatternType;
    patterns: MaskingPattern[];
}
//# sourceMappingURL=types.d.ts.map