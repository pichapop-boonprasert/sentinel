# Implementation Plan: Data Masking Suggestion Plugin

## Overview

This implementation plan breaks down the Data Masking Suggestion Plugin into incremental coding tasks. The plugin provides AI-powered detection and masking suggestions for sensitive data fields in source code, integrating with Kiro IDE through a modular architecture with Scanner, Analyzer, Suggestion Engine, and Configuration Manager components.

## Tasks

- [ ] 1. Set up project structure and core interfaces
  - [x] 1.1 Create plugin directory structure and package configuration
    - Create `src/` directory with subdirectories for `scanner/`, `analyzer/`, `suggestion-engine/`, `config/`, `ui/`, and `types/`
    - Set up `package.json` with Kiro IDE extension dependencies
    - Configure TypeScript with `tsconfig.json`
    - Set up testing framework with fast-check for property-based testing
    - _Requirements: 7.1_

  - [x] 1.2 Define core TypeScript interfaces and types
    - Create `types/index.ts` with all interfaces: `IScanner`, `IAnalyzer`, `ISuggestionEngine`, `IConfigurationManager`, `IReportGenerator`
    - Define data models: `FieldDeclaration`, `CodeLocation`, `AnalysisResult`, `Suggestion`, `MaskingConfiguration`
    - Define enums: `MaskingPatternType`, `SuggestionStatus`, `Priority`, `PluginErrorCode`
    - _Requirements: 2.6, 4.2_

  - [ ]* 1.3 Write property test for confidence score bounds
    - **Property 4: Confidence Score Assignment**
    - Verify all analysis results have confidence scores between 0 and 100
    - **Validates: Requirements 2.6**

- [x] 2. Implement Scanner component
  - [x] 2.1 Implement file type detection and language support
    - Create `scanner/language-support.ts` with `isSupported()` function
    - Support JavaScript, TypeScript, Python, C#, Java, and JSON files
    - _Requirements: 1.3_

  - [x] 2.2 Implement AST parsing for each supported language
    - Create `scanner/parsers/` with language-specific parsers
    - Extract field names, variable declarations, and property definitions
    - Capture surrounding code context, comments, and parent scope
    - _Requirements: 1.1, 3.1_

  - [ ]* 2.3 Write property test for field extraction completeness
    - **Property 1: Field Extraction Completeness**
    - Generate valid source files, verify all declared fields are extracted
    - **Validates: Requirements 1.1, 1.3**

  - [x] 2.4 Implement scan error handling and resilience
    - Handle syntax errors gracefully, log and continue scanning
    - Create `ScanError` objects with file path, message, and recoverability
    - _Requirements: 1.4_

  - [ ]* 2.5 Write property test for scan resilience
    - **Property 2: Scan Resilience**
    - Generate file sets with valid and invalid files, verify valid files are parsed
    - **Validates: Requirements 1.4**

  - [x] 2.6 Implement workspace scanning with progress reporting
    - Create `scanWorkspace()` with AsyncIterableIterator for streaming results
    - Implement progress indicator updates for status bar
    - _Requirements: 1.2, 1.5_

- [x] 3. Checkpoint - Scanner component complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Analyzer component
  - [x] 4.1 Implement built-in sensitive data patterns
    - Create `analyzer/patterns/` with pattern definitions for PII, credentials, financial, and health data
    - Define regex patterns for field names and values
    - Define context indicators for each pattern type
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 4.2 Implement pattern matching engine
    - Create `analyzer/pattern-matcher.ts` with pattern detection logic
    - Match field names against registered patterns
    - Consider field name, data type annotations, and context indicators
    - _Requirements: 2.5_

  - [ ]* 4.3 Write property test for sensitive pattern detection
    - **Property 3: Sensitive Pattern Detection**
    - Generate fields with known sensitive patterns, verify correct detection and categorization
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 4.4 Implement confidence score calculation
    - Create scoring algorithm based on pattern match strength, context indicators, and usage context
    - Assign scores between 0-100
    - _Requirements: 2.6_

  - [x] 4.5 Implement usage context analysis
    - Detect logging, serialization, API response, storage, and display contexts
    - Assign higher priority to high-risk contexts
    - _Requirements: 3.3_

  - [ ]* 4.6 Write property test for high-risk context priority
    - **Property 5: High-Risk Context Priority**
    - Generate fields with and without high-risk contexts, verify priority assignment
    - **Validates: Requirements 3.3**

  - [x] 4.7 Implement custom pattern registration
    - Create `registerPattern()` method for user-defined patterns
    - Validate regex patterns before registration
    - _Requirements: 6.4_

  - [ ]* 4.8 Write property test for custom pattern detection
    - **Property 15: Custom Pattern Detection**
    - Generate custom patterns and matching fields, verify detection
    - **Validates: Requirements 6.4**

  - [x] 4.9 Implement user feedback recording for ML improvement
    - Create `recordFeedback()` method to store feedback
    - Store expected vs actual sensitivity for future learning
    - _Requirements: 3.4_

