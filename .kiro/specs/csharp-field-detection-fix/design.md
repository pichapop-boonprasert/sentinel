# C# Field Detection Fix - Bugfix Design

## Overview

The data masking suggestion plugin fails to detect sensitive fields in C# language files, while detection works correctly for Python and JavaScript files. The C# parser successfully extracts field declarations (verified by passing unit tests), and the parser is properly registered in the system. However, the sensitive data detection pipeline does not produce suggestions for C# files containing fields like `Email`, `SSN`, `Password`, and `CreditCardNumber`.

This design document formalizes the bug condition, identifies the root cause through analysis, and proposes a targeted fix that preserves existing behavior for other languages.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when C# files are scanned but sensitive fields are not detected despite having names that match sensitive data patterns
- **Property (P)**: The desired behavior - C# fields with sensitive names should be detected and generate masking suggestions with appropriate confidence scores
- **Preservation**: Existing detection behavior for Python, JavaScript, TypeScript, Java, and JSON files must remain unchanged
- **CSharpParser**: The parser in `extension/src/scanner/parsers/csharp-parser.ts` that extracts field declarations from C# source files
- **PatternMatcher**: The component in `extension/src/analyzer/pattern-matcher.ts` that matches field names against sensitive data patterns
- **FieldDeclaration**: The data structure containing field name, type, location, and context information extracted by parsers

## Bug Details

### Bug Condition

The bug manifests when scanning C# files containing sensitive fields. The `CSharpParser` extracts fields correctly, but the pattern matching pipeline fails to identify them as sensitive, resulting in zero masking suggestions for C# files.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { filePath: string, fields: FieldDeclaration[] }
  OUTPUT: boolean
  
  RETURN input.filePath ENDS WITH '.cs'
         AND input.fields.length > 0
         AND EXISTS field IN input.fields WHERE
             field.name MATCHES sensitivePattern (e.g., 'Email', 'SSN', 'Password')
         AND suggestionsGenerated(input.filePath) = 0
