/**
 * Pattern Matcher for sensitive field detection.
 * 
 * This module provides utilities for normalizing identifiers and matching them
 * against sensitive field patterns. It handles various naming conventions:
 * camelCase, snake_case, kebab-case, and space-separated formats.
 */

import { SensitivePattern } from './types';

/**
 * Normalizes an identifier for pattern matching.
 * Converts camelCase, snake_case, kebab-case, PascalCase, and space-separated formats
 * to a consistent lowercase space-separated format.
 * 
 * Examples:
 * - "firstName" -> "first name"
 * - "first_name" -> "first name"
 * - "first-name" -> "first name"
 * - "first name" -> "first name"
 * - "FirstName" -> "first name"
 * - "FIRST_NAME" -> "first name"
 * - "SSN" -> "ssn"
 * - "userSSN" -> "user ssn"
 * - "XMLParser" -> "xml parser"
 * - "address2" -> "address 2"
 * - "user2FA" -> "user 2 fa"
 * - "123abc" -> "123 abc"
 * 
 * @param identifier - The identifier string to normalize
 * @returns The normalized identifier in lowercase space-separated format
 */
export function normalize(identifier: string): string {
  if (!identifier) {
    return '';
  }

  return identifier
    // Handle camelCase and PascalCase: insert space before uppercase letters
    // that follow lowercase letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Handle sequences of uppercase letters followed by lowercase
    // (e.g., "XMLParser" -> "XML Parser")
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Handle numbers followed by uppercase letters (e.g., "user2FA" -> "user2 FA")
    .replace(/([0-9])([A-Z])/g, '$1 $2')
    // Handle lowercase letters followed by numbers (e.g., "address2" -> "address 2")
    .replace(/([a-z])([0-9])/g, '$1 $2')
    // Handle numbers followed by lowercase letters (e.g., "123abc" -> "123 abc")
    .replace(/([0-9])([a-z])/g, '$1 $2')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Convert to lowercase
    .toLowerCase()
    // Normalize multiple spaces to single space
    .replace(/\s+/g, ' ')
    // Trim leading and trailing whitespace
    .trim();
}

/**
 * PatternMatcher provides methods for matching identifiers against
 * sensitive field patterns using normalized comparison.
 */
export class PatternMatcher {
  /**
   * Normalizes an identifier for comparison.
   * This is a convenience method that delegates to the standalone normalize function.
   * 
   * @param identifier - The identifier to normalize
   * @returns The normalized identifier
   */
  normalize(identifier: string): string {
    return normalize(identifier);
  }

  /**
   * Checks if an identifier matches any of the provided patterns.
   * Matching is performed using normalized comparison, supporting:
   * - Exact match: "firstName" matches "firstName" pattern
   * - Normalized match: "first_name" matches "firstName" pattern
   * - Partial match: "userFirstName" matches "firstName" pattern
   * 
   * @param identifier - The identifier to check
   * @param patterns - Array of SensitivePattern objects to match against
   * @returns The matching SensitivePattern or null if no match found
   */
  matches(identifier: string, patterns: SensitivePattern[]): SensitivePattern | null {
    if (!identifier || !patterns || patterns.length === 0) {
      return null;
    }

    const normalizedIdentifier = normalize(identifier);
    
    if (!normalizedIdentifier) {
      return null;
    }

    // First, try exact normalized match
    for (const pattern of patterns) {
      const normalizedPattern = normalize(pattern.pattern);
      if (normalizedIdentifier === normalizedPattern) {
        return pattern;
      }
    }

    // Then, try partial match (identifier contains pattern)
    for (const pattern of patterns) {
      const normalizedPattern = normalize(pattern.pattern);
      if (normalizedPattern && normalizedIdentifier.includes(normalizedPattern)) {
        return pattern;
      }
    }

    return null;
  }
}
