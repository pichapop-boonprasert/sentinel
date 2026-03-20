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
    }
    /**
     * Get the VS Code workspace configuration for the extension.
     */
    getConfig() {
        return vscode.workspace.getConfiguration(this.configSection);
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
}
exports.ConfigurationManager = ConfigurationManager;
//# sourceMappingURL=configurationManager.js.map