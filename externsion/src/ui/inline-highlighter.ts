/**
 * Inline Code Highlighter
 * 
 * Highlights detected sensitive fields with distinctive visual indicators
 * in the code editor.
 * 
 * Validates: Requirements 4.3
 */

import { Suggestion, MaskingPatternType, CodeLocation } from '../types';

/**
 * Decoration style configuration
 */
export interface DecorationStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  borderStyle?: string;
  color?: string;
  fontWeight?: string;
  textDecoration?: string;
  after?: {
    contentText?: string;
    color?: string;
    margin?: string;
  };
}

/**
 * Decoration range with style
 */
export interface DecorationRange {
  location: CodeLocation;
  style: DecorationStyle;
  hoverMessage?: string;
  suggestionId: string;
}

/**
 * Default styles for different pattern types
 */
export const DEFAULT_STYLES: Record<MaskingPatternType, DecorationStyle> = {
  pii: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: '#ffc107',
    borderWidth: '1px',
    borderStyle: 'solid',
    after: {
      contentText: ' 🔒 PII',
      color: '#ffc107',
      margin: '0 0 0 5px',
    },
  },
  credentials: {
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    borderColor: '#f44336',
    borderWidth: '1px',
    borderStyle: 'solid',
    after: {
      contentText: ' 🔑 Secret',
      color: '#f44336',
      margin: '0 0 0 5px',
    },
  },
  financial: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4caf50',
    borderWidth: '1px',
    borderStyle: 'solid',
    after: {
      contentText: ' 💳 Financial',
      color: '#4caf50',
      margin: '0 0 0 5px',
    },
  },
  health: {
    backgroundColor: 'rgba(156, 39, 176, 0.2)',
    borderColor: '#9c27b0',
    borderWidth: '1px',
    borderStyle: 'solid',
    after: {
      contentText: ' 🏥 Health',
      color: '#9c27b0',
      margin: '0 0 0 5px',
    },
  },
  custom: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderColor: '#2196f3',
    borderWidth: '1px',
    borderStyle: 'solid',
    after: {
      contentText: ' ⚠️ Sensitive',
      color: '#2196f3',
      margin: '0 0 0 5px',
    },
  },
};

/**
 * InlineHighlighter class for managing code decorations
 */
export class InlineHighlighter {
  private suggestions: Suggestion[] = [];
  private styles: Record<MaskingPatternType, DecorationStyle>;
  private enabled: boolean = true;
  private showLabels: boolean = true;

  constructor(customStyles?: Partial<Record<MaskingPatternType, DecorationStyle>>) {
    this.styles = {
      ...DEFAULT_STYLES,
      ...customStyles,
    };
  }

  /**
   * Sets the suggestions to highlight
   */
  setSuggestions(suggestions: Suggestion[]): void {
    this.suggestions = suggestions;
  }

  /**
   * Gets suggestions for a specific file
   */
  getSuggestionsForFile(filePath: string): Suggestion[] {
    return this.suggestions.filter(s => s.field.location.filePath === filePath);
  }

  /**
   * Gets decoration ranges for a specific file
   * 
   * Validates: Requirements 4.3
   */
  getDecorationsForFile(filePath: string): DecorationRange[] {
    if (!this.enabled) {
      return [];
    }

    const fileSuggestions = this.getSuggestionsForFile(filePath);
    
    return fileSuggestions.map(suggestion => {
      const style = this.getStyleForSuggestion(suggestion);
      
      return {
        location: suggestion.field.location,
        style,
        hoverMessage: this.createHoverMessage(suggestion),
        suggestionId: suggestion.id,
      };
    });
  }

  /**
   * Gets the style for a suggestion based on pattern type and confidence
   */
  private getStyleForSuggestion(suggestion: Suggestion): DecorationStyle {
    const baseStyle = this.styles[suggestion.patternType] || this.styles.custom;
    
    // Adjust opacity based on confidence
    const opacity = Math.max(0.1, suggestion.confidenceScore / 100 * 0.3);
    
    // Clone and modify style
    const style: DecorationStyle = { ...baseStyle };
    
    if (style.backgroundColor) {
      style.backgroundColor = this.adjustOpacity(style.backgroundColor, opacity);
    }

    // Remove label if disabled
    if (!this.showLabels) {
      delete style.after;
    }

    return style;
  }

  /**
   * Adjusts the opacity of an rgba color string
   */
  private adjustOpacity(color: string, opacity: number): string {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
    return color;
  }

  /**
   * Creates a hover message for a suggestion
   */
  private createHoverMessage(suggestion: Suggestion): string {
    const lines = [
      `**${suggestion.field.name}** - ${this.formatPatternType(suggestion.patternType)}`,
      '',
      `Confidence: ${suggestion.confidenceScore}%`,
      `Status: ${suggestion.status}`,
      '',
      `Recommended: ${suggestion.recommendedAction.description}`,
    ];

    return lines.join('\n');
  }

  /**
   * Formats pattern type for display
   */
  private formatPatternType(type: MaskingPatternType): string {
    const labels: Record<MaskingPatternType, string> = {
      pii: 'Personal Identifiable Information',
      credentials: 'Credentials/Secret',
      financial: 'Financial Data',
      health: 'Health Information',
      custom: 'Custom Pattern',
    };
    return labels[type] || type;
  }

  /**
   * Enables or disables highlighting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Gets whether highlighting is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enables or disables inline labels
   */
  setShowLabels(show: boolean): void {
    this.showLabels = show;
  }

  /**
   * Gets whether labels are shown
   */
  isShowingLabels(): boolean {
    return this.showLabels;
  }

  /**
   * Sets a custom style for a pattern type
   */
  setStyle(patternType: MaskingPatternType, style: DecorationStyle): void {
    this.styles[patternType] = style;
  }

  /**
   * Gets the style for a pattern type
   */
  getStyle(patternType: MaskingPatternType): DecorationStyle {
    return { ...this.styles[patternType] };
  }

  /**
   * Gets all unique files that have suggestions
   */
  getFilesWithSuggestions(): string[] {
    const files = new Set<string>();
    for (const suggestion of this.suggestions) {
      files.add(suggestion.field.location.filePath);
    }
    return Array.from(files);
  }

  /**
   * Gets the count of suggestions per file
   */
  getSuggestionCountByFile(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const suggestion of this.suggestions) {
      const filePath = suggestion.field.location.filePath;
      counts.set(filePath, (counts.get(filePath) || 0) + 1);
    }
    return counts;
  }
}

/**
 * Creates a new InlineHighlighter instance
 */
export function createInlineHighlighter(
  customStyles?: Partial<Record<MaskingPatternType, DecorationStyle>>
): InlineHighlighter {
  return new InlineHighlighter(customStyles);
}
