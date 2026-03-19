import * as vscode from 'vscode';
import { Suggestion, MaskingPatternType } from '../types';
import {
  IScanResultsAggregator,
  AggregatedFileResult,
  FileFinding,
  FileListFilter,
  ScanResultsStore,
} from './types';

/**
 * Aggregates scan results by file and provides filtering capabilities.
 * Implements IScanResultsAggregator interface.
 */
export class ScanResultsAggregator implements IScanResultsAggregator {
  private store: ScanResultsStore;

  constructor() {
    this.store = {
      lastScanTime: null,
      resultsByFile: new Map(),
      totalFindings: 0,
      totalFiles: 0,
    };
  }

  /**
   * Converts an absolute file path to a workspace-relative path.
   * @param absolutePath - The absolute file path
   * @returns The relative path from workspace root, or the original path if no workspace
   */
  private toRelativePath(absolutePath: string): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return absolutePath;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    if (absolutePath.startsWith(workspaceRoot)) {
      // Remove workspace root and leading separator
      let relativePath = absolutePath.slice(workspaceRoot.length);
      if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
        relativePath = relativePath.slice(1);
      }
      return relativePath;
    }

    return absolutePath;
  }

  /**
   * Stores scan results from a workspace scan.
   * Groups suggestions by file and calculates per-file statistics.
   * Replaces any previously stored results.
   * @param suggestions - Array of suggestions from the scan
   */
  storeResults(suggestions: Suggestion[]): void {
    // Clear previous results
    this.store.resultsByFile.clear();
    this.store.totalFindings = 0;
    this.store.totalFiles = 0;
    this.store.lastScanTime = new Date();

    // Group suggestions by file
    const fileMap = new Map<string, Suggestion[]>();
    for (const suggestion of suggestions) {
      const absolutePath = suggestion.field.location.filePath;
      const relativePath = this.toRelativePath(absolutePath);
      
      if (!fileMap.has(relativePath)) {
        fileMap.set(relativePath, []);
      }
      fileMap.get(relativePath)!.push(suggestion);
    }

    // Create aggregated results for each file
    for (const [filePath, fileSuggestions] of fileMap) {
      const findings: FileFinding[] = fileSuggestions.map((s) => ({
        fieldName: s.field.name,
        lineNumber: s.field.location.startLine,
        patternType: s.patternType,
        confidenceScore: s.confidenceScore,
      }));

      // Calculate highest confidence
      const highestConfidence = Math.max(...findings.map((f) => f.confidenceScore));

      // Get unique pattern types
      const patternTypesSet = new Set<MaskingPatternType>();
      for (const finding of findings) {
        patternTypesSet.add(finding.patternType);
      }
      const patternTypes = Array.from(patternTypesSet);

      const aggregatedResult: AggregatedFileResult = {
        filePath,
        findingCount: findings.length,
        highestConfidence,
        patternTypes,
        findings,
      };

      this.store.resultsByFile.set(filePath, aggregatedResult);
      this.store.totalFindings += findings.length;
    }

    this.store.totalFiles = this.store.resultsByFile.size;
  }

  /**
   * Gets aggregated results, optionally filtered.
   * Results are sorted by finding count in descending order by default.
   * @param filter - Optional filter criteria
   * @returns Array of aggregated file results
   */
  getAggregatedResults(filter?: FileListFilter): AggregatedFileResult[] {
    let results = Array.from(this.store.resultsByFile.values());

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    // Sort by finding count descending (default sort order per Requirement 1.4)
    results.sort((a, b) => b.findingCount - a.findingCount);

    return results;
  }

  /**
   * Applies filter criteria to the results.
   * @param results - Array of results to filter
   * @param filter - Filter criteria
   * @returns Filtered array of results
   */
  private applyFilter(
    results: AggregatedFileResult[],
    filter: FileListFilter
  ): AggregatedFileResult[] {
    let filtered = results;

    // Filter by search text (case-insensitive path matching)
    if (filter.searchText && filter.searchText.trim() !== '') {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter((r) =>
        r.filePath.toLowerCase().includes(searchLower)
      );
    }

    // Filter by pattern types
    if (filter.patternTypes && filter.patternTypes.length > 0) {
      filtered = filtered.filter((r) =>
        r.patternTypes.some((pt) => filter.patternTypes!.includes(pt))
      );
    }

    // Filter by minimum confidence
    if (filter.minConfidence !== undefined && filter.minConfidence > 0) {
      filtered = filtered.filter(
        (r) => r.highestConfidence >= filter.minConfidence!
      );
    }

    return filtered;
  }

  /**
   * Checks if results exist.
   * @returns True if there are stored results
   */
  hasResults(): boolean {
    return this.store.resultsByFile.size > 0;
  }

  /**
   * Clears stored results.
   */
  clearResults(): void {
    this.store.resultsByFile.clear();
    this.store.totalFindings = 0;
    this.store.totalFiles = 0;
    this.store.lastScanTime = null;
  }

  /**
   * Gets findings for a specific file.
   * @param filePath - The file path to get findings for
   * @returns Array of findings for the file, or empty array if not found
   */
  getFindingsForFile(filePath: string): FileFinding[] {
    const result = this.store.resultsByFile.get(filePath);
    return result ? result.findings : [];
  }

  /**
   * Gets the timestamp of the last scan.
   * @returns Date of last scan or null if no scan has been performed
   */
  getLastScanTime(): Date | null {
    return this.store.lastScanTime;
  }

  /**
   * Gets the total number of findings across all files.
   * @returns Total finding count
   */
  getTotalFindings(): number {
    return this.store.totalFindings;
  }

  /**
   * Gets the total number of files with findings.
   * @returns Total file count
   */
  getTotalFiles(): number {
    return this.store.totalFiles;
  }
}
