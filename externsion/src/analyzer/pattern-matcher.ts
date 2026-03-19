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
 * Valid masking pattern types
 */
const VALID_PATTERN_TYPES: MaskingPatternType[] = ['pii', 'credentials', 'financial', 'health', 'custom'];

/**
 * Error thrown when pattern validation fails
 */
export class PatternValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'PatternValidationError';
  }
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
export class PatternMatcher {
  private patterns: MaskingPattern[] = [];

  /**
   * Creates a new PatternMatcher with the given patterns
   * @param patterns - Array of masking patterns to use for matching
   */
  constructor(patterns: MaskingPattern[] = []) {
    this.patterns = [...patterns];
  }

  /**
   * Validates a regex pattern to ensure it compiles without errors
   * @param pattern - The regex pattern to validate
   * @returns true if valid, false otherwise
   */
  private isValidRegex(pattern: RegExp): boolean {
    try {
      // Test that the regex can be used for matching
      pattern.test('');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates a MaskingPattern structure and its regex patterns
   * @param pattern - The pattern to validate
   * @returns Validation result with any errors found
   */
  validatePattern(pattern: MaskingPattern): PatternValidationResult {
    const errors: PatternValidationError[] = [];

    // Validate required fields
    if (!pattern.id || typeof pattern.id !== 'string' || pattern.id.trim() === '') {
      errors.push(new PatternValidationError(
        'Pattern ID is required and must be a non-empty string',
        'id'
      ));
    }

    if (!pattern.name || typeof pattern.name !== 'string' || pattern.name.trim() === '') {
      errors.push(new PatternValidationError(
        'Pattern name is required and must be a non-empty string',
        'name'
      ));
    }

    if (!pattern.type || !VALID_PATTERN_TYPES.includes(pattern.type)) {
      errors.push(new PatternValidationError(
        `Pattern type must be one of: ${VALID_PATTERN_TYPES.join(', ')}`,
        'type',
        `Received: ${pattern.type}`
      ));
    }

    // Validate fieldNamePatterns array
    if (!Array.isArray(pattern.fieldNamePatterns)) {
      errors.push(new PatternValidationError(
        'fieldNamePatterns must be an array',
        'fieldNamePatterns'
      ));
    } else {
      // Validate each regex in fieldNamePatterns
      pattern.fieldNamePatterns.forEach((regex, index) => {
        if (!(regex instanceof RegExp)) {
          errors.push(new PatternValidationError(
            `fieldNamePatterns[${index}] must be a RegExp`,
            'fieldNamePatterns',
            `Received type: ${typeof regex}`
          ));
        } else if (!this.isValidRegex(regex)) {
          errors.push(new PatternValidationError(
            `fieldNamePatterns[${index}] is an invalid regex`,
            'fieldNamePatterns',
            `Pattern: ${regex.source}`
          ));
        }
      });
    }

    // Validate valuePatterns array
    if (!Array.isArray(pattern.valuePatterns)) {
      errors.push(new PatternValidationError(
        'valuePatterns must be an array',
        'valuePatterns'
      ));
    } else {
      // Validate each regex in valuePatterns
      pattern.valuePatterns.forEach((regex, index) => {
        if (!(regex instanceof RegExp)) {
          errors.push(new PatternValidationError(
            `valuePatterns[${index}] must be a RegExp`,
            'valuePatterns',
            `Received type: ${typeof regex}`
          ));
        } else if (!this.isValidRegex(regex)) {
          errors.push(new PatternValidationError(
            `valuePatterns[${index}] is an invalid regex`,
            'valuePatterns',
            `Pattern: ${regex.source}`
          ));
        }
      });
    }

    // Validate contextIndicators array
    if (!Array.isArray(pattern.contextIndicators)) {
      errors.push(new PatternValidationError(
        'contextIndicators must be an array',
        'contextIndicators'
      ));
    } else {
      // Validate each context indicator is a string
      pattern.contextIndicators.forEach((indicator, index) => {
        if (typeof indicator !== 'string') {
          errors.push(new PatternValidationError(
            `contextIndicators[${index}] must be a string`,
            'contextIndicators',
            `Received type: ${typeof indicator}`
          ));
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Registers a new pattern for matching with validation
   * @param pattern - The pattern to register
   * @param options - Registration options
   * @throws PatternValidationError if pattern is invalid or duplicate ID exists (when allowReplace is false)
   * 
   * Validates: Requirements 6.4
   */
  registerPattern(pattern: MaskingPattern, options: RegisterPatternOptions = {}): void {
    const { allowReplace = false } = options;

    // Validate pattern structure and regex patterns
    const validation = this.validatePattern(pattern);
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ');
      throw new PatternValidationError(
        `Invalid pattern: ${errorMessages}`,
        undefined,
        validation.errors.map(e => e.field).filter(Boolean).join(', ')
      );
    }

    // Check for duplicate IDs
    const existingIndex = this.patterns.findIndex(p => p.id === pattern.id);
    if (existingIndex >= 0) {
      if (allowReplace) {
        // Replace existing pattern with same ID
        this.patterns[existingIndex] = pattern;
      } else {
        throw new PatternValidationError(
          `Pattern with ID '${pattern.id}' already exists. Use allowReplace option to update.`,
          'id',
          `Existing pattern name: ${this.patterns[existingIndex].name}`
        );
      }
    } else {
      this.patterns.push(pattern);
    }
  }

  /**
   * Unregisters a pattern by ID
   * @param patternId - The ID of the pattern to remove
   * @returns true if pattern was removed, false if not found
   */
  unregisterPattern(patternId: string): boolean {
    const index = this.patterns.findIndex(p => p.id === patternId);
    if (index >= 0) {
      this.patterns.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Checks if a pattern with the given ID exists
   * @param patternId - The ID to check
   * @returns true if pattern exists, false otherwise
   */
  hasPattern(patternId: string): boolean {
    return this.patterns.some(p => p.id === patternId);
  }

  /**
   * Gets a pattern by ID
   * @param patternId - The ID of the pattern to get
   * @returns The pattern if found, undefined otherwise
   */
  getPattern(patternId: string): MaskingPattern | undefined {
    return this.patterns.find(p => p.id === patternId);
  }

  /**
   * Gets all registered patterns
   * @returns Array of registered patterns
   */
  getPatterns(): MaskingPattern[] {
    return [...this.patterns];
  }

  /**
   * Gets all patterns of a specific type
   * @param type - The pattern type to filter by
   * @returns Array of patterns matching the type
   */
  getPatternsByType(type: MaskingPatternType): MaskingPattern[] {
    return this.patterns.filter(p => p.type === type);
  }

  /**
   * Matches a field against all registered patterns
   * @param field - The field declaration to match
   * @param fieldValue - Optional field value to match against value patterns
   * @returns The match result with details
   */
  matchField(field: FieldDeclaration, fieldValue?: string): PatternMatchResult {
    let bestMatch: PatternMatchResult = this.createNoMatchResult();

    for (const pattern of this.patterns) {
      const result = this.matchAgainstPattern(field, pattern, fieldValue);
      if (result.matched && result.matchScore > bestMatch.matchScore) {
        bestMatch = result;
      }
    }

    return bestMatch;
  }

  /**
   * Matches a field against a specific pattern
   * @param field - The field declaration to match
   * @param pattern - The pattern to match against
   * @param fieldValue - Optional field value to match against value patterns
   * @returns The match result with details
   */
  matchAgainstPattern(
    field: FieldDeclaration,
    pattern: MaskingPattern,
    fieldValue?: string
  ): PatternMatchResult {
    const matchDetails: MatchDetails = {
      fieldNameMatched: false,
      valueMatched: false,
      contextIndicatorsFound: 0,
      matchedContextIndicators: [],
      matchedFieldNamePattern: null,
      matchedValuePattern: null,
    };

    // Check field name against patterns
    for (const regex of pattern.fieldNamePatterns) {
      if (regex.test(field.name)) {
        matchDetails.fieldNameMatched = true;
        matchDetails.matchedFieldNamePattern = regex.source;
        break;
      }
    }

    // Check field value against value patterns (if provided)
    if (fieldValue && pattern.valuePatterns.length > 0) {
      for (const regex of pattern.valuePatterns) {
        if (regex.test(fieldValue)) {
          matchDetails.valueMatched = true;
          matchDetails.matchedValuePattern = regex.source;
          break;
        }
      }
    }

    // Check context indicators in surrounding code and comments
    const contextText = this.buildContextText(field);
    for (const indicator of pattern.contextIndicators) {
      if (this.containsIndicator(contextText, indicator)) {
        matchDetails.contextIndicatorsFound++;
        matchDetails.matchedContextIndicators.push(indicator);
      }
    }

    // Calculate match score and determine if matched
    const { matched, matchScore, matchStrength } = this.calculateMatchScore(matchDetails, pattern);

    return {
      matched,
      patternType: matched ? pattern.type : null,
      matchedPattern: matched ? pattern : null,
      matchStrength,
      matchScore,
      matchDetails,
    };
  }

  /**
   * Matches multiple fields against all registered patterns
   * @param fields - Array of field declarations to match
   * @returns Array of match results for each field
   */
  matchFields(fields: FieldDeclaration[]): PatternMatchResult[] {
    return fields.map(field => this.matchField(field));
  }

  /**
   * Builds a combined context text from field context for indicator matching
   */
  private buildContextText(field: FieldDeclaration): string {
    const parts: string[] = [];

    // Add surrounding code
    if (field.context.surroundingCode) {
      parts.push(field.context.surroundingCode);
    }

    // Add comments
    if (field.context.comments && field.context.comments.length > 0) {
      parts.push(...field.context.comments);
    }

    // Add parent scope
    if (field.context.parentScope) {
      parts.push(field.context.parentScope);
    }

    // Add field type if available
    if (field.type) {
      parts.push(field.type);
    }

    return parts.join(' ').toLowerCase();
  }

  /**
   * Checks if context text contains an indicator (case-insensitive word boundary match)
   */
  private containsIndicator(contextText: string, indicator: string): boolean {
    const lowerIndicator = indicator.toLowerCase();
    // Use word boundary matching to avoid partial matches
    const regex = new RegExp(`\\b${this.escapeRegex(lowerIndicator)}\\b`, 'i');
    return regex.test(contextText);
  }

  /**
   * Escapes special regex characters in a string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Calculates match score based on match details
   * 
   * Scoring logic:
   * - Field name match: 60 points (strong indicator)
   * - Value match: 25 points (confirms the pattern)
   * - Context indicators: up to 15 points (supporting evidence)
   */
  private calculateMatchScore(
    details: MatchDetails,
    pattern: MaskingPattern
  ): { matched: boolean; matchScore: number; matchStrength: MatchStrength } {
    let score = 0;

    // Field name match is the primary indicator (60 points)
    if (details.fieldNameMatched) {
      score += 60;
    }

    // Value match provides strong confirmation (25 points)
    if (details.valueMatched) {
      score += 25;
    }

    // Context indicators provide supporting evidence (up to 15 points)
    if (details.contextIndicatorsFound > 0) {
      const maxContextScore = 15;
      const indicatorCount = pattern.contextIndicators.length;
      const foundRatio = indicatorCount > 0 
        ? details.contextIndicatorsFound / indicatorCount 
        : 0;
      score += Math.min(maxContextScore, Math.round(foundRatio * maxContextScore * 2));
    }

    // Determine if this counts as a match
    // A match requires at least a field name match OR value match with context
    const matched = details.fieldNameMatched || 
      (details.valueMatched && details.contextIndicatorsFound > 0);

    // Determine match strength
    let matchStrength: MatchStrength;
    if (score >= 70) {
      matchStrength = 'strong';
    } else if (score >= 40) {
      matchStrength = 'medium';
    } else {
      matchStrength = 'weak';
    }

    return { matched, matchScore: Math.min(100, score), matchStrength };
  }

  /**
   * Creates a default no-match result
   */
  private createNoMatchResult(): PatternMatchResult {
    return {
      matched: false,
      patternType: null,
      matchedPattern: null,
      matchStrength: 'weak',
      matchScore: 0,
      matchDetails: {
        fieldNameMatched: false,
        valueMatched: false,
        contextIndicatorsFound: 0,
        matchedContextIndicators: [],
        matchedFieldNamePattern: null,
        matchedValuePattern: null,
      },
    };
  }
}

/**
 * Creates a PatternMatcher with the given patterns
 * @param patterns - Array of masking patterns to use
 * @returns A new PatternMatcher instance
 */
export function createPatternMatcher(patterns: MaskingPattern[] = []): PatternMatcher {
  return new PatternMatcher(patterns);
}
