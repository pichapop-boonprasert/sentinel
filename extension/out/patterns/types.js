"use strict";
/**
 * Pattern types and data models for sensitive field detection.
 *
 * This module defines the core types used for categorizing and detecting
 * sensitive data fields across PII, Financial, Health, and Credentials categories.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAGNOSTIC_CODES = exports.CATEGORY_COMPLIANCE = exports.PatternCategory = void 0;
/**
 * Categories of sensitive data patterns.
 * Each category maps to specific compliance regulations.
 */
var PatternCategory;
(function (PatternCategory) {
    PatternCategory["PII"] = "pii";
    PatternCategory["Financial"] = "financial";
    PatternCategory["Health"] = "health";
    PatternCategory["Credentials"] = "credentials";
})(PatternCategory || (exports.PatternCategory = PatternCategory = {}));
/**
 * Maps each pattern category to its relevant compliance regulations.
 * Used to populate the compliance field when creating SensitivePattern instances.
 */
exports.CATEGORY_COMPLIANCE = {
    [PatternCategory.PII]: ["GDPR", "CCPA", "PDPA"],
    [PatternCategory.Financial]: ["PCI-DSS", "GDPR"],
    [PatternCategory.Health]: ["HIPAA", "GDPR"],
    [PatternCategory.Credentials]: ["SOC2", "ISO27001"]
};
/**
 * Maps each pattern category to its diagnostic code.
 * Used for generating category-specific VS Code diagnostics.
 */
exports.DIAGNOSTIC_CODES = {
    [PatternCategory.PII]: "pii-field-personal",
    [PatternCategory.Financial]: "pii-field-financial",
    [PatternCategory.Health]: "pii-field-health",
    [PatternCategory.Credentials]: "pii-field-credentials"
};
//# sourceMappingURL=types.js.map