- [x] 5. Checkpoint - Analyzer component complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Suggestion Engine component
  - [x] 6.1 Implement suggestion creation and storage
    - Create `suggestion-engine/index.ts` with suggestion management
    - Generate unique IDs, store suggestions with all required fields
    - _Requirements: 4.2_

  - [ ]* 6.2 Write property test for suggestion completeness
    - **Property 6: Suggestion Completeness**
    - Generate suggestions, verify all contain required fields (field name, location, score, action)
    - **Validates: Requirements 4.2**

  - [x] 6.3 Implement suggestion filtering and sorting
    - Create filter by pattern type, confidence threshold, status, and file path
    - Implement sorting by confidence score, file location, and pattern category
    - _Requirements: 4.5_

  - [ ]* 6.4 Write property test for suggestion sorting
    - **Property 7: Suggestion Sorting**
    - Generate random suggestions, verify sorting produces correctly ordered results
    - **Validates: Requirements 4.5**

  - [x] 6.5 Implement user decision processing (accept/reject/defer)
    - Create `processDecision()` method for handling user actions
    - Update suggestion status based on decision
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 6.6 Write property test for defer decision visibility
    - **Property 10: Defer Decision Visibility**
    - Defer suggestions, verify they remain visible with pending status
    - **Validates: Requirements 5.3**

  - [x] 6.7 Implement "apply to similar" functionality
    - Create `applyToSimilar()` method to find and update matching fields
    - Match by field name across workspace
    - _Requirements: 5.5_

  - [ ]* 6.8 Write property test for similar field application
    - **Property 11: Similar Field Application**
    - Accept with "apply to similar", verify all matching fields receive same decision
    - **Validates: Requirements 5.5**

  - [x] 6.9 Implement custom field addition
    - Create `addCustomField()` method for manual field additions
    - _Requirements: 5.4_

- [x] 7. Checkpoint - Suggestion Engine component complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement Configuration Manager component
  - [x] 8.1 Implement configuration file loading and saving
    - Create `config/manager.ts` with load/save methods
    - Store configuration in `.kiro/masking-config.json`
    - _Requirements: 6.1, 6.3_

  - [ ]* 8.2 Write property test for configuration load on startup
    - **Property 14: Configuration Load on Startup**
    - Create config files, verify all fields, patterns, and settings are restored
    - **Validates: Requirements 6.3**

  - [x] 8.3 Implement configuration import/export
    - Create `export()` and `import()` methods
    - Support JSON format for configuration exchange
    - _Requirements: 6.2_

  - [ ]* 8.4 Write property test for configuration round-trip
    - **Property 13: Configuration Round-Trip**
    - Generate configurations, export/import, verify equivalence
    - **Validates: Requirements 6.2**

  - [x] 8.5 Implement corrupted configuration recovery
    - Detect corrupted or invalid JSON
    - Create backup file and initialize new configuration
    - _Requirements: 6.5_

  - [ ]* 8.6 Write property test for corrupted configuration recovery
    - **Property 16: Corrupted Configuration Recovery**
    - Corrupt config files, verify backup creation and reinitialization
    - **Validates: Requirements 6.5**

  - [x] 8.7 Implement workspace and user-level configuration inheritance
    - Load user-level settings as defaults
    - Override with workspace-level settings
    - _Requirements: 6.6_

  - [ ]* 8.8 Write property test for configuration inheritance
    - **Property 17: Configuration Inheritance**
    - Define settings at both levels, verify user-level overrides workspace-level
    - **Validates: Requirements 6.6**

  - [x] 8.9 Implement decision history tracking
    - Create `DecisionRecord` entries for all user decisions
    - Store timestamp and user information
    - _Requirements: 5.6_

  - [ ]* 8.10 Write property test for decision history completeness
    - **Property 12: Decision History Completeness**
    - Make decisions, verify history records are created with all required fields
    - **Validates: Requirements 5.6**

  - [x] 8.11 Implement accept decision persistence
    - Add accepted fields to masking configuration
    - Exclude from future suggestions
    - _Requirements: 5.1_

  - [ ]* 8.12 Write property test for accept decision persistence
    - **Property 8: Accept Decision Persistence**
    - Accept suggestions, verify fields added to config and excluded from future scans
    - **Validates: Requirements 5.1**

  - [x] 8.13 Implement reject decision exclusion
    - Mark rejected fields as reviewed
    - Exclude from future suggestions for that specific field/file
    - _Requirements: 5.2_

  - [ ]* 8.14 Write property test for reject decision exclusion
    - **Property 9: Reject Decision Exclusion**
    - Reject suggestions, verify fields excluded from future suggestions
    - **Validates: Requirements 5.2**

