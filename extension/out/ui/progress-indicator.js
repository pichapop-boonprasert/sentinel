"use strict";
/**
 * Progress Indicator for Status Bar
 *
 * Shows scanning progress and suggestion count summary in the IDE status bar.
 *
 * Validates: Requirements 1.5, 4.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressIndicator = void 0;
exports.createProgressIndicator = createProgressIndicator;
/**
 * ProgressIndicator class for managing status bar display
 */
class ProgressIndicator {
    state = 'idle';
    filesScanned = 0;
    totalFiles = 0;
    suggestionsFound = 0;
    errorMessage = '';
    listeners = new Set();
    config;
    constructor(config) {
        this.config = {
            priority: 100,
            alignment: 'left',
            showSpinner: true,
            showProgress: true,
            ...config,
        };
    }
    /**
     * Starts scanning progress
     *
     * Validates: Requirements 1.5
     */
    startScanning(totalFiles) {
        this.state = 'scanning';
        this.totalFiles = totalFiles;
        this.filesScanned = 0;
        this.suggestionsFound = 0;
        this.errorMessage = '';
        this.notifyListeners();
    }
    /**
     * Updates scanning progress
     */
    updateProgress(filesScanned, suggestionsFound) {
        this.filesScanned = filesScanned;
        if (suggestionsFound !== undefined) {
            this.suggestionsFound = suggestionsFound;
        }
        this.notifyListeners();
    }
    /**
     * Increments the files scanned count
     */
    incrementFilesScanned(suggestionsInFile = 0) {
        this.filesScanned++;
        this.suggestionsFound += suggestionsInFile;
        this.notifyListeners();
    }
    /**
     * Switches to analyzing state
     */
    startAnalyzing() {
        this.state = 'analyzing';
        this.notifyListeners();
    }
    /**
     * Completes the progress
     *
     * Validates: Requirements 4.6
     */
    complete(totalSuggestions) {
        this.state = 'complete';
        this.suggestionsFound = totalSuggestions;
        this.notifyListeners();
    }
    /**
     * Sets error state
     */
    setError(message) {
        this.state = 'error';
        this.errorMessage = message;
        this.notifyListeners();
    }
    /**
     * Resets to idle state
     */
    reset() {
        this.state = 'idle';
        this.filesScanned = 0;
        this.totalFiles = 0;
        this.suggestionsFound = 0;
        this.errorMessage = '';
        this.notifyListeners();
    }
    /**
     * Gets current progress info
     */
    getProgressInfo() {
        return {
            state: this.state,
            message: this.getMessage(),
            progress: this.getProgressPercent(),
            filesScanned: this.filesScanned,
            totalFiles: this.totalFiles,
            suggestionsFound: this.suggestionsFound,
            errorMessage: this.errorMessage || undefined,
        };
    }
    /**
     * Gets the current progress percentage
     */
    getProgressPercent() {
        if (this.totalFiles === 0) {
            return 0;
        }
        return Math.round((this.filesScanned / this.totalFiles) * 100);
    }
    /**
     * Gets the status message
     */
    getMessage() {
        switch (this.state) {
            case 'idle':
                return this.suggestionsFound > 0
                    ? `$(shield) ${this.suggestionsFound} sensitive fields`
                    : '$(shield) Data Masking';
            case 'scanning':
                if (this.config.showProgress && this.totalFiles > 0) {
                    return `$(sync~spin) Scanning... ${this.filesScanned}/${this.totalFiles} files`;
                }
                return '$(sync~spin) Scanning...';
            case 'analyzing':
                return '$(sync~spin) Analyzing...';
            case 'complete':
                return `$(shield) ${this.suggestionsFound} sensitive fields found`;
            case 'error':
                return `$(error) ${this.errorMessage || 'Scan failed'}`;
            default:
                return '$(shield) Data Masking';
        }
    }
    /**
     * Gets the tooltip text
     */
    getTooltip() {
        const info = this.getProgressInfo();
        const lines = ['Data Masking Suggestion Plugin'];
        switch (info.state) {
            case 'scanning':
                lines.push('');
                lines.push(`Scanning: ${info.filesScanned}/${info.totalFiles} files (${info.progress}%)`);
                if (info.suggestionsFound && info.suggestionsFound > 0) {
                    lines.push(`Found: ${info.suggestionsFound} sensitive fields so far`);
                }
                break;
            case 'analyzing':
                lines.push('');
                lines.push('Analyzing detected fields...');
                break;
            case 'complete':
                lines.push('');
                lines.push(`Scan complete: ${info.totalFiles} files scanned`);
                lines.push(`Found: ${info.suggestionsFound ?? 0} sensitive fields`);
                lines.push('');
                lines.push('Click to open Suggestion Panel');
                break;
            case 'error':
                lines.push('');
                lines.push(`Error: ${info.errorMessage}`);
                lines.push('');
                lines.push('Click to retry');
                break;
            default:
                if (info.suggestionsFound && info.suggestionsFound > 0) {
                    lines.push('');
                    lines.push(`${info.suggestionsFound} sensitive fields detected`);
                    lines.push('');
                    lines.push('Click to open Suggestion Panel');
                }
                else {
                    lines.push('');
                    lines.push('Click to scan workspace');
                }
        }
        return lines.join('\n');
    }
    /**
     * Adds a progress listener
     */
    onProgress(listener) {
        this.listeners.add(listener);
    }
    /**
     * Removes a progress listener
     */
    offProgress(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Notifies all listeners of progress change
     */
    notifyListeners() {
        const info = this.getProgressInfo();
        for (const listener of this.listeners) {
            listener(info);
        }
    }
    /**
     * Gets the current state
     */
    getState() {
        return this.state;
    }
    /**
     * Checks if currently scanning
     */
    isScanning() {
        return this.state === 'scanning' || this.state === 'analyzing';
    }
    /**
     * Gets the suggestion count
     */
    getSuggestionCount() {
        return this.suggestionsFound;
    }
    /**
     * Sets the suggestion count (for external updates)
     */
    setSuggestionCount(count) {
        this.suggestionsFound = count;
        this.notifyListeners();
    }
}
exports.ProgressIndicator = ProgressIndicator;
/**
 * Creates a new ProgressIndicator instance
 */
function createProgressIndicator(config) {
    return new ProgressIndicator(config);
}
//# sourceMappingURL=progress-indicator.js.map