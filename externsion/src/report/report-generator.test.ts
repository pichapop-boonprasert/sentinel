/**
 * Tests for Report Generator
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReportGenerator,
  createReportGenerator,
  ClipboardService,
} from './report-generator';
import {
  Suggestion,
  MaskingPatternType,
  SuggestionStatus,
  ReportOptions,
} from '../types';

// Mock clipboard service
function createMockClipboard(): ClipboardService & { lastText: string | null } {
  return {
    lastText: null,
    async writeText(text: string): Promise<void> {
      this.lastText = text;
    },
  };
}

// Helper to create a mock suggestion
function createMockSuggestion(
  fieldName: string,
  filePath: string = 'test.ts',
  patternType: MaskingPatternType = 'pii',
  confidenceScore: number = 85,
  status: SuggestionStatus = 'pending',
  lineNumber: number = 1
): Suggestion {
  return {
    id: `suggestion-${Date.now()}-${Math.random()}`,
    field: {
      name: fieldName,
      type: 'string',
      location: {
        filePath,
        startLine: lineNumber,
        startColumn: 0,
        endLine: lineNumber,
        endColumn: fieldName.length,
      },
      context: {
        surroundingCode: '',
        comments: [],
        parentScope: '',
        usageContexts: [],
      },
    },
    confidenceScore,
    patternType,
    status,
    recommendedAction: { type: 'mask', description: 'Test' },
    createdAt: new Date(),
    reviewedAt: null,
  };
}

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  let clipboard: ReturnType<typeof createMockClipboard>;

  beforeEach(() => {
    clipboard = createMockClipboard();
    generator = new ReportGenerator('/workspace', clipboard);
  });

  describe('generateReport - Validates: Requirements 9.1, 9.3', () => {
    it('should generate empty report when no suggestions', async () => {
      const report = await generator.generateReport();

      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.workspacePath).toBe('/workspace');
      expect(report.totalFiles).toBe(0);
      expect(report.totalSuggestions).toBe(0);
      expect(report.findings).toHaveLength(0);
      expect(report.summary.totalFields).toBe(0);
      expect(report.summary.averageConfidence).toBe(0);
    });

    it('should include all detected sensitive fields', async () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
        createMockSuggestion('password', 'src/auth.ts', 'credentials', 95, 'accepted', 20),
        createMockSuggestion('ssn', 'src/user.ts', 'pii', 85, 'pending', 15),
      ];
      generator.setSuggestions(suggestions);

      const report = await generator.generateReport();

      expect(report.totalSuggestions).toBe(3);
      expect(report.totalFiles).toBe(2); // Two unique files
      expect(report.findings).toHaveLength(3);
    });

    it('should include required information in each finding', async () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      generator.setSuggestions(suggestions);

      const report = await generator.generateReport();
      const finding = report.findings[0];

      // Validates: Requirements 9.3 - each finding includes name, location, pattern, score, status
      expect(finding.fieldName).toBe('email');
      expect(finding.filePath).toBe('src/user.ts');
      expect(finding.lineNumber).toBe(10);
      expect(finding.patternType).toBe('pii');
      expect(finding.confidenceScore).toBe(90);
      expect(finding.status).toBe('pending');
    });

    it('should calculate summary statistics correctly', async () => {
      const suggestions = [
        createMockSuggestion('email', 'a.ts', 'pii', 80, 'pending'),
        createMockSuggestion('password', 'b.ts', 'credentials', 90, 'accepted'),
        createMockSuggestion('ssn', 'c.ts', 'pii', 100, 'rejected'),
        createMockSuggestion('cardNumber', 'd.ts', 'financial', 70, 'deferred'),
      ];
      generator.setSuggestions(suggestions);

      const report = await generator.generateReport();

      expect(report.summary.totalFields).toBe(4);
      expect(report.summary.byPatternType.pii).toBe(2);
      expect(report.summary.byPatternType.credentials).toBe(1);
      expect(report.summary.byPatternType.financial).toBe(1);
      expect(report.summary.byPatternType.health).toBe(0);
      expect(report.summary.byStatus.pending).toBe(1);
      expect(report.summary.byStatus.accepted).toBe(1);
      expect(report.summary.byStatus.rejected).toBe(1);
      expect(report.summary.byStatus.deferred).toBe(1);
      expect(report.summary.averageConfidence).toBe(85); // (80+90+100+70)/4 = 85
    });
  });


  describe('report filtering - Validates: Requirements 9.4', () => {
    beforeEach(() => {
      const suggestions = [
        createMockSuggestion('email', 'a.ts', 'pii', 80, 'pending'),
        createMockSuggestion('password', 'b.ts', 'credentials', 90, 'accepted'),
        createMockSuggestion('ssn', 'c.ts', 'pii', 60, 'rejected'),
        createMockSuggestion('cardNumber', 'd.ts', 'financial', 70, 'deferred'),
        createMockSuggestion('diagnosis', 'e.ts', 'health', 85, 'pending'),
      ];
      generator.setSuggestions(suggestions);
    });

    it('should filter by pattern category', async () => {
      const options: ReportOptions = {
        includePatterns: ['pii'],
      };

      const report = await generator.generateReport(options);

      expect(report.totalSuggestions).toBe(2);
      expect(report.findings.every(f => f.patternType === 'pii')).toBe(true);
    });

    it('should filter by multiple pattern categories', async () => {
      const options: ReportOptions = {
        includePatterns: ['pii', 'credentials'],
      };

      const report = await generator.generateReport(options);

      expect(report.totalSuggestions).toBe(3);
      expect(report.findings.every(f => ['pii', 'credentials'].includes(f.patternType))).toBe(true);
    });

    it('should filter by confidence threshold', async () => {
      const options: ReportOptions = {
        minConfidence: 80,
      };

      const report = await generator.generateReport(options);

      expect(report.totalSuggestions).toBe(3);
      expect(report.findings.every(f => f.confidenceScore >= 80)).toBe(true);
    });

    it('should filter by decision status', async () => {
      const options: ReportOptions = {
        includeStatus: ['pending'],
      };

      const report = await generator.generateReport(options);

      expect(report.totalSuggestions).toBe(2);
      expect(report.findings.every(f => f.status === 'pending')).toBe(true);
    });

    it('should filter by multiple statuses', async () => {
      const options: ReportOptions = {
        includeStatus: ['pending', 'accepted'],
      };

      const report = await generator.generateReport(options);

      expect(report.totalSuggestions).toBe(3);
      expect(report.findings.every(f => ['pending', 'accepted'].includes(f.status))).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const options: ReportOptions = {
        includePatterns: ['pii', 'credentials'],
        minConfidence: 75,
        includeStatus: ['pending', 'accepted'],
      };

      const report = await generator.generateReport(options);

      // email (pii, 80, pending) and password (credentials, 90, accepted) match
      expect(report.totalSuggestions).toBe(2);
    });

    it('should return empty report when no matches', async () => {
      const options: ReportOptions = {
        includePatterns: ['custom'],
      };

      const report = await generator.generateReport(options);

      expect(report.totalSuggestions).toBe(0);
      expect(report.findings).toHaveLength(0);
    });
  });


  describe('exportReport - Validates: Requirements 9.2', () => {
    let report: Awaited<ReturnType<typeof generator.generateReport>>;

    beforeEach(async () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
        createMockSuggestion('password', 'src/auth.ts', 'credentials', 95, 'accepted', 20),
      ];
      generator.setSuggestions(suggestions);
      report = await generator.generateReport();
    });

    describe('JSON export', () => {
      it('should export valid JSON', () => {
        const exported = generator.exportReport(report, 'json');
        const parsed = JSON.parse(exported);

        expect(parsed.workspacePath).toBe('/workspace');
        expect(parsed.totalSuggestions).toBe(2);
        expect(parsed.findings).toHaveLength(2);
      });

      it('should serialize dates as ISO strings', () => {
        const exported = generator.exportReport(report, 'json');
        const parsed = JSON.parse(exported);

        expect(typeof parsed.generatedAt).toBe('string');
        expect(new Date(parsed.generatedAt)).toBeInstanceOf(Date);
      });

      it('should include all report fields', () => {
        const exported = generator.exportReport(report, 'json');
        const parsed = JSON.parse(exported);

        expect(parsed).toHaveProperty('generatedAt');
        expect(parsed).toHaveProperty('workspacePath');
        expect(parsed).toHaveProperty('totalFiles');
        expect(parsed).toHaveProperty('totalSuggestions');
        expect(parsed).toHaveProperty('findings');
        expect(parsed).toHaveProperty('summary');
      });
    });

    describe('CSV export', () => {
      it('should export valid CSV with header', () => {
        const exported = generator.exportReport(report, 'csv');
        const lines = exported.split('\n');

        expect(lines[0]).toBe('Field Name,File Path,Line Number,Pattern Type,Confidence Score,Status');
        expect(lines.length).toBe(3); // Header + 2 data rows
      });

      it('should include all findings', () => {
        const exported = generator.exportReport(report, 'csv');
        const lines = exported.split('\n');

        expect(lines[1]).toContain('email');
        expect(lines[1]).toContain('src/user.ts');
        expect(lines[1]).toContain('10');
        expect(lines[1]).toContain('pii');
        expect(lines[1]).toContain('90');
        expect(lines[1]).toContain('pending');

        expect(lines[2]).toContain('password');
        expect(lines[2]).toContain('credentials');
      });

      it('should escape values with commas', async () => {
        const suggestions = [
          createMockSuggestion('field,with,commas', 'path/to/file.ts', 'pii', 80, 'pending'),
        ];
        generator.setSuggestions(suggestions);
        const newReport = await generator.generateReport();

        const exported = generator.exportReport(newReport, 'csv');
        const lines = exported.split('\n');

        expect(lines[1]).toContain('"field,with,commas"');
      });

      it('should escape values with quotes', async () => {
        const suggestions = [
          createMockSuggestion('field"with"quotes', 'path/to/file.ts', 'pii', 80, 'pending'),
        ];
        generator.setSuggestions(suggestions);
        const newReport = await generator.generateReport();

        const exported = generator.exportReport(newReport, 'csv');
        const lines = exported.split('\n');

        expect(lines[1]).toContain('"field""with""quotes"');
      });
    });

    describe('Markdown export', () => {
      it('should export valid Markdown', () => {
        const exported = generator.exportReport(report, 'markdown');

        expect(exported).toContain('# Data Masking Report');
        expect(exported).toContain('## Summary');
        expect(exported).toContain('## Findings');
      });

      it('should include metadata', () => {
        const exported = generator.exportReport(report, 'markdown');

        expect(exported).toContain('Generated:');
        expect(exported).toContain('Workspace: /workspace');
      });

      it('should include summary statistics', () => {
        const exported = generator.exportReport(report, 'markdown');

        expect(exported).toContain('Total Files Scanned: 2');
        expect(exported).toContain('Total Suggestions: 2');
        expect(exported).toContain('Average Confidence:');
      });

      it('should include pattern type breakdown', () => {
        const exported = generator.exportReport(report, 'markdown');

        expect(exported).toContain('### By Pattern Type');
        expect(exported).toContain('| pii | 1 |');
        expect(exported).toContain('| credentials | 1 |');
      });

      it('should include status breakdown', () => {
        const exported = generator.exportReport(report, 'markdown');

        expect(exported).toContain('### By Status');
        expect(exported).toContain('| pending | 1 |');
        expect(exported).toContain('| accepted | 1 |');
      });

      it('should include findings table', () => {
        const exported = generator.exportReport(report, 'markdown');

        expect(exported).toContain('| Field Name | File Path | Line | Pattern | Confidence | Status |');
        expect(exported).toContain('| email | src/user.ts | 10 | pii | 90% | pending |');
        expect(exported).toContain('| password | src/auth.ts | 20 | credentials | 95% | accepted |');
      });

      it('should handle empty report', async () => {
        generator.setSuggestions([]);
        const emptyReport = await generator.generateReport();
        const exported = generator.exportReport(emptyReport, 'markdown');

        expect(exported).toContain('No findings to report.');
      });
    });

    it('should throw error for unsupported format', () => {
      expect(() => {
        generator.exportReport(report, 'xml' as any);
      }).toThrow('Unsupported export format: xml');
    });
  });


  describe('copyToClipboard - Validates: Requirements 9.5', () => {
    it('should copy suggestions to clipboard', async () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
        createMockSuggestion('password', 'src/auth.ts', 'credentials', 95, 'accepted', 20),
      ];

      await generator.copyToClipboard(suggestions);

      expect(clipboard.lastText).not.toBeNull();
      expect(clipboard.lastText).toContain('Sensitive Field Suggestions');
      expect(clipboard.lastText).toContain('email');
      expect(clipboard.lastText).toContain('password');
    });

    it('should include field details in clipboard text', async () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];

      await generator.copyToClipboard(suggestions);

      expect(clipboard.lastText).toContain('Field: email');
      expect(clipboard.lastText).toContain('File: src/user.ts:10');
      expect(clipboard.lastText).toContain('Pattern: pii');
      expect(clipboard.lastText).toContain('Confidence: 90%');
      expect(clipboard.lastText).toContain('Status: pending');
    });

    it('should handle empty suggestions list', async () => {
      await generator.copyToClipboard([]);

      expect(clipboard.lastText).toContain('Sensitive Field Suggestions');
      expect(clipboard.lastText).not.toContain('Field:');
    });
  });

  describe('formatSuggestionsAsText', () => {
    it('should format suggestions as simple text list', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
        createMockSuggestion('password', 'src/auth.ts', 'credentials', 95, 'accepted', 20),
      ];

      const text = generator.formatSuggestionsAsText(suggestions);

      expect(text).toContain('email (src/user.ts:10) - pii [90%]');
      expect(text).toContain('password (src/auth.ts:20) - credentials [95%]');
    });

    it('should return empty string for empty list', () => {
      const text = generator.formatSuggestionsAsText([]);
      expect(text).toBe('');
    });
  });

  describe('setSuggestions and getSuggestions', () => {
    it('should set and get suggestions', () => {
      const suggestions = [
        createMockSuggestion('email', 'test.ts'),
        createMockSuggestion('password', 'test.ts'),
      ];

      generator.setSuggestions(suggestions);
      const retrieved = generator.getSuggestions();

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].field.name).toBe('email');
    });

    it('should return a copy of suggestions', () => {
      const suggestions = [createMockSuggestion('email', 'test.ts')];
      generator.setSuggestions(suggestions);

      const retrieved = generator.getSuggestions();
      retrieved.push(createMockSuggestion('password', 'test.ts'));

      expect(generator.getSuggestions()).toHaveLength(1);
    });
  });
});

describe('createReportGenerator factory', () => {
  it('should create generator with default workspace path', () => {
    const generator = createReportGenerator();
    expect(generator).toBeInstanceOf(ReportGenerator);
  });

  it('should create generator with custom workspace path', () => {
    const generator = createReportGenerator('/custom/path');
    expect(generator).toBeInstanceOf(ReportGenerator);
  });

  it('should create generator with custom clipboard service', () => {
    const clipboard = createMockClipboard();
    const generator = createReportGenerator('/workspace', clipboard);
    expect(generator).toBeInstanceOf(ReportGenerator);
  });
});
