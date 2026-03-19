/**
 * Hover Tooltip Provider
 * 
 * Displays masking suggestion details on hover over sensitive fields.
 * 
 * Validates: Requirements 4.4
 */

import { Suggestion, MaskingPatternType, CodeLocation } from '../types';

/**
 * Tooltip content structure
 */
export interface TooltipContent {
  title: string;
  sections: TooltipSection[];
  actions?: TooltipAction[];
}

/**
 * A section within the tooltip
 */
export interface TooltipSection {
  label: string;
  value: string;
  style?: 'normal' | 'warning' | 'success' | 'error';
}

/**
 * An action button in the tooltip
 */
export interface TooltipAction {
  label: string;
  command: string;
  args?: unknown[];
}

/**
 * TooltipProvider class for generating hover tooltips
 */
export class TooltipProvider {
  private suggestions: Map<string, Suggestion[]> = new Map();

  /**
   * Sets the suggestions for tooltip lookup
   */
  setSuggestions(suggestions: Suggestion[]): void {
    this.suggestions.clear();
    
    // Index by file path for quick lookup
    for (const suggestion of suggestions) {
      const filePath = suggestion.field.location.filePath;
      if (!this.suggestions.has(filePath)) {
        this.suggestions.set(filePath, []);
      }
      this.suggestions.get(filePath)!.push(suggestion);
    }
  }

  /**
   * Gets tooltip content for a position in a file
   * 
   * Validates: Requirements 4.4
   */
  getTooltipAt(filePath: string, line: number, column: number): TooltipContent | null {
    const fileSuggestions = this.suggestions.get(filePath);
    if (!fileSuggestions) {
      return null;
    }

    // Find suggestion at this position
    const suggestion = this.findSuggestionAtPosition(fileSuggestions, line, column);
    if (!suggestion) {
      return null;
    }

    return this.createTooltipContent(suggestion);
  }

  /**
   * Finds a suggestion that contains the given position
   */
  private findSuggestionAtPosition(
    suggestions: Suggestion[],
    line: number,
    column: number
  ): Suggestion | null {
    for (const suggestion of suggestions) {
      const loc = suggestion.field.location;
      
      // Check if position is within the suggestion's range
      if (this.isPositionInRange(line, column, loc)) {
        return suggestion;
      }
    }
    return null;
  }

  /**
   * Checks if a position is within a code location range
   */
  private isPositionInRange(line: number, column: number, loc: CodeLocation): boolean {
    // Check line bounds
    if (line < loc.startLine || line > loc.endLine) {
      return false;
    }

    // Single line case
    if (loc.startLine === loc.endLine) {
      return column >= loc.startColumn && column <= loc.endColumn;
    }

    // Multi-line case
    if (line === loc.startLine) {
      return column >= loc.startColumn;
    }
    if (line === loc.endLine) {
      return column <= loc.endColumn;
    }

    // Middle lines are fully included
    return true;
  }

  /**
   * Creates tooltip content for a suggestion
   */
  private createTooltipContent(suggestion: Suggestion): TooltipContent {
    const sections: TooltipSection[] = [
      {
        label: 'Pattern Type',
        value: this.formatPatternType(suggestion.patternType),
        style: 'normal',
      },
      {
        label: 'Confidence',
        value: `${suggestion.confidenceScore}%`,
        style: this.getConfidenceStyle(suggestion.confidenceScore),
      },
      {
        label: 'Status',
        value: this.formatStatus(suggestion.status),
        style: this.getStatusStyle(suggestion.status),
      },
      {
        label: 'Recommended Action',
        value: suggestion.recommendedAction.description,
        style: 'normal',
      },
    ];

    // Add field type if available
    if (suggestion.field.type) {
      sections.splice(1, 0, {
        label: 'Type',
        value: suggestion.field.type,
        style: 'normal',
      });
    }

    const actions: TooltipAction[] = [
      {
        label: '✓ Accept',
        command: 'dataMasking.acceptSuggestion',
        args: [suggestion.id],
      },
      {
        label: '✗ Reject',
        command: 'dataMasking.rejectSuggestion',
        args: [suggestion.id],
      },
      {
        label: '⏸ Defer',
        command: 'dataMasking.deferSuggestion',
        args: [suggestion.id],
      },
    ];

    return {
      title: `🔒 Sensitive Field: ${suggestion.field.name}`,
      sections,
      actions,
    };
  }

  /**
   * Formats pattern type for display
   */
  private formatPatternType(type: MaskingPatternType): string {
    const labels: Record<MaskingPatternType, string> = {
      pii: '👤 Personal Identifiable Information',
      credentials: '🔑 Credentials/Secret',
      financial: '💳 Financial Data',
      health: '🏥 Health Information',
      custom: '⚠️ Custom Pattern',
    };
    return labels[type] || type;
  }

  /**
   * Formats status for display
   */
  private formatStatus(status: string): string {
    const labels: Record<string, string> = {
      pending: '⏳ Pending Review',
      accepted: '✓ Accepted',
      rejected: '✗ Rejected',
      deferred: '⏸ Deferred',
    };
    return labels[status] || status;
  }

  /**
   * Gets style based on confidence score
   */
  private getConfidenceStyle(score: number): TooltipSection['style'] {
    if (score >= 80) return 'error'; // High confidence = high risk
    if (score >= 50) return 'warning';
    return 'normal';
  }

  /**
   * Gets style based on status
   */
  private getStatusStyle(status: string): TooltipSection['style'] {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'normal';
      case 'pending':
        return 'warning';
      default:
        return 'normal';
    }
  }

  /**
   * Generates Markdown content for the tooltip
   */
  generateMarkdown(content: TooltipContent): string {
    const lines: string[] = [];

    // Title
    lines.push(`### ${content.title}`);
    lines.push('');

    // Sections
    for (const section of content.sections) {
      lines.push(`**${section.label}:** ${section.value}`);
    }

    // Actions
    if (content.actions && content.actions.length > 0) {
      lines.push('');
      lines.push('---');
      lines.push('');
      const actionLinks = content.actions.map(
        action => `[${action.label}](command:${action.command}?${encodeURIComponent(JSON.stringify(action.args))})`
      );
      lines.push(actionLinks.join(' | '));
    }

    return lines.join('\n');
  }

  /**
   * Gets all suggestions for a file
   */
  getSuggestionsForFile(filePath: string): Suggestion[] {
    return this.suggestions.get(filePath) || [];
  }

  /**
   * Checks if there are any suggestions at a given line
   */
  hasSuggestionsAtLine(filePath: string, line: number): boolean {
    const fileSuggestions = this.suggestions.get(filePath);
    if (!fileSuggestions) {
      return false;
    }

    return fileSuggestions.some(s => 
      line >= s.field.location.startLine && line <= s.field.location.endLine
    );
  }
}

/**
 * Creates a new TooltipProvider instance
 */
export function createTooltipProvider(): TooltipProvider {
  return new TooltipProvider();
}
