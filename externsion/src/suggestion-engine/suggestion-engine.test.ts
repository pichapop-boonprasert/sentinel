/**
 * Tests for Suggestion Engine
 * 
 * Validates: Requirements 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SuggestionEngine,
  createSuggestionEngine,
  SortOptions,
  SuggestionEvent,
} from './suggestion-engine';
import {
  Suggestion,
  SuggestionFilter,
  UserDecision,
  AnalysisResult,
  FieldDeclaration,
  CustomFieldInput,
} from '../types';

// Helper to create a mock field declaration
function createMockField(
  name: string,
  filePath: string = 'test.ts',
  startLine: number = 1
): FieldDeclaration {
  return {
    name,
    type: 'string',
    location: {
      filePath,
      startLine,
      startColumn: 0,
      endLine: startLine,
      endColumn: name.length,
    },
    context: {
      surroundingCode: `const ${name} = "value";`,
      comments: [],
      parentScope: 'TestClass',
      usageContexts: [],
    },
  };
}

// Helper to create a mock analysis result
function createMockAnalysisResult(
  fieldName: string,
  options: {
    filePath?: string;
    confidenceScore?: number;
    patternType?: 'pii' | 'credentials' | 'financial' | 'health' | 'custom';
    priority?: 'high' | 'medium' | 'low';
    isSensitive?: boolean;
  } = {}
): AnalysisResult {
  const {
    filePath = 'test.ts',
    confidenceScore = 85,
    patternType = 'pii',
    priority = 'medium',
    isSensitive = true,
  } = options;

  return {
    field: createMockField(fieldName, filePath),
    isSensitive,
    confidenceScore,
    detectedPatterns: [patternType],
    reasoning: `Field "${fieldName}" matches ${patternType} pattern`,
    priority,
  };
}

describe('SuggestionEngine', () => {
  let engine: SuggestionEngine;

  beforeEach(() => {
    engine = new SuggestionEngine();
  });

  describe('suggestion creation - Validates: Requirements 4.2', () => {
    it('should create a suggestion from analysis result', () => {
      const result = createMockAnalysisResult('userEmail');
      const suggestion = engine.createSuggestion(result);

      expect(suggestion.id).toBeDefined();
      expect(suggestion.field.name).toBe('userEmail');
      expect(suggestion.confidenceScore).toBe(85);
      expect(suggestion.patternType).toBe('pii');
      expect(suggestion.status).toBe('pending');
      expect(suggestion.recommendedAction).toBeDefined();
      expect(suggestion.createdAt).toBeInstanceOf(Date);
      expect(suggestion.reviewedAt).toBeNull();
    });

    it('should generate unique IDs for each suggestion', () => {
      const result1 = createMockAnalysisResult('email1');
      const result2 = createMockAnalysisResult('email2');
      const result3 = createMockAnalysisResult('email3');

      const s1 = engine.createSuggestion(result1);
      const s2 = engine.createSuggestion(result2);
      const s3 = engine.createSuggestion(result3);

      expect(s1.id).not.toBe(s2.id);
      expect(s2.id).not.toBe(s3.id);
      expect(s1.id).not.toBe(s3.id);
    });

    it('should create multiple suggestions from analysis results', () => {
      const results = [
        createMockAnalysisResult('email', { isSensitive: true }),
        createMockAnalysisResult('password', { patternType: 'credentials', isSensitive: true }),
        createMockAnalysisResult('username', { isSensitive: false }),
      ];

      const suggestions = engine.createSuggestions(results);

      // Should only create suggestions for sensitive fields
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0].field.name).toBe('email');
      expect(suggestions[1].field.name).toBe('password');
    });

    it('should determine recommended action based on pattern type', () => {
      const credentialResult = createMockAnalysisResult('password', { patternType: 'credentials' });
      const financialResult = createMockAnalysisResult('creditCard', { patternType: 'financial' });
      const healthResult = createMockAnalysisResult('diagnosis', { patternType: 'health' });
      const piiResult = createMockAnalysisResult('email', { patternType: 'pii' });

      const credentialSuggestion = engine.createSuggestion(credentialResult);
      const financialSuggestion = engine.createSuggestion(financialResult);
      const healthSuggestion = engine.createSuggestion(healthResult);
      const piiSuggestion = engine.createSuggestion(piiResult);

      expect(credentialSuggestion.recommendedAction.type).toBe('redact');
      expect(financialSuggestion.recommendedAction.type).toBe('mask');
      expect(healthSuggestion.recommendedAction.type).toBe('encrypt');
      expect(piiSuggestion.recommendedAction.type).toBe('mask');
    });

    it('should recommend hash for high-priority PII', () => {
      const result = createMockAnalysisResult('ssn', { patternType: 'pii', priority: 'high' });
      const suggestion = engine.createSuggestion(result);

      expect(suggestion.recommendedAction.type).toBe('hash');
    });
  });

  describe('getSuggestions - Validates: Requirements 4.2', () => {
    beforeEach(() => {
      // Add various suggestions for filtering tests
      engine.createSuggestion(createMockAnalysisResult('email', { 
        patternType: 'pii', 
        confidenceScore: 90,
        filePath: 'src/user.ts'
      }));
      engine.createSuggestion(createMockAnalysisResult('password', { 
        patternType: 'credentials', 
        confidenceScore: 95,
        filePath: 'src/auth.ts'
      }));
      engine.createSuggestion(createMockAnalysisResult('creditCard', { 
        patternType: 'financial', 
        confidenceScore: 80,
        filePath: 'src/payment.ts'
      }));
      engine.createSuggestion(createMockAnalysisResult('phone', { 
        patternType: 'pii', 
        confidenceScore: 70,
        filePath: 'src/user.ts'
      }));
    });

    it('should return all suggestions when no filter provided', () => {
      const suggestions = engine.getSuggestions();
      expect(suggestions).toHaveLength(4);
    });

    it('should filter by pattern types', () => {
      const filter: SuggestionFilter = { patternTypes: ['pii'] };
      const suggestions = engine.getSuggestions(filter);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.every(s => s.patternType === 'pii')).toBe(true);
    });

    it('should filter by multiple pattern types', () => {
      const filter: SuggestionFilter = { patternTypes: ['pii', 'credentials'] };
      const suggestions = engine.getSuggestions(filter);

      expect(suggestions).toHaveLength(3);
    });

    it('should filter by minimum confidence', () => {
      const filter: SuggestionFilter = { minConfidence: 85 };
      const suggestions = engine.getSuggestions(filter);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.every(s => s.confidenceScore >= 85)).toBe(true);
    });

    it('should filter by status', () => {
      // Accept one suggestion first
      const allSuggestions = engine.getSuggestions();
      engine.processDecision(allSuggestions[0].id, { action: 'accept' });

      const filter: SuggestionFilter = { status: ['pending'] };
      const suggestions = engine.getSuggestions(filter);

      expect(suggestions).toHaveLength(3);
      expect(suggestions.every(s => s.status === 'pending')).toBe(true);
    });

    it('should filter by file path', () => {
      const filter: SuggestionFilter = { filePath: 'src/user.ts' };
      const suggestions = engine.getSuggestions(filter);

      expect(suggestions).toHaveLength(2);
      expect(suggestions.every(s => s.field.location.filePath === 'src/user.ts')).toBe(true);
    });

    it('should combine multiple filters', () => {
      const filter: SuggestionFilter = {
        patternTypes: ['pii'],
        minConfidence: 80,
        filePath: 'src/user.ts',
      };
      const suggestions = engine.getSuggestions(filter);

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].field.name).toBe('email');
    });
  });

  describe('sortSuggestions - Validates: Requirements 4.5', () => {
    let suggestions: Suggestion[];

    beforeEach(() => {
      engine.createSuggestion(createMockAnalysisResult('email', { 
        confidenceScore: 90,
        filePath: 'src/b.ts',
      }));
      engine.createSuggestion(createMockAnalysisResult('password', { 
        confidenceScore: 70,
        patternType: 'credentials',
        filePath: 'src/a.ts',
      }));
      engine.createSuggestion(createMockAnalysisResult('creditCard', { 
        confidenceScore: 85,
        patternType: 'financial',
        filePath: 'src/c.ts',
      }));
      suggestions = engine.getSuggestions();
    });

    it('should sort by confidence score ascending', () => {
      const sorted = engine.sortSuggestions(suggestions, { 
        criteria: 'confidence', 
        direction: 'asc' 
      });

      expect(sorted[0].confidenceScore).toBe(70);
      expect(sorted[1].confidenceScore).toBe(85);
      expect(sorted[2].confidenceScore).toBe(90);
    });

    it('should sort by confidence score descending', () => {
      const sorted = engine.sortSuggestions(suggestions, { 
        criteria: 'confidence', 
        direction: 'desc' 
      });

      expect(sorted[0].confidenceScore).toBe(90);
      expect(sorted[1].confidenceScore).toBe(85);
      expect(sorted[2].confidenceScore).toBe(70);
    });

    it('should sort by file location', () => {
      const sorted = engine.sortSuggestions(suggestions, { 
        criteria: 'location', 
        direction: 'asc' 
      });

      expect(sorted[0].field.location.filePath).toBe('src/a.ts');
      expect(sorted[1].field.location.filePath).toBe('src/b.ts');
      expect(sorted[2].field.location.filePath).toBe('src/c.ts');
    });

    it('should sort by pattern type', () => {
      const sorted = engine.sortSuggestions(suggestions, { 
        criteria: 'patternType', 
        direction: 'asc' 
      });

      expect(sorted[0].patternType).toBe('credentials');
      expect(sorted[1].patternType).toBe('financial');
      expect(sorted[2].patternType).toBe('pii');
    });

    it('should sort by status', () => {
      // Set different statuses
      const all = engine.getSuggestions();
      engine.processDecision(all[0].id, { action: 'accept' });
      engine.processDecision(all[1].id, { action: 'defer' });

      const updated = engine.getSuggestions();
      const sorted = engine.sortSuggestions(updated, { 
        criteria: 'status', 
        direction: 'asc' 
      });

      expect(sorted[0].status).toBe('pending');
      expect(sorted[1].status).toBe('deferred');
      expect(sorted[2].status).toBe('accepted');
    });

    it('should not modify original array', () => {
      const original = [...suggestions];
      engine.sortSuggestions(suggestions, { criteria: 'confidence', direction: 'asc' });

      expect(suggestions).toEqual(original);
    });
  });

  describe('processDecision - Validates: Requirements 5.1, 5.2, 5.3', () => {
    let suggestionId: string;

    beforeEach(() => {
      const result = createMockAnalysisResult('email');
      const suggestion = engine.createSuggestion(result);
      suggestionId = suggestion.id;
    });

    it('should update status to accepted on accept decision', async () => {
      await engine.processDecision(suggestionId, { action: 'accept' });

      const suggestion = engine.getSuggestionById(suggestionId);
      expect(suggestion?.status).toBe('accepted');
      expect(suggestion?.reviewedAt).toBeInstanceOf(Date);
    });

    it('should update status to rejected on reject decision', async () => {
      await engine.processDecision(suggestionId, { action: 'reject' });

      const suggestion = engine.getSuggestionById(suggestionId);
      expect(suggestion?.status).toBe('rejected');
    });

    it('should update status to deferred on defer decision - Validates: Requirements 5.3', async () => {
      await engine.processDecision(suggestionId, { action: 'defer' });

      const suggestion = engine.getSuggestionById(suggestionId);
      expect(suggestion?.status).toBe('deferred');
      
      // Deferred suggestions should remain visible
      const pendingAndDeferred = engine.getSuggestions({ status: ['pending', 'deferred'] });
      expect(pendingAndDeferred.some(s => s.id === suggestionId)).toBe(true);
    });

    it('should throw error for non-existent suggestion', async () => {
      await expect(
        engine.processDecision('non-existent', { action: 'accept' })
      ).rejects.toThrow('Suggestion not found');
    });

    it('should call persist callback when set', async () => {
      const persistCallback = vi.fn().mockResolvedValue(undefined);
      engine.setDecisionPersistCallback(persistCallback);

      await engine.processDecision(suggestionId, { action: 'accept', notes: 'Test note' });

      expect(persistCallback).toHaveBeenCalledWith(
        suggestionId,
        { action: 'accept', notes: 'Test note' },
        expect.objectContaining({ id: suggestionId, status: 'accepted' })
      );
    });

    it('should emit decision-made event', async () => {
      const listener = vi.fn();
      engine.addEventListener(listener);

      await engine.processDecision(suggestionId, { action: 'accept' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'decision-made',
          decision: { action: 'accept' },
        })
      );
    });
  });

  describe('applyToSimilar - Validates: Requirements 5.5', () => {
    beforeEach(() => {
      // Create suggestions with same field name in different files
      engine.createSuggestion(createMockAnalysisResult('userEmail', { filePath: 'src/user.ts' }));
      engine.createSuggestion(createMockAnalysisResult('userEmail', { filePath: 'src/profile.ts' }));
      engine.createSuggestion(createMockAnalysisResult('userEmail', { filePath: 'src/settings.ts' }));
      engine.createSuggestion(createMockAnalysisResult('password', { filePath: 'src/auth.ts' }));
    });

    it('should apply decision to all suggestions with same field name', async () => {
      const suggestions = engine.getSuggestions();
      const firstEmailSuggestion = suggestions.find(s => s.field.name === 'userEmail')!;

      // First process the decision on the original suggestion
      await engine.processDecision(firstEmailSuggestion.id, { action: 'accept' });

      // Then apply to similar (this is typically called with applyToSimilar: true in processDecision)
      const updatedCount = await engine.applyToSimilar(firstEmailSuggestion.id, { action: 'accept' });

      // Should update the other 2 userEmail suggestions (not the original which is already accepted)
      expect(updatedCount).toBe(2);

      const emailSuggestions = engine.getSuggestions({ patternTypes: ['pii'] })
        .filter(s => s.field.name === 'userEmail');
      
      expect(emailSuggestions.every(s => s.status === 'accepted')).toBe(true);
    });

    it('should not affect suggestions with different field names', async () => {
      const suggestions = engine.getSuggestions();
      const emailSuggestion = suggestions.find(s => s.field.name === 'userEmail')!;

      await engine.applyToSimilar(emailSuggestion.id, { action: 'accept' });

      const passwordSuggestion = engine.getSuggestions()
        .find(s => s.field.name === 'password');
      
      expect(passwordSuggestion?.status).toBe('pending');
    });

    it('should call findSimilarFieldsCallback when set', async () => {
      const findCallback = vi.fn().mockResolvedValue([
        createMockField('userEmail', 'src/new-file.ts'),
      ]);
      engine.setFindSimilarFieldsCallback(findCallback);

      const suggestions = engine.getSuggestions();
      const emailSuggestion = suggestions.find(s => s.field.name === 'userEmail')!;

      await engine.applyToSimilar(emailSuggestion.id, { action: 'accept' });

      expect(findCallback).toHaveBeenCalledWith('userEmail', emailSuggestion.field.location.filePath);
    });
  });

  describe('addCustomField - Validates: Requirements 5.4', () => {
    it('should create a suggestion for custom field', async () => {
      const input: CustomFieldInput = {
        fieldName: 'customSecret',
        filePath: 'src/config.ts',
        patternType: 'credentials',
        notes: 'Custom secret field',
      };

      const suggestion = await engine.addCustomField(input);

      expect(suggestion.field.name).toBe('customSecret');
      expect(suggestion.field.location.filePath).toBe('src/config.ts');
      expect(suggestion.patternType).toBe('credentials');
      expect(suggestion.confidenceScore).toBe(100);
      expect(suggestion.status).toBe('accepted');
    });

    it('should include notes in field context', async () => {
      const input: CustomFieldInput = {
        fieldName: 'apiKey',
        filePath: 'src/api.ts',
        patternType: 'credentials',
        notes: 'API key for external service',
      };

      const suggestion = await engine.addCustomField(input);

      expect(suggestion.field.context.comments).toContain('API key for external service');
    });

    it('should call persist callback for custom field', async () => {
      const persistCallback = vi.fn().mockResolvedValue(undefined);
      engine.setDecisionPersistCallback(persistCallback);

      const input: CustomFieldInput = {
        fieldName: 'secret',
        filePath: 'src/config.ts',
        patternType: 'credentials',
      };

      await engine.addCustomField(input);

      expect(persistCallback).toHaveBeenCalled();
    });
  });

  describe('suggestion management', () => {
    it('should get suggestion by ID', () => {
      const result = createMockAnalysisResult('email');
      const created = engine.createSuggestion(result);

      const found = engine.getSuggestionById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
    });

    it('should return undefined for non-existent ID', () => {
      expect(engine.getSuggestionById('non-existent')).toBeUndefined();
    });

    it('should get suggestion count', () => {
      expect(engine.getSuggestionCount()).toBe(0);

      engine.createSuggestion(createMockAnalysisResult('email'));
      engine.createSuggestion(createMockAnalysisResult('password'));

      expect(engine.getSuggestionCount()).toBe(2);
    });

    it('should get count by status', async () => {
      engine.createSuggestion(createMockAnalysisResult('email'));
      engine.createSuggestion(createMockAnalysisResult('password'));
      engine.createSuggestion(createMockAnalysisResult('phone'));

      const suggestions = engine.getSuggestions();
      await engine.processDecision(suggestions[0].id, { action: 'accept' });
      await engine.processDecision(suggestions[1].id, { action: 'reject' });

      const counts = engine.getCountByStatus();

      expect(counts.pending).toBe(1);
      expect(counts.accepted).toBe(1);
      expect(counts.rejected).toBe(1);
      expect(counts.deferred).toBe(0);
    });

    it('should remove suggestion by ID', () => {
      const result = createMockAnalysisResult('email');
      const suggestion = engine.createSuggestion(result);

      expect(engine.removeSuggestion(suggestion.id)).toBe(true);
      expect(engine.getSuggestionById(suggestion.id)).toBeUndefined();
    });

    it('should return false when removing non-existent suggestion', () => {
      expect(engine.removeSuggestion('non-existent')).toBe(false);
    });

    it('should remove all suggestions for a file', () => {
      engine.createSuggestion(createMockAnalysisResult('email', { filePath: 'src/user.ts' }));
      engine.createSuggestion(createMockAnalysisResult('phone', { filePath: 'src/user.ts' }));
      engine.createSuggestion(createMockAnalysisResult('password', { filePath: 'src/auth.ts' }));

      const removed = engine.removeSuggestionsForFile('src/user.ts');

      expect(removed).toBe(2);
      expect(engine.getSuggestionCount()).toBe(1);
    });

    it('should update suggestions for a file', () => {
      engine.createSuggestion(createMockAnalysisResult('oldEmail', { filePath: 'src/user.ts' }));
      
      const newResults = [
        createMockAnalysisResult('newEmail', { filePath: 'src/user.ts' }),
        createMockAnalysisResult('newPhone', { filePath: 'src/user.ts' }),
      ];

      const newSuggestions = engine.updateSuggestionsForFile('src/user.ts', newResults);

      expect(newSuggestions).toHaveLength(2);
      expect(engine.getSuggestions().some(s => s.field.name === 'oldEmail')).toBe(false);
      expect(engine.getSuggestions().some(s => s.field.name === 'newEmail')).toBe(true);
    });

    it('should clear all suggestions', () => {
      engine.createSuggestion(createMockAnalysisResult('email'));
      engine.createSuggestion(createMockAnalysisResult('password'));

      engine.clearAll();

      expect(engine.getSuggestionCount()).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should emit suggestion-added event', () => {
      const listener = vi.fn();
      engine.addEventListener(listener);

      engine.createSuggestion(createMockAnalysisResult('email'));

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'suggestion-added' })
      );
    });

    it('should emit suggestion-removed event', () => {
      const suggestion = engine.createSuggestion(createMockAnalysisResult('email'));
      
      const listener = vi.fn();
      engine.addEventListener(listener);

      engine.removeSuggestion(suggestion.id);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'suggestion-removed' })
      );
    });

    it('should emit bulk-update event', () => {
      const listener = vi.fn();
      engine.addEventListener(listener);

      engine.createSuggestions([
        createMockAnalysisResult('email'),
        createMockAnalysisResult('password'),
      ]);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bulk-update' })
      );
    });

    it('should remove event listener', () => {
      const listener = vi.fn();
      engine.addEventListener(listener);
      engine.removeEventListener(listener);

      engine.createSuggestion(createMockAnalysisResult('email'));

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('import/export', () => {
    it('should export suggestions', () => {
      engine.createSuggestion(createMockAnalysisResult('email'));
      engine.createSuggestion(createMockAnalysisResult('password'));

      const exported = engine.exportSuggestions();

      expect(exported).toHaveLength(2);
      expect(exported[0].createdAt).toBeInstanceOf(Date);
    });

    it('should import suggestions replacing existing', () => {
      engine.createSuggestion(createMockAnalysisResult('existing'));

      const toImport: Suggestion[] = [
        {
          id: 'suggestion-100',
          field: createMockField('imported'),
          confidenceScore: 90,
          patternType: 'pii',
          status: 'pending',
          recommendedAction: { type: 'mask', description: 'Test' },
          createdAt: new Date(),
          reviewedAt: null,
        },
      ];

      engine.importSuggestions(toImport, false);

      expect(engine.getSuggestionCount()).toBe(1);
      expect(engine.getSuggestions()[0].field.name).toBe('imported');
    });

    it('should import suggestions merging with existing', () => {
      engine.createSuggestion(createMockAnalysisResult('existing'));

      const toImport: Suggestion[] = [
        {
          id: 'suggestion-100',
          field: createMockField('imported'),
          confidenceScore: 90,
          patternType: 'pii',
          status: 'pending',
          recommendedAction: { type: 'mask', description: 'Test' },
          createdAt: new Date(),
          reviewedAt: null,
        },
      ];

      engine.importSuggestions(toImport, true);

      expect(engine.getSuggestionCount()).toBe(2);
    });
  });
});

describe('createSuggestionEngine factory', () => {
  it('should create empty engine', () => {
    const engine = createSuggestionEngine();
    expect(engine.getSuggestionCount()).toBe(0);
  });

  it('should create engine with initial suggestions', () => {
    const initial: Suggestion[] = [
      {
        id: 'suggestion-1',
        field: {
          name: 'email',
          type: 'string',
          location: { filePath: 'test.ts', startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 },
          context: { surroundingCode: '', comments: [], parentScope: '', usageContexts: [] },
        },
        confidenceScore: 90,
        patternType: 'pii',
        status: 'pending',
        recommendedAction: { type: 'mask', description: 'Test' },
        createdAt: new Date(),
        reviewedAt: null,
      },
    ];

    const engine = createSuggestionEngine(initial);

    expect(engine.getSuggestionCount()).toBe(1);
    expect(engine.getSuggestionById('suggestion-1')).toBeDefined();
  });
});
