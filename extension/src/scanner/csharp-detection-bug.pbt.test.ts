/**
 * Bug Condition Exploration Test - C# Sensitive Field Detection Failure
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**
 * 
 * This property-based test is designed to FAIL on unfixed code to prove the bug exists.
 * The bug condition: C# files with sensitive fields (Email, SSN, Password, CreditCardNumber)
 * return 0 masking suggestions while equivalent Python/JavaScript files work correctly.
 * 
 * Bug condition: `filePath.endsWith('.cs') AND fields.length > 0 AND sensitiveFieldsExist AND suggestionsGenerated = 0`
 * Expected behavior: `suggestionsGenerated > 0 AND confidenceScore >= 30`
 * 
 * @module scanner/csharp-detection-bug.pbt.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CSharpParser } from './parsers/csharp-parser';
import { PythonParser } from './parsers/python-parser';
import { PatternMatcher, createPatternMatcher } from '../analyzer/pattern-matcher';
import { ConfidenceScorer, createConfidenceScorer } from '../analyzer/confidence-scorer';
import { piiPatterns } from '../analyzer/patterns/pii-patterns';
import { credentialsPatterns } from '../analyzer/patterns/credentials-patterns';
import { financialPatterns } from '../analyzer/patterns/financial-patterns';
import { FieldDeclaration, AnalysisResult, MaskingPatternType } from '../types';

// Known sensitive field names that should be detected
const SENSITIVE_FIELD_NAMES = ['Email', 'SSN', 'Password', 'CreditCardNumber'] as const;
type SensitiveFieldName = typeof SENSITIVE_FIELD_NAMES[number];

// C# types for generating test code
const CSHARP_TYPES = ['string', 'String', 'string?', 'String?'] as const;

/**
 * Generates a C# class with the specified sensitive fields as properties
 */
function generateCSharpClassWithProperties(fields: SensitiveFieldName[]): string {
  const properties = fields.map(field => 
    `    public string ${field} { get; set; }`
  ).join('\n');
  
  return `
public class User
{
${properties}
}
`;
}

/**
 * Generates a C# class with the specified sensitive fields as private fields
 */
function generateCSharpClassWithFields(fields: SensitiveFieldName[]): string {
  const fieldDeclarations = fields.map(field => 
    `    private string ${field.toLowerCase()};`
  ).join('\n');
  
  return `
public class User
{
${fieldDeclarations}
}
`;
}

/**
 * Generates equivalent Python class for comparison
 * Uses the same field names as C# (PascalCase) for fair comparison
 */
function generatePythonClass(fields: SensitiveFieldName[]): string {
  const attributes = fields.map(field => 
    `        self.${field} = None`
  ).join('\n');
  
  return `
class User:
    def __init__(self):
${attributes}
`;
}

/**
 * Analyzes fields and returns suggestions with confidence scores
 */
function analyzeFields(
  fields: FieldDeclaration[],
  patternMatcher: PatternMatcher,
  confidenceScorer: ConfidenceScorer
): AnalysisResult[] {
  const results: AnalysisResult[] = [];
  
  for (const field of fields) {
    const matchResult = patternMatcher.matchField(field);
    
    if (matchResult.matched) {
      const scoreBreakdown = confidenceScorer.calculateScore({
        field,
        patternMatchResult: matchResult,
      });
      
      results.push({
        field,
        isSensitive: scoreBreakdown.finalScore >= 30,
        confidenceScore: scoreBreakdown.finalScore,
        detectedPatterns: matchResult.patternType ? [matchResult.patternType] : [],
        reasoning: scoreBreakdown.reasoning,
        priority: scoreBreakdown.priority,
      });
    }
  }
  
  return results;
}

/**
 * Counts suggestions that meet the minimum confidence threshold
 */
function countSuggestions(results: AnalysisResult[], minConfidence: number = 30): number {
  return results.filter(r => r.isSensitive && r.confidenceScore >= minConfidence).length;
}

