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

import { FieldDeclaration, MaskingPatternType, Priority, UsageContext } from '../types';
import { MatchDetails, MatchStrength, PatternMatchResult } from './pattern-matcher';

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
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  patternMatch: 0.50,      // 50% - Primary indicator
  contextIndicators: 0.20, // 20% - Supporting evidence
  usageContext: 0.20,      // 20% - Risk context
  typeAnnotations: 0.10,   // 10% - Type hints
};

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
 * High-risk usage context types that increase confidence
 */
const HIGH_RISK_USAGE_TYPES: UsageContext['type'][] = ['logging', 'serialization', 'api_response'];

/**
 * Medium-risk usage context types
 */
const MEDIUM_RISK_USAGE_TYPES: UsageContext['type'][] = ['storage', 'display'];

/**
 * Sensitive type annotation keywords
 */
const SENSITIVE_TYPE_KEYWORDS = [
  'string', 'str', 'text', 'varchar',
  'secret', 'password', 'credential',
  'email', 'phone', 'address',
  'ssn', 'social', 'tax',
  'card', 'account', 'bank',
  'token', 'key', 'auth',
  'private', 'personal', 'sensitive',
  'medical', 'health', 'patient',
];

/**
 * ConfidenceScorer class for calculating sophisticated confidence scores
 */
export class ConfidenceScorer {
  private weights: ScoringWeights;

  /**
   * Creates a new ConfidenceScorer with optional custom weights
   * @param weights - Custom scoring weights (defaults to DEFAULT_SCORING_WEIGHTS)
   */
  constructor(weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = this.normalizeWeights(weights);
  }

  /**
   * Calculates the confidence score for a field
   * @param input - The input containing field and pattern match result
   * @returns Detailed confidence score breakdown
   */
  calculateScore(input: ConfidenceScoreInput): ConfidenceScoreBreakdown {
    const { field, patternMatchResult } = input;

    // Calculate individual component scores
    const patternMatchScore = this.calculatePatternMatchScore(patternMatchResult);
    const contextIndicatorScore = this.calculateContextIndicatorScore(patternMatchResult.matchDetails);
    const usageContextScore = this.calculateUsageContextScore(field.context.usageContexts);
    const typeAnnotationScore = this.calculateTypeAnnotationScore(field.type);

    // Calculate weighted final score
    const finalScore = this.calculateWeightedScore(
      patternMatchScore,
      contextIndicatorScore,
      usageContextScore,
      typeAnnotationScore
    );

    // Determine priority based on score and context
    const priority = this.determinePriority(finalScore, field.context.usageContexts);

    // Generate reasoning
    const reasoning = this.generateReasoning(
      patternMatchResult,
      field,
      patternMatchScore,
      contextIndicatorScore,
      usageContextScore,
      typeAnnotationScore
    );

    return {
      patternMatchScore,
      contextIndicatorScore,
      usageContextScore,
      typeAnnotationScore,
      finalScore,
      reasoning,
      priority,
    };
  }

  /**
   * Calculates score from pattern match result
   */
  private calculatePatternMatchScore(result: PatternMatchResult): number {
    if (!result.matched) {
      return 0;
    }

    // Start with the base match score from PatternMatcher
    let score = result.matchScore;

    // Apply strength multiplier
    const strengthMultiplier = this.getStrengthMultiplier(result.matchStrength);
    score = Math.round(score * strengthMultiplier);

    // Bonus for both field name and value matching
    if (result.matchDetails.fieldNameMatched && result.matchDetails.valueMatched) {
      score = Math.min(100, score + 10);
    }

    return this.clampScore(score);
  }

  /**
   * Calculates score from context indicators
   */
  private calculateContextIndicatorScore(details: MatchDetails): number {
    if (details.contextIndicatorsFound === 0) {
      return 0;
    }

    // Base score per indicator (diminishing returns)
    const indicatorCount = details.contextIndicatorsFound;
    
    // First indicator: 40 points, second: 25, third: 20, fourth+: 5 each
    let score = 0;
    if (indicatorCount >= 1) score += 40;
    if (indicatorCount >= 2) score += 25;
    if (indicatorCount >= 3) score += 20;
    if (indicatorCount >= 4) score += Math.min(15, (indicatorCount - 3) * 5);

    return this.clampScore(score);
  }

  /**
   * Calculates score from usage context analysis
   */
  private calculateUsageContextScore(usageContexts: UsageContext[]): number {
    if (!usageContexts || usageContexts.length === 0) {
      return 0;
    }

    let score = 0;
    let hasHighRisk = false;
    let hasMediumRisk = false;

    for (const context of usageContexts) {
      if (HIGH_RISK_USAGE_TYPES.includes(context.type)) {
        hasHighRisk = true;
        // High-risk contexts add significant score
        if (context.risk === 'high') {
          score += 40;
        } else if (context.risk === 'medium') {
          score += 30;
        } else {
          score += 20;
        }
      } else if (MEDIUM_RISK_USAGE_TYPES.includes(context.type)) {
        hasMediumRisk = true;
        // Medium-risk contexts add moderate score
        if (context.risk === 'high') {
          score += 25;
        } else if (context.risk === 'medium') {
          score += 15;
        } else {
          score += 10;
        }
      } else {
        // Other contexts add minimal score
        score += 5;
      }
    }

    // Bonus for multiple high-risk contexts
    if (hasHighRisk && hasMediumRisk) {
      score += 10;
    }

    return this.clampScore(score);
  }

