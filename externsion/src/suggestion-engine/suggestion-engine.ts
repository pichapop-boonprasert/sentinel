/**
 * Suggestion Engine for managing masking suggestions
 * 
 * Manages the lifecycle of suggestions and handles user interactions
 * including accept, reject, and defer decisions.
 * 
 * Validates: Requirements 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  Suggestion,
  SuggestionFilter,
  SuggestionStatus,
  UserDecision,
  CustomFieldInput,
  FieldDeclaration,
  MaskingPatternType,
  MaskingAction,
  AnalysisResult,
  Priority,
  ISuggestionEngine,
  CodeLocation,
} from '../types';

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
export type SuggestionEventType = 
  | 'suggestion-added'
  | 'suggestion-updated'
  | 'suggestion-removed'
  | 'decision-made'
  | 'bulk-update';

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
export type DecisionPersistCallback = (
  suggestionId: string,
  decision: UserDecision,
  suggestion: Suggestion
) => Promise<void>;

/**
 * Callback for finding similar fields across workspace
 */
export type FindSimilarFieldsCallback = (
  fieldName: string,
  excludeFilePath?: string
) => Promise<FieldDeclaration[]>;

/**
 * SuggestionEngine class for managing masking suggestions
 */
export class SuggestionEngine implements ISuggestionEngine {
  private suggestions: Map<string, Suggestion> = new Map();
  private idCounter: number = 0;
  private eventListeners: SuggestionEventListener[] = [];
  private decisionPersistCallback?: DecisionPersistCallback;
  private findSimilarFieldsCallback?: FindSimilarFieldsCallback;

  /**
   * Creates a new SuggestionEngine
   * @param initialSuggestions - Optional initial suggestions to load
   */
  constructor(initialSuggestions: Suggestion[] = []) {
    for (const suggestion of initialSuggestions) {
      this.suggestions.set(suggestion.id, suggestion);
      // Update idCounter to avoid ID collisions
      const idNum = parseInt(suggestion.id.replace('suggestion-', ''), 10);
      if (!isNaN(idNum) && idNum >= this.idCounter) {
        this.idCounter = idNum + 1;
      }
    }
  }

  /**
   * Sets the callback for persisting decisions
   */
  setDecisionPersistCallback(callback: DecisionPersistCallback): void {
    this.decisionPersistCallback = callback;
  }

  /**
   * Sets the callback for finding similar fields
   */
  setFindSimilarFieldsCallback(callback: FindSimilarFieldsCallback): void {
    this.findSimilarFieldsCallback = callback;
  }

