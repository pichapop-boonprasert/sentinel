/**
 * Progress Indicator for Status Bar
 *
 * Shows scanning progress and suggestion count summary in the IDE status bar.
 *
 * Validates: Requirements 1.5, 4.6
 */
/**
 * Progress state
 */
export type ProgressState = 'idle' | 'scanning' | 'analyzing' | 'complete' | 'error';
/**
 * Progress information
 */
export interface ProgressInfo {
    state: ProgressState;
    message: string;
    progress?: number;
    filesScanned?: number;
    totalFiles?: number;
    suggestionsFound?: number;
    errorMessage?: string;
}
/**
 * Status bar item configuration
 */
export interface StatusBarConfig {
    priority?: number;
    alignment?: 'left' | 'right';
    showSpinner?: boolean;
    showProgress?: boolean;
}
/**
 * Event listener for progress changes
 */
export type ProgressListener = (info: ProgressInfo) => void;
/**
 * ProgressIndicator class for managing status bar display
 */
export declare class ProgressIndicator {
    private state;
    private filesScanned;
    private totalFiles;
    private suggestionsFound;
    private errorMessage;
    private listeners;
    private config;
    constructor(config?: StatusBarConfig);
    /**
     * Starts scanning progress
     *
     * Validates: Requirements 1.5
     */
    startScanning(totalFiles: number): void;
    /**
     * Updates scanning progress
     */
    updateProgress(filesScanned: number, suggestionsFound?: number): void;
    /**
     * Increments the files scanned count
     */
    incrementFilesScanned(suggestionsInFile?: number): void;
    /**
     * Switches to analyzing state
     */
    startAnalyzing(): void;
    /**
     * Completes the progress
     *
     * Validates: Requirements 4.6
     */
    complete(totalSuggestions: number): void;
    /**
     * Sets error state
     */
    setError(message: string): void;
    /**
     * Resets to idle state
     */
    reset(): void;
    /**
     * Gets current progress info
     */
    getProgressInfo(): ProgressInfo;
    /**
     * Gets the current progress percentage
     */
    private getProgressPercent;
    /**
     * Gets the status message
     */
    private getMessage;
    /**
     * Gets the tooltip text
     */
    getTooltip(): string;
    /**
     * Adds a progress listener
     */
    onProgress(listener: ProgressListener): void;
    /**
     * Removes a progress listener
     */
    offProgress(listener: ProgressListener): void;
    /**
     * Notifies all listeners of progress change
     */
    private notifyListeners;
    /**
     * Gets the current state
     */
    getState(): ProgressState;
    /**
     * Checks if currently scanning
     */
    isScanning(): boolean;
    /**
     * Gets the suggestion count
     */
    getSuggestionCount(): number;
    /**
     * Sets the suggestion count (for external updates)
     */
    setSuggestionCount(count: number): void;
}
/**
 * Creates a new ProgressIndicator instance
 */
export declare function createProgressIndicator(config?: StatusBarConfig): ProgressIndicator;
//# sourceMappingURL=progress-indicator.d.ts.map