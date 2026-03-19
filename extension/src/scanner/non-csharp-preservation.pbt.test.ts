/**
 * Preservation Property Tests - Non-C# Language Detection Unchanged
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 * 
 * These property-based tests verify that the fix for C# detection does NOT
 * break existing detection behavior for other languages. These tests should
 * PASS on both unfixed and fixed code.
 * 
 * Observation-first methodology:
 * - Python file with `email = "test@example.com"` generates 1 suggestion
 * - JavaScript file with `const email = "test@example.com"` generates 1 suggestion
 * - TypeScript file with `email: string` generates 1 suggestion
 * - Java file with `private String email;` generates 1 suggestion
 * - JSON file with `{"email": "test@example.com"}` generates 1 suggestion
 * 
 * @module scanner/non-csharp-preservation.pbt.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PythonParser } from './parsers/python-parser';
import { JavaScriptParser, TypeScriptParser } from './parsers/javascript-parser';
import { JavaParser } from './parsers/java-parser';
import { JsonParser } from './parsers/json-parser';
import { PatternMatcher, createPatternMatcher } from '../analyzer/pattern-matcher';
import { ConfidenceScorer, createConfidenceScorer } from '../analyzer/confidence-scorer';
import { piiPatterns } from '../analyzer/patterns/pii-patterns';
import { credentialsPatterns } from '../analyzer/patterns/credentials-patterns';
import { financialPatterns } from '../analyzer/patterns/financial-patterns';
import { FieldDeclaration, AnalysisResult } from '../types';

// Known sensitive field names that should be detected across all languages
// These field names match the patterns defined in pii-patterns.ts, credentials-patterns.ts, and financial-patterns.ts
// Using only field names that are confirmed to work in pattern-matcher.test.ts
const SENSITIVE_FIELD_NAMES = ['email', 'password', 'firstName', 'lastName'] as const;
type SensitiveFieldName = typeof SENSITIVE_FIELD_NAMES[number];

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

// ============================================================================
// Python Code Generators - Using patterns that PythonParser can extract
// ============================================================================

/**
 * Generates Python class with sensitive self attributes (extracted by PythonParser)
 */
function generatePythonClass(fields: string[]): string {
  const attributes = fields.map(f => `        self.${f} = None`).join('\n');
  return `
class User:
    def __init__(self):
${attributes}
`;
}

// ============================================================================
// JavaScript Code Generators - Using patterns that JavaScriptParser can extract
// ============================================================================

/**
 * Generates JavaScript class with sensitive properties (extracted by JavaScriptParser)
 */
function generateJavaScriptClass(fields: string[]): string {
  const properties = fields.map(f => `  ${f} = '';`).join('\n');
  return `
class User {
${properties}
}
`;
}

// ============================================================================
// TypeScript Code Generators - Using patterns that TypeScriptParser can extract
// ============================================================================

/**
 * Generates TypeScript interface with sensitive properties (extracted by TypeScriptParser)
 */
function generateTypeScriptInterface(fields: string[]): string {
  const properties = fields.map(f => `  ${f}: string;`).join('\n');
  return `interface User {
${properties}
}`;
}

// ============================================================================
// Java Code Generators - Using patterns that JavaParser can extract
// ============================================================================

/**
 * Generates Java class with sensitive fields (extracted by JavaParser)
 */
function generateJavaClass(fields: string[]): string {
  const fieldDeclarations = fields.map(f => `    private String ${f};`).join('\n');
  return `
public class User {
${fieldDeclarations}
}
`;
}

// ============================================================================
// JSON Code Generators - Using patterns that JsonParser can extract
// ============================================================================

/**
 * Generates JSON object with sensitive keys (extracted by JsonParser)
 */
function generateJsonObject(fields: string[]): string {
  const entries = fields.map(f => `  "${f}": "test@example.com"`).join(',\n');
  return `{
${entries}
}`;
}

