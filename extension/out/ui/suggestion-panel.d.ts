/**
 * Suggestion Panel Webview Provider
 *
 * Displays suggestions grouped by pattern category with field name,
 * file location, confidence score, and recommended action.
 *
 * Validates: Requirements 4.1, 4.2, 4.5
 */
import { Suggestion, SuggestionFilter, MaskingPatternType, UserDecision } from '../types';
/**
 * Sort options for the suggestion panel
 */
export type SortOption = 'confidence' | 'location' | 'pattern' | 'status' | 'date';
export type SortDirection = 'asc' | 'desc';
/**
 * Panel configuration
 */
export interface PanelConfig {
    sortBy: SortOption;
    sortDirection: SortDirection;
    groupByPattern: boolean;
    filter: SuggestionFilter;
}
/**
 * Event types emitted by the panel
 */
export type PanelEventType = 'accept' | 'reject' | 'defer' | 'navigate' | 'sort' | 'filter' | 'refresh';
/**
 * Panel event data
 */
export interface PanelEvent {
    type: PanelEventType;
    suggestionId?: string;
    decision?: UserDecision;
    sortOption?: SortOption;
    filter?: SuggestionFilter;
}
/**
 * Event listener type
 */
export type PanelEventListener = (event: PanelEvent) => void;
/**
 * Grouped suggestions by pattern type
 */
export interface GroupedSuggestions {
    patternType: MaskingPatternType;
    suggestions: Suggestion[];
    count: number;
}
/**
 * SuggestionPanel class for managing the webview panel
 */
export declare class SuggestionPanel {
    private suggestions;
    private config;
    private listeners;
    constructor(config?: Partial<PanelConfig>);
    /**
     * Sets the suggestions to display
     */
    setSuggestions(suggestions: Suggestion[]): void;
    /**
     * Gets filtered and sorted suggestions
     */
    getSuggestions(): Suggestion[];
    /**
     * Gets suggestions grouped by pattern type
     *
     * Validates: Requirements 4.1
     */
    getGroupedSuggestions(): GroupedSuggestions[];
    /**
     * Filters suggestions based on current filter config
     */
    private filterSuggestions;
    /**
     * Sorts suggestions based on current sort config
     *
     * Validates: Requirements 4.5
     */
    private sortSuggestions;
    /**
     * Sets the sort option
     */
    setSortOption(sortBy: SortOption, sortDirection?: SortDirection): void;
    /**
     * Gets the current sort option
     */
    getSortOption(): {
        sortBy: SortOption;
        sortDirection: SortDirection;
    };
    /**
     * Sets the filter
     */
    setFilter(filter: SuggestionFilter): void;
    /**
     * Gets the current filter
     */
    getFilter(): SuggestionFilter;
    /**
     * Toggles grouping by pattern
     */
    setGroupByPattern(enabled: boolean): void;
    /**
     * Gets whether grouping is enabled
     */
    isGroupByPattern(): boolean;
    /**
     * Handles accept action for a suggestion
     */
    accept(suggestionId: string, applyToSimilar?: boolean): void;
    /**
     * Handles reject action for a suggestion
     */
    reject(suggestionId: string, notes?: string): void;
    /**
     * Handles defer action for a suggestion
     */
    defer(suggestionId: string): void;
    /**
     * Navigates to a suggestion's location in the editor
     */
    navigateTo(suggestionId: string): void;
    /**
     * Requests a refresh of suggestions
     */
    refresh(): void;
    /**
     * Adds an event listener
     */
    on(eventType: PanelEventType, listener: PanelEventListener): void;
    /**
     * Removes an event listener
     */
    off(eventType: PanelEventType, listener: PanelEventListener): void;
    /**
     * Emits an event to all listeners
     */
    private emit;
    /**
     * Gets a suggestion by ID
     */
    getSuggestionById(id: string): Suggestion | undefined;
    /**
     * Gets summary statistics for display
     */
    getSummary(): {
        total: number;
        pending: number;
        accepted: number;
        rejected: number;
        deferred: number;
    };
    /**
     * Generates HTML content for the webview
     *
     * Validates: Requirements 4.2
     */
    generateHtml(): string;
    /**
     * Formats pattern type for display
     */
    private formatPatternType;
    /**
     * Gets CSS class for confidence score
     */
    private getConfidenceClass;
    /**
     * Escapes HTML special characters
     */
    private escapeHtml;
}
/**
 * Creates a new SuggestionPanel instance
 */
export declare function createSuggestionPanel(config?: Partial<PanelConfig>): SuggestionPanel;
//# sourceMappingURL=suggestion-panel.d.ts.map