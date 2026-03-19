# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - C# Sensitive Field Detection Failure
  - **IMPORTANT**: Write this property-based test BEFORE implementing the fix
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to C# files with known sensitive field names (Email, SSN, Password, CreditCardNumber)
  - Test that scanning a C# file with `public string Email { get; set; }` generates at least 1 masking suggestion
  - Test that scanning a C# file with multiple sensitive fields (Email, SSN, Password, CreditCardNumber) generates suggestions for each
  - Bug condition: `filePath.endsWith('.cs') AND fields.length > 0 AND sensitiveFieldsExist AND suggestionsGenerated = 0`
  - Expected behavior: `suggestionsGenerated > 0 AND confidenceScore >= 30`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "C# file with Email field returns 0 suggestions while Python equivalent returns 1")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-C# Language Detection Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Python file with `email = "test@example.com"` generates 1 suggestion on unfixed code
  - Observe: JavaScript file with `const email = "test@example.com"` generates 1 suggestion on unfixed code
  - Observe: TypeScript file with `email: string` generates 1 suggestion on unfixed code
  - Observe: Java file with `private String email;` generates 1 suggestion on unfixed code
  - Observe: JSON file with `{"email": "test@example.com"}` generates 1 suggestion on unfixed code
  - Write property-based test: for all non-C# files with sensitive fields, detection results match observed baseline
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for C# sensitive field detection failure

  - [x] 3.1 Investigate and identify root cause
    - Debug the scan pipeline to trace C# file processing
    - Verify `getLanguage()` returns `'csharp'` for `.cs` files
    - Verify `getParser('csharp')` returns the CSharpParser instance
    - Verify CSharpParser extracts fields correctly (unit tests pass)
    - Trace field names through pattern matching to identify where detection fails
    - Check for case sensitivity issues with PascalCase field names (Email vs email)
    - Document the exact root cause before proceeding with fix
    - _Requirements: 1.1, 1.2_
    
    **ROOT CAUSE IDENTIFIED:**
    The CSharpParser fails to extract fields when C# code uses Allman brace style (opening brace on a new line), which is the default C# coding convention.
    
    **Technical Details:**
    In `extension/src/scanner/parsers/csharp-parser.ts`, the `parse()` method has a bug in the scope tracking logic:
    
    1. When a class declaration is found (e.g., `public class User`), it sets `currentClass = 'User'` and `classStartDepth = braceDepth` (which is 0)
    2. The brace depth is updated AFTER checking if we've exited the class scope
    3. The exit check is: `if (classStartDepth >= 0 && braceDepth <= classStartDepth)`
    4. When the opening brace `{` is on the NEXT line (Allman style), `braceDepth` is still 0 when the exit check runs
    5. Since `braceDepth (0) <= classStartDepth (0)` is TRUE, `currentClass` is immediately set to `null`
    6. When the property line is processed, `currentClass` is already `null`, so the property is not extracted
    
    **Why unit tests pass:**
    The unit tests use K&R brace style (`public class User {`) where the opening brace is on the same line as the class declaration. In this case, `braceDepth` becomes 1 before the exit check, so the class scope is maintained.
    
    **Fix Required:**
    Move the brace depth update BEFORE the scope exit checks, or adjust the exit condition to account for Allman brace style.

  - [x] 3.2 Implement the fix based on root cause
    - Apply targeted fix to the identified integration point
    - If language identifier mismatch: fix the mapping in scanner or parser registry
    - If parser selection issue: ensure CSharpParser is correctly retrieved for `.cs` files
    - If field name normalization issue: ensure field names are properly passed to pattern matcher
    - If pattern matching issue: ensure case-insensitive matching works for PascalCase names
    - Ensure fix is minimal and targeted to avoid unintended side effects
    - _Bug_Condition: isBugCondition(input) where input.filePath ends with '.cs' AND sensitiveFields exist AND suggestions = 0_
    - _Expected_Behavior: suggestionsGenerated > 0 for C# files with sensitive fields_
    - _Preservation: Non-C# language detection must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - C# Sensitive Field Detection Works
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-C# Language Detection Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite including existing unit tests
  - Verify C# parser unit tests still pass
  - Verify pattern matcher unit tests still pass
  - Verify all language detection tests pass
  - Ensure no regressions in any supported language
  - Ask the user if questions arise