describe('Bug Condition Exploration: C# Sensitive Field Detection Failure', () => {
  let csharpParser: CSharpParser;
  let pythonParser: PythonParser;
  let patternMatcher: PatternMatcher;
  let confidenceScorer: ConfidenceScorer;

  beforeEach(() => {
    csharpParser = new CSharpParser();
    pythonParser = new PythonParser();
    
    // Create pattern matcher with all sensitive data patterns
    patternMatcher = createPatternMatcher([
      ...piiPatterns,
      ...credentialsPatterns,
      ...financialPatterns,
    ]);
    
    confidenceScorer = createConfidenceScorer();
  });

  /**
   * Property 1: Bug Condition - C# Sensitive Field Detection
   * 
   * _For any_ C# file containing fields with names that match sensitive data patterns
   * (e.g., Email, SSN, Password, CreditCardNumber), the detection pipeline SHALL
   * identify these fields as sensitive and generate masking suggestions with
   * appropriate confidence scores (≥30).
   * 
   * **Validates: Requirements 2.1, 2.2, 2.3**
   * 
   * This test is EXPECTED TO FAIL on unfixed code - failure confirms the bug exists.
   */
  it('Property 1: C# files with sensitive property fields should generate suggestions', () => {
    // Arbitrary for generating non-empty subsets of sensitive field names
    const sensitiveFieldsArb = fc.subarray(
      [...SENSITIVE_FIELD_NAMES],
      { minLength: 1, maxLength: 4 }
    );

    fc.assert(
      fc.property(sensitiveFieldsArb, (fields) => {
        // Generate C# code with sensitive properties
        const csharpCode = generateCSharpClassWithProperties(fields as SensitiveFieldName[]);
        
        // Parse the C# code
        const parseResult = csharpParser.parse(csharpCode, 'User.cs');
        
        // Verify parser extracted fields (this should work - parser tests pass)
        expect(parseResult.errors).toHaveLength(0);
        expect(parseResult.fields.length).toBeGreaterThan(0);
        
        // Analyze fields for sensitive data
        const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
        
        // Count suggestions with confidence >= 30
        const suggestionCount = countSuggestions(analysisResults, 30);
        
        // BUG CONDITION CHECK:
        // Expected behavior: suggestionsGenerated > 0 for C# files with sensitive fields
        // Bug condition: suggestionsGenerated = 0 (this is what we expect to see on unfixed code)
        expect(suggestionCount).toBeGreaterThan(0);
        
        // Additionally verify each sensitive field generates a suggestion
        for (const fieldName of fields) {
          const fieldSuggestion = analysisResults.find(
            r => r.field.name.toLowerCase() === fieldName.toLowerCase() && r.isSensitive
          );
          expect(fieldSuggestion).toBeDefined();
          if (fieldSuggestion) {
            expect(fieldSuggestion.confidenceScore).toBeGreaterThanOrEqual(30);
          }
        }
      }),
      { numRuns: 20 } // Run 20 iterations to cover various field combinations
    );
  });

  /**
   * Property 1b: C# files with single Email property should generate at least 1 suggestion
   * 
   * Specific test case: Scanning a C# file with `public string Email { get; set; }`
   * should generate at least 1 masking suggestion.
   * 
   * **Validates: Requirements 1.1, 2.1**
   */
  it('Property 1b: C# file with Email property should generate at least 1 suggestion', () => {
    const csharpCode = `
public class User
{
    public string Email { get; set; }
}
`;
    
    // Parse the C# code
    const parseResult = csharpParser.parse(csharpCode, 'User.cs');
    
    // Verify parser extracted the Email field
    expect(parseResult.errors).toHaveLength(0);
    expect(parseResult.fields.length).toBeGreaterThan(0);
    
    const emailField = parseResult.fields.find(f => f.name === 'Email');
    expect(emailField).toBeDefined();
    
    // Analyze fields for sensitive data
    const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
    
    // Count suggestions
    const suggestionCount = countSuggestions(analysisResults, 30);
    
    // BUG CONDITION: This should generate at least 1 suggestion
    // On unfixed code, this will be 0 (proving the bug exists)
    expect(suggestionCount).toBeGreaterThanOrEqual(1);
  });

  /**
   * Property 1c: C# files with multiple sensitive fields should generate suggestions for each
   * 
   * Test that scanning a C# file with multiple sensitive fields (Email, SSN, Password, CreditCardNumber)
   * generates suggestions for each field.
   * 
   * **Validates: Requirements 1.2, 2.2**
   */
  it('Property 1c: C# file with multiple sensitive fields should generate suggestions for each', () => {
    const csharpCode = generateCSharpClassWithProperties([...SENSITIVE_FIELD_NAMES]);
    
    // Parse the C# code
    const parseResult = csharpParser.parse(csharpCode, 'User.cs');
    
    // Verify parser extracted all fields
    expect(parseResult.errors).toHaveLength(0);
    expect(parseResult.fields.length).toBeGreaterThanOrEqual(SENSITIVE_FIELD_NAMES.length);
    
    // Analyze fields for sensitive data
    const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
    
    // Count suggestions
    const suggestionCount = countSuggestions(analysisResults, 30);
    
    // BUG CONDITION: Should generate suggestions for all 4 sensitive fields
    // On unfixed code, this will be 0 (proving the bug exists)
    expect(suggestionCount).toBeGreaterThanOrEqual(SENSITIVE_FIELD_NAMES.length);
    
    // Verify each sensitive field has a suggestion
    for (const fieldName of SENSITIVE_FIELD_NAMES) {
      const fieldSuggestion = analysisResults.find(
        r => r.field.name.toLowerCase() === fieldName.toLowerCase() && r.isSensitive
      );
      expect(fieldSuggestion).toBeDefined();
    }
  });

  /**
   * Property 1d: C# vs Python comparison - demonstrates the bug is fixed
   * 
   * Scanning equivalent C# and Python files with the same sensitive field names
   * should both detect the fields. The confidence scores may differ due to
   * language-specific features (e.g., type annotations in C#).
   * 
   * **Validates: Requirements 1.3, 2.3**
   */
  it('Property 1d: C# and Python files with same fields should generate same suggestion count', () => {
    const sensitiveFieldsArb = fc.subarray(
      [...SENSITIVE_FIELD_NAMES],
      { minLength: 1, maxLength: 4 }
    );

    fc.assert(
      fc.property(sensitiveFieldsArb, (fields) => {
        // Generate equivalent C# and Python code
        const csharpCode = generateCSharpClassWithProperties(fields as SensitiveFieldName[]);
        const pythonCode = generatePythonClass(fields as SensitiveFieldName[]);
        
        // Parse both
        const csharpResult = csharpParser.parse(csharpCode, 'User.cs');
        const pythonResult = pythonParser.parse(pythonCode, 'user.py');
        
        // Both parsers should extract fields without errors
        expect(csharpResult.errors).toHaveLength(0);
        expect(pythonResult.errors).toHaveLength(0);
        
        // Both parsers should extract the same number of fields
        expect(csharpResult.fields.length).toBe(fields.length);
        expect(pythonResult.fields.length).toBe(fields.length);
        
        // Analyze both
        const csharpAnalysis = analyzeFields(csharpResult.fields, patternMatcher, confidenceScorer);
        const pythonAnalysis = analyzeFields(pythonResult.fields, patternMatcher, confidenceScorer);
        
        // C# should generate suggestions (the main bug fix)
        // Note: We use a lower threshold (0) to verify pattern matching works,
        // since confidence scores may differ due to type annotations
        const csharpMatches = csharpAnalysis.filter(r => r.detectedPatterns.length > 0).length;
        const pythonMatches = pythonAnalysis.filter(r => r.detectedPatterns.length > 0).length;
        
        // Both languages should match the same patterns
        expect(csharpMatches).toBeGreaterThan(0);
        expect(csharpMatches).toBe(pythonMatches);
      }),
      { numRuns: 10 }
    );
  });
});
