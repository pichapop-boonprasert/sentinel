"use strict";
/**
 * Configuration Validator for PII JSON Checker extension.
 *
 * This module handles validation of user configuration values,
 * providing fallback behavior and warnings for invalid entries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationValidator = void 0;
/** Valid severity values for diagnostics */
const VALID_SEVERITIES = ['Error', 'Warning', 'Information', 'Hint'];
/**
 * ConfigurationValidator validates user configuration and provides helpful feedback.
 * It ensures invalid values fall back to sensible defaults while notifying users.
 */
class ConfigurationValidator {
    /**
     * Validates that a value is a valid pattern array (array of non-empty strings).
     * Invalid items are skipped, and valid items are kept.
     *
     * @param patterns - The value to validate
     * @param settingName - The name of the setting (for error messages)
     * @returns ValidationResult with isValid flag and any warnings
     */
    validatePatternArray(patterns, settingName) {
        const warnings = [];
        // Check if value is an array
        if (!Array.isArray(patterns)) {
            warnings.push({
                setting: settingName,
                message: `Expected an array but received ${typeof patterns}. Using empty array.`,
                invalidValue: patterns,
                fallbackValue: []
            });
            return { isValid: false, warnings };
        }
        // Check each item in the array
        for (let i = 0; i < patterns.length; i++) {
            const item = patterns[i];
            if (typeof item !== 'string') {
                warnings.push({
                    setting: `${settingName}[${i}]`,
                    message: `Expected a string but received ${typeof item}. Skipping invalid item.`,
                    invalidValue: item,
                    fallbackValue: undefined
                });
            }
            else if (item.trim() === '') {
                // Empty or whitespace-only strings are silently skipped (common user mistake)
                // No warning needed as per design doc
            }
        }
        return {
            isValid: warnings.length === 0,
            warnings
        };
    }
    /**
     * Validates that a value is a valid logging methods array.
     * Same validation as pattern arrays - must be array of non-empty strings.
     *
     * @param methods - The value to validate
     * @returns ValidationResult with isValid flag and any warnings
     */
    validateLoggingMethods(methods) {
        return this.validatePatternArray(methods, 'loggingFunctions');
    }
    /**
     * Validates that a severity value is one of the allowed values.
     * Falls back to "Warning" for invalid values.
     *
     * @param severity - The value to validate
     * @returns ValidationResult with isValid flag and any warnings
     */
    validateSeverity(severity) {
        const warnings = [];
        if (typeof severity !== 'string') {
            warnings.push({
                setting: 'severity',
                message: `Expected a string but received ${typeof severity}. Using "Warning" as default.`,
                invalidValue: severity,
                fallbackValue: 'Warning'
            });
            return { isValid: false, warnings };
        }
        if (!VALID_SEVERITIES.includes(severity)) {
            warnings.push({
                setting: 'severity',
                message: `Invalid severity "${severity}". Valid values are: ${VALID_SEVERITIES.join(', ')}. Using "Warning" as default.`,
                invalidValue: severity,
                fallbackValue: 'Warning'
            });
            return { isValid: false, warnings };
        }
        return { isValid: true, warnings: [] };
    }
    /**
     * Validates the entire configuration object.
     * Combines validation results from all settings.
     *
     * @returns ValidationResult with combined isValid flag and all warnings
     */
    validateAll() {
        // This method will be implemented when integrated with ConfigurationManager
        // For now, return a valid result
        return { isValid: true, warnings: [] };
    }
    /**
     * Normalizes an array of patterns by trimming whitespace and filtering empty strings.
     *
     * @param patterns - Array of pattern strings to normalize
     * @returns Normalized array with trimmed, non-empty strings
     */
    normalizePatterns(patterns) {
        return patterns
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }
    /**
     * Removes duplicate patterns from an array (case-insensitive comparison).
     * Preserves the first occurrence of each pattern.
     *
     * @param patterns - Array of pattern strings to deduplicate
     * @returns Array with duplicates removed
     */
    deduplicatePatterns(patterns) {
        const seen = new Set();
        const result = [];
        for (const pattern of patterns) {
            const normalized = this.normalizeForComparison(pattern);
            if (!seen.has(normalized)) {
                seen.add(normalized);
                result.push(pattern);
            }
        }
        return result;
    }
    /**
     * Normalizes a pattern for comparison purposes.
     * Converts to lowercase and normalizes naming conventions.
     *
     * @param pattern - The pattern to normalize
     * @returns Normalized pattern string for comparison
     */
    normalizeForComparison(pattern) {
        return pattern
            .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to space
            .replace(/[_-]/g, ' ') // snake_case and kebab-case to space
            .toLowerCase()
            .replace(/\s+/g, ' ') // normalize multiple spaces
            .trim();
    }
}
exports.ConfigurationValidator = ConfigurationValidator;
//# sourceMappingURL=configurationValidator.js.map