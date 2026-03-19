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
export declare const DEFAULT_STYLES: Record<MaskingPatternType, DecorationStyle>;
/**
 * InlineHighlighter class for managing code decorations
 */
export declare class InlineHighlighter {
    private suggestions;
    private styles;
    private enabled;
    private showLabels;
    constructor(customStyles?: Partial<Record<MaskingPatternType, DecorationStyle>>);
    /**
     * Sets the suggestions to highlight
     */
    setSuggestions(suggestions: Suggestion[]): void;
    /**
     * Gets suggestions for a specific file
     */
    getSuggestionsForFile(filePath: string): Suggestion[];
    /**
     * Gets decoration ranges for a specific file
     *
     * Validates: Requirements 4.3
     */
    getDecorationsForFile(filePath: string): DecorationRange[];
    /**
     * Gets the style for a suggestion based on pattern type and confidence
     */
    private getStyleForSuggestion;
    /**
     * Adjusts the opacity of an rgba color string
     */
    private adjustOpacity;
    /**
     * Creates a hover message for a suggestion
     */
    private createHoverMessage;
    /**
     * Formats pattern type for display
     */
    private formatPatternType;
    /**
     * Enables or disables highlighting
     */
    setEnabled(enabled: boolean): void;
    /**
     * Gets whether highlighting is enabled
     */
    isEnabled(): boolean;
    /**
     * Enables or disables inline labels
     */
    setShowLabels(show: boolean): void;
    /**
     * Gets whether labels are shown
     */
    isShowingLabels(): boolean;
    /**
     * Sets a custom style for a pattern type
     */
    setStyle(patternType: MaskingPatternType, style: DecorationStyle): void;
    /**
     * Gets the style for a pattern type
     */
    getStyle(patternType: MaskingPatternType): DecorationStyle;
    /**
     * Gets all unique files that have suggestions
     */
    getFilesWithSuggestions(): string[];
    /**
     * Gets the count of suggestions per file
     */
    getSuggestionCountByFile(): Map<string, number>;
}
/**
 * Creates a new InlineHighlighter instance
 */
export declare function createInlineHighlighter(customStyles?: Partial<Record<MaskingPatternType, DecorationStyle>>): InlineHighlighter;
//# sourceMappingURL=inline-highlighter.d.ts.map