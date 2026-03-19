import { Suggestion } from '../types';
import { IScanResultsAggregator, AggregatedFileResult, FileFinding, FileListFilter } from './types';
/**
 * Aggregates scan results by file and provides filtering capabilities.
 * Implements IScanResultsAggregator interface.
 */
export declare class ScanResultsAggregator implements IScanResultsAggregator {
    private store;
    constructor();
    /**
     * Converts an absolute file path to a workspace-relative path.
     * @param absolutePath - The absolute file path
     * @returns The relative path from workspace root, or the original path if no workspace
     */
    private toRelativePath;
    /**
     * Stores scan results from a workspace scan.
     * Groups suggestions by file and calculates per-file statistics.
     * Replaces any previously stored results.
     * @param suggestions - Array of suggestions from the scan
     */
    storeResults(suggestions: Suggestion[]): void;
    /**
     * Gets aggregated results, optionally filtered.
     * Results are sorted by finding count in descending order by default.
     * @param filter - Optional filter criteria
     * @returns Array of aggregated file results
     */
    getAggregatedResults(filter?: FileListFilter): AggregatedFileResult[];
    /**
     * Applies filter criteria to the results.
     * @param results - Array of results to filter
     * @param filter - Filter criteria
     * @returns Filtered array of results
     */
    private applyFilter;
    /**
     * Checks if results exist.
     * @returns True if there are stored results
     */
    hasResults(): boolean;
    /**
     * Clears stored results.
     */
    clearResults(): void;
    /**
     * Gets findings for a specific file.
     * @param filePath - The file path to get findings for
     * @returns Array of findings for the file, or empty array if not found
     */
    getFindingsForFile(filePath: string): FileFinding[];
    /**
     * Gets the timestamp of the last scan.
     * @returns Date of last scan or null if no scan has been performed
     */
    getLastScanTime(): Date | null;
    /**
     * Gets the total number of findings across all files.
     * @returns Total finding count
     */
    getTotalFindings(): number;
    /**
     * Gets the total number of files with findings.
     * @returns Total file count
     */
    getTotalFiles(): number;
}
//# sourceMappingURL=scan-results-aggregator.d.ts.map