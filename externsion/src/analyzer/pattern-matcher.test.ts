/**
 * Tests for Pattern Matching Engine
 * 
 * Validates: Requirements 2.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternMatcher, createPatternMatcher, PatternMatchResult, PatternValidationError } from './pattern-matcher';
import { FieldDeclaration, MaskingPattern } from '../types';
import { createPattern } from './patterns/types';
import { builtInPatterns } from './patterns';

// Helper to create a minimal field declaration for testing
function createTestField(
  name: string,
  options: {
    type?: string | null;
    surroundingCode?: string;
    comments?: string[];
    parentScope?: string;
  } = {}
): FieldDeclaration {
  return {
    name,
    type: options.type ?? null,
    location: {
      filePath: 'test.ts',
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: name.length,
    },
    context: {
      surroundingCode: options.surroundingCode ?? '',
      comments: options.comments ?? [],
      parentScope: options.parentScope ?? '',
      usageContexts: [],
    },
  };
}

// Test patterns for unit tests
const testEmailPattern: MaskingPattern = createPattern(
  'test-email',
  'Test Email',
  'pii',
  [/^e[-_]?mail$/i, /email[-_]?address$/i],
  [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/],
  ['contact', 'user', 'notification']
);

const testPasswordPattern: MaskingPattern = createPattern(
  'test-password',
  'Test Password',
  'credentials',
  [/^pass(word)?$/i, /^pwd$/i],
  [/^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/],
  ['auth', 'login', 'security']
);

const testCreditCardPattern: MaskingPattern = createPattern(
  'test-creditcard',
  'Test Credit Card',
  'financial',
  [/^(credit|debit)[-_]?card$/i, /^card[-_]?number$/i],
  [/^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/],
  ['payment', 'billing', 'checkout']
);

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher([testEmailPattern, testPasswordPattern, testCreditCardPattern]);
  });

  describe('constructor and pattern registration', () => {
    it('should create matcher with initial patterns', () => {
      const patterns = matcher.getPatterns();
      expect(patterns).toHaveLength(3);
      expect(patterns.map(p => p.id)).toContain('test-email');
      expect(patterns.map(p => p.id)).toContain('test-password');
      expect(patterns.map(p => p.id)).toContain('test-creditcard');
    });

    it('should create empty matcher when no patterns provided', () => {
      const emptyMatcher = new PatternMatcher();
      expect(emptyMatcher.getPatterns()).toHaveLength(0);
    });

    it('should register new pattern', () => {
      const newPattern = createPattern(
        'test-ssn',
        'Test SSN',
        'pii',
        [/^ssn$/i],
        [],
        ['social', 'security']
      );
      matcher.registerPattern(newPattern);
      expect(matcher.getPatterns()).toHaveLength(4);
      expect(matcher.getPatterns().find(p => p.id === 'test-ssn')).toBeDefined();
    });

    it('should replace pattern with same ID when allowReplace is true', () => {
      const updatedPattern = createPattern(
        'test-email',
        'Updated Email',
        'pii',
        [/^updated[-_]?email$/i],
        [],
        ['updated']
      );
      matcher.registerPattern(updatedPattern, { allowReplace: true });
      expect(matcher.getPatterns()).toHaveLength(3);
      const emailPattern = matcher.getPatterns().find(p => p.id === 'test-email');
      expect(emailPattern?.name).toBe('Updated Email');
    });

    it('should throw error on duplicate ID when allowReplace is false', () => {
      const duplicatePattern = createPattern(
        'test-email',
        'Duplicate Email',
        'pii',
        [/^dup[-_]?email$/i],
        [],
        []
      );
      expect(() => matcher.registerPattern(duplicatePattern)).toThrow(PatternValidationError);
      expect(() => matcher.registerPattern(duplicatePattern)).toThrow(/already exists/);
    });

    it('should unregister pattern by ID', () => {
      const result = matcher.unregisterPattern('test-email');
      expect(result).toBe(true);
      expect(matcher.getPatterns()).toHaveLength(2);
      expect(matcher.getPatterns().find(p => p.id === 'test-email')).toBeUndefined();
    });

    it('should return false when unregistering non-existent pattern', () => {
      const result = matcher.unregisterPattern('non-existent');
      expect(result).toBe(false);
      expect(matcher.getPatterns()).toHaveLength(3);
    });
  });

  describe('field name matching', () => {
    it('should match exact field name', () => {
      const field = createTestField('email');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('pii');
      expect(result.matchedPattern?.id).toBe('test-email');
      expect(result.matchDetails.fieldNameMatched).toBe(true);
    });

    it('should match field name with underscore separator', () => {
      const field = createTestField('e_mail');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('pii');
    });

    it('should match field name with hyphen separator', () => {
      const field = createTestField('e-mail');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('pii');
    });

    it('should match case-insensitively', () => {
      const field = createTestField('EMAIL');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('pii');
    });

    it('should match password field', () => {
      const field = createTestField('password');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('credentials');
      expect(result.matchedPattern?.id).toBe('test-password');
    });

    it('should match pwd abbreviation', () => {
      const field = createTestField('pwd');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('credentials');
    });

    it('should match credit card field', () => {
      const field = createTestField('creditCard');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('financial');
    });

    it('should not match non-sensitive field', () => {
      const field = createTestField('username');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(false);
      expect(result.patternType).toBeNull();
      expect(result.matchedPattern).toBeNull();
    });

    it('should not match unrelated field name', () => {
      const field = createTestField('configuration');
      const result = matcher.matchField(field);
      
      // Should not match because the field name doesn't match any pattern
      expect(result.matched).toBe(false);
    });
  });

  describe('value pattern matching', () => {
    it('should match email value pattern', () => {
      const field = createTestField('contactInfo', { 
        surroundingCode: 'user contact information' 
      });
      const result = matcher.matchField(field, 'test@example.com');
      
      expect(result.matchDetails.valueMatched).toBe(true);
      expect(result.matchDetails.matchedValuePattern).toBeDefined();
    });

    it('should match credit card value pattern', () => {
      const field = createTestField('paymentData', {
        surroundingCode: 'payment checkout billing'
      });
      const result = matcher.matchField(field, '4111-1111-1111-1111');
      
      expect(result.matchDetails.valueMatched).toBe(true);
    });

    it('should not match invalid email value', () => {
      const field = createTestField('data');
      const result = matcher.matchField(field, 'not-an-email');
      
      expect(result.matchDetails.valueMatched).toBe(false);
    });
  });

  describe('context indicator matching', () => {
    it('should find context indicators in surrounding code', () => {
      const field = createTestField('email', {
        surroundingCode: 'send user notification to contact', // 'contact', 'user', 'notification' are context indicators for test email pattern
      });
      const result = matcher.matchField(field);
      
      expect(result.matchDetails.contextIndicatorsFound).toBeGreaterThan(0);
      expect(result.matchDetails.matchedContextIndicators).toContain('contact');
    });

    it('should find context indicators in comments', () => {
      const field = createTestField('email', {
        comments: ['// User notification email address'],
      });
      const result = matcher.matchField(field);
      
      expect(result.matchDetails.contextIndicatorsFound).toBeGreaterThan(0);
      expect(result.matchDetails.matchedContextIndicators).toContain('notification');
    });

    it('should find context indicators in parent scope', () => {
      const field = createTestField('password', {
        parentScope: 'class Auth Service', // 'auth' is a context indicator for password (as separate word)
      });
      const result = matcher.matchField(field);
      
      expect(result.matchDetails.contextIndicatorsFound).toBeGreaterThan(0);
      expect(result.matchDetails.matchedContextIndicators).toContain('auth');
    });

    it('should find context indicators in field type', () => {
      const field = createTestField('cardNumber', {
        type: 'string',
        surroundingCode: 'billing payment information', // 'billing' and 'payment' are context indicators
      });
      const result = matcher.matchField(field);
      
      expect(result.matchDetails.contextIndicatorsFound).toBeGreaterThan(0);
      expect(result.matchDetails.matchedContextIndicators).toContain('billing');
    });

    it('should match context indicators case-insensitively', () => {
      const field = createTestField('email', {
        surroundingCode: 'USER CONTACT NOTIFICATION',
      });
      const result = matcher.matchField(field);
      
      expect(result.matchDetails.contextIndicatorsFound).toBeGreaterThan(0);
    });

    it('should use word boundary matching for indicators', () => {
      const field = createTestField('email', {
        surroundingCode: 'authentication required', // 'auth' should not match 'authentication'
      });
      const result = matcher.matchField(field);
      
      // 'auth' should not match 'authentication' due to word boundary
      expect(result.matchDetails.matchedContextIndicators).not.toContain('auth');
    });
  });

  describe('match scoring', () => {
    it('should assign high score for field name match', () => {
      const field = createTestField('email');
      const result = matcher.matchField(field);
      
      expect(result.matchScore).toBeGreaterThanOrEqual(60);
    });

    it('should assign higher score for field name + context match', () => {
      const fieldWithContext = createTestField('email', {
        surroundingCode: 'user contact notification',
      });
      const fieldWithoutContext = createTestField('email');
      
      const resultWithContext = matcher.matchField(fieldWithContext);
      const resultWithoutContext = matcher.matchField(fieldWithoutContext);
      
      expect(resultWithContext.matchScore).toBeGreaterThan(resultWithoutContext.matchScore);
    });

    it('should assign highest score for field name + value + context match', () => {
      const field = createTestField('email', {
        surroundingCode: 'user contact notification',
      });
      const result = matcher.matchField(field, 'test@example.com');
      
      expect(result.matchScore).toBeGreaterThanOrEqual(85);
      expect(result.matchStrength).toBe('strong');
    });

    it('should assign strong match strength for high scores', () => {
      const field = createTestField('email', {
        surroundingCode: 'user contact notification',
      });
      const result = matcher.matchField(field, 'test@example.com');
      
      expect(result.matchStrength).toBe('strong');
    });

    it('should assign medium match strength for moderate scores', () => {
      const field = createTestField('email');
      const result = matcher.matchField(field);
      
      expect(result.matchStrength).toBe('medium');
    });

    it('should cap score at 100', () => {
      const field = createTestField('email', {
        surroundingCode: 'user contact notification',
        comments: ['// User email for contact and notification'],
        parentScope: 'class UserContactService',
      });
      const result = matcher.matchField(field, 'test@example.com');
      
      expect(result.matchScore).toBeLessThanOrEqual(100);
    });
  });

  describe('matchFields (batch matching)', () => {
    it('should match multiple fields', () => {
      const fields = [
        createTestField('email'),
        createTestField('password'),
        createTestField('username'),
        createTestField('creditCard'),
      ];
      
      const results = matcher.matchFields(fields);
      
      expect(results).toHaveLength(4);
      expect(results[0].matched).toBe(true);
      expect(results[0].patternType).toBe('pii');
      expect(results[1].matched).toBe(true);
      expect(results[1].patternType).toBe('credentials');
      expect(results[2].matched).toBe(false);
      expect(results[3].matched).toBe(true);
      expect(results[3].patternType).toBe('financial');
    });

    it('should return empty array for empty input', () => {
      const results = matcher.matchFields([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('best match selection', () => {
    it('should select pattern with highest score when multiple match', () => {
      // Create a matcher with overlapping patterns
      const overlappingMatcher = new PatternMatcher([
        createPattern('generic-email', 'Generic Email', 'pii', [/email/i], [], []),
        createPattern('specific-email', 'Specific Email', 'pii', [/^email$/i], [], ['user', 'contact']),
      ]);
      
      const field = createTestField('email', {
        surroundingCode: 'user contact information',
      });
      const result = overlappingMatcher.matchField(field);
      
      // Should match the more specific pattern with context
      expect(result.matched).toBe(true);
      expect(result.matchedPattern?.id).toBe('specific-email');
    });
  });

  describe('matchAgainstPattern (specific pattern matching)', () => {
    it('should match field against specific pattern', () => {
      const field = createTestField('email');
      const result = matcher.matchAgainstPattern(field, testEmailPattern);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('pii');
    });

    it('should not match field against non-matching pattern', () => {
      const field = createTestField('email');
      const result = matcher.matchAgainstPattern(field, testPasswordPattern);
      
      expect(result.matched).toBe(false);
    });
  });
});

describe('createPatternMatcher factory', () => {
  it('should create matcher with provided patterns', () => {
    const matcher = createPatternMatcher([testEmailPattern]);
    expect(matcher.getPatterns()).toHaveLength(1);
  });

  it('should create empty matcher when no patterns provided', () => {
    const matcher = createPatternMatcher();
    expect(matcher.getPatterns()).toHaveLength(0);
  });
});

describe('PatternMatcher with built-in patterns', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher(builtInPatterns);
  });

  it('should detect PII fields', () => {
    const piiFields = [
      createTestField('firstName'),
      createTestField('lastName'),
      createTestField('email'),
      createTestField('phoneNumber'),
      createTestField('address'),
      createTestField('dateOfBirth'),
      createTestField('ssn'),
    ];

    for (const field of piiFields) {
      const result = matcher.matchField(field);
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('pii');
    }
  });

  it('should detect credential fields', () => {
    const credentialFields = [
      createTestField('password'),
      createTestField('apiKey'),
      createTestField('secret'),
      createTestField('accessToken'),
      createTestField('authToken'),
    ];

    for (const field of credentialFields) {
      const result = matcher.matchField(field);
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('credentials');
    }
  });

  it('should detect financial fields', () => {
    const financialFields = [
      createTestField('creditCard'),
      createTestField('cardNumber'),
      createTestField('cvv'),
      createTestField('bankAccount'),
      createTestField('routingNumber'),
    ];

    for (const field of financialFields) {
      const result = matcher.matchField(field);
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('financial');
    }
  });

  it('should detect health fields', () => {
    const healthFields = [
      createTestField('medicalRecord'),
      createTestField('diagnosis'),
      createTestField('patientId'),
      createTestField('insuranceId'),
    ];

    for (const field of healthFields) {
      const result = matcher.matchField(field);
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('health');
    }
  });

  it('should not match non-sensitive fields', () => {
    const nonSensitiveFields = [
      createTestField('count'),
      createTestField('isActive'),
      createTestField('createdAt'),
      createTestField('description'),
      createTestField('title'),
    ];

    for (const field of nonSensitiveFields) {
      const result = matcher.matchField(field);
      expect(result.matched).toBe(false);
    }
  });
});


describe('Custom Pattern Registration - Validates: Requirements 6.4', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('pattern validation', () => {
    it('should validate pattern with all required fields', () => {
      const validPattern = createPattern(
        'custom-employee-id',
        'Employee ID',
        'custom',
        [/^emp(loyee)?[-_]?id$/i],
        [/^EMP-\d{6}$/],
        ['employee', 'staff', 'hr']
      );
      
      const result = matcher.validatePattern(validPattern);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject pattern with empty ID', () => {
      const invalidPattern: MaskingPattern = {
        id: '',
        name: 'Test Pattern',
        type: 'custom',
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should reject pattern with empty name', () => {
      const invalidPattern: MaskingPattern = {
        id: 'test-id',
        name: '',
        type: 'custom',
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject pattern with invalid type', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'invalid-type' as any,
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should accept all valid pattern types', () => {
      const validTypes = ['pii', 'credentials', 'financial', 'health', 'custom'] as const;
      
      for (const type of validTypes) {
        const pattern = createPattern(
          `test-${type}`,
          `Test ${type}`,
          type,
          [/test/],
          [],
          []
        );
        const result = matcher.validatePattern(pattern);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject pattern with non-array fieldNamePatterns', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'custom' as const,
        fieldNamePatterns: 'not-an-array' as any,
        valuePatterns: [],
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'fieldNamePatterns')).toBe(true);
    });

    it('should reject pattern with non-RegExp in fieldNamePatterns', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'custom' as const,
        fieldNamePatterns: ['not-a-regex'] as any,
        valuePatterns: [],
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'fieldNamePatterns')).toBe(true);
    });

    it('should reject pattern with non-array valuePatterns', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'custom' as const,
        fieldNamePatterns: [/test/],
        valuePatterns: 'not-an-array' as any,
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'valuePatterns')).toBe(true);
    });

    it('should reject pattern with non-RegExp in valuePatterns', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'custom' as const,
        fieldNamePatterns: [/test/],
        valuePatterns: [123] as any,
        contextIndicators: [],
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'valuePatterns')).toBe(true);
    });

    it('should reject pattern with non-array contextIndicators', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'custom' as const,
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: 'not-an-array' as any,
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'contextIndicators')).toBe(true);
    });

    it('should reject pattern with non-string in contextIndicators', () => {
      const invalidPattern = {
        id: 'test-id',
        name: 'Test Pattern',
        type: 'custom' as const,
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [123, true] as any,
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'contextIndicators')).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      const invalidPattern = {
        id: '',
        name: '',
        type: 'invalid' as any,
        fieldNamePatterns: 'not-array' as any,
        valuePatterns: 'not-array' as any,
        contextIndicators: 'not-array' as any,
      };
      
      const result = matcher.validatePattern(invalidPattern);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('registerPattern with validation', () => {
    it('should register valid custom pattern', () => {
      const customPattern = createPattern(
        'custom-employee-id',
        'Employee ID',
        'custom',
        [/^emp(loyee)?[-_]?id$/i, /^staff[-_]?number$/i],
        [/^EMP-\d{6}$/],
        ['employee', 'staff', 'hr']
      );
      
      matcher.registerPattern(customPattern);
      expect(matcher.getPatterns()).toHaveLength(1);
      expect(matcher.hasPattern('custom-employee-id')).toBe(true);
    });

    it('should throw PatternValidationError for invalid pattern', () => {
      const invalidPattern = {
        id: '',
        name: 'Test',
        type: 'custom' as const,
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [],
      };
      
      expect(() => matcher.registerPattern(invalidPattern)).toThrow(PatternValidationError);
    });

    it('should throw error with descriptive message for invalid pattern', () => {
      const invalidPattern = {
        id: '',
        name: '',
        type: 'invalid' as any,
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [],
      };
      
      try {
        matcher.registerPattern(invalidPattern);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PatternValidationError);
        expect((error as PatternValidationError).message).toContain('Invalid pattern');
      }
    });

    it('should prevent duplicate pattern IDs by default', () => {
      const pattern1 = createPattern('dup-id', 'Pattern 1', 'custom', [/test1/], [], []);
      const pattern2 = createPattern('dup-id', 'Pattern 2', 'custom', [/test2/], [], []);
      
      matcher.registerPattern(pattern1);
      expect(() => matcher.registerPattern(pattern2)).toThrow(PatternValidationError);
      expect(() => matcher.registerPattern(pattern2)).toThrow(/already exists/);
      
      // Original pattern should still be there
      expect(matcher.getPattern('dup-id')?.name).toBe('Pattern 1');
    });

    it('should allow replacing pattern with allowReplace option', () => {
      const pattern1 = createPattern('dup-id', 'Pattern 1', 'custom', [/test1/], [], []);
      const pattern2 = createPattern('dup-id', 'Pattern 2', 'custom', [/test2/], [], []);
      
      matcher.registerPattern(pattern1);
      matcher.registerPattern(pattern2, { allowReplace: true });
      
      expect(matcher.getPatterns()).toHaveLength(1);
      expect(matcher.getPattern('dup-id')?.name).toBe('Pattern 2');
    });
  });

  describe('custom pattern detection', () => {
    it('should detect fields matching custom pattern', () => {
      const customPattern = createPattern(
        'custom-employee-id',
        'Employee ID',
        'custom',
        [/^emp(loyee)?[-_]?id$/i, /^staff[-_]?number$/i],
        [/^EMP-\d{6}$/],
        ['employee', 'staff', 'hr']
      );
      
      matcher.registerPattern(customPattern);
      
      const field = createTestField('employeeId');
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.patternType).toBe('custom');
      expect(result.matchedPattern?.id).toBe('custom-employee-id');
    });

    it('should detect fields with custom value patterns', () => {
      const customPattern = createPattern(
        'custom-order-id',
        'Order ID',
        'custom',
        [/^order[-_]?id$/i],
        [/^ORD-\d{8}$/],
        ['order', 'purchase']
      );
      
      matcher.registerPattern(customPattern);
      
      const field = createTestField('orderId');
      const result = matcher.matchField(field, 'ORD-12345678');
      
      expect(result.matched).toBe(true);
      expect(result.matchDetails.valueMatched).toBe(true);
    });

    it('should detect fields with custom context indicators', () => {
      const customPattern = createPattern(
        'custom-internal-id',
        'Internal ID',
        'custom',
        [/^internal[-_]?id$/i],
        [],
        ['internal', 'private', 'confidential']
      );
      
      matcher.registerPattern(customPattern);
      
      const field = createTestField('internalId', {
        surroundingCode: 'private internal data',
        comments: ['// confidential information'],
      });
      const result = matcher.matchField(field);
      
      expect(result.matched).toBe(true);
      expect(result.matchDetails.contextIndicatorsFound).toBeGreaterThan(0);
    });

    it('should support multiple custom patterns', () => {
      const pattern1 = createPattern('custom-1', 'Custom 1', 'custom', [/^custom1$/i], [], []);
      const pattern2 = createPattern('custom-2', 'Custom 2', 'custom', [/^custom2$/i], [], []);
      const pattern3 = createPattern('custom-3', 'Custom 3', 'custom', [/^custom3$/i], [], []);
      
      matcher.registerPattern(pattern1);
      matcher.registerPattern(pattern2);
      matcher.registerPattern(pattern3);
      
      expect(matcher.getPatterns()).toHaveLength(3);
      expect(matcher.getPatternsByType('custom')).toHaveLength(3);
      
      expect(matcher.matchField(createTestField('custom1')).matched).toBe(true);
      expect(matcher.matchField(createTestField('custom2')).matched).toBe(true);
      expect(matcher.matchField(createTestField('custom3')).matched).toBe(true);
    });
  });

  describe('helper methods', () => {
    it('should check if pattern exists with hasPattern', () => {
      const pattern = createPattern('test-pattern', 'Test', 'custom', [/test/], [], []);
      
      expect(matcher.hasPattern('test-pattern')).toBe(false);
      matcher.registerPattern(pattern);
      expect(matcher.hasPattern('test-pattern')).toBe(true);
    });

    it('should get pattern by ID', () => {
      const pattern = createPattern('test-pattern', 'Test Pattern', 'custom', [/test/], [], []);
      matcher.registerPattern(pattern);
      
      const retrieved = matcher.getPattern('test-pattern');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Pattern');
    });

    it('should return undefined for non-existent pattern', () => {
      expect(matcher.getPattern('non-existent')).toBeUndefined();
    });

    it('should get patterns by type', () => {
      matcher.registerPattern(createPattern('pii-1', 'PII 1', 'pii', [/pii1/], [], []));
      matcher.registerPattern(createPattern('pii-2', 'PII 2', 'pii', [/pii2/], [], []));
      matcher.registerPattern(createPattern('custom-1', 'Custom 1', 'custom', [/custom1/], [], []));
      
      expect(matcher.getPatternsByType('pii')).toHaveLength(2);
      expect(matcher.getPatternsByType('custom')).toHaveLength(1);
      expect(matcher.getPatternsByType('credentials')).toHaveLength(0);
    });
  });
});
