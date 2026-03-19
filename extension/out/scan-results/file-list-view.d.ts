import { IFileListView, AggregatedFileResult, FileListFilter, FileListSortOption } from './types';
/**
 * File List View implementation using VS Code QuickPick API.
 * Displays aggregated scan results with filtering and navigation capabilities.
 * Implements IFileListView interface.
 */
export declare class FileListView implements IFileListView {
    private results;
    private filter;
    private sortOption;
    private fileSelectedCallbacks;
    private quickPick;
    private activePatternFilters;
    /**
     * Shows the file list with current results using VS Code QuickPick.
     * Handles empty state with appropriate messages.
     */
    show(): Promise<void>;
    /**
     * Updates the displayed results.
     * @param results - New aggregated results to display
     */
    updateResults(results: AggregatedFileResult[]): void;
    /**
     * Sets the current filter.
     * @param filter - Filter criteria to apply
     */
    setFilter(filter: FileListFilter): void;
    /**
     * Sets the sort option.
     * @param option - Sort option to apply
     */
    setSortOption(option: FileListSortOption): void;
    /**
     * Registers callback for file selection.
     * @param callback - Function to call when a file is selected
     */
    onFileSelected(callback: (filePath: string) => void): void;
    /**
     * Creates filter buttons for pattern types.
     * @returns Array of QuickInputButtons for pattern type filtering
     */
    private createFilterButtons;
    /**
     * Gets the icon name for a pattern type.
     * @param type - Pattern type
     * @returns Icon name without $() wrapper
     */
    private getPatternIcon;
    /**
     * Handles filter button clicks to toggle pattern type filters.
     * @param button - The clicked button
     */
    private handleFilterButtonClick;
    /**
     * Updates QuickPick items based on current results and filters.
     */
    private updateQuickPickItems;
    /**
     * Applies current filters to results.
     * @param results - Results to filter
     * @returns Filtered results
     */
    private applyFilters;
    /**
     * Sorts results based on current sort option.
     * @param results - Results to sort
     * @returns Sorted results
     */
    private sortResults;
    /**
     * Creates a QuickPick item from an aggregated result.
     * Format:
     *   src/models/User.ts
     *   3 findings • 95% confidence • [PII] [Credentials]
     * @param result - Aggregated file result
     * @returns QuickPick item
     */
    private createQuickPickItem;
    /**
     * Generates tooltip content with pattern type breakdown.
     * Format: "PII: 2, Credentials: 1"
     * @param result - Aggregated file result
     * @returns Tooltip content string
     */
    private generateTooltipContent;
    /**
     * Notifies all registered callbacks of file selection.
     * @param filePath - Selected file path
     */
    private notifyFileSelected;
}
//# sourceMappingURL=file-list-view.d.ts.map