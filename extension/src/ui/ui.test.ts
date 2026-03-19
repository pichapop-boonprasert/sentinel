/**
 * Tests for UI Components
 * 
 * Validates: Requirements 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SuggestionPanel,
  createSuggestionPanel,
  InlineHighlighter,
  createInlineHighlighter,
  TooltipProvider,
  createTooltipProvider,
  ProgressIndicator,
  createProgressIndicator,
  DEFAULT_STYLES,
} from './index';
import { Suggestion, MaskingPatternType, SuggestionStatus } from '../types';

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
    id: `suggestion-${fieldName}-${Date.now()}`,
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
    recommendedAction: { type: 'mask', description: 'Mask this field' },
    createdAt: new Date(),
    reviewedAt: null,
  };
}

describe('SuggestionPanel', () => {
  let panel: SuggestionPanel;

  beforeEach(() => {
    panel = createSuggestionPanel();
  });

  describe('grouping - Validates: Requirements 4.1', () => {
    it('should group suggestions by pattern type', () => {
      const suggestions = [
        createMockSuggestion('email', 'a.ts', 'pii'),
        createMockSuggestion('password', 'b.ts', 'credentials'),
        createMockSuggestion('ssn', 'c.ts', 'pii'),
        createMockSuggestion('cardNumber', 'd.ts', 'financial'),
      ];
      panel.setSuggestions(suggestions);

      const groups = panel.getGroupedSuggestions();

      expect(groups.length).toBe(3); // pii, credentials, financial
      
      const piiGroup = groups.find(g => g.patternType === 'pii');
      expect(piiGroup?.count).toBe(2);
      
      const credentialsGroup = groups.find(g => g.patternType === 'credentials');
      expect(credentialsGroup?.count).toBe(1);
    });

    it('should not include empty groups', () => {
      const suggestions = [
        createMockSuggestion('email', 'a.ts', 'pii'),
      ];
      panel.setSuggestions(suggestions);

      const groups = panel.getGroupedSuggestions();

      expect(groups.length).toBe(1);
      expect(groups[0].patternType).toBe('pii');
    });
  });

  describe('sorting - Validates: Requirements 4.5', () => {
    beforeEach(() => {
      const suggestions = [
        createMockSuggestion('email', 'b.ts', 'pii', 70, 'pending', 20),
        createMockSuggestion('password', 'a.ts', 'credentials', 90, 'accepted', 10),
        createMockSuggestion('ssn', 'c.ts', 'pii', 80, 'rejected', 30),
      ];
      panel.setSuggestions(suggestions);
    });

    it('should sort by confidence score descending by default', () => {
      const sorted = panel.getSuggestions();

      expect(sorted[0].confidenceScore).toBe(90);
      expect(sorted[1].confidenceScore).toBe(80);
      expect(sorted[2].confidenceScore).toBe(70);
    });

    it('should sort by confidence score ascending', () => {
      panel.setSortOption('confidence', 'asc');
      const sorted = panel.getSuggestions();

      expect(sorted[0].confidenceScore).toBe(70);
      expect(sorted[2].confidenceScore).toBe(90);
    });

    it('should sort by file location', () => {
      panel.setSortOption('location', 'asc');
      const sorted = panel.getSuggestions();

      expect(sorted[0].field.location.filePath).toBe('a.ts');
      expect(sorted[1].field.location.filePath).toBe('b.ts');
      expect(sorted[2].field.location.filePath).toBe('c.ts');
    });

    it('should sort by pattern type', () => {
      panel.setSortOption('pattern', 'asc');
      const sorted = panel.getSuggestions();

      expect(sorted[0].patternType).toBe('credentials');
      expect(sorted[1].patternType).toBe('pii');
    });

    it('should sort by status', () => {
      panel.setSortOption('status', 'asc');
      const sorted = panel.getSuggestions();

      expect(sorted[0].status).toBe('accepted');
      expect(sorted[1].status).toBe('pending');
      expect(sorted[2].status).toBe('rejected');
    });
  });


  describe('filtering', () => {
    beforeEach(() => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 80, 'pending'),
        createMockSuggestion('password', 'src/auth.ts', 'credentials', 90, 'accepted'),
        createMockSuggestion('ssn', 'src/user.ts', 'pii', 60, 'rejected'),
      ];
      panel.setSuggestions(suggestions);
    });

    it('should filter by pattern type', () => {
      panel.setFilter({ patternTypes: ['pii'] });
      const filtered = panel.getSuggestions();

      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.patternType === 'pii')).toBe(true);
    });

    it('should filter by minimum confidence', () => {
      panel.setFilter({ minConfidence: 75 });
      const filtered = panel.getSuggestions();

      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.confidenceScore >= 75)).toBe(true);
    });

    it('should filter by status', () => {
      panel.setFilter({ status: ['pending'] });
      const filtered = panel.getSuggestions();

      expect(filtered.length).toBe(1);
      expect(filtered[0].status).toBe('pending');
    });

    it('should filter by file path', () => {
      panel.setFilter({ filePath: 'user.ts' });
      const filtered = panel.getSuggestions();

      expect(filtered.length).toBe(2);
      expect(filtered.every(s => s.field.location.filePath.includes('user.ts'))).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit accept event', () => {
      const listener = vi.fn();
      panel.on('accept', listener);

      panel.accept('suggestion-1', true);

      expect(listener).toHaveBeenCalledWith({
        type: 'accept',
        suggestionId: 'suggestion-1',
        decision: { action: 'accept', applyToSimilar: true },
      });
    });

    it('should emit reject event', () => {
      const listener = vi.fn();
      panel.on('reject', listener);

      panel.reject('suggestion-1', 'Not sensitive');

      expect(listener).toHaveBeenCalledWith({
        type: 'reject',
        suggestionId: 'suggestion-1',
        decision: { action: 'reject', notes: 'Not sensitive' },
      });
    });

    it('should emit defer event', () => {
      const listener = vi.fn();
      panel.on('defer', listener);

      panel.defer('suggestion-1');

      expect(listener).toHaveBeenCalledWith({
        type: 'defer',
        suggestionId: 'suggestion-1',
        decision: { action: 'defer' },
      });
    });

    it('should emit navigate event', () => {
      const listener = vi.fn();
      panel.on('navigate', listener);

      panel.navigateTo('suggestion-1');

      expect(listener).toHaveBeenCalledWith({
        type: 'navigate',
        suggestionId: 'suggestion-1',
      });
    });

    it('should remove event listener', () => {
      const listener = vi.fn();
      panel.on('accept', listener);
      panel.off('accept', listener);

      panel.accept('suggestion-1');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('HTML generation - Validates: Requirements 4.2', () => {
    it('should generate valid HTML', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending'),
      ];
      panel.setSuggestions(suggestions);

      const html = panel.generateHtml();

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('email');
      expect(html).toContain('src/user.ts');
      expect(html).toContain('90%');
      expect(html).toContain('pending');
    });

    it('should include action buttons', () => {
      const suggestions = [createMockSuggestion('email', 'test.ts')];
      panel.setSuggestions(suggestions);

      const html = panel.generateHtml();

      expect(html).toContain('Accept');
      expect(html).toContain('Reject');
      expect(html).toContain('Defer');
      expect(html).toContain('Go to');
    });

    it('should show summary', () => {
      const suggestions = [
        createMockSuggestion('email', 'a.ts', 'pii', 80, 'pending'),
        createMockSuggestion('password', 'b.ts', 'credentials', 90, 'accepted'),
      ];
      panel.setSuggestions(suggestions);

      const html = panel.generateHtml();

      expect(html).toContain('2 suggestions');
      expect(html).toContain('1 pending');
      expect(html).toContain('1 accepted');
    });
  });

  describe('getSummary', () => {
    it('should return correct summary statistics', () => {
      const suggestions = [
        createMockSuggestion('a', 'a.ts', 'pii', 80, 'pending'),
        createMockSuggestion('b', 'b.ts', 'pii', 80, 'accepted'),
        createMockSuggestion('c', 'c.ts', 'pii', 80, 'rejected'),
        createMockSuggestion('d', 'd.ts', 'pii', 80, 'deferred'),
      ];
      panel.setSuggestions(suggestions);

      const summary = panel.getSummary();

      expect(summary.total).toBe(4);
      expect(summary.pending).toBe(1);
      expect(summary.accepted).toBe(1);
      expect(summary.rejected).toBe(1);
      expect(summary.deferred).toBe(1);
    });
  });
});


describe('InlineHighlighter', () => {
  let highlighter: InlineHighlighter;

  beforeEach(() => {
    highlighter = createInlineHighlighter();
  });

  describe('decorations - Validates: Requirements 4.3', () => {
    it('should return decorations for file with suggestions', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
        createMockSuggestion('password', 'src/user.ts', 'credentials', 85, 'pending', 20),
      ];
      highlighter.setSuggestions(suggestions);

      const decorations = highlighter.getDecorationsForFile('src/user.ts');

      expect(decorations.length).toBe(2);
      expect(decorations[0].location.startLine).toBe(10);
      expect(decorations[1].location.startLine).toBe(20);
    });

    it('should return empty array for file without suggestions', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii'),
      ];
      highlighter.setSuggestions(suggestions);

      const decorations = highlighter.getDecorationsForFile('src/other.ts');

      expect(decorations.length).toBe(0);
    });

    it('should include hover message in decorations', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90),
      ];
      highlighter.setSuggestions(suggestions);

      const decorations = highlighter.getDecorationsForFile('src/user.ts');

      expect(decorations[0].hoverMessage).toContain('email');
      expect(decorations[0].hoverMessage).toContain('90%');
    });

    it('should return empty when disabled', () => {
      const suggestions = [createMockSuggestion('email', 'src/user.ts')];
      highlighter.setSuggestions(suggestions);
      highlighter.setEnabled(false);

      const decorations = highlighter.getDecorationsForFile('src/user.ts');

      expect(decorations.length).toBe(0);
    });
  });

  describe('styles', () => {
    it('should have default styles for all pattern types', () => {
      expect(DEFAULT_STYLES.pii).toBeDefined();
      expect(DEFAULT_STYLES.credentials).toBeDefined();
      expect(DEFAULT_STYLES.financial).toBeDefined();
      expect(DEFAULT_STYLES.health).toBeDefined();
      expect(DEFAULT_STYLES.custom).toBeDefined();
    });

    it('should allow custom styles', () => {
      const customStyle = {
        backgroundColor: 'red',
        borderColor: 'blue',
      };
      highlighter.setStyle('pii', customStyle);

      const style = highlighter.getStyle('pii');

      expect(style.backgroundColor).toBe('red');
      expect(style.borderColor).toBe('blue');
    });
  });

  describe('labels', () => {
    it('should show labels by default', () => {
      expect(highlighter.isShowingLabels()).toBe(true);
    });

    it('should hide labels when disabled', () => {
      highlighter.setShowLabels(false);
      expect(highlighter.isShowingLabels()).toBe(false);
    });
  });

  describe('file tracking', () => {
    it('should return files with suggestions', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts'),
        createMockSuggestion('password', 'src/auth.ts'),
        createMockSuggestion('ssn', 'src/user.ts'),
      ];
      highlighter.setSuggestions(suggestions);

      const files = highlighter.getFilesWithSuggestions();

      expect(files.length).toBe(2);
      expect(files).toContain('src/user.ts');
      expect(files).toContain('src/auth.ts');
    });

    it('should return suggestion count by file', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts'),
        createMockSuggestion('password', 'src/auth.ts'),
        createMockSuggestion('ssn', 'src/user.ts'),
      ];
      highlighter.setSuggestions(suggestions);

      const counts = highlighter.getSuggestionCountByFile();

      expect(counts.get('src/user.ts')).toBe(2);
      expect(counts.get('src/auth.ts')).toBe(1);
    });
  });
});


describe('TooltipProvider', () => {
  let provider: TooltipProvider;

  beforeEach(() => {
    provider = createTooltipProvider();
  });

  describe('getTooltipAt - Validates: Requirements 4.4', () => {
    it('should return tooltip for position within suggestion', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      // Set column range
      suggestions[0].field.location.startColumn = 5;
      suggestions[0].field.location.endColumn = 10;
      provider.setSuggestions(suggestions);

      const tooltip = provider.getTooltipAt('src/user.ts', 10, 7);

      expect(tooltip).not.toBeNull();
      expect(tooltip?.title).toContain('email');
    });

    it('should return null for position outside suggestion', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      provider.setSuggestions(suggestions);

      const tooltip = provider.getTooltipAt('src/user.ts', 20, 5);

      expect(tooltip).toBeNull();
    });

    it('should return null for different file', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii'),
      ];
      provider.setSuggestions(suggestions);

      const tooltip = provider.getTooltipAt('src/other.ts', 1, 0);

      expect(tooltip).toBeNull();
    });

    it('should include all required information in tooltip', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      provider.setSuggestions(suggestions);

      const tooltip = provider.getTooltipAt('src/user.ts', 10, 0);

      expect(tooltip?.sections.some(s => s.label === 'Pattern Type')).toBe(true);
      expect(tooltip?.sections.some(s => s.label === 'Confidence')).toBe(true);
      expect(tooltip?.sections.some(s => s.label === 'Status')).toBe(true);
      expect(tooltip?.sections.some(s => s.label === 'Recommended Action')).toBe(true);
    });

    it('should include action buttons', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      provider.setSuggestions(suggestions);

      const tooltip = provider.getTooltipAt('src/user.ts', 10, 0);

      expect(tooltip?.actions?.length).toBe(3);
      expect(tooltip?.actions?.some(a => a.label.includes('Accept'))).toBe(true);
      expect(tooltip?.actions?.some(a => a.label.includes('Reject'))).toBe(true);
      expect(tooltip?.actions?.some(a => a.label.includes('Defer'))).toBe(true);
    });
  });

  describe('generateMarkdown', () => {
    it('should generate valid markdown', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      provider.setSuggestions(suggestions);

      const tooltip = provider.getTooltipAt('src/user.ts', 10, 0);
      const markdown = provider.generateMarkdown(tooltip!);

      expect(markdown).toContain('###');
      expect(markdown).toContain('email');
      expect(markdown).toContain('**Pattern Type:**');
      expect(markdown).toContain('**Confidence:**');
    });
  });

  describe('hasSuggestionsAtLine', () => {
    it('should return true for line with suggestion', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      provider.setSuggestions(suggestions);

      expect(provider.hasSuggestionsAtLine('src/user.ts', 10)).toBe(true);
    });

    it('should return false for line without suggestion', () => {
      const suggestions = [
        createMockSuggestion('email', 'src/user.ts', 'pii', 90, 'pending', 10),
      ];
      provider.setSuggestions(suggestions);

      expect(provider.hasSuggestionsAtLine('src/user.ts', 20)).toBe(false);
    });
  });
});


describe('ProgressIndicator', () => {
  let indicator: ProgressIndicator;

  beforeEach(() => {
    indicator = createProgressIndicator();
  });

  describe('scanning progress - Validates: Requirements 1.5', () => {
    it('should start in idle state', () => {
      expect(indicator.getState()).toBe('idle');
    });

    it('should transition to scanning state', () => {
      indicator.startScanning(100);

      expect(indicator.getState()).toBe('scanning');
      const info = indicator.getProgressInfo();
      expect(info.totalFiles).toBe(100);
      expect(info.filesScanned).toBe(0);
    });

    it('should update progress', () => {
      indicator.startScanning(100);
      indicator.updateProgress(50, 10);

      const info = indicator.getProgressInfo();
      expect(info.filesScanned).toBe(50);
      expect(info.suggestionsFound).toBe(10);
      expect(info.progress).toBe(50);
    });

    it('should increment files scanned', () => {
      indicator.startScanning(100);
      indicator.incrementFilesScanned(2);
      indicator.incrementFilesScanned(3);

      const info = indicator.getProgressInfo();
      expect(info.filesScanned).toBe(2);
      expect(info.suggestionsFound).toBe(5);
    });
  });

  describe('state transitions', () => {
    it('should transition to analyzing state', () => {
      indicator.startScanning(100);
      indicator.startAnalyzing();

      expect(indicator.getState()).toBe('analyzing');
    });

    it('should transition to complete state', () => {
      indicator.startScanning(100);
      indicator.complete(25);

      expect(indicator.getState()).toBe('complete');
      expect(indicator.getSuggestionCount()).toBe(25);
    });

    it('should transition to error state', () => {
      indicator.startScanning(100);
      indicator.setError('Scan failed');

      expect(indicator.getState()).toBe('error');
      const info = indicator.getProgressInfo();
      expect(info.errorMessage).toBe('Scan failed');
    });

    it('should reset to idle state', () => {
      indicator.startScanning(100);
      indicator.updateProgress(50, 10);
      indicator.reset();

      expect(indicator.getState()).toBe('idle');
      const info = indicator.getProgressInfo();
      expect(info.filesScanned).toBe(0);
      expect(info.suggestionsFound).toBe(0);
    });
  });

  describe('suggestion count display - Validates: Requirements 4.6', () => {
    it('should show suggestion count when complete', () => {
      indicator.complete(15);

      const info = indicator.getProgressInfo();
      expect(info.message).toContain('15');
      expect(info.message).toContain('sensitive fields');
    });

    it('should update suggestion count externally', () => {
      indicator.setSuggestionCount(20);

      expect(indicator.getSuggestionCount()).toBe(20);
    });
  });

  describe('messages', () => {
    it('should show scanning message with progress', () => {
      indicator.startScanning(100);
      indicator.updateProgress(50);

      const info = indicator.getProgressInfo();
      expect(info.message).toContain('Scanning');
      expect(info.message).toContain('50/100');
    });

    it('should show analyzing message', () => {
      indicator.startAnalyzing();

      const info = indicator.getProgressInfo();
      expect(info.message).toContain('Analyzing');
    });

    it('should show error message', () => {
      indicator.setError('Permission denied');

      const info = indicator.getProgressInfo();
      expect(info.message).toContain('Permission denied');
    });
  });

  describe('tooltip', () => {
    it('should generate tooltip for scanning state', () => {
      indicator.startScanning(100);
      indicator.updateProgress(50, 10);

      const tooltip = indicator.getTooltip();

      expect(tooltip).toContain('Scanning');
      expect(tooltip).toContain('50/100');
      expect(tooltip).toContain('10 sensitive fields');
    });

    it('should generate tooltip for complete state', () => {
      indicator.startScanning(100);
      indicator.complete(25);

      const tooltip = indicator.getTooltip();

      expect(tooltip).toContain('Scan complete');
      expect(tooltip).toContain('25 sensitive fields');
    });
  });

  describe('event listeners', () => {
    it('should notify listeners on progress change', () => {
      const listener = vi.fn();
      indicator.onProgress(listener);

      indicator.startScanning(100);

      expect(listener).toHaveBeenCalled();
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        state: 'scanning',
        totalFiles: 100,
      }));
    });

    it('should remove listener', () => {
      const listener = vi.fn();
      indicator.onProgress(listener);
      indicator.offProgress(listener);

      indicator.startScanning(100);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('isScanning', () => {
    it('should return true when scanning', () => {
      indicator.startScanning(100);
      expect(indicator.isScanning()).toBe(true);
    });

    it('should return true when analyzing', () => {
      indicator.startAnalyzing();
      expect(indicator.isScanning()).toBe(true);
    });

    it('should return false when idle', () => {
      expect(indicator.isScanning()).toBe(false);
    });

    it('should return false when complete', () => {
      indicator.complete(10);
      expect(indicator.isScanning()).toBe(false);
    });
  });
});
