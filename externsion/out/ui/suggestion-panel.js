"use strict";
/**
 * Suggestion Panel Webview Provider
 *
 * Displays suggestions grouped by pattern category with field name,
 * file location, confidence score, and recommended action.
 *
 * Validates: Requirements 4.1, 4.2, 4.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuggestionPanel = void 0;
exports.createSuggestionPanel = createSuggestionPanel;
/**
 * SuggestionPanel class for managing the webview panel
 */
class SuggestionPanel {
    suggestions = [];
    config;
    listeners = new Map();
    constructor(config) {
        this.config = {
            sortBy: 'confidence',
            sortDirection: 'desc',
            groupByPattern: true,
            filter: {},
            ...config,
        };
    }
    /**
     * Sets the suggestions to display
     */
    setSuggestions(suggestions) {
        this.suggestions = suggestions;
    }
    /**
     * Gets filtered and sorted suggestions
     */
    getSuggestions() {
        let result = this.filterSuggestions(this.suggestions);
        result = this.sortSuggestions(result);
        return result;
    }
    /**
     * Gets suggestions grouped by pattern type
     *
     * Validates: Requirements 4.1
     */
    getGroupedSuggestions() {
        const filtered = this.getSuggestions();
        const groups = new Map();
        // Initialize all pattern types
        const patternTypes = ['pii', 'credentials', 'financial', 'health', 'custom'];
        for (const type of patternTypes) {
            groups.set(type, []);
        }
        // Group suggestions
        for (const suggestion of filtered) {
            const group = groups.get(suggestion.patternType) || [];
            group.push(suggestion);
            groups.set(suggestion.patternType, group);
        }
        // Convert to array, filtering out empty groups
        return patternTypes
            .map(type => ({
            patternType: type,
            suggestions: groups.get(type) || [],
            count: (groups.get(type) || []).length,
        }))
            .filter(g => g.count > 0);
    }
    /**
     * Filters suggestions based on current filter config
     */
    filterSuggestions(suggestions) {
        const { filter } = this.config;
        let result = [...suggestions];
        if (filter.patternTypes && filter.patternTypes.length > 0) {
            result = result.filter(s => filter.patternTypes.includes(s.patternType));
        }
        if (filter.minConfidence !== undefined) {
            result = result.filter(s => s.confidenceScore >= filter.minConfidence);
        }
        if (filter.status && filter.status.length > 0) {
            result = result.filter(s => filter.status.includes(s.status));
        }
        if (filter.filePath) {
            result = result.filter(s => s.field.location.filePath.includes(filter.filePath));
        }
        return result;
    }
    /**
     * Sorts suggestions based on current sort config
     *
     * Validates: Requirements 4.5
     */
    sortSuggestions(suggestions) {
        const { sortBy, sortDirection } = this.config;
        const multiplier = sortDirection === 'asc' ? 1 : -1;
        return [...suggestions].sort((a, b) => {
            switch (sortBy) {
                case 'confidence':
                    return (a.confidenceScore - b.confidenceScore) * multiplier;
                case 'location':
                    const fileCompare = a.field.location.filePath.localeCompare(b.field.location.filePath);
                    if (fileCompare !== 0)
                        return fileCompare * multiplier;
                    return (a.field.location.startLine - b.field.location.startLine) * multiplier;
                case 'pattern':
                    return a.patternType.localeCompare(b.patternType) * multiplier;
                case 'status':
                    return a.status.localeCompare(b.status) * multiplier;
                case 'date':
                    return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
                default:
                    return 0;
            }
        });
    }
    /**
     * Sets the sort option
     */
    setSortOption(sortBy, sortDirection) {
        this.config.sortBy = sortBy;
        if (sortDirection) {
            this.config.sortDirection = sortDirection;
        }
        this.emit({ type: 'sort', sortOption: sortBy });
    }
    /**
     * Gets the current sort option
     */
    getSortOption() {
        return {
            sortBy: this.config.sortBy,
            sortDirection: this.config.sortDirection,
        };
    }
    /**
     * Sets the filter
     */
    setFilter(filter) {
        this.config.filter = filter;
        this.emit({ type: 'filter', filter });
    }
    /**
     * Gets the current filter
     */
    getFilter() {
        return { ...this.config.filter };
    }
    /**
     * Toggles grouping by pattern
     */
    setGroupByPattern(enabled) {
        this.config.groupByPattern = enabled;
    }
    /**
     * Gets whether grouping is enabled
     */
    isGroupByPattern() {
        return this.config.groupByPattern;
    }
    /**
     * Handles accept action for a suggestion
     */
    accept(suggestionId, applyToSimilar = false) {
        const decision = { action: 'accept', applyToSimilar };
        this.emit({ type: 'accept', suggestionId, decision });
    }
    /**
     * Handles reject action for a suggestion
     */
    reject(suggestionId, notes) {
        const decision = { action: 'reject', notes };
        this.emit({ type: 'reject', suggestionId, decision });
    }
    /**
     * Handles defer action for a suggestion
     */
    defer(suggestionId) {
        const decision = { action: 'defer' };
        this.emit({ type: 'defer', suggestionId, decision });
    }
    /**
     * Navigates to a suggestion's location in the editor
     */
    navigateTo(suggestionId) {
        this.emit({ type: 'navigate', suggestionId });
    }
    /**
     * Requests a refresh of suggestions
     */
    refresh() {
        this.emit({ type: 'refresh' });
    }
    /**
     * Adds an event listener
     */
    on(eventType, listener) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, new Set());
        }
        this.listeners.get(eventType).add(listener);
    }
    /**
     * Removes an event listener
     */
    off(eventType, listener) {
        const listeners = this.listeners.get(eventType);
        if (listeners) {
            listeners.delete(listener);
        }
    }
    /**
     * Emits an event to all listeners
     */
    emit(event) {
        const listeners = this.listeners.get(event.type);
        if (listeners) {
            for (const listener of listeners) {
                listener(event);
            }
        }
    }
    /**
     * Gets a suggestion by ID
     */
    getSuggestionById(id) {
        return this.suggestions.find(s => s.id === id);
    }
    /**
     * Gets summary statistics for display
     */
    getSummary() {
        const filtered = this.getSuggestions();
        return {
            total: filtered.length,
            pending: filtered.filter(s => s.status === 'pending').length,
            accepted: filtered.filter(s => s.status === 'accepted').length,
            rejected: filtered.filter(s => s.status === 'rejected').length,
            deferred: filtered.filter(s => s.status === 'deferred').length,
        };
    }
    /**
     * Generates HTML content for the webview
     *
     * Validates: Requirements 4.2
     */
    generateHtml() {
        const groups = this.getGroupedSuggestions();
        const summary = this.getSummary();
        let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: var(--vscode-font-family); padding: 10px; }
    .summary { margin-bottom: 20px; padding: 10px; background: var(--vscode-editor-background); }
    .group { margin-bottom: 15px; }
    .group-header { font-weight: bold; padding: 5px; background: var(--vscode-sideBar-background); }
    .suggestion { padding: 8px; border-bottom: 1px solid var(--vscode-panel-border); }
    .suggestion:hover { background: var(--vscode-list-hoverBackground); }
    .field-name { font-weight: bold; }
    .location { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
    .confidence { display: inline-block; padding: 2px 6px; border-radius: 3px; }
    .confidence-high { background: #4caf50; color: white; }
    .confidence-medium { background: #ff9800; color: white; }
    .confidence-low { background: #f44336; color: white; }
    .actions { margin-top: 5px; }
    .actions button { margin-right: 5px; padding: 3px 8px; cursor: pointer; }
    .status { font-size: 0.8em; padding: 2px 5px; border-radius: 3px; }
    .status-pending { background: #2196f3; color: white; }
    .status-accepted { background: #4caf50; color: white; }
    .status-rejected { background: #f44336; color: white; }
    .status-deferred { background: #9e9e9e; color: white; }
  </style>
</head>
<body>
  <div class="summary">
    <strong>Summary:</strong> ${summary.total} suggestions
    (${summary.pending} pending, ${summary.accepted} accepted, ${summary.rejected} rejected, ${summary.deferred} deferred)
  </div>
`;
        for (const group of groups) {
            html += `
  <div class="group">
    <div class="group-header">${this.formatPatternType(group.patternType)} (${group.count})</div>
`;
            for (const suggestion of group.suggestions) {
                const confidenceClass = this.getConfidenceClass(suggestion.confidenceScore);
                const statusClass = `status-${suggestion.status}`;
                html += `
    <div class="suggestion" data-id="${suggestion.id}">
      <div class="field-name">${this.escapeHtml(suggestion.field.name)}</div>
      <div class="location">${this.escapeHtml(suggestion.field.location.filePath)}:${suggestion.field.location.startLine}</div>
      <span class="confidence ${confidenceClass}">${suggestion.confidenceScore}%</span>
      <span class="status ${statusClass}">${suggestion.status}</span>
      <div class="recommended-action">${this.escapeHtml(suggestion.recommendedAction.description)}</div>
      <div class="actions">
        <button onclick="accept('${suggestion.id}')">Accept</button>
        <button onclick="reject('${suggestion.id}')">Reject</button>
        <button onclick="defer('${suggestion.id}')">Defer</button>
        <button onclick="navigate('${suggestion.id}')">Go to</button>
      </div>
    </div>
`;
            }
            html += `  </div>\n`;
        }
        html += `
</body>
</html>`;
        return html;
    }
    /**
     * Formats pattern type for display
     */
    formatPatternType(type) {
        const labels = {
            pii: 'Personal Identifiable Information (PII)',
            credentials: 'Credentials & Secrets',
            financial: 'Financial Data',
            health: 'Health Information',
            custom: 'Custom Patterns',
        };
        return labels[type] || type;
    }
    /**
     * Gets CSS class for confidence score
     */
    getConfidenceClass(score) {
        if (score >= 80)
            return 'confidence-high';
        if (score >= 50)
            return 'confidence-medium';
        return 'confidence-low';
    }
    /**
     * Escapes HTML special characters
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}
exports.SuggestionPanel = SuggestionPanel;
/**
 * Creates a new SuggestionPanel instance
 */
function createSuggestionPanel(config) {
    return new SuggestionPanel(config);
}
//# sourceMappingURL=suggestion-panel.js.map