# Technical Design Document

## Overview

This design document describes the technical implementation for the Workspace Scan File Navigation feature. The feature enhances the Data Masking Suggestion Plugin by providing a file-centric view of workspace scan results with navigation capabilities.

The core functionality includes:
- Displaying a list of files containing sensitive data findings after a workspace scan
- Enabling navigation to specific files and findings from the results list
- Showing finding details and summaries for each file
- Persisting scan results for re-navigation without re-scanning
- Providing filtering and search capabilities for the file list

This feature integrates with the existing scanner, suggestion engine, and UI components to provide a seamless workflow for reviewing sensitive data findings across the workspace.

## Architecture

The feature follows the existing plugin architecture with new components for scan result aggregation and file list presentation.

```mermaid
flowchart TB
    subgraph Extension
        Scanner[Scanner]
        SuggestionEngine[Suggestion Engine]
    end
    
    subgraph NewComponents["New Components"]
        SRA[Scan Results Aggregator]
        FLV[File List View]
        FNH[File Navigation Handler]
    end
    
    subgraph VSCode["VS Code API"]
        QuickPick[QuickPick API]
        TextEditor[Text Editor API]
        Commands[Commands API]
    end
    
    Scanner -->|ScanResult[]| SRA
    SuggestionEngine -->|Suggestion[]| SRA
    SRA -->|AggregatedFileResult[]| FLV
    FLV -->|User Selection| FNH
    FNH -->|Open File| TextEditor
    FLV -->|Display| QuickPick
    Commands -->|Trigger| FLV
```

### Component Responsibilities

1. **Scan Results Aggregator**: Groups scan findings by file, calculates per-file statistics, and maintains the most recent scan results in memory.

2. **File List View**: Presents the aggregated results using VS Code's QuickPick API with search, filtering, and sorting capabilities.

3. **File Navigation Handler**: Opens selected files in the editor and positions the cursor at the first finding, triggering highlighting.

## Components and Interfaces

### Scan Results Aggregator

```typescript
/**
 * Aggregated scan results for a single file
 */
interface AggregatedFileResult {
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
interface FileFinding {
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
interface FileListFilter {
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
type FileListSortOption = 'findingCount' | 'confidence' | 'filePath';

/**
 * Scan Results Aggregator interface
 */
interface IScanResultsAggregator {
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
```

### File List View

```typescript
/**
 * QuickPick item for file list display
 */
interface FileQuickPickItem extends vscode.QuickPickItem {
  /** File path for navigation */
  filePath: string;
  /** Aggregated result data */
  result: AggregatedFileResult;
}

/**
 * File List View interface
 */
interface IFileListView {
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
```

### File Navigation Handler

```typescript
/**
 * File Navigation Handler interface
 */
interface IFileNavigationHandler {
  /** Opens a file and navigates to the first finding */
  navigateToFile(filePath: string): Promise<void>;
  
  /** Opens a file and navigates to a specific line */
  navigateToLine(filePath: string, lineNumber: number): Promise<void>;
  
  /** Triggers highlighting for all findings in the open file */
  highlightFindings(filePath: string): void;
}
```

## Data Models

### Storage Model

The scan results are stored in memory within the extension context. No persistent storage is required as results are regenerated on each workspace scan.

```typescript
/**
 * In-memory storage for scan results
 */
interface ScanResultsStore {
  /** Timestamp of the last scan */
  lastScanTime: Date | null;
  /** Aggregated results by file path */
  resultsByFile: Map<string, AggregatedFileResult>;
  /** Total finding count across all files */
  totalFindings: number;
  /** Total file count with findings */
  totalFiles: number;
}
```

### QuickPick Display Format

Each file entry in the QuickPick displays:
- **Label**: Relative file path
- **Description**: Finding count and highest confidence
- **Detail**: Pattern type icons/labels

Example format:
```
src/models/User.ts
  3 findings • 95% confidence • [PII] [Credentials]
```

### Pattern Type Icons

| Pattern Type | Icon/Label |
|-------------|------------|
| pii | $(person) PII |
| credentials | $(key) Credentials |
| financial | $(credit-card) Financial |
| health | $(heart) Health |
| custom | $(tag) Custom |



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Files with findings are displayed

*For any* set of scan results containing suggestions, the file list should display exactly those files that have at least one finding, with no files missing and no files without findings included.

**Validates: Requirements 1.1**

### Property 2: File paths are relative to workspace root

*For any* file path in the aggregated results, the displayed path should be the relative path from the workspace root, not an absolute path.

**Validates: Requirements 1.2**

### Property 3: Finding count accuracy

*For any* file in the aggregated results, the displayed finding count should equal the actual number of findings (suggestions) associated with that file.

**Validates: Requirements 1.3**

### Property 4: Default sort order by finding count

*For any* list of aggregated file results sorted by default, each file's finding count should be greater than or equal to the finding count of the subsequent file in the list (descending order).

**Validates: Requirements 1.4**

### Property 5: Navigation positions cursor at first finding

