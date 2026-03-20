/**
 * Pattern types and data models for sensitive field detection.
 * 
 * This module defines the core types used for categorizing and detecting
 * sensitive data fields across PII, Financial, Health, and Credentials categories.
 */

/**
 * Categories of sensitive data patterns.
 * Each category maps to specific compliance regulations.
 */
export enum PatternCategory {
  PII = "pii",
  Financial = "financial",
  Health = "health",
  Credentials = "credentials"
}

/**
 * Represents a sensitive field pattern with its category and compliance information.
 */
export interface SensitivePattern {
  /** The pattern to match (e.g., "firstName") */
  pattern: string;
  /** The category this pattern belongs to (PII, Financial, Health, Credentials) */
  category: PatternCategory;
  /** Relevant compliance regulations (e.g., GDPR, PCI-DSS, HIPAA) */
  compliance: string[];
}

/**
 * Maps each pattern category to its relevant compliance regulations.
 * Used to populate the compliance field when creating SensitivePattern instances.
 */
export const CATEGORY_COMPLIANCE: Record<PatternCategory, string[]> = {
  [PatternCategory.PII]: ["GDPR", "CCPA", "PDPA"],
  [PatternCategory.Financial]: ["PCI-DSS", "GDPR"],
  [PatternCategory.Health]: ["HIPAA", "GDPR"],
  [PatternCategory.Credentials]: ["SOC2", "ISO27001"]
};

/**
 * Maps each pattern category to its diagnostic code.
 * Used for generating category-specific VS Code diagnostics.
 */
export const DIAGNOSTIC_CODES: Record<PatternCategory, string> = {
  [PatternCategory.PII]: "pii-field-personal",
  [PatternCategory.Financial]: "pii-field-financial",
  [PatternCategory.Health]: "pii-field-health",
  [PatternCategory.Credentials]: "pii-field-credentials"
};
