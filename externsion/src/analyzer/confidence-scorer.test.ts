/**
 * Tests for ConfidenceScorer
 * 
 * Validates: Requirements 2.6 - Confidence Score Assignment
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConfidenceScorer,
  createConfidenceScorer,
  calculateConfidenceScore,
  DEFAULT_SCORING_WEIGHTS,
  ScoringWeights,
  ConfidenceScoreInput,
} from './confidence-scorer';
import { PatternMatchResult, MatchDetails } from './pattern-matcher';
import { FieldDeclaration, UsageContext, MaskingPattern } from '../types';

// Helper to create a mock field declaration
function createMockField(overrides: Partial<FieldDeclaration> = {}): FieldDeclaration {
  return {
    name: 'testField',
    type: null,
    location: {
      filePath: 'test.ts',
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 10,
    },
    context: {
      surroundingCode: '',
      comments: [],
      parentScope: '',
      usageContexts: [],
    },
    ...overrides,
  };
}

// Helper to create mock match details
function createMockMatchDetails(overrides: Partial<MatchDetails> = {}): MatchDetails {
  return {
    fieldNameMatched: false,
    valueMatched: false,
    contextIndicatorsFound: 0,
    matchedContextIndicators: [],
    matchedFieldNamePattern: null,
    matchedValuePattern: null,
    ...overrides,
  };
}

// Helper to create a mock pattern
function createMockPattern(overrides: Partial<MaskingPattern> = {}): MaskingPattern {
  return {
    id: 'test-pattern',
    name: 'Test Pattern',
    type: 'pii',
    fieldNamePatterns: [/test/i],
    valuePatterns: [],
    contextIndicators: ['personal', 'private'],
    ...overrides,
  };
}

// Helper to create a mock pattern match result
function createMockPatternMatchResult(overrides: Partial<PatternMatchResult> = {}): PatternMatchResult {
  return {
    matched: false,
    patternType: null,
    matchedPattern: null,
    matchStrength: 'weak',
    matchScore: 0,
    matchDetails: createMockMatchDetails(),
    ...overrides,
  };
}

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });

  describe('constructor', () => {
    it('should use default weights when none provided', () => {
      const weights = scorer.getWeights();
      // Use toBeCloseTo for floating-point comparison
      expect(weights.patternMatch).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.patternMatch, 5);
      expect(weights.contextIndicators).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.contextIndicators, 5);
      expect(weights.usageContext).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.usageContext, 5);
      expect(weights.typeAnnotations).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.typeAnnotations, 5);
    });

    it('should normalize custom weights to sum to 1', () => {
      const customWeights: ScoringWeights = {
        patternMatch: 2,
        contextIndicators: 1,
        usageContext: 1,
        typeAnnotations: 0,
      };
      const customScorer = new ConfidenceScorer(customWeights);
      const weights = customScorer.getWeights();
      
      const sum = weights.patternMatch + weights.contextIndicators + 
                  weights.usageContext + weights.typeAnnotations;
      expect(sum).toBeCloseTo(1, 5);
    });

    it('should use default weights when all custom weights are zero', () => {
      const zeroWeights: ScoringWeights = {
        patternMatch: 0,
        contextIndicators: 0,
        usageContext: 0,
        typeAnnotations: 0,
      };
      const customScorer = new ConfidenceScorer(zeroWeights);
      expect(customScorer.getWeights()).toEqual(DEFAULT_SCORING_WEIGHTS);
    });
  });

  describe('calculateScore', () => {
    it('should return score of 0 for non-matching field', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult(),
      };

      const result = scorer.calculateScore(input);

      expect(result.finalScore).toBe(0);
      expect(result.patternMatchScore).toBe(0);
      expect(result.priority).toBe('low');
    });

    it('should return score between 0 and 100 for matching field', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField({ name: 'userEmail' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          patternType: 'pii',
          matchedPattern: createMockPattern({ name: 'Email' }),
          matchStrength: 'strong',
          matchScore: 60,
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            matchedFieldNamePattern: 'email',
          }),
        }),
      };

      const result = scorer.calculateScore(input);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(100);
    });

    it('should always return scores between 0 and 100', () => {
      // Test with maximum possible inputs
      const input: ConfidenceScoreInput = {
        field: createMockField({
          name: 'userPassword',
          type: 'SecretString',
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [
              { type: 'logging', location: createMockField().location, risk: 'high' },
              { type: 'api_response', location: createMockField().location, risk: 'high' },
              { type: 'serialization', location: createMockField().location, risk: 'high' },
            ],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          patternType: 'credentials',
          matchedPattern: createMockPattern({ name: 'Password' }),
          matchStrength: 'strong',
          matchScore: 100,
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            valueMatched: true,
            contextIndicatorsFound: 5,
            matchedContextIndicators: ['password', 'secret', 'credential', 'auth', 'private'],
          }),
        }),
      };

      const result = scorer.calculateScore(input);

      expect(result.finalScore).toBeGreaterThanOrEqual(0);
      expect(result.finalScore).toBeLessThanOrEqual(100);
      expect(result.patternMatchScore).toBeLessThanOrEqual(100);
      expect(result.contextIndicatorScore).toBeLessThanOrEqual(100);
      expect(result.usageContextScore).toBeLessThanOrEqual(100);
      expect(result.typeAnnotationScore).toBeLessThanOrEqual(100);
    });
  });

  describe('pattern match scoring', () => {
    it('should give higher score for strong matches', () => {
      const strongInput: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 60,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const weakInput: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'weak',
          matchScore: 60,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const strongResult = scorer.calculateScore(strongInput);
      const weakResult = scorer.calculateScore(weakInput);

      expect(strongResult.patternMatchScore).toBeGreaterThan(weakResult.patternMatchScore);
    });

    it('should give bonus for both field name and value matching', () => {
      const fieldOnlyInput: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 60,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            valueMatched: false,
          }),
        }),
      };

      const bothInput: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 60,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            valueMatched: true,
          }),
        }),
      };

      const fieldOnlyResult = scorer.calculateScore(fieldOnlyInput);
      const bothResult = scorer.calculateScore(bothInput);

      expect(bothResult.patternMatchScore).toBeGreaterThan(fieldOnlyResult.patternMatchScore);
    });
  });

  describe('context indicator scoring', () => {
    it('should increase score with more context indicators', () => {
      const oneIndicator: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            contextIndicatorsFound: 1,
            matchedContextIndicators: ['personal'],
          }),
        }),
      };

      const threeIndicators: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            contextIndicatorsFound: 3,
            matchedContextIndicators: ['personal', 'private', 'sensitive'],
          }),
        }),
      };

      const oneResult = scorer.calculateScore(oneIndicator);
      const threeResult = scorer.calculateScore(threeIndicators);

      expect(threeResult.contextIndicatorScore).toBeGreaterThan(oneResult.contextIndicatorScore);
    });

    it('should return 0 for no context indicators', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            contextIndicatorsFound: 0,
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.contextIndicatorScore).toBe(0);
    });
  });

  describe('usage context scoring', () => {
    it('should give higher score for high-risk usage contexts', () => {
      const loggingContext: UsageContext = {
        type: 'logging',
        location: createMockField().location,
        risk: 'high',
      };

      const displayContext: UsageContext = {
        type: 'display',
        location: createMockField().location,
        risk: 'low',
      };

      const highRiskInput: ConfidenceScoreInput = {
        field: createMockField({
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [loggingContext],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const lowRiskInput: ConfidenceScoreInput = {
        field: createMockField({
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [displayContext],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const highRiskResult = scorer.calculateScore(highRiskInput);
      const lowRiskResult = scorer.calculateScore(lowRiskInput);

      expect(highRiskResult.usageContextScore).toBeGreaterThan(lowRiskResult.usageContextScore);
    });

    it('should return 0 for no usage contexts', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.usageContextScore).toBe(0);
    });

    it('should give bonus for multiple high-risk contexts', () => {
      const singleContext: ConfidenceScoreInput = {
        field: createMockField({
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [
              { type: 'logging', location: createMockField().location, risk: 'high' },
            ],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const multipleContexts: ConfidenceScoreInput = {
        field: createMockField({
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [
              { type: 'logging', location: createMockField().location, risk: 'high' },
              { type: 'storage', location: createMockField().location, risk: 'medium' },
            ],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const singleResult = scorer.calculateScore(singleContext);
      const multipleResult = scorer.calculateScore(multipleContexts);

      expect(multipleResult.usageContextScore).toBeGreaterThan(singleResult.usageContextScore);
    });
  });

  describe('type annotation scoring', () => {
    it('should give higher score for sensitive type annotations', () => {
      const sensitiveType: ConfidenceScoreInput = {
        field: createMockField({ type: 'SecretString' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const genericType: ConfidenceScoreInput = {
        field: createMockField({ type: 'number' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const sensitiveResult = scorer.calculateScore(sensitiveType);
      const genericResult = scorer.calculateScore(genericType);

      expect(sensitiveResult.typeAnnotationScore).toBeGreaterThan(genericResult.typeAnnotationScore);
    });

    it('should return 0 for null type', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField({ type: null }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.typeAnnotationScore).toBe(0);
    });

    it('should be case-insensitive for type matching', () => {
      const upperCase: ConfidenceScoreInput = {
        field: createMockField({ type: 'PASSWORD' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const lowerCase: ConfidenceScoreInput = {
        field: createMockField({ type: 'password' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const upperResult = scorer.calculateScore(upperCase);
      const lowerResult = scorer.calculateScore(lowerCase);

      expect(upperResult.typeAnnotationScore).toBe(lowerResult.typeAnnotationScore);
    });
  });

  describe('priority determination', () => {
    it('should assign high priority for score >= 70', () => {
      // Create input that will produce a high final score
      // Pattern match score of 100 * 0.5 = 50
      // Context indicator score of 100 * 0.2 = 20
      // Usage context score of 0 * 0.2 = 0
      // Type annotation score of 0 * 0.1 = 0
      // Total = 70
      const input: ConfidenceScoreInput = {
        field: createMockField({
          type: 'SecretPassword', // Will give type annotation score
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [
              { type: 'logging', location: createMockField().location, risk: 'high' },
            ],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 100,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            valueMatched: true,
            contextIndicatorsFound: 4,
            matchedContextIndicators: ['personal', 'private', 'sensitive', 'secret'],
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.finalScore).toBeGreaterThanOrEqual(70);
      expect(result.priority).toBe('high');
    });

    it('should assign high priority for score >= 50 with high-risk context', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField({
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [
              { type: 'logging', location: createMockField().location, risk: 'high' },
            ],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 80,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            contextIndicatorsFound: 2,
            matchedContextIndicators: ['personal', 'private'],
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.finalScore).toBeGreaterThanOrEqual(50);
      expect(result.priority).toBe('high');
    });

    it('should assign medium priority for score >= 40', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 70,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            contextIndicatorsFound: 1,
            matchedContextIndicators: ['personal'],
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.finalScore).toBeGreaterThanOrEqual(40);
      expect(result.priority).toBe('medium');
    });

    it('should assign low priority for score < 40 without high-risk context', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'weak',
          matchScore: 30,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.priority).toBe('low');
    });
  });

  describe('reasoning generation', () => {
    it('should include pattern match information in reasoning', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField({ name: 'userEmail' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchStrength: 'strong',
          matchScore: 60,
          matchedPattern: createMockPattern({ name: 'Email Pattern' }),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.reasoning).toContain('Email Pattern');
      expect(result.reasoning).toContain('strong');
    });

    it('should include context indicators in reasoning', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({
            fieldNameMatched: true,
            contextIndicatorsFound: 2,
            matchedContextIndicators: ['personal', 'private'],
          }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.reasoning).toContain('personal');
      expect(result.reasoning).toContain('private');
    });

    it('should include usage context in reasoning', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField({
          context: {
            surroundingCode: '',
            comments: [],
            parentScope: '',
            usageContexts: [
              { type: 'logging', location: createMockField().location, risk: 'high' },
            ],
          },
        }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.reasoning).toContain('logging');
      expect(result.reasoning).toContain('high-risk');
    });

    it('should include type annotation in reasoning when present', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField({ type: 'SecretString' }),
        patternMatchResult: createMockPatternMatchResult({
          matched: true,
          matchedPattern: createMockPattern(),
          matchDetails: createMockMatchDetails({ fieldNameMatched: true }),
        }),
      };

      const result = scorer.calculateScore(input);
      expect(result.reasoning).toContain('SecretString');
    });

    it('should provide default reasoning for no indicators', () => {
      const input: ConfidenceScoreInput = {
        field: createMockField(),
        patternMatchResult: createMockPatternMatchResult(),
      };

      const result = scorer.calculateScore(input);
      expect(result.reasoning).toContain('No strong indicators');
    });
  });

  describe('setWeights', () => {
    it('should update weights and normalize them', () => {
      scorer.setWeights({
        patternMatch: 4,
        contextIndicators: 2,
        usageContext: 2,
        typeAnnotations: 2,
      });

      const weights = scorer.getWeights();
      expect(weights.patternMatch).toBeCloseTo(0.4, 5);
      expect(weights.contextIndicators).toBeCloseTo(0.2, 5);
    });
  });
});

describe('createConfidenceScorer', () => {
  it('should create a scorer with default weights', () => {
    const scorer = createConfidenceScorer();
    const weights = scorer.getWeights();
    // Use toBeCloseTo for floating-point comparison
    expect(weights.patternMatch).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.patternMatch, 5);
    expect(weights.contextIndicators).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.contextIndicators, 5);
    expect(weights.usageContext).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.usageContext, 5);
    expect(weights.typeAnnotations).toBeCloseTo(DEFAULT_SCORING_WEIGHTS.typeAnnotations, 5);
  });

  it('should create a scorer with custom weights', () => {
    const customWeights: ScoringWeights = {
      patternMatch: 0.6,
      contextIndicators: 0.2,
      usageContext: 0.1,
      typeAnnotations: 0.1,
    };
    const scorer = createConfidenceScorer(customWeights);
    const weights = scorer.getWeights();
    
    expect(weights.patternMatch).toBeCloseTo(0.6, 5);
  });
});

describe('calculateConfidenceScore', () => {
  it('should calculate score using convenience function', () => {
    const input: ConfidenceScoreInput = {
      field: createMockField({ name: 'password' }),
      patternMatchResult: createMockPatternMatchResult({
        matched: true,
        matchStrength: 'strong',
        matchScore: 70,
        matchedPattern: createMockPattern({ name: 'Password' }),
        matchDetails: createMockMatchDetails({
          fieldNameMatched: true,
        }),
      }),
    };

    const result = calculateConfidenceScore(input);

    expect(result.finalScore).toBeGreaterThanOrEqual(0);
    expect(result.finalScore).toBeLessThanOrEqual(100);
    expect(result.priority).toBeDefined();
    expect(result.reasoning).toBeDefined();
  });
});
