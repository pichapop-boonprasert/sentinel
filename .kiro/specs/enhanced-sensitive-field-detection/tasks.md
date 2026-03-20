# Implementation Plan: Enhanced Sensitive Field Detection

## Overview

This implementation plan converts the enhanced sensitive field detection design into actionable coding tasks. The extension will be enhanced to detect PII, financial data (PCI-DSS), health information (HIPAA), and authentication credentials with categorized diagnostics and configurable pattern management.

## Tasks

- [x] 1. Create Pattern Registry and Data Models
  - [x] 1.1 Create PatternCategory enum and SensitivePattern interface
    - Create `extension/src/patterns/types.ts` with PatternCategory enum (PII, Financial, Health, Credentials)
    - Define SensitivePattern interface with pattern, category, and compliance fields
    - Define CATEGORY_COMPLIANCE and DIAGNOSTIC_CODES mappings
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.2 Create default pattern definitions
    - Create `extension/src/patterns/defaultPatterns.ts` with DEFAULT_PATTERNS constant
    - Include all PII patterns: names, contacts, identifiers, addresses, dates
    - Include all Financial patterns: credit cards, bank accounts, payment info
    - Include all Health patterns: patient identifiers, medical data, insurance, providers
    - Include all Credentials patterns: passwords, tokens, keys, connection strings
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 6.1_

  - [x] 1.3 Implement PatternRegistry class
    - Create `extension/src/patterns/patternRegistry.ts`
    - Implement getPatterns(), getPatternsByCategory(), isCategoryEnabled(), matchPattern() methods
    - Support merging default patterns with user-defined patterns
    - Support excluding patterns specified in configuration
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.4 Write property test for pattern detection across categories
    - **Property 1: Pattern Detection Across Categories**
    - **Validates: Requirements 1.1-1.5, 2.1-2.3, 3.1-3.4, 4.1-4.4**

- [x] 2. Implement Pattern Matcher with Normalization
  - [x] 2.1 Implement normalize function and PatternMatcher
    - Create `extension/src/patterns/patternMatcher.ts`
    - Implement normalize() to handle camelCase, snake_case, kebab-case, space-separated formats
    - Implement matches() to find matching SensitivePattern for an identifier
    - _Requirements: 1.6_

  - [ ]* 2.2 Write property test for normalization equivalence
    - **Property 2: Normalization Equivalence**
    - **Validates: Requirements 1.6**

  - [ ]* 2.3 Write unit tests for pattern matcher edge cases
    - Test exact match, normalized match, partial match, no match scenarios
    - Test empty strings, very long strings, identifiers with numbers, unicode characters
    - _Requirements: 1.6_

- [x] 3. Checkpoint - Ensure pattern matching works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Configuration Manager
  - [x] 4.1 Update VS Code configuration schema in package.json
    - Add category toggle settings (pii, financial, health, credentials)
    - Add customPatterns settings by category
    - Add excludedPatterns setting
    - Update existing settings documentation
    - _Requirements: 6.2, 6.3, 6.4_

  - [x] 4.2 Implement ConfigurationManager class
    - Create `extension/src/config/configurationManager.ts`
    - Implement getEffectivePatterns() to merge defaults with custom patterns minus exclusions
    - Implement getEnabledCategories() to read category toggles
    - Implement getSeverity(), getExtraLoggingFunctions(), getExtraMaskingPatterns()
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 4.3 Write property tests for configuration behavior
    - **Property 6: Custom Patterns Are Detected**
    - **Property 7: Excluded Patterns Are Skipped**
    - **Property 8: Disabled Categories Are Skipped**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 5. Implement Diagnostic Generator with Categories
  - [x] 5.1 Implement DiagnosticGenerator class
    - Create `extension/src/diagnostics/diagnosticGenerator.ts`
    - Implement createFieldDiagnostic() with category label and compliance reference in message
    - Implement createLoggingDiagnostic() for unmasked logging warnings
    - Use category-specific diagnostic codes (pii-field-personal, pii-field-financial, etc.)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 5.2 Write property test for diagnostic content correctness
    - **Property 9: Diagnostic Content Correctness**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 6. Update Logging Analyzer for All Sensitive Fields
  - [x] 6.1 Refactor LoggingAnalyzer to use PatternRegistry
    - Update `extension/src/extension.ts` or extract to `extension/src/analyzers/loggingAnalyzer.ts`
    - Modify analyzeLoggingContext() to accept SensitivePattern[] instead of string[]
    - Update isMasked() to support all masking functions (Mask, Redact, Anonymize, Hash)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 6.2 Write property tests for logging detection
    - **Property 3: Unmasked Logging Detection**
    - **Property 4: Masking Suppresses Warnings**
    - **Property 5: Logging Function Coverage**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 7. Checkpoint - Ensure logging detection works correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integrate Components into Extension
  - [x] 8.1 Refactor extension.ts to use new components
    - Import and instantiate PatternRegistry, PatternMatcher, ConfigurationManager, DiagnosticGenerator
    - Update analyzeDocument() to use PatternRegistry.getPatterns()
    - Update analyzeDotNet() to use PatternMatcher and DiagnosticGenerator
    - Update analyzeJson() to use PatternMatcher and DiagnosticGenerator
    - _Requirements: 1.1-1.5, 2.1-2.3, 3.1-3.4, 4.1-4.4, 7.1-7.3_

  - [x] 8.2 Update code action provider for category-specific actions
    - Update PiiCodeActionProvider to handle new diagnostic codes
    - Ensure quick-fix actions work with all categories
    - _Requirements: 5.2_

  - [ ]* 8.3 Write integration tests for end-to-end detection
    - Create test fixtures with sensitive fields from all categories
    - Verify correct diagnostics are generated for each category
    - Test configuration changes trigger re-analysis
    - _Requirements: 1.1-1.5, 2.1-2.3, 3.1-3.4, 4.1-4.4, 5.1-5.4, 6.1-6.4, 7.1-7.3_

- [x] 9. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The implementation uses TypeScript as the extension is a VS Code extension
- Property tests should use `fast-check` library with minimum 100 iterations
- Checkpoints ensure incremental validation of functionality
