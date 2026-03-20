"use strict";
/**
 * Configuration Manager for PII JSON Checker extension.
 *
 * This module handles reading VS Code workspace configuration and
 * providing effective patterns, enabled categories, and other settings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationManager = void 0;
const vscode = require("vscode");
const types_1 = require("../patterns/types");
const defaultPatterns_1 = require("../patterns/defaultPatterns");
const loggingMethodRegistry_1 = require("./loggingMethodRegistry");
const configurationValidator_1 = require("./configurationValidator");
/**
 * Normalizes an identifier for pattern matching.
 * Converts camelCase, snake_case, kebab-case, and space-separated to lowercase.
 */
function normalizeIdentifier(identifier) {
    return identifier
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to space
        .replace(/[_-]/g, ' ') // snake_case and kebab-case to space
        .toLowerCase()
        .replace(/\s+/g, ' ') // normalize multiple spaces
        .trim();
}
/**
 * ConfigurationManager handles VS Code settings for pattern customization.
 * It reads workspace configuration and provides merged patterns based on
 * defaults, custom additions, and exclusions.
 */
class ConfigurationManager {
    constructor() {
        this.configSection = 'piiJsonChecker';
        this.loggingMethodRegistry = new loggingMethodRegistry_1.LoggingMethodRegistry();
        this.configurationValidator = new configurationValidator_1.ConfigurationValidator();
    }
    /**
     * Get the VS Code workspace configuration for the extension.
     */
    getConfig() {
        return vscode.workspace.getConfiguration(this.configSection);
    }
    /**
     * Get the final list of logging methods to detect based on user config or defaults.
     *
     * This method integrates with LoggingMethodRegistry to support:
     * - Replace mode: User-configured methods replace defaults (not additive)
     * - Default fallback: Returns language-appropriate defaults when no user config exists
     *
     * @param languageId - The VS Code language ID (e.g., 'csharp', 'typescript')
     * @returns Array of logging method names to detect
     *
     * Requirements: 4.1, 4.3, 8.1
     */
    getEffectiveLoggingMethods(languageId) {
        return this.loggingMethodRegistry.getEffectiveMethods(languageId);
    }
    /**
     * Get merged patterns (defaults + user additions - exclusions).
     * Only includes patterns from enabled categories.
     */
    getEffectivePatterns() {
        const config = this.getConfig();
        const enabledCategories = this.getEnabledCategories();
        const excludedPatterns = config.get('excludedPatterns', []);
        const excludedSet = new Set(excludedPatterns.map(p => normalizeIdentifier(p)));
        const effectivePatterns = [];
        for (const category of enabledCategories) {
            // Get default patterns for this category
            const defaultPatternsForCategory = defaultPatterns_1.DEFAULT_PATTERNS[category] || [];
            // Get custom patterns for this category
            const customPatternsForCategory = config.get(`customPatterns.${category}`, []);
            // Merge default and custom patterns, removing duplicates
            const allPatterns = new Set([
                ...defaultPatternsForCategory,
                ...customPatternsForCategory
            ]);
            // Create SensitivePattern objects, filtering out excluded patterns
            for (const pattern of allPatterns) {
                const normalizedPattern = normalizeIdentifier(pattern);
                // Skip if pattern is excluded
                if (excludedSet.has(normalizedPattern)) {
                    continue;
                }
                // Skip empty or invalid patterns
                if (!pattern || pattern.trim() === '') {
                    continue;
                }
                effectivePatterns.push({
                    pattern,
                    category,
                    compliance: types_1.CATEGORY_COMPLIANCE[category]
                });
            }
        }
        return effectivePatterns;
    }
    /**
     * Get enabled categories based on VS Code settings.
     * Returns array of PatternCategory values that are enabled.
     */
    getEnabledCategories() {
        const config = this.getConfig();
        const enabledCategories = [];
        for (const category of Object.values(types_1.PatternCategory)) {
            const isEnabled = config.get(`categories.${category}`, true);
            if (isEnabled) {
                enabledCategories.push(category);
            }
        }
        return enabledCategories;
    }
    /**
     * Get diagnostic severity from VS Code settings.
     * Maps string value to vscode.DiagnosticSeverity enum.
     */
    getSeverity() {
        const config = this.getConfig();
        const severityString = config.get('severity', 'Warning');
        switch (severityString) {
            case 'Error':
                return vscode.DiagnosticSeverity.Error;
            case 'Warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'Information':
                return vscode.DiagnosticSeverity.Information;
            case 'Hint':
                return vscode.DiagnosticSeverity.Hint;
            default:
                // Fall back to Warning for invalid values
                return vscode.DiagnosticSeverity.Warning;
        }
    }
    /**
     * Get extra logging functions to detect from VS Code settings.
     * These are in addition to the built-in logging functions.
     */
    getExtraLoggingFunctions() {
        const config = this.getConfig();
        return config.get('loggingFunctions', []);
    }
    /**
     * Get extra masking patterns from VS Code settings.
     * These are in addition to the built-in masking patterns.
     */
    getExtraMaskingPatterns() {
        const config = this.getConfig();
        return config.get('maskingPatterns', []);
    }
    /**
     * Check if logging detection is enabled.
     */
    isLoggingDetectionEnabled() {
        const config = this.getConfig();
        return config.get('enableLoggingDetection', true);
    }
    /**
     * Get patterns to exclude from detection.
     * Returns the array of patterns that should be excluded from sensitive field detection.
     * Returns an empty array if no exclusions are configured.
     *
     * Requirements: 5.3, 8.3
     */
    getExcludedPatterns() {
        const config = this.getConfig();
        return config.get('excludedPatterns', []);
    }
    /**
     * Validates the current configuration and returns a ValidationResult.
     *
     * This method validates all configuration settings including:
     * - Custom pattern arrays for each category (pii, financial, health, credentials)
     * - Excluded patterns array
     * - Logging functions array
     * - Severity setting
     *
     * Invalid values are reported as warnings, and the extension will fall back
     * to default values for any invalid configuration.
     *
     * Requirements: 7.2, 7.3, 7.4, 7.5, 7.6
     *
     * @returns ValidationResult with isValid flag and warnings array
     */
    validateConfiguration() {
        const config = this.getConfig();
        const allWarnings = [];
        // Validate custom patterns for each category
        const categories = ['pii', 'financial', 'health', 'credentials'];
        for (const category of categories) {
            const patterns = config.get(`customPatterns.${category}`);
            if (patterns !== undefined) {
                const result = this.configurationValidator.validatePatternArray(patterns, `customPatterns.${category}`);
                allWarnings.push(...result.warnings);
            }
        }
        // Validate excluded patterns
        const excludedPatterns = config.get('excludedPatterns');
        if (excludedPatterns !== undefined) {
            const result = this.configurationValidator.validatePatternArray(excludedPatterns, 'excludedPatterns');
            allWarnings.push(...result.warnings);
        }
        // Validate logging functions
        const loggingFunctions = config.get('loggingFunctions');
        if (loggingFunctions !== undefined) {
            const result = this.configurationValidator.validateLoggingMethods(loggingFunctions);
            allWarnings.push(...result.warnings);
        }
        // Validate severity
        const severity = config.get('severity');
        if (severity !== undefined) {
            const result = this.configurationValidator.validateSeverity(severity);
            allWarnings.push(...result.warnings);
        }
        return {
            isValid: allWarnings.length === 0,
            warnings: allWarnings
        };
    }
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=configurationManager.js.map