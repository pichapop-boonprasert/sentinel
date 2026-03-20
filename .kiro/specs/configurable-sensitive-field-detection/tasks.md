# Implementation Plan: Configurable Sensitive Field Detection

## Overview

This implementation plan breaks down the configurable sensitive field detection feature into incremental coding tasks. The feature enables users to customize which field names are considered sensitive and which logging methods trigger masking warnings, while maintaining sensible defaults.

## Tasks

- [ ] 1. Create ConfigurationValidator component
  - [x] 1.1 Create `extension/src/config/configurationValidator.ts` with validation interface
    - Implement `validatePatternArray()` method to validate pattern arrays
    - Implement `validateLoggingMethods()` method to validate logging method arrays
    - Implement `validateSeverity()` method to validate severity values
    - Implement `normalizePatterns()` and `deduplicatePatterns()` helper methods
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [ ]* 1.2 Write property test for configuration validation and fallback (Property 10)
    - **Property 10: Configuration Validation and Fallback**
    - Test that invalid configuration values are skipped and valid entries continue processing
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [ ] 2. Create PatternRegistry component
  - [x] 2.1 Create `extension/src/patterns/patternRegistry.ts` with pattern merging logic
    - Implement `getPatternsForCategory()` method to get merged patterns (defaults + custom - excluded)
    - Implement `getAllEffectivePatterns()` method to get all patterns across enabled categories
    - Implement `isExcluded()` method to check if a pattern is excluded
    - Implement `refresh()` method to reload patterns from configuration
    - _Requirements: 3.1, 3.2, 3.3, 5.2, 5.3, 5.4, 8.2, 8.3_

  - [ ]* 2.2 Write property test for additive pattern merging (Property 2)
    - **Property 2: Additive Pattern Merging**
    - Test that custom patterns are added to defaults for each category
    - **Validates: Requirements 3.1, 3.2, 3.3, 5.2, 5.4, 8.2**

  - [ ]* 2.3 Write property test for pattern exclusion (Property 3)
    - **Property 3: Pattern Exclusion**
    - Test that excluded patterns do not appear in effective patterns
    - **Validates: Requirements 5.3, 8.3**

  - [ ]* 2.4 Write property test for pattern deduplication (Property 4)
    - **Property 4: Pattern Deduplication**
    - Test that duplicate patterns (after normalization) appear only once
    - **Validates: Requirements 3.4**

- [ ] 3. Create LoggingMethodRegistry component
  - [x] 3.1 Create `extension/src/config/loggingMethodRegistry.ts` with logging method management
    - Implement `getEffectiveMethods()` method to get logging methods based on configuration
    - Implement `isLoggingMethod()` method to check if a method name triggers detection
    - Implement `getDefaultMethods()` method to get default methods for a language
    - Implement `refresh()` method to reload from configuration
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1_

  - [ ]* 3.2 Write property test for logging method replace mode (Property 6)
    - **Property 6: Logging Method Replace Mode**
    - Test that user-configured methods replace (not add to) default methods
    - **Validates: Requirements 4.1, 4.3, 8.1**

  - [ ]* 3.3 Write property test for logging method detection scope (Property 7)
    - **Property 7: Logging Method Detection Scope**
    - Test that warnings are generated only for configured logging methods with unmasked sensitive fields
    - **Validates: Requirements 4.2**

  - [ ]* 3.4 Write property test for logging method format support (Property 8)
    - **Property 8: Logging Method Format Support**
    - Test that both fully qualified and short method formats are detected
    - **Validates: Requirements 4.5**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Enhance ConfigurationManager with new methods
  - [x] 5.1 Add `getEffectiveLoggingMethods()` method to ConfigurationManager
    - Return final list of logging methods to detect based on user config or defaults
    - Integrate with LoggingMethodRegistry
    - _Requirements: 4.1, 4.3, 8.1_

  - [x] 5.2 Add `getExcludedPatterns()` method to ConfigurationManager
    - Return patterns to exclude from detection
    - _Requirements: 5.3, 8.3_

  - [x] 5.3 Add `validateConfiguration()` method to ConfigurationManager
    - Return ValidationResult with isValid flag and warnings array
    - Integrate with ConfigurationValidator
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 5.4 Write property test for default configuration completeness (Property 1)
    - **Property 1: Default Configuration Completeness**
    - Test that fresh configuration returns non-empty patterns for all categories, all enabled, Warning severity
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

  - [ ]* 5.5 Write property test for category toggle effect (Property 9)
    - **Property 9: Category Toggle Effect**
    - Test that disabled categories have no patterns in effective patterns
    - **Validates: Requirements 5.1**

- [ ] 6. Enhance PatternMatcher for normalization round-trip
  - [x] 6.1 Verify and enhance `normalize()` function in patternMatcher.ts
    - Ensure consistent normalization for camelCase, snake_case, kebab-case, PascalCase
    - Add any missing edge case handling
    - _Requirements: 3.5_

  - [ ]* 6.2 Write property test for pattern normalization round-trip (Property 5)
    - **Property 5: Pattern Normalization Round-Trip**
    - Test that identifiers match patterns regardless of naming convention
    - **Validates: Requirements 3.5**

- [ ] 7. Update settings schema in package.json
  - [x] 7.1 Enhance setting descriptions with examples and tooltips
    - Update descriptions for customPatterns settings with example values
    - Update descriptions for loggingFunctions and maskingPatterns with examples
    - Add clear indication of additive vs replace mode behavior
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.5, 8.4, 8.5_

  - [ ]* 7.2 Write property test for setting key naming consistency (Property 11)
    - **Property 11: Setting Key Naming Consistency**
    - Test that all setting keys follow `piiJsonChecker.<section>.<name>` pattern with camelCase
    - **Validates: Requirements 2.4**

- [ ] 8. Integrate components and wire real-time updates
  - [x] 8.1 Update LoggingAnalyzer to use PatternRegistry and LoggingMethodRegistry
    - Replace direct pattern access with PatternRegistry calls
    - Replace hardcoded logging methods with LoggingMethodRegistry calls
    - _Requirements: 4.2, 5.1_

  - [x] 8.2 Add configuration change listener in extension.ts
    - Subscribe to `vscode.workspace.onDidChangeConfiguration`
    - Trigger re-analysis of open documents on configuration change
    - Call `refresh()` on PatternRegistry and LoggingMethodRegistry
    - _Requirements: 3.6, 4.6_

  - [x] 8.3 Add user notification for invalid configuration fallback
    - Show notification when falling back to defaults due to invalid config
    - Log warnings to output channel for invalid entries
    - _Requirements: 7.5, 7.6_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- The implementation uses TypeScript as specified in the existing codebase
- fast-check library should be used for property-based testing