  /**
   * Calculates score from type annotations
   */
  private calculateTypeAnnotationScore(fieldType: string | null): number {
    if (!fieldType) {
      return 0;
    }

    const lowerType = fieldType.toLowerCase();
    let score = 0;
    let matchCount = 0;

    for (const keyword of SENSITIVE_TYPE_KEYWORDS) {
      if (lowerType.includes(keyword)) {
        matchCount++;
        // First match: 50 points, subsequent: 15 each
        if (matchCount === 1) {
          score += 50;
        } else {
          score += 15;
        }
      }
    }

    return this.clampScore(score);
  }

  /**
   * Calculates the final weighted score
   */
  private calculateWeightedScore(
    patternMatchScore: number,
    contextIndicatorScore: number,
    usageContextScore: number,
    typeAnnotationScore: number
  ): number {
    const weightedScore = 
      patternMatchScore * this.weights.patternMatch +
      contextIndicatorScore * this.weights.contextIndicators +
      usageContextScore * this.weights.usageContext +
      typeAnnotationScore * this.weights.typeAnnotations;

    return this.clampScore(Math.round(weightedScore));
  }

  /**
   * Determines priority based on score and usage context
   */
  private determinePriority(score: number, usageContexts: UsageContext[]): Priority {
    // Check for high-risk usage contexts
    const hasHighRiskContext = usageContexts?.some(
      ctx => HIGH_RISK_USAGE_TYPES.includes(ctx.type) && ctx.risk === 'high'
    );

    // High priority: score >= 70 OR (score >= 50 AND high-risk context)
    if (score >= 70 || (score >= 50 && hasHighRiskContext)) {
      return 'high';
    }

    // Medium priority: score >= 40 OR any high-risk context
    if (score >= 40 || hasHighRiskContext) {
      return 'medium';
    }

    // Low priority: everything else
    return 'low';
  }

  /**
   * Generates human-readable reasoning for the score
   */
  private generateReasoning(
    patternMatchResult: PatternMatchResult,
    field: FieldDeclaration,
    patternMatchScore: number,
    contextIndicatorScore: number,
    usageContextScore: number,
    typeAnnotationScore: number
  ): string {
    const reasons: string[] = [];

    // Pattern match reasoning
    if (patternMatchResult.matched && patternMatchResult.matchedPattern) {
      reasons.push(
        `Field name matches ${patternMatchResult.matchedPattern.name} pattern ` +
        `(${patternMatchResult.matchStrength} match, score: ${patternMatchScore})`
      );
    }

    // Context indicator reasoning
    if (patternMatchResult.matchDetails.contextIndicatorsFound > 0) {
      const indicators = patternMatchResult.matchDetails.matchedContextIndicators.join(', ');
      reasons.push(
        `Found ${patternMatchResult.matchDetails.contextIndicatorsFound} context indicator(s): ${indicators} ` +
        `(score: ${contextIndicatorScore})`
      );
    }

    // Usage context reasoning
    if (field.context.usageContexts && field.context.usageContexts.length > 0) {
      const usageTypes = field.context.usageContexts.map(ctx => ctx.type).join(', ');
      const hasHighRisk = field.context.usageContexts.some(
        ctx => HIGH_RISK_USAGE_TYPES.includes(ctx.type)
      );
      if (hasHighRisk) {
        reasons.push(`Used in high-risk context(s): ${usageTypes} (score: ${usageContextScore})`);
      } else {
        reasons.push(`Used in context(s): ${usageTypes} (score: ${usageContextScore})`);
      }
    }

    // Type annotation reasoning
    if (field.type && typeAnnotationScore > 0) {
      reasons.push(`Type annotation "${field.type}" suggests sensitive data (score: ${typeAnnotationScore})`);
    }

    return reasons.length > 0 
      ? reasons.join('. ') + '.'
      : 'No strong indicators of sensitive data found.';
  }

  /**
   * Gets multiplier based on match strength
   */
  private getStrengthMultiplier(strength: MatchStrength): number {
    switch (strength) {
      case 'strong':
        return 1.0;
      case 'medium':
        return 0.85;
      case 'weak':
        return 0.7;
      default:
        return 0.7;
    }
  }

  /**
   * Normalizes weights to ensure they sum to 1
   */
  private normalizeWeights(weights: ScoringWeights): ScoringWeights {
    const sum = weights.patternMatch + weights.contextIndicators + 
                weights.usageContext + weights.typeAnnotations;
    
    if (sum === 0) {
      return DEFAULT_SCORING_WEIGHTS;
    }

    return {
      patternMatch: weights.patternMatch / sum,
      contextIndicators: weights.contextIndicators / sum,
      usageContext: weights.usageContext / sum,
      typeAnnotations: weights.typeAnnotations / sum,
    };
  }

  /**
   * Clamps a score to the valid range [0, 100]
   */
  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gets the current scoring weights
   */
  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  /**
   * Updates the scoring weights
   */
  setWeights(weights: ScoringWeights): void {
    this.weights = this.normalizeWeights(weights);
  }
}

/**
 * Creates a ConfidenceScorer with optional custom weights
 * @param weights - Custom scoring weights
 * @returns A new ConfidenceScorer instance
 */
export function createConfidenceScorer(weights?: ScoringWeights): ConfidenceScorer {
  return new ConfidenceScorer(weights);
}

/**
 * Convenience function to calculate confidence score
 * @param input - The input containing field and pattern match result
 * @param weights - Optional custom scoring weights
 * @returns Detailed confidence score breakdown
 */
export function calculateConfidenceScore(
  input: ConfidenceScoreInput,
  weights?: ScoringWeights
): ConfidenceScoreBreakdown {
  const scorer = new ConfidenceScorer(weights);
  return scorer.calculateScore(input);
}
