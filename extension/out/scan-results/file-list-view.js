"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileListView = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Pattern type icon mapping for QuickPick display
 */
const PATTERN_TYPE_ICONS = {
    pii: '$(person) PII',
    credentials: '$(key) Credentials',
    financial: '$(credit-card) Financial',
    health: '$(heart) Health',
    custom: '$(tag) Custom',
};
/**
 * File List View implementation using VS Code QuickPick API.
 * Displays aggregated scan results with filtering and navigation capabilities.
 * Implements IFileListView interface.
 */
class FileListView {
    results = [];
    filter = {};
    sortOption = 'findingCount';
    fileSelectedCallbacks = [];
    quickPick = null;
    activePatternFilters = new Set();
    /**
     * Shows the file list with current results using VS Code QuickPick.
     * Handles empty state with appropriate messages.
     */
    async show() {
        // Handle empty state - no results exist
        if (this.results.length === 0) {
            const action = await vscode.window.showInformationMessage('No scan results available. Would you like to run a workspace scan?', 'Run Scan', 'Cancel');
            if (action === 'Run Scan') {
                await vscode.commands.executeCommand('dataMasking.scanWorkspace');
            }
            return;
        }
        // Create QuickPick instance
        this.quickPick = vscode.window.createQuickPick();
        this.quickPick.title = 'Sensitive Data Findings';
        this.quickPick.placeholder = 'Search files by path...';
        this.quickPick.matchOnDescription = true;
        this.quickPick.matchOnDetail = true;
        // Create filter buttons for pattern types
        this.quickPick.buttons = this.createFilterButtons();
        // Set initial items
        this.updateQuickPickItems();
        // Handle search/filter via QuickPick's built-in filter
        this.quickPick.onDidChangeValue((value) => {
            this.filter.searchText = value;
            // QuickPick handles filtering automatically, but we track the value
        });
        // Handle filter button clicks
        this.quickPick.onDidTriggerButton((button) => {
            this.handleFilterButtonClick(button);
        });
        // Handle file selection
        this.quickPick.onDidAccept(() => {
            const selected = this.quickPick?.selectedItems[0];
            if (selected) {
                this.notifyFileSelected(selected.filePath);
                this.quickPick?.hide();
            }
        });
        // Handle QuickPick hide
        this.quickPick.onDidHide(() => {
            this.quickPick?.dispose();
            this.quickPick = null;
        });
        this.quickPick.show();
    }
    /**
     * Updates the displayed results.
     * @param results - New aggregated results to display
     */
    updateResults(results) {
        this.results = results;
        if (this.quickPick) {
            this.updateQuickPickItems();
        }
    }
    /**
     * Sets the current filter.
     * @param filter - Filter criteria to apply
     */
    setFilter(filter) {
        this.filter = filter;
        if (filter.patternTypes) {
            this.activePatternFilters = new Set(filter.patternTypes);
        }
        if (this.quickPick) {
            this.updateQuickPickItems();
            this.quickPick.buttons = this.createFilterButtons();
        }
    }
    /**
     * Sets the sort option.
     * @param option - Sort option to apply
     */
    setSortOption(option) {
        this.sortOption = option;
        if (this.quickPick) {
            this.updateQuickPickItems();
        }
    }
    /**
     * Registers callback for file selection.
     * @param callback - Function to call when a file is selected
     */
    onFileSelected(callback) {
        this.fileSelectedCallbacks.push(callback);
    }
    /**
     * Creates filter buttons for pattern types.
     * @returns Array of QuickInputButtons for pattern type filtering
     */
    createFilterButtons() {
        const patternTypes = ['pii', 'credentials', 'financial', 'health', 'custom'];
        return patternTypes.map((type) => {
            const isActive = this.activePatternFilters.has(type);
            return {
                iconPath: new vscode.ThemeIcon(this.getPatternIcon(type)),
                tooltip: `${isActive ? 'Hide' : 'Show'} ${type.toUpperCase()} findings`,
                // Store pattern type in a way we can retrieve it
                _patternType: type,
            };
        });
    }
    /**
     * Gets the icon name for a pattern type.
     * @param type - Pattern type
     * @returns Icon name without $() wrapper
     */
    getPatternIcon(type) {
        const iconMap = {
            pii: 'person',
            credentials: 'key',
            financial: 'credit-card',
            health: 'heart',
            custom: 'tag',
        };
        return iconMap[type];
    }
    /**
     * Handles filter button clicks to toggle pattern type filters.
     * @param button - The clicked button
     */
    handleFilterButtonClick(button) {
        const patternButton = button;
        const patternType = patternButton._patternType;
        if (patternType) {
            if (this.activePatternFilters.has(patternType)) {
                this.activePatternFilters.delete(patternType);
            }
            else {
                this.activePatternFilters.add(patternType);
            }
            // Update filter
            this.filter.patternTypes = this.activePatternFilters.size > 0
                ? Array.from(this.activePatternFilters)
                : undefined;
            // Update UI
            if (this.quickPick) {
                this.quickPick.buttons = this.createFilterButtons();
                this.updateQuickPickItems();
            }
        }
    }
    /**
     * Updates QuickPick items based on current results and filters.
     */
    updateQuickPickItems() {
        if (!this.quickPick) {
            return;
        }
        let filteredResults = this.applyFilters(this.results);
        filteredResults = this.sortResults(filteredResults);
        // Handle empty filtered results
        if (filteredResults.length === 0) {
            this.quickPick.items = [{
                    label: '$(info) No files match the current filter',
                    filePath: '',
                    result: null,
                    alwaysShow: true,
                }];
            return;
        }
        const items = filteredResults.map((result) => this.createQuickPickItem(result));
        this.quickPick.items = items;
    }
    /**
     * Applies current filters to results.
     * @param results - Results to filter
     * @returns Filtered results
     */
    applyFilters(results) {
        let filtered = results;
        // Filter by pattern types
        if (this.filter.patternTypes && this.filter.patternTypes.length > 0) {
            filtered = filtered.filter((r) => r.patternTypes.some((pt) => this.filter.patternTypes.includes(pt)));
        }
        // Filter by minimum confidence
        if (this.filter.minConfidence !== undefined && this.filter.minConfidence > 0) {
            filtered = filtered.filter((r) => r.highestConfidence >= this.filter.minConfidence);
        }
        // Note: searchText filtering is handled by QuickPick's built-in filter
        // We don't need to filter here as QuickPick does fuzzy matching on label/description/detail
        return filtered;
    }
    /**
     * Sorts results based on current sort option.
     * @param results - Results to sort
     * @returns Sorted results
     */
    sortResults(results) {
        const sorted = [...results];
        switch (this.sortOption) {
            case 'findingCount':
                // Sort by finding count descending (default per Requirement 1.4)
                sorted.sort((a, b) => b.findingCount - a.findingCount);
                break;
            case 'confidence':
                // Sort by highest confidence descending
                sorted.sort((a, b) => b.highestConfidence - a.highestConfidence);
                break;
            case 'filePath':
                // Sort by file path alphabetically
                sorted.sort((a, b) => a.filePath.localeCompare(b.filePath));
                break;
        }
        return sorted;
    }
    /**
     * Creates a QuickPick item from an aggregated result.
     * Format:
     *   src/models/User.ts
     *   3 findings • 95% confidence • [PII] [Credentials]
     * @param result - Aggregated file result
     * @returns QuickPick item
     */
    createQuickPickItem(result) {
        const patternLabels = result.patternTypes
            .map((type) => `[${type.toUpperCase()}]`)
            .join(' ');
        const findingText = result.findingCount === 1 ? 'finding' : 'findings';
        const description = `${result.findingCount} ${findingText} • ${result.highestConfidence}% confidence • ${patternLabels}`;
        return {
            label: result.filePath,
            description,
            detail: this.generateTooltipContent(result),
            filePath: result.filePath,
            result,
        };
    }
    /**
     * Generates tooltip content with pattern type breakdown.
     * Format: "PII: 2, Credentials: 1"
     * @param result - Aggregated file result
     * @returns Tooltip content string
     */
    generateTooltipContent(result) {
        // Count findings by pattern type
        const countByType = new Map();
        for (const finding of result.findings) {
            const current = countByType.get(finding.patternType) || 0;
            countByType.set(finding.patternType, current + 1);
        }
        // Format as readable breakdown with icons
        const breakdown = Array.from(countByType.entries())
            .map(([type, count]) => `${PATTERN_TYPE_ICONS[type]}: ${count}`)
            .join(', ');
        return breakdown;
    }
    /**
     * Notifies all registered callbacks of file selection.
     * @param filePath - Selected file path
     */
    notifyFileSelected(filePath) {
        // Don't notify for empty/placeholder items
        if (!filePath) {
            return;
        }
        for (const callback of this.fileSelectedCallbacks) {
            callback(filePath);
        }
    }
}
exports.FileListView = FileListView;
//# sourceMappingURL=file-list-view.js.map