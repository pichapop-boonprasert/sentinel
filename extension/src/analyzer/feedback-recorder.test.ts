/**
 * Tests for FeedbackRecorder
 * 
 * Validates: Requirements 3.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeedbackRecorder,
  createFeedbackRecorder,
  FeedbackRecord,
  PatternMatchInfo,
  FeedbackFilter,
} from './feedback-recorder';
import { UserFeedback, MaskingPatternType } from '../types';

describe('FeedbackRecorder', () => {
  let recorder: FeedbackRecorder;

  beforeEach(() => {
    recorder = new FeedbackRecorder();
  });

  describe('recordFeedback', () => {
    it('should record basic feedback', () => {
      const feedback: UserFeedback = {
        fieldName: 'userEmail',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: 'User profile data',
      };

      const record = recorder.recordFeedback(feedback);

      expect(record.id).toBeDefined();
      expect(record.timestamp).toBeInstanceOf(Date);
      expect(record.feedback).toEqual(feedback);
      expect(record.patternMatchResults).toBeNull();
      expect(record.originalConfidenceScore).toBeNull();
      expect(record.filePath).toBeNull();
    });

    it('should record feedback with pattern match info', () => {
      const feedback: UserFeedback = {
        fieldName: 'password',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'credentials',
        context: 'Login form',
      };

      const patternMatchInfo: PatternMatchInfo = {
        matched: true,
        patternType: 'credentials',
        matchScore: 85,
        contextIndicatorsFound: ['auth', 'login'],
      };

      const record = recorder.recordFeedback(feedback, {
        patternMatchInfo,
        confidenceScore: 90,
        filePath: 'src/auth/login.ts',
      });

      expect(record.patternMatchResults).toEqual(patternMatchInfo);
      expect(record.originalConfidenceScore).toBe(90);
      expect(record.filePath).toBe('src/auth/login.ts');
    });

    it('should record feedback with metadata', () => {
      const feedback: UserFeedback = {
        fieldName: 'ssn',
        expectedSensitive: true,
        actualSensitive: false,
        patternType: 'pii',
        context: 'Employee record',
      };

      const record = recorder.recordFeedback(feedback, {
        metadata: {
          userId: 'user-123',
          sessionId: 'session-456',
          tags: ['false-negative', 'pii'],
        },
      });

      expect(record.metadata.userId).toBe('user-123');
      expect(record.metadata.sessionId).toBe('session-456');
      expect(record.metadata.tags).toEqual(['false-negative', 'pii']);
    });

    it('should generate unique IDs for each record', () => {
      const feedback: UserFeedback = {
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      };

      const record1 = recorder.recordFeedback(feedback);
      const record2 = recorder.recordFeedback(feedback);
      const record3 = recorder.recordFeedback(feedback);

      expect(record1.id).not.toBe(record2.id);
      expect(record2.id).not.toBe(record3.id);
      expect(record1.id).not.toBe(record3.id);
    });
  });

  describe('getAllFeedback', () => {
    it('should return empty array when no feedback recorded', () => {
      expect(recorder.getAllFeedback()).toEqual([]);
    });

    it('should return all recorded feedback', () => {
      const feedback1: UserFeedback = {
        fieldName: 'email',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      };
      const feedback2: UserFeedback = {
        fieldName: 'apiKey',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'credentials',
        context: '',
      };

      recorder.recordFeedback(feedback1);
      recorder.recordFeedback(feedback2);

      const all = recorder.getAllFeedback();
      expect(all).toHaveLength(2);
      expect(all[0].feedback.fieldName).toBe('email');
      expect(all[1].feedback.fieldName).toBe('apiKey');
    });

    it('should return a copy of records', () => {
      const feedback: UserFeedback = {
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      };

      recorder.recordFeedback(feedback);
      const all = recorder.getAllFeedback();
      all.push({} as FeedbackRecord);

      expect(recorder.getAllFeedback()).toHaveLength(1);
    });
  });

  describe('getFeedback with filters', () => {
    beforeEach(() => {
      // Add various feedback records for filtering tests
      recorder.recordFeedback({
        fieldName: 'userEmail',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: 'User data',
      });
      recorder.recordFeedback({
        fieldName: 'password',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'credentials',
        context: 'Auth',
      });
      recorder.recordFeedback({
        fieldName: 'userName',
        expectedSensitive: false,
        actualSensitive: true,
        patternType: 'pii',
        context: 'Display name',
      });
      recorder.recordFeedback({
        fieldName: 'creditCard',
        expectedSensitive: true,
        actualSensitive: false,
        patternType: 'financial',
        context: 'Payment',
      });
    });

    it('should filter by pattern type', () => {
      const piiRecords = recorder.getFeedback({ patternType: 'pii' });
      expect(piiRecords).toHaveLength(2);
      expect(piiRecords.every(r => r.feedback.patternType === 'pii')).toBe(true);
    });

    it('should filter by expected sensitivity', () => {
      const expectedSensitive = recorder.getFeedback({ expectedSensitive: true });
      expect(expectedSensitive).toHaveLength(3);
    });

    it('should filter by actual sensitivity', () => {
      const actualSensitive = recorder.getFeedback({ actualSensitive: true });
      expect(actualSensitive).toHaveLength(3);
    });

    it('should filter by field name pattern', () => {
      const userFields = recorder.getFeedback({ fieldNamePattern: /^user/i });
      expect(userFields).toHaveLength(2);
    });

    it('should apply limit', () => {
      const limited = recorder.getFeedback({ limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('should combine multiple filters', () => {
      const filtered = recorder.getFeedback({
        patternType: 'pii',
        expectedSensitive: true,
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].feedback.fieldName).toBe('userEmail');
    });
  });

  describe('getTrainingData', () => {
    it('should return training data format', () => {
      recorder.recordFeedback(
        {
          fieldName: 'email',
          expectedSensitive: true,
          actualSensitive: true,
          patternType: 'pii',
          context: 'User profile',
        },
        {
          patternMatchInfo: {
            matched: true,
            patternType: 'pii',
            matchScore: 80,
            contextIndicatorsFound: ['user', 'profile'],
          },
          confidenceScore: 85,
        }
      );

      const trainingData = recorder.getTrainingData();

      expect(trainingData).toHaveLength(1);
      expect(trainingData[0]).toEqual({
        fieldName: 'email',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: 'User profile',
        patternMatched: true,
        matchScore: 80,
        confidenceScore: 85,
        contextIndicators: ['user', 'profile'],
        isCorrectPrediction: true,
      });
    });

    it('should handle records without pattern match info', () => {
      recorder.recordFeedback({
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: false,
        patternType: null,
        context: '',
      });

      const trainingData = recorder.getTrainingData();

      expect(trainingData[0].patternMatched).toBe(false);
      expect(trainingData[0].matchScore).toBe(0);
      expect(trainingData[0].confidenceScore).toBe(0);
      expect(trainingData[0].contextIndicators).toEqual([]);
      expect(trainingData[0].isCorrectPrediction).toBe(false);
    });

    it('should apply filter to training data', () => {
      recorder.recordFeedback({
        fieldName: 'email',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });
      recorder.recordFeedback({
        fieldName: 'password',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'credentials',
        context: '',
      });

      const trainingData = recorder.getTrainingData({ patternType: 'pii' });

      expect(trainingData).toHaveLength(1);
      expect(trainingData[0].fieldName).toBe('email');
    });
  });

  describe('getStatistics', () => {
    it('should return zero statistics for empty recorder', () => {
      const stats = recorder.getStatistics();

      expect(stats.totalRecords).toBe(0);
      expect(stats.truePositives).toBe(0);
      expect(stats.falsePositives).toBe(0);
      expect(stats.trueNegatives).toBe(0);
      expect(stats.falseNegatives).toBe(0);
      expect(stats.precision).toBe(0);
      expect(stats.recall).toBe(0);
      expect(stats.f1Score).toBe(0);
    });

    it('should calculate confusion matrix correctly', () => {
      // True Positive: expected=true, actual=true
      recorder.recordFeedback({
        fieldName: 'tp1',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });
      recorder.recordFeedback({
        fieldName: 'tp2',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });

      // False Positive: expected=false, actual=true
      recorder.recordFeedback({
        fieldName: 'fp1',
        expectedSensitive: false,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });

      // True Negative: expected=false, actual=false
      recorder.recordFeedback({
        fieldName: 'tn1',
        expectedSensitive: false,
        actualSensitive: false,
        patternType: null,
        context: '',
      });

      // False Negative: expected=true, actual=false
      recorder.recordFeedback({
        fieldName: 'fn1',
        expectedSensitive: true,
        actualSensitive: false,
        patternType: 'pii',
        context: '',
      });

      const stats = recorder.getStatistics();

      expect(stats.totalRecords).toBe(5);
      expect(stats.truePositives).toBe(2);
      expect(stats.falsePositives).toBe(1);
      expect(stats.trueNegatives).toBe(1);
      expect(stats.falseNegatives).toBe(1);
    });

    it('should calculate precision, recall, and F1 score', () => {
      // 3 TP, 1 FP, 1 FN
      // Precision = 3 / (3 + 1) = 0.75
      // Recall = 3 / (3 + 1) = 0.75
      // F1 = 2 * (0.75 * 0.75) / (0.75 + 0.75) = 0.75

      for (let i = 0; i < 3; i++) {
        recorder.recordFeedback({
          fieldName: `tp${i}`,
          expectedSensitive: true,
          actualSensitive: true,
          patternType: 'pii',
          context: '',
        });
      }
      recorder.recordFeedback({
        fieldName: 'fp',
        expectedSensitive: false,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });
      recorder.recordFeedback({
        fieldName: 'fn',
        expectedSensitive: true,
        actualSensitive: false,
        patternType: 'pii',
        context: '',
      });

      const stats = recorder.getStatistics();

      expect(stats.precision).toBe(0.75);
      expect(stats.recall).toBe(0.75);
      expect(stats.f1Score).toBe(0.75);
    });

    it('should track statistics by pattern type', () => {
      recorder.recordFeedback({
        fieldName: 'email',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });
      recorder.recordFeedback({
        fieldName: 'password',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'credentials',
        context: '',
      });
      recorder.recordFeedback({
        fieldName: 'name',
        expectedSensitive: false,
        actualSensitive: true,
        patternType: 'pii',
        context: '',
      });

      const stats = recorder.getStatistics();

      expect(stats.byPatternType.pii.total).toBe(2);
      expect(stats.byPatternType.pii.truePositives).toBe(1);
      expect(stats.byPatternType.pii.falsePositives).toBe(1);
      expect(stats.byPatternType.credentials.total).toBe(1);
      expect(stats.byPatternType.credentials.truePositives).toBe(1);
    });
  });

  describe('record management', () => {
    it('should get record count', () => {
      expect(recorder.getRecordCount()).toBe(0);

      recorder.recordFeedback({
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      expect(recorder.getRecordCount()).toBe(1);
    });

    it('should get record by ID', () => {
      const record = recorder.recordFeedback({
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      const found = recorder.getRecordById(record.id);
      expect(found).toBeDefined();
      expect(found?.feedback.fieldName).toBe('test');
    });

    it('should return undefined for non-existent ID', () => {
      expect(recorder.getRecordById('non-existent')).toBeUndefined();
    });

    it('should remove record by ID', () => {
      const record = recorder.recordFeedback({
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      expect(recorder.removeRecord(record.id)).toBe(true);
      expect(recorder.getRecordCount()).toBe(0);
      expect(recorder.getRecordById(record.id)).toBeUndefined();
    });

    it('should return false when removing non-existent record', () => {
      expect(recorder.removeRecord('non-existent')).toBe(false);
    });

    it('should clear all records', () => {
      recorder.recordFeedback({
        fieldName: 'test1',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });
      recorder.recordFeedback({
        fieldName: 'test2',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      recorder.clearAllRecords();

      expect(recorder.getRecordCount()).toBe(0);
    });
  });

  describe('import/export', () => {
    it('should export records', () => {
      recorder.recordFeedback({
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: 'pii',
        context: 'Test context',
      });

      const exported = recorder.exportRecords();

      expect(exported).toHaveLength(1);
      expect(exported[0].feedback.fieldName).toBe('test');
      expect(exported[0].timestamp).toBeInstanceOf(Date);
    });

    it('should import records replacing existing', () => {
      recorder.recordFeedback({
        fieldName: 'existing',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      const importRecords: FeedbackRecord[] = [
        {
          id: 'feedback-100',
          timestamp: new Date(),
          feedback: {
            fieldName: 'imported',
            expectedSensitive: true,
            actualSensitive: true,
            patternType: 'pii',
            context: '',
          },
          patternMatchResults: null,
          originalConfidenceScore: null,
          filePath: null,
          metadata: {},
        },
      ];

      recorder.importRecords(importRecords, false);

      expect(recorder.getRecordCount()).toBe(1);
      expect(recorder.getAllFeedback()[0].feedback.fieldName).toBe('imported');
    });

    it('should import records merging with existing', () => {
      const existing = recorder.recordFeedback({
        fieldName: 'existing',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      const importRecords: FeedbackRecord[] = [
        {
          id: 'feedback-100',
          timestamp: new Date(),
          feedback: {
            fieldName: 'imported',
            expectedSensitive: true,
            actualSensitive: true,
            patternType: 'pii',
            context: '',
          },
          patternMatchResults: null,
          originalConfidenceScore: null,
          filePath: null,
          metadata: {},
        },
      ];

      recorder.importRecords(importRecords, true);

      expect(recorder.getRecordCount()).toBe(2);
    });

    it('should not duplicate records when merging with same ID', () => {
      const existing = recorder.recordFeedback({
        fieldName: 'existing',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      const importRecords: FeedbackRecord[] = [
        {
          id: existing.id, // Same ID
          timestamp: new Date(),
          feedback: {
            fieldName: 'duplicate',
            expectedSensitive: true,
            actualSensitive: true,
            patternType: 'pii',
            context: '',
          },
          patternMatchResults: null,
          originalConfidenceScore: null,
          filePath: null,
          metadata: {},
        },
      ];

      recorder.importRecords(importRecords, true);

      expect(recorder.getRecordCount()).toBe(1);
      expect(recorder.getAllFeedback()[0].feedback.fieldName).toBe('existing');
    });
  });

  describe('createFeedbackRecorder factory', () => {
    it('should create empty recorder', () => {
      const recorder = createFeedbackRecorder();
      expect(recorder.getRecordCount()).toBe(0);
    });

    it('should create recorder with initial records', () => {
      const initialRecords: FeedbackRecord[] = [
        {
          id: 'feedback-1',
          timestamp: new Date(),
          feedback: {
            fieldName: 'initial',
            expectedSensitive: true,
            actualSensitive: true,
            patternType: 'pii',
            context: '',
          },
          patternMatchResults: null,
          originalConfidenceScore: null,
          filePath: null,
          metadata: {},
        },
      ];

      const recorder = createFeedbackRecorder(initialRecords);

      expect(recorder.getRecordCount()).toBe(1);
      expect(recorder.getAllFeedback()[0].feedback.fieldName).toBe('initial');
    });
  });

  describe('date filtering', () => {
    it('should filter by date range', () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      recorder.recordFeedback({
        fieldName: 'test',
        expectedSensitive: true,
        actualSensitive: true,
        patternType: null,
        context: '',
      });

      // Should find record within range
      const inRange = recorder.getFeedback({
        startDate: yesterday,
        endDate: tomorrow,
      });
      expect(inRange).toHaveLength(1);

      // Should not find record before range
      const beforeRange = recorder.getFeedback({
        endDate: yesterday,
      });
      expect(beforeRange).toHaveLength(0);

      // Should not find record after range
      const afterRange = recorder.getFeedback({
        startDate: tomorrow,
      });
      expect(afterRange).toHaveLength(0);
    });
  });
});
