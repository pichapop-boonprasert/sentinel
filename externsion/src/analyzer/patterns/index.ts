/**
 * Built-in sensitive data patterns for the Analyzer component
 * 
 * This module exports pattern definitions for detecting:
 * - PII (Personally Identifiable Information) - Requirement 2.1
 * - Credentials (passwords, API keys, tokens) - Requirement 2.2
 * - Financial data (credit cards, bank accounts) - Requirement 2.3
 * - Health information (medical records, diagnoses) - Requirement 2.4
 */

import { MaskingPattern, MaskingPatternType } from '../../types';

// Export individual pattern modules
export * from './types';
export * from './pii-patterns';
export * from './credentials-patterns';
export * from './financial-patterns';
export * from './health-patterns';

// Import pattern collections
import { piiPatterns } from './pii-patterns';
import { credentialsPatterns } from './credentials-patterns';
import { financialPatterns } from './financial-patterns';
import { healthPatterns } from './health-patterns';

/**
 * All built-in patterns combined
 */
export const builtInPatterns: MaskingPattern[] = [
  ...piiPatterns,
  ...credentialsPatterns,
  ...financialPatterns,
  ...healthPatterns,
];

/**
 * Get patterns by type
 * @param type - The masking pattern type to filter by
 * @returns Array of patterns matching the specified type
 */
export function getPatternsByType(type: MaskingPatternType): MaskingPattern[] {
  switch (type) {
    case 'pii':
      return piiPatterns;
    case 'credentials':
      return credentialsPatterns;
    case 'financial':
      return financialPatterns;
    case 'health':
      return healthPatterns;
    case 'custom':
      return []; // Custom patterns are managed separately
    default:
      return [];
  }
}

/**
 * Get a pattern by its ID
 * @param id - The pattern ID to find
 * @returns The matching pattern or undefined
 */
export function getPatternById(id: string): MaskingPattern | undefined {
  return builtInPatterns.find(pattern => pattern.id === id);
}

/**
 * Get all pattern IDs grouped by type
 * @returns Object mapping pattern types to arrays of pattern IDs
 */
export function getPatternIdsByType(): Record<MaskingPatternType, string[]> {
  return {
    pii: piiPatterns.map(p => p.id),
    credentials: credentialsPatterns.map(p => p.id),
    financial: financialPatterns.map(p => p.id),
    health: healthPatterns.map(p => p.id),
    custom: [],
  };
}