*For any* file with findings, when navigating to that file from the file list, the cursor should be positioned at the line number of the finding with the smallest line number in that file.

**Validates: Requirements 2.1, 2.2**

### Property 6: Highlighting triggered on navigation

*For any* file opened via the file list navigation, the highlighting mechanism should be invoked with that file's path to highlight all findings.

**Validates: Requirements 2.3**

### Property 7: Highest confidence calculation

*For any* file in the aggregated results, the displayed highest confidence score should equal the maximum confidence score among all findings in that file.

**Validates: Requirements 3.1**

### Property 8: Pattern types are unique set

*For any* file in the aggregated results, the displayed pattern types should be the unique set of pattern types from all findings in that file, with no duplicates.

**Validates: Requirements 3.2**

### Property 9: Tooltip contains pattern type breakdown

*For any* file in the aggregated results, the tooltip content should contain the count of findings for each pattern type present in that file.

**Validates: Requirements 3.3**

### Property 10: Result storage round-trip

*For any* set of suggestions stored in the aggregator, retrieving the results should return the same data. Additionally, storing new results should replace any previously stored results entirely.

**Validates: Requirements 4.1, 4.4**

### Property 11: Stored results are displayed on command

*For any* stored scan results, invoking the show results command should display those results in the file list view.

**Validates: Requirements 4.2**

### Property 12: Search filter matches path substring

*For any* search text and list of files, the filtered list should contain exactly those files whose paths contain the search text as a substring (case-insensitive matching).

**Validates: Requirements 5.2**

### Property 13: Pattern type filter accuracy

*For any* selected pattern type filter and list of files, the filtered list should contain exactly those files that have at least one finding matching any of the selected pattern types.

**Validates: Requirements 5.3**

## Error Handling

### File Access Errors

| Error Scenario | Handling Strategy |
|---------------|-------------------|
| File deleted after scan | Show warning message, remove from list, continue with remaining files |
| File moved after scan | Show warning message, offer to re-scan workspace |
| Permission denied on navigation | Show error message with file path |

### Empty State Handling

| Scenario | User Feedback |
|----------|---------------|
| No scan results exist | Show information message prompting user to run workspace scan |
| Scan completes with no findings | Show information message "No sensitive data found in workspace" |
| Filter returns no results | Show "No files match the current filter" in QuickPick |

### Navigation Errors

| Error Scenario | Handling Strategy |
|---------------|-------------------|
| File cannot be opened | Show error message, log details |
| Line number out of range | Navigate to end of file, show warning |
| Highlighting fails | Continue without highlighting, log error |

### Implementation Notes

- All errors should be logged using the existing logger infrastructure
- User-facing messages should be concise and actionable
- Non-critical errors should not interrupt the user workflow

## Testing Strategy

### Unit Testing Approach

Unit tests should focus on:
- Specific examples demonstrating correct behavior
- Edge cases (empty results, single file, single finding)
- Error conditions and boundary cases
- Integration points between components

### Property-Based Testing Approach

Property-based tests will use the `fast-check` library to verify universal properties across randomly generated inputs.

**Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: **Feature: workspace-scan-file-navigation, Property {number}: {property_text}**

### Test Categories

#### Scan Results Aggregator Tests

| Test Type | Description |
|-----------|-------------|
| Property | Files with findings are included (Property 1) |
| Property | Finding count matches actual count (Property 3) |
| Property | Highest confidence is maximum (Property 7) |
| Property | Pattern types are unique set (Property 8) |
| Property | Storage round-trip preserves data (Property 10) |
| Unit | Empty suggestions array returns empty results |
| Unit | Single file with single finding |

#### File List View Tests

| Test Type | Description |
|-----------|-------------|
| Property | Default sort is descending by count (Property 4) |
| Property | Search filter matches substring (Property 12) |
| Property | Pattern type filter accuracy (Property 13) |
| Unit | QuickPick item format is correct |
| Unit | Empty filter shows all results |
| Unit | No results shows appropriate message |

#### File Navigation Handler Tests

| Test Type | Description |
|-----------|-------------|
| Property | Cursor at first finding line (Property 5) |
| Property | Highlighting triggered (Property 6) |
| Unit | Navigation to non-existent file shows error |
| Unit | Navigation with no findings goes to line 1 |

### Test File Structure

```
extension/src/
├── scan-results/
│   ├── scan-results-aggregator.ts
│   ├── scan-results-aggregator.test.ts
│   ├── scan-results-aggregator.pbt.test.ts
│   ├── file-list-view.ts
│   ├── file-list-view.test.ts
│   └── file-list-view.pbt.test.ts
├── navigation/
│   ├── file-navigation-handler.ts
│   ├── file-navigation-handler.test.ts
│   └── file-navigation-handler.pbt.test.ts
```

### Mocking Strategy

- VS Code APIs (QuickPick, TextEditor, Commands) should be mocked in unit tests
- Property tests should focus on pure logic functions (aggregation, filtering, sorting)
- Integration tests can use VS Code's extension testing framework for end-to-end validation
