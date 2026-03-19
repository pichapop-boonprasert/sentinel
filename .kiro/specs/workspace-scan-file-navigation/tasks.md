# Implementation Plan: Workspace Scan File Navigation

## Overview

This implementation plan creates the file navigation feature for workspace scan results. The feature adds three new components: Scan Results Aggregator, File List View, and File Navigation Handler. These integrate with the existing scanner and suggestion engine to provide a file-centric view of sensitive data findings with navigation capabilities.

## Tasks

- [ ] 1. Create core interfaces and types
  - [x] 1.1 Create types file with AggregatedFileResult, FileFinding, FileListFilter, and FileListSortOption interfaces
    - Create `extension/src/scan-results/types.ts`
    - Define all interfaces from the design document
    - Export types for use by other components
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

- [ ] 2. Implement Scan Results Aggregator
  - [x] 2.1 Create ScanResultsAggregator class with storage and aggregation logic
    - Create `extension/src/scan-results/scan-results-aggregator.ts`
    - Implement storeResults() to group suggestions by file
    - Implement getAggregatedResults() with filtering support
    - Calculate findingCount, highestConfidence, and patternTypes per file
    - Convert absolute paths to workspace-relative paths
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 4.1, 4.4_

  - [ ]* 2.2 Write property test for files with findings display
    - **Property 1: Files with findings are displayed**
    - **Validates: Requirements 1.1**

  - [ ]* 2.3 Write property test for finding count accuracy
    - **Property 3: Finding count accuracy**
    - **Validates: Requirements 1.3**

  - [ ]* 2.4 Write property test for highest confidence calculation
    - **Property 7: Highest confidence calculation**
    - **Validates: Requirements 3.1**

  - [ ]* 2.5 Write property test for pattern types unique set
    - **Property 8: Pattern types are unique set**
    - **Validates: Requirements 3.2**

  - [ ]* 2.6 Write property test for result storage round-trip
    - **Property 10: Result storage round-trip**
    - **Validates: Requirements 4.1, 4.4**

  - [ ]* 2.7 Write unit tests for ScanResultsAggregator
    - Test empty suggestions array returns empty results
    - Test single file with single finding
    - Test workspace path conversion
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Checkpoint - Aggregator complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement File List View
  - [x] 4.1 Create FileListView class with QuickPick integration
    - Create `extension/src/scan-results/file-list-view.ts`
    - Implement show() using VS Code QuickPick API
    - Format items with file path, finding count, confidence, and pattern icons
    - Implement search filtering via QuickPick's built-in filter
    - Implement pattern type filter buttons
    - Handle empty state with appropriate messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 4.2 Write property test for default sort order
    - **Property 4: Default sort order by finding count**
    - **Validates: Requirements 1.4**

  - [ ]* 4.3 Write property test for search filter
    - **Property 12: Search filter matches path substring**
    - **Validates: Requirements 5.2**

  - [ ]* 4.4 Write property test for pattern type filter
    - **Property 13: Pattern type filter accuracy**
    - **Validates: Requirements 5.3**

  - [ ]* 4.5 Write unit tests for FileListView
    - Test QuickPick item format is correct
    - Test empty filter shows all results
    - Test no results shows appropriate message
    - Test tooltip contains pattern type breakdown
    - _Requirements: 1.2, 1.3, 3.3, 5.1_

- [x] 5. Checkpoint - File List View complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement File Navigation Handler
  - [x] 6.1 Create FileNavigationHandler class
    - Create `extension/src/navigation/file-navigation-handler.ts`
    - Implement navigateToFile() to open file and position cursor at first finding
    - Implement navigateToLine() for specific line navigation
    - Implement highlightFindings() to trigger existing highlighter
    - Handle file access errors gracefully
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 6.2 Write property test for cursor positioning
    - **Property 5: Navigation positions cursor at first finding**
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 6.3 Write property test for highlighting trigger
    - **Property 6: Highlighting triggered on navigation**
    - **Validates: Requirements 2.3**

  - [ ]* 6.4 Write unit tests for FileNavigationHandler
    - Test navigation to non-existent file shows error
    - Test navigation with no findings goes to line 1
    - Test line number out of range handling
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Checkpoint - Navigation Handler complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Integrate with extension and register commands
  - [x] 8.1 Create index.ts barrel exports for new modules
    - Create `extension/src/scan-results/index.ts`
    - Create `extension/src/navigation/index.ts`
    - Export all public interfaces and classes
    - _Requirements: 1.1, 2.1_

  - [x] 8.2 Update extension.ts to integrate new components
    - Import new components in extension.ts
    - Initialize ScanResultsAggregator, FileListView, and FileNavigationHandler in activate()
    - Store results after workspace scan completes
    - Wire FileListView selection to FileNavigationHandler
    - _Requirements: 1.1, 2.1, 4.1_

  - [x] 8.3 Register dataMasking.showScanResults command
    - Register command to show file list with stored results
    - Show prompt to run scan if no results exist
    - _Requirements: 4.2, 4.3_

  - [x] 8.4 Update scanWorkspace to store results and show file list
    - Call aggregator.storeResults() after scan completes
    - Show file list automatically after workspace scan
    - Display "no sensitive data found" message when appropriate
    - _Requirements: 1.1, 1.5, 4.1_

- [x] 9. Checkpoint - Integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Add relative path display support
  - [x] 10.1 Implement workspace-relative path conversion
    - Add utility function to convert absolute paths to workspace-relative
    - Ensure all displayed paths use relative format
    - _Requirements: 1.2_

  - [ ]* 10.2 Write property test for relative path display
    - **Property 2: File paths are relative to workspace root**
    - **Validates: Requirements 1.2**

- [ ] 11. Add tooltip with pattern breakdown
  - [x] 11.1 Implement tooltip generation for file entries
    - Generate tooltip content with finding count per pattern type
    - Format as readable breakdown (e.g., "PII: 2, Credentials: 1")
    - _Requirements: 3.3_

  - [ ]* 11.2 Write property test for tooltip content
    - **Property 9: Tooltip contains pattern type breakdown**
    - **Validates: Requirements 3.3**

- [ ] 12. Add stored results command behavior
  - [x] 12.1 Implement show results command with stored data check
    - Check if results exist before showing
    - Display prompt to run scan if no results
    - _Requirements: 4.2, 4.3_

  - [ ]* 12.2 Write property test for stored results display
    - **Property 11: Stored results are displayed on command**
    - **Validates: Requirements 4.2**

- [x] 13. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript consistent with the existing extension codebase
- VS Code APIs (QuickPick, TextEditor, Commands) should be mocked in tests