  /**
   * Adds an event listener
   */
  addEventListener(listener: SuggestionEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Removes an event listener
   */
  removeEventListener(listener: SuggestionEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index >= 0) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emits an event to all listeners
   */
  private emitEvent(event: SuggestionEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in suggestion event listener:', error);
      }
    }
  }

  /**
   * Generates a unique suggestion ID
   */
  private generateId(): string {
    return `suggestion-${++this.idCounter}`;
  }

  /**
   * Creates a suggestion from an analysis result
   * @param result - The analysis result to create a suggestion from
   * @returns The created suggestion
   * 
   * Validates: Requirements 4.2
   */
  createSuggestion(result: AnalysisResult): Suggestion {
    const suggestion: Suggestion = {
      id: this.generateId(),
      field: result.field,
      confidenceScore: result.confidenceScore,
      patternType: result.detectedPatterns[0] || 'custom',
      status: 'pending',
      recommendedAction: this.determineRecommendedAction(result),
      createdAt: new Date(),
      reviewedAt: null,
    };

    this.suggestions.set(suggestion.id, suggestion);
    this.emitEvent({ type: 'suggestion-added', suggestion });

    return suggestion;
  }

  /**
   * Creates multiple suggestions from analysis results
   * @param results - Array of analysis results
   * @returns Array of created suggestions
   */
  createSuggestions(results: AnalysisResult[]): Suggestion[] {
    const suggestions: Suggestion[] = [];
    
    for (const result of results) {
      if (result.isSensitive) {
        suggestions.push(this.createSuggestion(result));
      }
    }

    if (suggestions.length > 0) {
      this.emitEvent({ type: 'bulk-update', suggestions });
    }

    return suggestions;
  }

  /**
   * Determines the recommended masking action based on analysis result
   */
  private determineRecommendedAction(result: AnalysisResult): MaskingAction {
    const patternType = result.detectedPatterns[0];

    // Determine action based on pattern type and priority
    if (patternType === 'credentials') {
      return {
        type: 'redact',
        description: 'Completely redact credential values to prevent exposure',
      };
    }

    if (patternType === 'financial') {
      return {
        type: 'mask',
        description: 'Mask financial data showing only last 4 digits',
      };
    }

    if (patternType === 'health') {
      return {
        type: 'encrypt',
        description: 'Encrypt health data for HIPAA compliance',
      };
    }

    if (patternType === 'pii') {
      if (result.priority === 'high') {
        return {
          type: 'hash',
          description: 'Hash PII for anonymization while maintaining referential integrity',
        };
      }
      return {
        type: 'mask',
        description: 'Mask PII to protect personal information',
      };
    }

    // Default action for custom patterns
    return {
      type: 'mask',
      description: 'Apply masking to protect sensitive data',
    };
  }

  /**
   * Gets all suggestions or filtered suggestions
   * @param filter - Optional filter criteria
   * @returns Array of suggestions matching the filter
   * 
   * Validates: Requirements 4.2
   */
  getSuggestions(filter?: SuggestionFilter): Suggestion[] {
    let results = Array.from(this.suggestions.values());

    if (!filter) {
      return results;
    }

    // Filter by pattern types
    if (filter.patternTypes && filter.patternTypes.length > 0) {
      results = results.filter(s => filter.patternTypes!.includes(s.patternType));
    }

    // Filter by minimum confidence
    if (filter.minConfidence !== undefined) {
      results = results.filter(s => s.confidenceScore >= filter.minConfidence!);
    }

    // Filter by status
    if (filter.status && filter.status.length > 0) {
      results = results.filter(s => filter.status!.includes(s.status));
    }

    // Filter by file path
    if (filter.filePath) {
      results = results.filter(s => s.field.location.filePath === filter.filePath);
    }

    return results;
  }

  /**
   * Gets a suggestion by ID
   * @param id - The suggestion ID
   * @returns The suggestion if found, undefined otherwise
   */
  getSuggestionById(id: string): Suggestion | undefined {
    return this.suggestions.get(id);
  }

  /**
   * Gets the total count of suggestions
   */
  getSuggestionCount(): number {
    return this.suggestions.size;
  }

  /**
   * Gets count of suggestions by status
   */
  getCountByStatus(): Record<SuggestionStatus, number> {
    const counts: Record<SuggestionStatus, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      deferred: 0,
    };

    for (const suggestion of this.suggestions.values()) {
      counts[suggestion.status]++;
    }

    return counts;
  }

  /**
   * Sorts suggestions by the specified criteria
   * @param suggestions - Suggestions to sort
   * @param options - Sort options
   * @returns Sorted suggestions
   * 
   * Validates: Requirements 4.5
   */
  sortSuggestions(suggestions: Suggestion[], options: SortOptions): Suggestion[] {
    const sorted = [...suggestions];
    const multiplier = options.direction === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      switch (options.criteria) {
        case 'confidence':
          return (a.confidenceScore - b.confidenceScore) * multiplier;

        case 'location':
          // Sort by file path, then by line number
          const pathCompare = a.field.location.filePath.localeCompare(b.field.location.filePath);
          if (pathCompare !== 0) return pathCompare * multiplier;
          return (a.field.location.startLine - b.field.location.startLine) * multiplier;

        case 'patternType':
          return a.patternType.localeCompare(b.patternType) * multiplier;

        case 'status':
          const statusOrder: Record<SuggestionStatus, number> = {
            pending: 0,
            deferred: 1,
            accepted: 2,
            rejected: 3,
          };
          return (statusOrder[a.status] - statusOrder[b.status]) * multiplier;

        case 'createdAt':
          return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;

        default:
          return 0;
      }
    });

    return sorted;
  }

  /**
   * Processes a user decision on a suggestion
   * @param suggestionId - ID of the suggestion
   * @param decision - User's decision
   * 
   * Validates: Requirements 5.1, 5.2, 5.3
   */
  async processDecision(suggestionId: string, decision: UserDecision): Promise<void> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) {
      throw new Error(`Suggestion not found: ${suggestionId}`);
    }

    // Update suggestion status based on decision
    const previousStatus = suggestion.status;
    suggestion.status = this.mapDecisionToStatus(decision.action);
    suggestion.reviewedAt = new Date();

    // Persist the decision if callback is set
    if (this.decisionPersistCallback) {
      await this.decisionPersistCallback(suggestionId, decision, suggestion);
    }

    this.emitEvent({ type: 'decision-made', suggestion, decision });

    // Handle "apply to similar" if requested
    if (decision.applyToSimilar) {
      await this.applyToSimilar(suggestionId, decision);
    }
  }

  /**
   * Maps a decision action to a suggestion status
   */
  private mapDecisionToStatus(action: UserDecision['action']): SuggestionStatus {
    switch (action) {
      case 'accept':
        return 'accepted';
      case 'reject':
        return 'rejected';
      case 'defer':
        return 'deferred';
      default:
        return 'pending';
    }
  }

  /**
   * Applies a decision to similar fields across workspace
   * @param suggestionId - ID of the original suggestion
   * @param decision - Decision to apply
   * @returns Number of similar fields updated
   * 
   * Validates: Requirements 5.5
   */
  async applyToSimilar(suggestionId: string, decision: UserDecision): Promise<number> {
    const originalSuggestion = this.suggestions.get(suggestionId);
    if (!originalSuggestion) {
      throw new Error(`Suggestion not found: ${suggestionId}`);
    }

    const fieldName = originalSuggestion.field.name;
    let updatedCount = 0;

    // Find similar suggestions already in the engine (same field name, different file)
    for (const [id, suggestion] of this.suggestions) {
      if (id !== suggestionId && 
          suggestion.field.name === fieldName && 
          suggestion.status === 'pending') {
        suggestion.status = this.mapDecisionToStatus(decision.action);
        suggestion.reviewedAt = new Date();
        updatedCount++;

        // Persist each decision
        if (this.decisionPersistCallback) {
          await this.decisionPersistCallback(id, decision, suggestion);
        }
      }
    }

    // If callback is set, find similar fields in workspace that aren't suggestions yet
    if (this.findSimilarFieldsCallback) {
      const similarFields = await this.findSimilarFieldsCallback(
        fieldName,
        originalSuggestion.field.location.filePath
      );

      // Create suggestions for similar fields and apply the same decision
      for (const field of similarFields) {
        // Check if we already have a suggestion for this field
        const existingSuggestion = this.findSuggestionByField(field);
        if (!existingSuggestion) {
          // Create a new suggestion with the same decision already applied
          const newSuggestion: Suggestion = {
            id: this.generateId(),
            field,
            confidenceScore: originalSuggestion.confidenceScore,
            patternType: originalSuggestion.patternType,
            status: this.mapDecisionToStatus(decision.action),
            recommendedAction: originalSuggestion.recommendedAction,
            createdAt: new Date(),
            reviewedAt: new Date(),
          };

          this.suggestions.set(newSuggestion.id, newSuggestion);
          updatedCount++;

          if (this.decisionPersistCallback) {
            await this.decisionPersistCallback(newSuggestion.id, decision, newSuggestion);
          }
        }
      }
    }

    if (updatedCount > 0) {
      this.emitEvent({ 
        type: 'bulk-update', 
        suggestions: Array.from(this.suggestions.values()).filter(
          s => s.field.name === fieldName
        )
      });
    }

    return updatedCount;
  }

  /**
   * Finds a suggestion by field location
   */
  private findSuggestionByField(field: FieldDeclaration): Suggestion | undefined {
    for (const suggestion of this.suggestions.values()) {
      if (suggestion.field.location.filePath === field.location.filePath &&
          suggestion.field.location.startLine === field.location.startLine &&
          suggestion.field.name === field.name) {
        return suggestion;
      }
    }
    return undefined;
  }

  /**
   * Adds a custom field to the masking list
   * @param input - Custom field input
   * @returns The created suggestion
   * 
   * Validates: Requirements 5.4
   */
  async addCustomField(input: CustomFieldInput): Promise<Suggestion> {
    // Create a field declaration from the input
    const field: FieldDeclaration = {
      name: input.fieldName,
      type: null,
      location: {
        filePath: input.filePath,
        startLine: 0, // Unknown for custom fields
        startColumn: 0,
        endLine: 0,
        endColumn: input.fieldName.length,
      },
      context: {
        surroundingCode: '',
        comments: input.notes ? [input.notes] : [],
        parentScope: '',
        usageContexts: [],
      },
    };

    // Create suggestion with accepted status (user explicitly added it)
    const suggestion: Suggestion = {
      id: this.generateId(),
      field,
      confidenceScore: 100, // User-added fields have 100% confidence
      patternType: input.patternType,
      status: 'accepted',
      recommendedAction: {
        type: 'mask',
        description: 'User-defined sensitive field',
      },
      createdAt: new Date(),
      reviewedAt: new Date(),
    };

    this.suggestions.set(suggestion.id, suggestion);

    // Persist the decision
    if (this.decisionPersistCallback) {
      await this.decisionPersistCallback(suggestion.id, { action: 'accept' }, suggestion);
    }

    this.emitEvent({ type: 'suggestion-added', suggestion });

    return suggestion;
  }

  /**
   * Removes a suggestion by ID
   * @param id - The suggestion ID to remove
   * @returns true if removed, false if not found
   */
  removeSuggestion(id: string): boolean {
    const suggestion = this.suggestions.get(id);
    if (suggestion) {
      this.suggestions.delete(id);
      this.emitEvent({ type: 'suggestion-removed', suggestion });
      return true;
    }
    return false;
  }

  /**
   * Removes all suggestions for a specific file
   * @param filePath - The file path to remove suggestions for
   * @returns Number of suggestions removed
   */
  removeSuggestionsForFile(filePath: string): number {
    let removedCount = 0;
    const removedSuggestions: Suggestion[] = [];

    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.field.location.filePath === filePath) {
        this.suggestions.delete(id);
        removedSuggestions.push(suggestion);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.emitEvent({ type: 'bulk-update', suggestions: removedSuggestions });
    }

    return removedCount;
  }

  /**
   * Updates suggestions for a file (removes old ones and adds new ones)
   * @param filePath - The file path
   * @param newResults - New analysis results for the file
   * @returns Array of new suggestions
   */
  updateSuggestionsForFile(filePath: string, newResults: AnalysisResult[]): Suggestion[] {
    // Remove existing pending suggestions for this file
    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.field.location.filePath === filePath && 
          suggestion.status === 'pending') {
        this.suggestions.delete(id);
      }
    }

    // Create new suggestions from results
    return this.createSuggestions(newResults);
  }

  /**
   * Clears all suggestions
   */
  clearAll(): void {
    this.suggestions.clear();
    this.emitEvent({ type: 'bulk-update', suggestions: [] });
  }

  /**
   * Exports all suggestions for persistence
   */
  exportSuggestions(): Suggestion[] {
    return Array.from(this.suggestions.values()).map(s => ({
      ...s,
      createdAt: new Date(s.createdAt),
      reviewedAt: s.reviewedAt ? new Date(s.reviewedAt) : null,
    }));
  }

  /**
   * Imports suggestions from persistence
   * @param suggestions - Suggestions to import
   * @param merge - If true, merges with existing. If false, replaces all.
   */
  importSuggestions(suggestions: Suggestion[], merge: boolean = false): void {
    if (!merge) {
      this.suggestions.clear();
    }

    for (const suggestion of suggestions) {
      // Ensure dates are Date objects
      const imported: Suggestion = {
        ...suggestion,
        createdAt: new Date(suggestion.createdAt),
        reviewedAt: suggestion.reviewedAt ? new Date(suggestion.reviewedAt) : null,
      };

      if (!merge || !this.suggestions.has(imported.id)) {
        this.suggestions.set(imported.id, imported);
      }

      // Update idCounter
      const idNum = parseInt(imported.id.replace('suggestion-', ''), 10);
      if (!isNaN(idNum) && idNum >= this.idCounter) {
        this.idCounter = idNum + 1;
      }
    }

    this.emitEvent({ type: 'bulk-update', suggestions: Array.from(this.suggestions.values()) });
  }
}

/**
 * Creates a new SuggestionEngine instance
 * @param initialSuggestions - Optional initial suggestions
 * @returns A new SuggestionEngine
 */
export function createSuggestionEngine(initialSuggestions?: Suggestion[]): SuggestionEngine {
  return new SuggestionEngine(initialSuggestions);
}
