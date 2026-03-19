/**
 * Built-in sensitive data patterns for the Analyzer component
 *
 * This module exports pattern definitions for detecting:
 * - PII (Personally Identifiable Information) - Requirement 2.1
 * - Credentials (passwords, API keys, tokens) - Requirement 2.2
 * - Financial data (credit cards, bank accounts) - Requirement 2.3
 * - Health information (medical records, diagnoses) - Requirement 2.4
 */
import { MaskingPattern, MaskingPatternType } from '../../types';
export * from './types';
export * from './pii-patterns';
export * from './credentials-patterns';
export * from './financial-patterns';
export * from './health-patterns';
/**
 * All built-in patterns combined
 */
export declare const builtInPatterns: MaskingPattern[];
/**
 * Get patterns by type
 * @param type - The masking pattern type to filter by
 * @returns Array of patterns matching the specified type
 */
export declare function getPatternsByType(type: MaskingPatternType): MaskingPattern[];
/**
 * Get a pattern by its ID
 * @param id - The pattern ID to find
 * @returns The matching pattern or undefined
 */
export declare function getPatternById(id: string): MaskingPattern | undefined;
/**
 * Get all pattern IDs grouped by type
 * @returns Object mapping pattern types to arrays of pattern IDs
 */
export declare function getPatternIdsByType(): Record<MaskingPatternType, string[]>;
//# sourceMappingURL=index.d.ts.map