- [x] 9. Checkpoint - Configuration Manager component complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Report Generator component
  - [x] 10.1 Implement report generation
    - Create `report/generator.ts` with `generateReport()` method
    - Include all detected sensitive fields with required information
    - _Requirements: 9.1, 9.3_

  - [ ]* 10.2 Write property test for report completeness
    - **Property 22: Report Completeness**
    - Generate reports, verify all fields include name, location, pattern, score, status
    - **Validates: Requirements 9.1, 9.3**

  - [x] 10.3 Implement report export in multiple formats
    - Create exporters for JSON, CSV, and Markdown formats
    - Ensure valid, parseable output
    - _Requirements: 9.2_

  - [ ]* 10.4 Write property test for report format validity
    - **Property 23: Report Format Validity**
    - Export reports in each format, verify output is valid and parseable
    - **Validates: Requirements 9.2**

  - [x] 10.5 Implement report filtering
    - Filter by pattern category, confidence threshold, and decision status
    - _Requirements: 9.4_

  - [ ]* 10.6 Write property test for report filtering
    - **Property 24: Report Filtering**
    - Apply filters, verify only matching findings are included
    - **Validates: Requirements 9.4**

  - [x] 10.7 Implement clipboard copy functionality
    - Create `copyToClipboard()` method for suggestion list
    - _Requirements: 9.5_

- [x] 11. Checkpoint - Report Generator component complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement UI components
  - [x] 12.1 Implement Suggestion Panel webview
    - Create `ui/suggestion-panel.ts` with webview provider
    - Display suggestions grouped by pattern category
    - Show field name, file location, confidence score, and recommended action
    - _Requirements: 4.1, 4.2_

  - [x] 12.2 Implement suggestion panel sorting controls
    - Add sort options for confidence score, file location, and pattern category
    - _Requirements: 4.5_

  - [x] 12.3 Implement inline code highlighting
    - Create `ui/inline-highlighter.ts` with decoration provider
    - Highlight detected sensitive fields with distinctive visual indicator
    - _Requirements: 4.3_

  - [x] 12.4 Implement hover tooltip provider
    - Create `ui/tooltip-provider.ts` with hover information
    - Display masking suggestion details on hover
    - _Requirements: 4.4_

  - [x] 12.5 Implement progress indicator
    - Create `ui/progress-indicator.ts` for status bar
    - Show scanning progress and suggestion count summary
    - _Requirements: 1.5, 4.6_

- [x] 13. Implement Kiro IDE integration
  - [x] 13.1 Implement extension activation and registration
    - Create `extension.ts` with activation function
    - Register as Kiro IDE extension
    - _Requirements: 7.1_

  - [x] 13.2 Implement activity bar icon and panel registration
    - Add dedicated icon to activity bar
    - Register Suggestion Panel view
    - _Requirements: 7.2_

  - [x] 13.3 Implement file event handlers
    - Handle file open events for initial scan
    - Handle file save events for re-scanning
    - _Requirements: 7.3, 7.4_

  - [ ]* 13.4 Write property test for file save triggers rescan
    - **Property 18: File Save Triggers Rescan**
    - Save files, verify re-scan occurs and suggestions update
    - **Validates: Requirements 7.4**

  - [x] 13.5 Implement keyboard shortcuts
    - Register shortcuts for accept, reject, defer, and open panel
    - _Requirements: 7.5_

  - [x] 13.6 Implement command palette commands
    - Register all plugin commands with command palette
    - _Requirements: 7.6_

- [x] 14. Checkpoint - UI and IDE integration complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement performance optimizations
  - [x] 15.1 Implement analysis caching
    - Create `cache/analysis-cache.ts` with LRU/TTL eviction
    - Cache analysis results by file hash
    - _Requirements: 8.4_

  - [ ]* 15.2 Write property test for incremental scanning
    - **Property 20: Incremental Scanning**
    - Scan unchanged files, verify cached results are used
    - **Validates: Requirements 8.2**

  - [x] 15.3 Implement scan performance optimization
    - Ensure single file scan completes within 500ms for files under 1000 lines
    - _Requirements: 8.1_

  - [ ]* 15.4 Write property test for scan performance
    - **Property 19: Scan Performance**
    - Generate files under 1000 lines, verify scan completes within 500ms
    - **Validates: Requirements 8.1**

  - [x] 15.5 Implement on-demand scanning for large workspaces
    - Detect workspaces with 1000+ files
    - Switch to on-demand scanning mode
    - _Requirements: 8.5_

  - [ ]* 15.6 Write property test for on-demand scanning
    - **Property 21: On-Demand Scanning for Large Workspaces**
    - Create workspace with 1000+ files, verify on-demand mode activates
    - **Validates: Requirements 8.5**

  - [x] 15.7 Implement CPU usage throttling
    - Add configurable CPU limit for background analysis
    - _Requirements: 8.3_

  - [x] 15.8 Implement configurable scanning options
    - Add settings for scan frequency and resource limits
    - _Requirements: 8.6_

- [x] 16. Final checkpoint - All components integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The plugin uses TypeScript throughout as specified in the design document
