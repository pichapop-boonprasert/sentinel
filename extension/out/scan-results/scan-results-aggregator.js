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
exports.ScanResultsAggregator = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Aggregates scan results by file and provides filtering capabilities.
 * Implements IScanResultsAggregator interface.
 */
class ScanResultsAggregator {
    store;
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
    toRelativePath(absolutePath) {
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
    storeResults(suggestions) {
        // Clear previous results
        this.store.resultsByFile.clear();
        this.store.totalFindings = 0;
        this.store.totalFiles = 0;
        this.store.lastScanTime = new Date();
        // Group suggestions by file
        const fileMap = new Map();
        for (const suggestion of suggestions) {
            const absolutePath = suggestion.field.location.filePath;
            const relativePath = this.toRelativePath(absolutePath);
            if (!fileMap.has(relativePath)) {
                fileMap.set(relativePath, []);
            }
            fileMap.get(relativePath).push(suggestion);
        }
        // Create aggregated results for each file
        for (const [filePath, fileSuggestions] of fileMap) {
            const findings = fileSuggestions.map((s) => ({
                fieldName: s.field.name,
                lineNumber: s.field.location.startLine,
                patternType: s.patternType,
                confidenceScore: s.confidenceScore,
            }));
            // Calculate highest confidence
            const highestConfidence = Math.max(...findings.map((f) => f.confidenceScore));
            // Get unique pattern types
            const patternTypesSet = new Set();
            for (const finding of findings) {
                patternTypesSet.add(finding.patternType);
            }
            const patternTypes = Array.from(patternTypesSet);
            const aggregatedResult = {
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
    getAggregatedResults(filter) {
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
    applyFilter(results, filter) {
        let filtered = results;
        // Filter by search text (case-insensitive path matching)
        if (filter.searchText && filter.searchText.trim() !== '') {
            const searchLower = filter.searchText.toLowerCase();
            filtered = filtered.filter((r) => r.filePath.toLowerCase().includes(searchLower));
        }
        // Filter by pattern types
        if (filter.patternTypes && filter.patternTypes.length > 0) {
            filtered = filtered.filter((r) => r.patternTypes.some((pt) => filter.patternTypes.includes(pt)));
        }
        // Filter by minimum confidence
        if (filter.minConfidence !== undefined && filter.minConfidence > 0) {
            filtered = filtered.filter((r) => r.highestConfidence >= filter.minConfidence);
        }
        return filtered;
    }
    /**
     * Checks if results exist.
     * @returns True if there are stored results
     */
    hasResults() {
        return this.store.resultsByFile.size > 0;
    }
    /**
     * Clears stored results.
     */
    clearResults() {
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
    getFindingsForFile(filePath) {
        const result = this.store.resultsByFile.get(filePath);
        return result ? result.findings : [];
    }
    /**
     * Gets the timestamp of the last scan.
     * @returns Date of last scan or null if no scan has been performed
     */
    getLastScanTime() {
        return this.store.lastScanTime;
    }
    /**
     * Gets the total number of findings across all files.
     * @returns Total finding count
     */
    getTotalFindings() {
        return this.store.totalFindings;
    }
    /**
     * Gets the total number of files with findings.
     * @returns Total file count
     */
    getTotalFiles() {
        return this.store.totalFiles;
    }
}
exports.ScanResultsAggregator = ScanResultsAggregator;
//# sourceMappingURL=scan-results-aggregator.js.map