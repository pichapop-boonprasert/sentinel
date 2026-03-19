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
  progress?: number; // 0-100
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
export class ProgressIndicator {
  private state: ProgressState = 'idle';
  private filesScanned: number = 0;
  private totalFiles: number = 0;
  private suggestionsFound: number = 0;
  private errorMessage: string = '';
  private listeners: Set<ProgressListener> = new Set();
  private config: StatusBarConfig;

  constructor(config?: StatusBarConfig) {
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
  startScanning(totalFiles: number): void {
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
  updateProgress(filesScanned: number, suggestionsFound?: number): void {
    this.filesScanned = filesScanned;
    if (suggestionsFound !== undefined) {
      this.suggestionsFound = suggestionsFound;
    }
    this.notifyListeners();
  }

  /**
   * Increments the files scanned count
   */
  incrementFilesScanned(suggestionsInFile: number = 0): void {
    this.filesScanned++;
    this.suggestionsFound += suggestionsInFile;
    this.notifyListeners();
  }

  /**
   * Switches to analyzing state
   */
  startAnalyzing(): void {
    this.state = 'analyzing';
    this.notifyListeners();
  }

  /**
   * Completes the progress
   * 
   * Validates: Requirements 4.6
   */
  complete(totalSuggestions: number): void {
    this.state = 'complete';
    this.suggestionsFound = totalSuggestions;
    this.notifyListeners();
  }

  /**
   * Sets error state
   */
  setError(message: string): void {
    this.state = 'error';
    this.errorMessage = message;
    this.notifyListeners();
  }

  /**
   * Resets to idle state
   */
  reset(): void {
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
  getProgressInfo(): ProgressInfo {
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
  private getProgressPercent(): number {
    if (this.totalFiles === 0) {
      return 0;
    }
    return Math.round((this.filesScanned / this.totalFiles) * 100);
  }

  /**
   * Gets the status message
   */
  private getMessage(): string {
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
  getTooltip(): string {
    const info = this.getProgressInfo();
    const lines: string[] = ['Data Masking Suggestion Plugin'];

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
        } else {
          lines.push('');
          lines.push('Click to scan workspace');
        }
    }

    return lines.join('\n');
  }

  /**
   * Adds a progress listener
   */
  onProgress(listener: ProgressListener): void {
    this.listeners.add(listener);
  }

  /**
   * Removes a progress listener
   */
  offProgress(listener: ProgressListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Notifies all listeners of progress change
   */
  private notifyListeners(): void {
    const info = this.getProgressInfo();
    for (const listener of this.listeners) {
      listener(info);
    }
  }

  /**
   * Gets the current state
   */
  getState(): ProgressState {
    return this.state;
  }

  /**
   * Checks if currently scanning
   */
  isScanning(): boolean {
    return this.state === 'scanning' || this.state === 'analyzing';
  }

  /**
   * Gets the suggestion count
   */
  getSuggestionCount(): number {
    return this.suggestionsFound;
  }

  /**
   * Sets the suggestion count (for external updates)
   */
  setSuggestionCount(count: number): void {
    this.suggestionsFound = count;
    this.notifyListeners();
  }
}

/**
 * Creates a new ProgressIndicator instance
 */
export function createProgressIndicator(config?: StatusBarConfig): ProgressIndicator {
  return new ProgressIndicator(config);
}
