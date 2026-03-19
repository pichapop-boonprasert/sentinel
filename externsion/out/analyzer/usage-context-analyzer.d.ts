/**
 * Usage Context Analyzer for sensitive data detection
 *
 * Detects how fields are used in code (logging, serialization, API response, storage, display)
 * and assigns risk levels based on the context type.
 *
 * High-risk contexts (logging, serialization, API response) receive higher priority
 * as they are more likely to expose sensitive data.
 *
 * Validates: Requirements 3.3
 */
import { FieldDeclaration, UsageContext } from '../types';
/**
 * Context type with associated detection patterns
 */
interface ContextPattern {
    type: UsageContext['type'];
    /** Patterns that indicate this context type */
    patterns: RegExp[];
    /** Base risk level for this context type */
    baseRisk: UsageContext['risk'];
    /** Whether this is a high-risk context for sensitive data exposure */
    isHighRisk: boolean;
}
/**
 * High-risk context types that should receive elevated priority
 */
export declare const HIGH_RISK_CONTEXT_TYPES: UsageContext['type'][];
/**
 * Medium-risk context types
 */
export declare const MEDIUM_RISK_CONTEXT_TYPES: UsageContext['type'][];
/**
 * Result of analyzing usage contexts for a field
 */
export interface UsageContextAnalysisResult {
    /** Detected usage contexts */
    contexts: UsageContext[];
    /** Whether any high-risk context was detected */
    hasHighRiskContext: boolean;
    /** The highest risk level found */
    highestRisk: UsageContext['risk'];
    /** Summary of detected context types */
    contextTypes: UsageContext['type'][];
}
/**
 * UsageContextAnalyzer class for detecting how fields are used in code
 */
export declare class UsageContextAnalyzer {
    private contextPatterns;
    /**
     * Creates a new UsageContextAnalyzer
     * @param customPatterns - Optional custom patterns to add to default patterns
     */
    constructor(customPatterns?: ContextPattern[]);
    /**
     * Analyzes a field's surrounding code to detect usage contexts
     * @param field - The field declaration to analyze
     * @returns Analysis result with detected contexts
     */
    analyzeField(field: FieldDeclaration): UsageContextAnalysisResult;
    /**
     * Analyzes multiple fields for usage contexts
     * @param fields - Array of field declarations to analyze
     * @returns Array of analysis results
     */
    analyzeFields(fields: FieldDeclaration[]): UsageContextAnalysisResult[];
    /**
     * Checks if a specific context type is present in the surrounding code
     * @param field - The field to check
     * @param contextType - The context type to look for
     * @returns true if the context type is detected
     */
    hasContextType(field: FieldDeclaration, contextType: UsageContext['type']): boolean;
    /**
     * Gets the risk level for a field based on its usage contexts
     * @param field - The field to analyze
     * @returns The highest risk level found, or 'low' if no contexts detected
     */
    getRiskLevel(field: FieldDeclaration): UsageContext['risk'];
    /**
     * Determines if a field is used in any high-risk context
     * @param field - The field to check
     * @returns true if used in logging, serialization, or API response contexts
     */
    isHighRiskUsage(field: FieldDeclaration): boolean;
    /**
     * Builds combined context text from field context for pattern matching
     */
    private buildContextText;
    /**
     * Matches context text against a pattern and creates UsageContext if matched
     */
    private matchContextPattern;
    /**
     * Determines the risk level for a detected context
     */
    private determineRiskLevel;
    /**
     * Determines the highest risk level from a list of contexts
     */
    private determineHighestRisk;
    /**
     * Registers a custom context pattern
     * @param pattern - The custom pattern to register
     */
    registerPattern(pattern: ContextPattern): void;
    /**
     * Gets all registered context patterns
     */
    getPatterns(): ContextPattern[];
}
/**
 * Creates a new UsageContextAnalyzer instance
 * @param customPatterns - Optional custom patterns
 * @returns A new UsageContextAnalyzer
 */
export declare function createUsageContextAnalyzer(customPatterns?: ContextPattern[]): UsageContextAnalyzer;
/**
 * Convenience function to analyze usage contexts for a field
 * @param field - The field to analyze
 * @returns Analysis result with detected contexts
 */
export declare function analyzeUsageContext(field: FieldDeclaration): UsageContextAnalysisResult;
/**
 * Convenience function to check if a field is used in high-risk contexts
 * @param field - The field to check
 * @returns true if used in logging, serialization, or API response contexts
 */
export declare function isHighRiskUsage(field: FieldDeclaration): boolean;
export {};
//# sourceMappingURL=usage-context-analyzer.d.ts.map