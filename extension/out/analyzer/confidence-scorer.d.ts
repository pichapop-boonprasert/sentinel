/**
 * Confidence Score Calculator for sensitive data detection
 *
 * Calculates a sophisticated confidence score (0-100) based on:
 * - Pattern match strength (from PatternMatcher)
 * - Number and type of context indicators found
 * - Usage context (logging, serialization, API response, etc.)
 * - Field type annotations
 *
 * Validates: Requirements 2.6
 */
import { FieldDeclaration, Priority } from '../types';
import { PatternMatchResult } from './pattern-matcher';
/**
 * Weights for different scoring factors
 */
export interface ScoringWeights {
    /** Weight for pattern match strength (0-1) */
    patternMatch: number;
    /** Weight for context indicators (0-1) */
    contextIndicators: number;
    /** Weight for usage context (0-1) */
    usageContext: number;
    /** Weight for type annotations (0-1) */
    typeAnnotations: number;
}
/**
 * Default scoring weights
 */
export declare const DEFAULT_SCORING_WEIGHTS: ScoringWeights;
/**
 * Input for confidence score calculation
 */
export interface ConfidenceScoreInput {
    /** The field being analyzed */
    field: FieldDeclaration;
    /** Result from pattern matching */
    patternMatchResult: PatternMatchResult;
    /** Optional field value for additional analysis */
    fieldValue?: string;
}
/**
 * Detailed breakdown of confidence score components
 */
export interface ConfidenceScoreBreakdown {
    /** Score from pattern matching (0-100) */
    patternMatchScore: number;
    /** Score from context indicators (0-100) */
    contextIndicatorScore: number;
    /** Score from usage context analysis (0-100) */
    usageContextScore: number;
    /** Score from type annotation analysis (0-100) */
    typeAnnotationScore: number;
    /** Final weighted confidence score (0-100) */
    finalScore: number;
    /** Reasoning for the score */
    reasoning: string;
    /** Determined priority based on score and context */
    priority: Priority;
}
/**
 * ConfidenceScorer class for calculating sophisticated confidence scores
 */
export declare class ConfidenceScorer {
    private weights;
    /**
     * Creates a new ConfidenceScorer with optional custom weights
     * @param weights - Custom scoring weights (defaults to DEFAULT_SCORING_WEIGHTS)
     */
    constructor(weights?: ScoringWeights);
    /**
     * Calculates the confidence score for a field
     * @param input - The input containing field and pattern match result
     * @returns Detailed confidence score breakdown
     */
    calculateScore(input: ConfidenceScoreInput): ConfidenceScoreBreakdown;
    /**
     * Calculates score from pattern match result
     */
    private calculatePatternMatchScore;
    /**
     * Calculates score from context indicators
     */
    private calculateContextIndicatorScore;
    /**
     * Calculates score from usage context analysis
     */
    private calculateUsageContextScore;
    /**
     * Calculates score from type annotations
     */
    private calculateTypeAnnotationScore;
    /**
     * Calculates the final weighted score
     */
    private calculateWeightedScore;
    /**
     * Determines priority based on score and usage context
     */
    private determinePriority;
    /**
     * Generates human-readable reasoning for the score
     */
    private generateReasoning;
    /**
     * Gets multiplier based on match strength
     */
    private getStrengthMultiplier;
    /**
     * Normalizes weights to ensure they sum to 1
     */
    private normalizeWeights;
    /**
     * Clamps a score to the valid range [0, 100]
     */
    private clampScore;
    /**
     * Gets the current scoring weights
     */
    getWeights(): ScoringWeights;
    /**
     * Updates the scoring weights
     */
    setWeights(weights: ScoringWeights): void;
}
/**
 * Creates a ConfidenceScorer with optional custom weights
 * @param weights - Custom scoring weights
 * @returns A new ConfidenceScorer instance
 */
export declare function createConfidenceScorer(weights?: ScoringWeights): ConfidenceScorer;
/**
 * Convenience function to calculate confidence score
 * @param input - The input containing field and pattern match result
 * @param weights - Optional custom scoring weights
 * @returns Detailed confidence score breakdown
 */
export declare function calculateConfidenceScore(input: ConfidenceScoreInput, weights?: ScoringWeights): ConfidenceScoreBreakdown;
//# sourceMappingURL=confidence-scorer.d.ts.map