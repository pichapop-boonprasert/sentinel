// Types for Workspace Scan File Navigation feature
import * as vscode from 'vscode';
import { MaskingPatternType, Suggestion } from '../types';

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Aggregated scan results for a single file
 */
export interface AggregatedFileResult {
  /** Relative path from workspace root */
  filePath: string;
  /** Total number of findings in this file */
  findingCount: number;
  /** Highest confidence score among findings */
  highestConfidence: number;
  /** Pattern types detected in this file */
  patternTypes: MaskingPatternType[];
  /** Individual findings for this file */
  findings: FileFinding[];
}

/**
 * A single finding within a file
 */
export interface FileFinding {
  /** Field name that was detected */
  fieldName: string;
  /** Line number of the finding */
  lineNumber: number;
  /** Pattern type of the finding */
  patternType: MaskingPatternType;
  /** Confidence score (0-100) */
  confidenceScore: number;
}

/**
 * Filter options for the file list
 */
export interface FileListFilter {
  /** Filter by pattern types */
  patternTypes?: MaskingPatternType[];
  /** Search text for file path matching */
  searchText?: string;
  /** Minimum confidence threshold */
  minConfidence?: number;
}

/**
 * Sort options for the file list
 */
export type FileListSortOption = 'findingCount' | 'confidence' | 'filePath';

// ============================================================================
// Storage Model
// ============================================================================

/**
 * In-memory storage for scan results
 */
export interface ScanResultsStore {
  /** Timestamp of the last scan */
  lastScanTime: Date | null;
  /** Aggregated results by file path */
  resultsByFile: Map<string, AggregatedFileResult>;
  /** Total finding count across all files */
  totalFindings: number;
  /** Total file count with findings */
  totalFiles: number;
}

// ============================================================================
// Component Interfaces
// ============================================================================

/**
 * Scan Results Aggregator interface
 */
export interface IScanResultsAggregator {
  /** Stores scan results from a workspace scan */
  storeResults(suggestions: Suggestion[]): void;

  /** Gets aggregated results, optionally filtered */
  getAggregatedResults(filter?: FileListFilter): AggregatedFileResult[];

  /** Checks if results exist */
  hasResults(): boolean;

  /** Clears stored results */
  clearResults(): void;

  /** Gets findings for a specific file */
  getFindingsForFile(filePath: string): FileFinding[];
}

/**
 * QuickPick item for file list display
 */
export interface FileQuickPickItem extends vscode.QuickPickItem {
  /** File path for navigation */
  filePath: string;
  /** Aggregated result data */
  result: AggregatedFileResult;
}

/**
 * File List View interface
 */
export interface IFileListView {
  /** Shows the file list with current results */
  show(): Promise<void>;

  /** Updates the displayed results */
  updateResults(results: AggregatedFileResult[]): void;

  /** Sets the current filter */
  setFilter(filter: FileListFilter): void;

  /** Sets the sort option */
  setSortOption(option: FileListSortOption): void;

  /** Registers callback for file selection */
  onFileSelected(callback: (filePath: string) => void): void;
}

/**
 * File Navigation Handler interface
 */
export interface IFileNavigationHandler {
  /** Opens a file and navigates to the first finding */
  navigateToFile(filePath: string): Promise<void>;

  /** Opens a file and navigates to a specific line */
  navigateToLine(filePath: string, lineNumber: number): Promise<void>;

  /** Triggers highlighting for all findings in the open file */
  highlightFindings(filePath: string): void;
}
