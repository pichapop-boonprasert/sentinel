/**
 * Suggestion Engine for managing masking suggestions
 *
 * Manages the lifecycle of suggestions and handles user interactions
 * including accept, reject, and defer decisions.
 *
 * Validates: Requirements 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
import { Suggestion, SuggestionFilter, SuggestionStatus, UserDecision, CustomFieldInput, FieldDeclaration, AnalysisResult, ISuggestionEngine } from '../types';
/**
 * Sort criteria for suggestions
 */
export type SortCriteria = 'confidence' | 'location' | 'patternType' | 'status' | 'createdAt';
/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';
/**
 * Sort options for suggestions
 */
export interface SortOptions {
    criteria: SortCriteria;
    direction: SortDirection;
}
/**
 * Event types emitted by the suggestion engine
 */
export type SuggestionEventType = 'suggestion-added' | 'suggestion-updated' | 'suggestion-removed' | 'decision-made' | 'bulk-update';
/**
 * Event data for suggestion events
 */
export interface SuggestionEvent {
    type: SuggestionEventType;
    suggestion?: Suggestion;
    suggestions?: Suggestion[];
    decision?: UserDecision;
}
/**
 * Listener function for suggestion events
 */
export type SuggestionEventListener = (event: SuggestionEvent) => void;
/**
 * Callback for persisting decisions (to be provided by Configuration Manager)
 */
export type DecisionPersistCallback = (suggestionId: string, decision: UserDecision, suggestion: Suggestion) => Promise<void>;
/**
 * Callback for finding similar fields across workspace
 */
export type FindSimilarFieldsCallback = (fieldName: string, excludeFilePath?: string) => Promise<FieldDeclaration[]>;
/**
 * SuggestionEngine class for managing masking suggestions
 */
export declare class SuggestionEngine implements ISuggestionEngine {
    private suggestions;
    private idCounter;
    private eventListeners;
    private decisionPersistCallback?;
    private findSimilarFieldsCallback?;
    /**
     * Creates a new SuggestionEngine
     * @param initialSuggestions - Optional initial suggestions to load
     */
    constructor(initialSuggestions?: Suggestion[]);
    /**
     * Sets the callback for persisting decisions
     */
    setDecisionPersistCallback(callback: DecisionPersistCallback): void;
    /**
     * Sets the callback for finding similar fields
     */
    setFindSimilarFieldsCallback(callback: FindSimilarFieldsCallback): void;
    /**
     * Adds an event listener
     */
    addEventListener(listener: SuggestionEventListener): void;
    /**
     * Removes an event listener
     */
    removeEventListener(listener: SuggestionEventListener): void;
    /**
     * Emits an event to all listeners
     */
    private emitEvent;
    /**
     * Generates a unique suggestion ID
     */
    private generateId;
    /**
     * Creates a suggestion from an analysis result
     * @param result - The analysis result to create a suggestion from
     * @returns The created suggestion
     *
     * Validates: Requirements 4.2
     */
    createSuggestion(result: AnalysisResult): Suggestion;
    /**
     * Creates multiple suggestions from analysis results
     * @param results - Array of analysis results
     * @returns Array of created suggestions
     */
    createSuggestions(results: AnalysisResult[]): Suggestion[];
    /**
     * Determines the recommended masking action based on analysis result
     */
    private determineRecommendedAction;
    /**
     * Gets all suggestions or filtered suggestions
     * @param filter - Optional filter criteria
     * @returns Array of suggestions matching the filter
     *
     * Validates: Requirements 4.2
     */
    getSuggestions(filter?: SuggestionFilter): Suggestion[];
    /**
     * Gets a suggestion by ID
     * @param id - The suggestion ID
     * @returns The suggestion if found, undefined otherwise
     */
    getSuggestionById(id: string): Suggestion | undefined;
    /**
     * Gets the total count of suggestions
     */
    getSuggestionCount(): number;
    /**
     * Gets count of suggestions by status
     */
    getCountByStatus(): Record<SuggestionStatus, number>;
    /**
     * Sorts suggestions by the specified criteria
     * @param suggestions - Suggestions to sort
     * @param options - Sort options
     * @returns Sorted suggestions
     *
     * Validates: Requirements 4.5
     */
    sortSuggestions(suggestions: Suggestion[], options: SortOptions): Suggestion[];
    /**
     * Processes a user decision on a suggestion
     * @param suggestionId - ID of the suggestion
     * @param decision - User's decision
     *
     * Validates: Requirements 5.1, 5.2, 5.3
     */
    processDecision(suggestionId: string, decision: UserDecision): Promise<void>;
    /**
     * Maps a decision action to a suggestion status
     */
    private mapDecisionToStatus;
    /**
     * Applies a decision to similar fields across workspace
     * @param suggestionId - ID of the original suggestion
     * @param decision - Decision to apply
     * @returns Number of similar fields updated
     *
     * Validates: Requirements 5.5
     */
    applyToSimilar(suggestionId: string, decision: UserDecision): Promise<number>;
    /**
     * Finds a suggestion by field location
     */
    private findSuggestionByField;
    /**
     * Adds a custom field to the masking list
     * @param input - Custom field input
     * @returns The created suggestion
     *
     * Validates: Requirements 5.4
     */
    addCustomField(input: CustomFieldInput): Promise<Suggestion>;
    /**
     * Removes a suggestion by ID
     * @param id - The suggestion ID to remove
     * @returns true if removed, false if not found
     */
    removeSuggestion(id: string): boolean;
    /**
     * Removes all suggestions for a specific file
     * @param filePath - The file path to remove suggestions for
     * @returns Number of suggestions removed
     */
    removeSuggestionsForFile(filePath: string): number;
    /**
     * Updates suggestions for a file (removes old ones and adds new ones)
     * @param filePath - The file path
     * @param newResults - New analysis results for the file
     * @returns Array of new suggestions
     */
    updateSuggestionsForFile(filePath: string, newResults: AnalysisResult[]): Suggestion[];
    /**
     * Clears all suggestions
     */
    clearAll(): void;
    /**
     * Exports all suggestions for persistence
     */
    exportSuggestions(): Suggestion[];
    /**
     * Imports suggestions from persistence
     * @param suggestions - Suggestions to import
     * @param merge - If true, merges with existing. If false, replaces all.
     */
    importSuggestions(suggestions: Suggestion[], merge?: boolean): void;
}
/**
 * Creates a new SuggestionEngine instance
 * @param initialSuggestions - Optional initial suggestions
 * @returns A new SuggestionEngine
 */
export declare function createSuggestionEngine(initialSuggestions?: Suggestion[]): SuggestionEngine;
//# sourceMappingURL=suggestion-engine.d.ts.map