END FUNCTION
```

### Examples

- **Example 1**: Scanning `User.cs` with `public string Email { get; set; }` - Expected: 1 suggestion for Email field, Actual: 0 suggestions
- **Example 2**: Scanning `User.cs` with `public string SSN { get; set; }` - Expected: 1 suggestion for SSN field, Actual: 0 suggestions
- **Example 3**: Scanning `PaymentInfo.cs` with `public string CreditCardNumber { get; set; }` - Expected: 1 suggestion for CreditCardNumber field, Actual: 0 suggestions
- **Example 4**: Scanning `user.py` with `email = "test@example.com"` - Expected: 1 suggestion (works correctly), Actual: 1 suggestion

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Python files containing sensitive fields must continue to be detected and generate masking suggestions correctly
- JavaScript/TypeScript files containing sensitive fields must continue to be detected and generate masking suggestions correctly
- Java files containing sensitive fields must continue to be detected and generate masking suggestions correctly
- JSON files containing sensitive keys must continue to be detected and generate masking suggestions correctly
- The C# parser's field extraction logic must continue to work correctly (tests pass)
- Error handling for syntax errors in C# files must continue to work gracefully

**Scope:**
All inputs that do NOT involve C# file scanning should be completely unaffected by this fix. This includes:
- Scanning Python, JavaScript, TypeScript, Java, and JSON files
- Pattern registration and validation
- Confidence score calculation
- Suggestion management and user decisions

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Language Identifier Mismatch**: The `getLanguage()` function returns `'csharp'` for `.cs` files, but there may be a case sensitivity issue or mismatch somewhere in the pipeline that prevents the parser from being correctly selected or the results from being processed.

2. **Parser Registry Issue**: The C# parser is registered with `parserRegistry.set('csharp', csharpParser)`, but there could be an initialization timing issue where the parser is not available when needed.

3. **Field Name Extraction Issue**: The C# parser extracts PascalCase property names (e.g., `Email`, `SSN`), and while the patterns use case-insensitive matching (`/i` flag), there might be an issue with how the field names are passed to the pattern matcher.

4. **Pattern Matching Integration**: The pattern matcher tests pass with lowercase field names (`email`), but there might be an issue when matching PascalCase names from C# files, possibly due to string normalization or comparison issues.

5. **Scan Pipeline Short-Circuit**: There might be a condition in the scan pipeline that causes C# files to be skipped or their results to be discarded before pattern matching occurs.

## Correctness Properties

Property 1: Bug Condition - C# Sensitive Field Detection

_For any_ C# file containing fields with names that match sensitive data patterns (e.g., `Email`, `SSN`, `Password`, `CreditCardNumber`), the fixed detection pipeline SHALL identify these fields as sensitive and generate masking suggestions with appropriate confidence scores (≥30).

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-C# Language Detection

_For any_ file in a supported language other than C# (Python, JavaScript, TypeScript, Java, JSON) containing sensitive fields, the fixed code SHALL produce exactly the same detection results as the original code, preserving all existing functionality for non-C# file scanning.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix will target the integration point between the C# parser and the pattern matching pipeline.

**File**: `extension/src/scanner/parsers/csharp-parser.ts`

**Potential Changes**:
1. **Verify Field Name Extraction**: Ensure field names are extracted without any unintended whitespace or special characters that could affect pattern matching.

2. **Normalize Field Names**: If needed, ensure field names are trimmed and properly formatted before being returned in the FieldDeclaration.

**File**: `extension/src/scanner/parsers/index.ts`

**Potential Changes**:
1. **Verify Parser Registration**: Ensure the C# parser is correctly registered and accessible via `getParser('csharp')`.

2. **Add Debug Logging**: Temporarily add logging to verify the parser is being selected for `.cs` files.

**File**: `extension/src/extension.ts`

**Potential Changes**:
1. **Verify Language Detection**: Ensure `getLanguage()` returns `'csharp'` for `.cs` files and that this value is correctly used to retrieve the parser.

2. **Verify Pattern Matching Flow**: Ensure the pattern matcher receives the correct field names from the C# parser.

**File**: `extension/src/analyzer/pattern-matcher.ts`

**Potential Changes**:
1. **Verify Case-Insensitive Matching**: Ensure the pattern matching correctly handles PascalCase field names from C# files.

2. **Add Field Name Normalization**: If needed, normalize field names before matching to ensure consistent behavior across languages.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write integration tests that scan C# files with known sensitive fields and verify that suggestions are generated. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **C# Property Detection Test**: Scan a C# file with `public string Email { get; set; }` and verify a suggestion is generated (will fail on unfixed code)
2. **C# Field Detection Test**: Scan a C# file with `private string password;` and verify a suggestion is generated (will fail on unfixed code)
3. **C# Multiple Fields Test**: Scan a C# file with multiple sensitive fields (Email, SSN, Password, CreditCardNumber) and verify suggestions are generated for each (will fail on unfixed code)
4. **C# vs Python Comparison Test**: Scan equivalent C# and Python files with the same sensitive field names and compare suggestion counts (will show discrepancy on unfixed code)

**Expected Counterexamples**:
- C# files return 0 suggestions while equivalent Python files return expected suggestions
- Possible causes: parser not selected, field names not passed correctly, pattern matching fails for PascalCase

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := scanFile_fixed(input.filePath)
  suggestions := generateSuggestions(result.fields)
  ASSERT suggestions.length > 0
  ASSERT ALL sensitiveFields IN input.fields HAVE corresponding suggestion
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT scanFile_original(input) = scanFile_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for Python, JavaScript, TypeScript, Java, and JSON files, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Python Detection Preservation**: Verify Python files with sensitive fields continue to generate correct suggestions after fix
2. **JavaScript Detection Preservation**: Verify JavaScript files with sensitive fields continue to generate correct suggestions after fix
3. **TypeScript Detection Preservation**: Verify TypeScript files with sensitive fields continue to generate correct suggestions after fix
4. **Java Detection Preservation**: Verify Java files with sensitive fields continue to generate correct suggestions after fix
5. **JSON Detection Preservation**: Verify JSON files with sensitive keys continue to generate correct suggestions after fix

### Unit Tests

- Test C# parser field extraction for properties, fields, and method parameters
- Test pattern matching with PascalCase field names (Email, SSN, Password)
- Test pattern matching with camelCase field names (email, ssn, password)
- Test integration between C# parser and pattern matcher

### Property-Based Tests

- Generate random C# class definitions with sensitive field names and verify detection
- Generate random field names matching sensitive patterns and verify pattern matching works regardless of case
- Test that all supported languages produce consistent detection results for equivalent sensitive field names

### Integration Tests

- Test full scan pipeline for C# files from file read to suggestion generation
- Test workspace scan including C# files alongside other language files
- Test that C# file changes trigger re-scanning and suggestion updates
