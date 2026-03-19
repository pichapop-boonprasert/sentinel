/**
 * Hover Tooltip Provider
 *
 * Displays masking suggestion details on hover over sensitive fields.
 *
 * Validates: Requirements 4.4
 */
import { Suggestion } from '../types';
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
export declare class TooltipProvider {
    private suggestions;
    /**
     * Sets the suggestions for tooltip lookup
     */
    setSuggestions(suggestions: Suggestion[]): void;
    /**
     * Gets tooltip content for a position in a file
     *
     * Validates: Requirements 4.4
     */
    getTooltipAt(filePath: string, line: number, column: number): TooltipContent | null;
    /**
     * Finds a suggestion that contains the given position
     */
    private findSuggestionAtPosition;
    /**
     * Checks if a position is within a code location range
     */
    private isPositionInRange;
    /**
     * Creates tooltip content for a suggestion
     */
    private createTooltipContent;
    /**
     * Formats pattern type for display
     */
    private formatPatternType;
    /**
     * Formats status for display
     */
    private formatStatus;
    /**
     * Gets style based on confidence score
     */
    private getConfidenceStyle;
    /**
     * Gets style based on status
     */
    private getStatusStyle;
    /**
     * Generates Markdown content for the tooltip
     */
    generateMarkdown(content: TooltipContent): string;
    /**
     * Gets all suggestions for a file
     */
    getSuggestionsForFile(filePath: string): Suggestion[];
    /**
     * Checks if there are any suggestions at a given line
     */
    hasSuggestionsAtLine(filePath: string, line: number): boolean;
}
/**
 * Creates a new TooltipProvider instance
 */
export declare function createTooltipProvider(): TooltipProvider;
//# sourceMappingURL=tooltip-provider.d.ts.map