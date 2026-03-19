/**
 * Pattern Matching Engine for sensitive data detection
 *
 * Matches field names against registered patterns, considering:
 * - Field name patterns
 * - Value patterns (optional)
 * - Context indicators in surrounding code and comments
 *
 * Validates: Requirements 2.5, 6.4
 */
import { FieldDeclaration, MaskingPattern, MaskingPatternType } from '../types';
/**
 * Error thrown when pattern validation fails
 */
export declare class PatternValidationError extends Error {
    readonly field?: string | undefined;
    readonly details?: string | undefined;
    constructor(message: string, field?: string | undefined, details?: string | undefined);
}
/**
 * Result of pattern validation
 */
export interface PatternValidationResult {
    valid: boolean;
    errors: PatternValidationError[];
}
/**
 * Options for pattern registration
 */
export interface RegisterPatternOptions {
    /** If true, replaces existing pattern with same ID. If false, throws error on duplicate. Default: false */
    allowReplace?: boolean;
}
/**
 * Match strength levels for pattern matching
 */
export type MatchStrength = 'strong' | 'medium' | 'weak';
/**
 * Result of matching a field against patterns
 */
export interface PatternMatchResult {
    /** Whether any pattern matched */
    matched: boolean;
    /** The type of pattern that matched */
    patternType: MaskingPatternType | null;
    /** The specific pattern that matched */
    matchedPattern: MaskingPattern | null;
    /** Strength of the match */
    matchStrength: MatchStrength;
    /** Score from 0-100 indicating match confidence */
    matchScore: number;
    /** Details about what matched */
    matchDetails: MatchDetails;
}
/**
 * Details about what aspects of the field matched
 */
export interface MatchDetails {
    /** Whether field name matched a pattern */
    fieldNameMatched: boolean;
    /** Whether field value matched a pattern */
    valueMatched: boolean;
    /** Number of context indicators found */
    contextIndicatorsFound: number;
    /** List of matched context indicators */
    matchedContextIndicators: string[];
    /** The specific regex that matched the field name */
    matchedFieldNamePattern: string | null;
    /** The specific regex that matched the value */
    matchedValuePattern: string | null;
}
/**
 * Pattern Matcher class for detecting sensitive data patterns
 */
export declare class PatternMatcher {
    private patterns;
    /**
     * Creates a new PatternMatcher with the given patterns
     * @param patterns - Array of masking patterns to use for matching
     */
    constructor(patterns?: MaskingPattern[]);
    /**
     * Validates a regex pattern to ensure it compiles without errors
     * @param pattern - The regex pattern to validate
     * @returns true if valid, false otherwise
     */
    private isValidRegex;
    /**
     * Validates a MaskingPattern structure and its regex patterns
     * @param pattern - The pattern to validate
     * @returns Validation result with any errors found
     */
    validatePattern(pattern: MaskingPattern): PatternValidationResult;
    /**
     * Registers a new pattern for matching with validation
     * @param pattern - The pattern to register
     * @param options - Registration options
     * @throws PatternValidationError if pattern is invalid or duplicate ID exists (when allowReplace is false)
     *
     * Validates: Requirements 6.4
     */
    registerPattern(pattern: MaskingPattern, options?: RegisterPatternOptions): void;
    /**
     * Unregisters a pattern by ID
     * @param patternId - The ID of the pattern to remove
     * @returns true if pattern was removed, false if not found
     */
    unregisterPattern(patternId: string): boolean;
    /**
     * Checks if a pattern with the given ID exists
     * @param patternId - The ID to check
     * @returns true if pattern exists, false otherwise
     */
    hasPattern(patternId: string): boolean;
    /**
     * Gets a pattern by ID
     * @param patternId - The ID of the pattern to get
     * @returns The pattern if found, undefined otherwise
     */
    getPattern(patternId: string): MaskingPattern | undefined;
    /**
     * Gets all registered patterns
     * @returns Array of registered patterns
     */
    getPatterns(): MaskingPattern[];
    /**
     * Gets all patterns of a specific type
     * @param type - The pattern type to filter by
     * @returns Array of patterns matching the type
     */
    getPatternsByType(type: MaskingPatternType): MaskingPattern[];
    /**
     * Matches a field against all registered patterns
     * @param field - The field declaration to match
     * @param fieldValue - Optional field value to match against value patterns
     * @returns The match result with details
     */
    matchField(field: FieldDeclaration, fieldValue?: string): PatternMatchResult;
    /**
     * Matches a field against a specific pattern
     * @param field - The field declaration to match
     * @param pattern - The pattern to match against
     * @param fieldValue - Optional field value to match against value patterns
     * @returns The match result with details
     */
    matchAgainstPattern(field: FieldDeclaration, pattern: MaskingPattern, fieldValue?: string): PatternMatchResult;
    /**
     * Matches multiple fields against all registered patterns
     * @param fields - Array of field declarations to match
     * @returns Array of match results for each field
     */
    matchFields(fields: FieldDeclaration[]): PatternMatchResult[];
    /**
     * Builds a combined context text from field context for indicator matching
     */
    private buildContextText;
    /**
     * Checks if context text contains an indicator (case-insensitive word boundary match)
     */
    private containsIndicator;
    /**
     * Escapes special regex characters in a string
     */
    private escapeRegex;
    /**
     * Calculates match score based on match details
     *
     * Scoring logic:
     * - Field name match: 60 points (strong indicator)
     * - Value match: 25 points (confirms the pattern)
     * - Context indicators: up to 15 points (supporting evidence)
     */
    private calculateMatchScore;
    /**
     * Creates a default no-match result
     */
    private createNoMatchResult;
}
/**
 * Creates a PatternMatcher with the given patterns
 * @param patterns - Array of masking patterns to use
 * @returns A new PatternMatcher instance
 */
export declare function createPatternMatcher(patterns?: MaskingPattern[]): PatternMatcher;
//# sourceMappingURL=pattern-matcher.d.ts.map