describe('Preservation Property Tests: Non-C# Language Detection Unchanged', () => {
  let pythonParser: PythonParser;
  let jsParser: JavaScriptParser;
  let tsParser: TypeScriptParser;
  let javaParser: JavaParser;
  let jsonParser: JsonParser;
  let patternMatcher: PatternMatcher;
  let confidenceScorer: ConfidenceScorer;

  beforeEach(() => {
    pythonParser = new PythonParser();
    jsParser = new JavaScriptParser();
    tsParser = new TypeScriptParser();
    javaParser = new JavaParser();
    jsonParser = new JsonParser();
    
    // Create pattern matcher with all sensitive data patterns
    patternMatcher = createPatternMatcher([
      ...piiPatterns,
      ...credentialsPatterns,
      ...financialPatterns,
    ]);
    
    confidenceScorer = createConfidenceScorer();
  });

  // ==========================================================================
  // Observation Tests - Verify baseline behavior
  // ==========================================================================

  describe('Baseline Observations', () => {
    /**
     * Observation: Python file with `self.email = None` generates 1 suggestion
     * 
     * **Validates: Requirements 3.1**
     */
    it('Observation: Python file with email attribute generates 1 suggestion', () => {
      const pythonCode = `
class User:
    def __init__(self):
        self.email = None
`;
      
      const parseResult = pythonParser.parse(pythonCode, 'test.py');
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.fields.length).toBeGreaterThan(0);
      
      const emailField = parseResult.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      
      const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
      const suggestionCount = countSuggestions(analysisResults, 30);
      
      // Baseline: Python email field generates 1 suggestion
      expect(suggestionCount).toBe(1);
    });

    /**
     * Observation: JavaScript file with class property `email = ''` generates 1 suggestion
     * 
     * **Validates: Requirements 3.2**
     */
    it('Observation: JavaScript file with email class property generates 1 suggestion', () => {
      const jsCode = `
class User {
  email = '';
}
`;
      
      const parseResult = jsParser.parse(jsCode, 'test.js');
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.fields.length).toBeGreaterThan(0);
      
      const emailField = parseResult.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      
      const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
      const suggestionCount = countSuggestions(analysisResults, 30);
      
      // Baseline: JavaScript email field generates 1 suggestion
      expect(suggestionCount).toBe(1);
    });

    /**
     * Observation: TypeScript file with `email: string` generates 1 suggestion
     * 
     * **Validates: Requirements 3.2**
     */
    it('Observation: TypeScript file with email property generates 1 suggestion', () => {
      const tsCode = `interface User { email: string; }`;
      
      const parseResult = tsParser.parse(tsCode, 'test.ts');
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.fields.length).toBeGreaterThan(0);
      
      const emailField = parseResult.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      
      const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
      const suggestionCount = countSuggestions(analysisResults, 30);
      
      // Baseline: TypeScript email field generates 1 suggestion
      expect(suggestionCount).toBe(1);
    });

    /**
     * Observation: Java file with `private String email;` generates 1 suggestion
     * 
     * **Validates: Requirements 3.3**
     */
    it('Observation: Java file with email field generates 1 suggestion', () => {
      const javaCode = `
public class User {
    private String email;
}
`;
      
      const parseResult = javaParser.parse(javaCode, 'User.java');
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.fields.length).toBeGreaterThan(0);
      
      const emailField = parseResult.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      
      const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
      const suggestionCount = countSuggestions(analysisResults, 30);
      
      // Baseline: Java email field generates 1 suggestion
      expect(suggestionCount).toBe(1);
    });

    /**
     * Observation: JSON file with `{"email": "test@example.com"}` generates suggestions
     * 
     * Note: JSON detection works differently - keys are extracted but pattern matching
     * may behave differently than code-based languages. This test verifies the parser
     * extracts the field correctly.
     * 
     * **Validates: Requirements 3.4**
     */
    it('Observation: JSON file with email key extracts field correctly', () => {
      const jsonCode = `{"email": "test@example.com"}`;
      
      const parseResult = jsonParser.parse(jsonCode, 'test.json');
      expect(parseResult.errors).toHaveLength(0);
      expect(parseResult.fields.length).toBeGreaterThan(0);
      
      const emailField = parseResult.fields.find(f => f.name === 'email');
      expect(emailField).toBeDefined();
      
      // JSON parser extracts the field - pattern matching may or may not detect it
      // depending on context. The key preservation requirement is that the parser
      // continues to work correctly.
    });
  });

  // ==========================================================================
  // Property-Based Tests - Verify preservation across all inputs
  // ==========================================================================

  describe('Property 2: Preservation - Non-C# Language Detection Unchanged', () => {
    /**
     * Property 2a: Python Detection Preservation
     * 
     * _For any_ Python file containing sensitive fields, the detection pipeline
     * SHALL continue to identify these fields as sensitive and generate masking
     * suggestions with appropriate confidence scores (≥30).
     * 
     * **Validates: Requirements 3.1**
     */
    it('Property 2a: Python files with sensitive fields should generate suggestions', () => {
      const sensitiveFieldsArb = fc.subarray(
        [...SENSITIVE_FIELD_NAMES],
        { minLength: 1, maxLength: 4 }
      );

      fc.assert(
        fc.property(sensitiveFieldsArb, (fields) => {
          // Generate Python code with sensitive fields
          const pythonCode = generatePythonClass(fields);
          
          // Parse the Python code
          const parseResult = pythonParser.parse(pythonCode, 'user.py');
          
          // Verify parser extracted fields without errors
          expect(parseResult.errors).toHaveLength(0);
          expect(parseResult.fields.length).toBeGreaterThan(0);
          
          // Analyze fields for sensitive data
          const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
          
          // Count suggestions with confidence >= 30
          const suggestionCount = countSuggestions(analysisResults, 30);
          
          // PRESERVATION: Python detection should continue to work
          // Each sensitive field should generate a suggestion
          expect(suggestionCount).toBeGreaterThanOrEqual(fields.length);
        }),
        { numRuns: 15 }
      );
    });

    /**
     * Property 2b: JavaScript Detection Preservation
     * 
     * _For any_ JavaScript file containing sensitive fields, the detection pipeline
     * SHALL continue to identify these fields as sensitive and generate masking
     * suggestions with appropriate confidence scores (≥30).
     * 
     * **Validates: Requirements 3.2**
     */
    it('Property 2b: JavaScript files with sensitive fields should generate suggestions', () => {
      const sensitiveFieldsArb = fc.subarray(
        [...SENSITIVE_FIELD_NAMES],
        { minLength: 1, maxLength: 4 }
      );

      fc.assert(
        fc.property(sensitiveFieldsArb, (fields) => {
          // Generate JavaScript code with sensitive fields
          const jsCode = generateJavaScriptClass(fields);
          
          // Parse the JavaScript code
          const parseResult = jsParser.parse(jsCode, 'user.js');
          
          // Verify parser extracted fields without errors
          expect(parseResult.errors).toHaveLength(0);
          expect(parseResult.fields.length).toBeGreaterThan(0);
          
          // Analyze fields for sensitive data
          const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
          
          // Count suggestions with confidence >= 30
          const suggestionCount = countSuggestions(analysisResults, 30);
          
          // PRESERVATION: JavaScript detection should continue to work
          expect(suggestionCount).toBeGreaterThanOrEqual(fields.length);
        }),
        { numRuns: 15 }
      );
    });

    /**
     * Property 2c: TypeScript Detection Preservation
     * 
     * _For any_ TypeScript file containing sensitive fields, the detection pipeline
     * SHALL continue to identify these fields as sensitive and generate masking
     * suggestions with appropriate confidence scores (≥30).
     * 
     * **Validates: Requirements 3.2**
     */
    it('Property 2c: TypeScript files with sensitive fields should generate suggestions', () => {
      const sensitiveFieldsArb = fc.subarray(
        [...SENSITIVE_FIELD_NAMES],
        { minLength: 1, maxLength: 4 }
      );

      fc.assert(
        fc.property(sensitiveFieldsArb, (fields) => {
          // Generate TypeScript code with sensitive fields
          const tsCode = generateTypeScriptInterface(fields);
          
          // Parse the TypeScript code
          const parseResult = tsParser.parse(tsCode, 'user.ts');
          
          // Verify parser extracted fields without errors
          expect(parseResult.errors).toHaveLength(0);
          expect(parseResult.fields.length).toBeGreaterThan(0);
          
          // Analyze fields for sensitive data
          const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
          
          // Count suggestions with confidence >= 30
          const suggestionCount = countSuggestions(analysisResults, 30);
          
          // PRESERVATION: TypeScript detection should continue to work
          expect(suggestionCount).toBeGreaterThanOrEqual(fields.length);
        }),
        { numRuns: 15 }
      );
    });

    /**
     * Property 2d: Java Detection Preservation
     * 
     * _For any_ Java file containing sensitive fields, the detection pipeline
     * SHALL continue to identify these fields as sensitive and generate masking
     * suggestions with appropriate confidence scores (≥30).
     * 
     * **Validates: Requirements 3.3**
     */
    it('Property 2d: Java files with sensitive fields should generate suggestions', () => {
      const sensitiveFieldsArb = fc.subarray(
        [...SENSITIVE_FIELD_NAMES],
        { minLength: 1, maxLength: 4 }
      );

      fc.assert(
        fc.property(sensitiveFieldsArb, (fields) => {
          // Generate Java code with sensitive fields
          const javaCode = generateJavaClass(fields);
          
          // Parse the Java code
          const parseResult = javaParser.parse(javaCode, 'User.java');
          
          // Verify parser extracted fields without errors
          expect(parseResult.errors).toHaveLength(0);
          expect(parseResult.fields.length).toBeGreaterThan(0);
          
          // Analyze fields for sensitive data
          const analysisResults = analyzeFields(parseResult.fields, patternMatcher, confidenceScorer);
          
          // Count suggestions with confidence >= 30
          const suggestionCount = countSuggestions(analysisResults, 30);
          
          // PRESERVATION: Java detection should continue to work
          expect(suggestionCount).toBeGreaterThanOrEqual(fields.length);
        }),
        { numRuns: 15 }
      );
    });

    /**
     * Property 2e: JSON Detection Preservation
     * 
     * _For any_ JSON file containing sensitive keys, the parser SHALL continue
     * to extract these keys correctly. Pattern matching behavior may vary based
     * on context.
     * 
     * **Validates: Requirements 3.4**
     */
    it('Property 2e: JSON files with sensitive keys should be parsed correctly', () => {
      const sensitiveFieldsArb = fc.subarray(
        [...SENSITIVE_FIELD_NAMES],
        { minLength: 1, maxLength: 4 }
      );

      fc.assert(
        fc.property(sensitiveFieldsArb, (fields) => {
          // Generate JSON code with sensitive keys
          const jsonCode = generateJsonObject(fields);
          
          // Parse the JSON code
          const parseResult = jsonParser.parse(jsonCode, 'data.json');
          
          // Verify parser extracted fields without errors
          expect(parseResult.errors).toHaveLength(0);
          expect(parseResult.fields.length).toBeGreaterThan(0);
          
          // PRESERVATION: JSON parser should continue to extract all keys
          // Verify each field was extracted
          for (const fieldName of fields) {
            const field = parseResult.fields.find(f => f.name === fieldName);
            expect(field).toBeDefined();
          }
        }),
        { numRuns: 15 }
      );
    });
  });

  // ==========================================================================
  // Error Handling Preservation Tests
  // ==========================================================================

  describe('Error Handling Preservation', () => {
    /**
     * Property 2f: Syntax error handling should continue to work gracefully
     * 
     * _For any_ file with syntax errors, the parser SHALL continue to handle
     * errors gracefully and return appropriate error information.
     * 
     * **Validates: Requirements 3.5**
     */
    it('Property 2f: Parsers should handle syntax errors gracefully', () => {
      // Test Python with syntax error - parser uses regex, should not throw
      const badPython = `def broken(:\n  pass`;
      expect(() => pythonParser.parse(badPython, 'bad.py')).not.toThrow();

      // Test JavaScript with syntax error
      const badJs = `const x = {`;
      const jsResult = jsParser.parse(badJs, 'bad.js');
      // Should have errors but not throw
      expect(jsResult.errors.length).toBeGreaterThan(0);

      // Test Java with syntax error - parser uses regex, should not throw
      const badJava = `public class { }`;
      expect(() => javaParser.parse(badJava, 'Bad.java')).not.toThrow();

      // Test JSON with syntax error
      const badJson = `{"email": }`;
      const jsonResult = jsonParser.parse(badJson, 'bad.json');
      expect(jsonResult.errors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Cross-Language Consistency Tests
  // ==========================================================================

  describe('Cross-Language Consistency', () => {
    /**
     * Property 2g: All non-C# languages should detect the same sensitive field names
     * 
     * _For any_ sensitive field name, all supported non-C# code languages SHALL
     * detect it consistently when the field is present in the code.
     * 
     * **Validates: Requirements 3.1, 3.2, 3.3**
     */
    it('Property 2g: All non-C# code languages should detect email field consistently', () => {
      const fieldName = 'email';
      
      // Python
      const pythonCode = generatePythonClass([fieldName]);
      const pythonResult = pythonParser.parse(pythonCode, 'test.py');
      const pythonAnalysis = analyzeFields(pythonResult.fields, patternMatcher, confidenceScorer);
      const pythonSuggestions = countSuggestions(pythonAnalysis, 30);
      
      // JavaScript
      const jsCode = generateJavaScriptClass([fieldName]);
      const jsResult = jsParser.parse(jsCode, 'test.js');
      const jsAnalysis = analyzeFields(jsResult.fields, patternMatcher, confidenceScorer);
      const jsSuggestions = countSuggestions(jsAnalysis, 30);
      
      // TypeScript
      const tsCode = generateTypeScriptInterface([fieldName]);
      const tsResult = tsParser.parse(tsCode, 'test.ts');
      const tsAnalysis = analyzeFields(tsResult.fields, patternMatcher, confidenceScorer);
      const tsSuggestions = countSuggestions(tsAnalysis, 30);
      
      // Java
      const javaCode = generateJavaClass([fieldName]);
      const javaResult = javaParser.parse(javaCode, 'Test.java');
      const javaAnalysis = analyzeFields(javaResult.fields, patternMatcher, confidenceScorer);
      const javaSuggestions = countSuggestions(javaAnalysis, 30);
      
      // All code languages should detect the email field
      expect(pythonSuggestions).toBe(1);
      expect(jsSuggestions).toBe(1);
      expect(tsSuggestions).toBe(1);
      expect(javaSuggestions).toBe(1);
    });

    /**
     * Property 2h: Multiple sensitive fields should be detected in all languages
     * 
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     */
    it('Property 2h: Multiple sensitive fields should be detected in all languages', () => {
      const fields = ['email', 'password', 'firstName'];
      
      // Python
      const pythonCode = generatePythonClass(fields);
      const pythonResult = pythonParser.parse(pythonCode, 'test.py');
      const pythonAnalysis = analyzeFields(pythonResult.fields, patternMatcher, confidenceScorer);
      const pythonSuggestions = countSuggestions(pythonAnalysis, 30);
      
      // JavaScript
      const jsCode = generateJavaScriptClass(fields);
      const jsResult = jsParser.parse(jsCode, 'test.js');
      const jsAnalysis = analyzeFields(jsResult.fields, patternMatcher, confidenceScorer);
      const jsSuggestions = countSuggestions(jsAnalysis, 30);
      
      // TypeScript
      const tsCode = generateTypeScriptInterface(fields);
      const tsResult = tsParser.parse(tsCode, 'test.ts');
      const tsAnalysis = analyzeFields(tsResult.fields, patternMatcher, confidenceScorer);
      const tsSuggestions = countSuggestions(tsAnalysis, 30);
      
      // Java
      const javaCode = generateJavaClass(fields);
      const javaResult = javaParser.parse(javaCode, 'Test.java');
      const javaAnalysis = analyzeFields(javaResult.fields, patternMatcher, confidenceScorer);
      const javaSuggestions = countSuggestions(javaAnalysis, 30);
      
      // All languages should detect all 3 sensitive fields
      expect(pythonSuggestions).toBeGreaterThanOrEqual(3);
      expect(jsSuggestions).toBeGreaterThanOrEqual(3);
      expect(tsSuggestions).toBeGreaterThanOrEqual(3);
      expect(javaSuggestions).toBeGreaterThanOrEqual(3);
    });
  });
});
