"use strict";
/**
 * Pattern Registry for managing sensitive field patterns.
 *
 * This module provides a centralized registry for sensitive field patterns,
 * supporting default patterns, custom patterns, exclusions, and category toggles.
 *
 * Key behaviors:
 * - Custom patterns are ADDITIVE (merged with defaults)
 * - Excluded patterns are removed from effective patterns
 * - Patterns are deduplicated after merging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternRegistry = void 0;
const vscode = require("vscode");
const types_1 = require("./types");
const defaultPatterns_1 = require("./defaultPatterns");
const configurationValidator_1 = require("../config/configurationValidator");
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
 * PatternRegistry manages the collection of sensitive field patterns.
 * It supports merging default patterns with custom patterns and filtering by exclusions.
 *
 * Implements the PatternRegistry interface from the design document:
 * - getPatternsForCategory(category): Get merged patterns for a category
 * - getAllEffectivePatterns(): Get all patterns across enabled categories
 * - isExcluded(pattern): Check if a pattern is excluded
 * - refresh(): Reload patterns from configuration
 */
class PatternRegistry {
    constructor(config) {
        this.configSection = 'piiJsonChecker';
        this.patterns = [];
        this.patternsByCategory = new Map();
        this.enabledCategories = new Map();
        this.excludedPatternsSet = new Set();
        this.normalizedPatternMap = new Map();
        this.validator = new configurationValidator_1.ConfigurationValidator();
        if (config) {
            // Use provided config (for testing or manual configuration)
            this.initializeFromConfig(config);
        }
        else {
            // Load from VS Code settings
            this.refresh();
        }
    }
    /**
     * Initialize the registry from a provided configuration object.
     */
    initializeFromConfig(config) {
        this.initializeEnabledCategories(config.enabledCategories);
        this.initializeExcludedPatterns(config.excludedPatterns);
        this.buildPatterns(config.customPatterns, config.excludedPatterns);
    }
    /**
     * Get the VS Code workspace configuration for the extension.
     */
    getConfig() {
        return vscode.workspace.getConfiguration(this.configSection);
    }
    /**
     * Initialize enabled categories with defaults (all enabled).
     */
    initializeEnabledCategories(enabledCategories) {
        // Default all categories to enabled
        for (const category of Object.values(types_1.PatternCategory)) {
            this.enabledCategories.set(category, true);
        }
        // Apply user overrides
        if (enabledCategories) {
            for (const [category, enabled] of Object.entries(enabledCategories)) {
                if (Object.values(types_1.PatternCategory).includes(category)) {
                    this.enabledCategories.set(category, enabled ?? true);
                }
            }
        }
    }
    /**
     * Initialize the excluded patterns set.
     */
    initializeExcludedPatterns(excludedPatterns) {
        this.excludedPatternsSet = new Set((excludedPatterns || []).map(p => normalizeIdentifier(p)));
    }
    /**
     * Build the pattern collection by merging defaults with custom patterns
     * and filtering out excluded patterns.
     */
    buildPatterns(customPatterns, excludedPatterns) {
        // Initialize excluded set
        this.initializeExcludedPatterns(excludedPatterns);
        // Clear existing data
        this.normalizedPatternMap.clear();
        // Initialize category maps
        for (const category of Object.values(types_1.PatternCategory)) {
            this.patternsByCategory.set(category, []);
        }
        // Process each category
        for (const category of Object.values(types_1.PatternCategory)) {
            const defaultPatternsForCategory = defaultPatterns_1.DEFAULT_PATTERNS[category] || [];
            const customPatternsForCategory = customPatterns?.[category] || [];
            // Normalize and validate custom patterns
            const validCustomPatterns = this.validator.normalizePatterns(customPatternsForCategory);
            // Merge default and custom patterns using a Map to deduplicate by normalized form
            const seenNormalized = new Set();
            const mergedPatterns = [];
            // Add defaults first
            for (const pattern of defaultPatternsForCategory) {
                const normalized = normalizeIdentifier(pattern);
                if (!seenNormalized.has(normalized)) {
                    seenNormalized.add(normalized);
                    mergedPatterns.push(pattern);
                }
            }
            // Add custom patterns (deduplicated)
            for (const pattern of validCustomPatterns) {
                const normalized = normalizeIdentifier(pattern);
                if (!seenNormalized.has(normalized)) {
                    seenNormalized.add(normalized);
                    mergedPatterns.push(pattern);
                }
            }
            // Create SensitivePattern objects, filtering out excluded patterns
            for (const pattern of mergedPatterns) {
                const normalizedPattern = normalizeIdentifier(pattern);
                // Skip if pattern is excluded
                if (this.excludedPatternsSet.has(normalizedPattern)) {
                    continue;
                }
                const sensitivePattern = {
                    pattern,
                    category,
                    compliance: types_1.CATEGORY_COMPLIANCE[category]
                };
                // Add to category-specific collection
                this.patternsByCategory.get(category).push(sensitivePattern);
                // Add to normalized map for fast lookup
                this.normalizedPatternMap.set(normalizedPattern, sensitivePattern);
            }
        }
        // Build the full patterns array from enabled categories
        this.rebuildPatternsArray();
    }
    /**
     * Rebuild the patterns array based on enabled categories.
     */
    rebuildPatternsArray() {
        this.patterns = [];
        for (const category of Object.values(types_1.PatternCategory)) {
            if (this.enabledCategories.get(category)) {
                const categoryPatterns = this.patternsByCategory.get(category) || [];
                this.patterns.push(...categoryPatterns);
            }
        }
    }
    /**
     * Get merged patterns for a category (defaults + custom - excluded).
     * Returns empty array if category is disabled.
     *
     * @param category - The pattern category to get patterns for
     * @returns Array of SensitivePattern objects for the category
     */
    getPatternsForCategory(category) {
        if (!this.isCategoryEnabled(category)) {
            return [];
        }
        return [...(this.patternsByCategory.get(category) || [])];
    }
    /**
     * Get all effective patterns across enabled categories.
     * This returns the merged patterns (defaults + custom - excluded) for all enabled categories.
     *
     * @returns Array of all effective SensitivePattern objects
     */
    getAllEffectivePatterns() {
        return [...this.patterns];
    }
    /**
     * Check if a pattern is excluded.
     * Comparison is done using normalized form (case-insensitive, naming convention agnostic).
     *
     * @param pattern - The pattern string to check
     * @returns true if the pattern is in the exclusion list
     */
    isExcluded(pattern) {
        const normalized = normalizeIdentifier(pattern);
        return this.excludedPatternsSet.has(normalized);
    }
    /**
     * Reload patterns from VS Code configuration.
     * This method reads the current settings and rebuilds the pattern collections.
     * Should be called when configuration changes.
     */
    refresh() {
        const config = this.getConfig();
        // Read enabled categories
        const enabledCategories = {};
        for (const category of Object.values(types_1.PatternCategory)) {
            enabledCategories[category] = config.get(`categories.${category}`, true);
        }
        this.initializeEnabledCategories(enabledCategories);
        // Read custom patterns for each category
        const customPatterns = {};
        for (const category of Object.values(types_1.PatternCategory)) {
            const patterns = config.get(`customPatterns.${category}`, []);
            if (patterns.length > 0) {
                customPatterns[category] = patterns;
            }
        }
        // Read excluded patterns
        const excludedPatterns = config.get('excludedPatterns', []);
        // Rebuild patterns with new configuration
        this.buildPatterns(customPatterns, excludedPatterns);
    }
    /**
     * Check if a category is enabled.
     */
    isCategoryEnabled(category) {
        return this.enabledCategories.get(category) ?? true;
    }
    /**
     * Get all enabled patterns across categories.
     * @deprecated Use getAllEffectivePatterns() instead
     */
    getPatterns() {
        return this.getAllEffectivePatterns();
    }
    /**
     * Get patterns for a specific category.
     * @deprecated Use getPatternsForCategory() instead
     */
    getPatternsByCategory(category) {
        return this.getPatternsForCategory(category);
    }
    /**
     * Match an identifier against all enabled patterns.
     * Returns the matching SensitivePattern or null if no match.
     */
    matchPattern(identifier) {
        const normalizedIdentifier = normalizeIdentifier(identifier);
        // First try exact normalized match
        const exactMatch = this.normalizedPatternMap.get(normalizedIdentifier);
        if (exactMatch && this.isCategoryEnabled(exactMatch.category)) {
            return exactMatch;
        }
        // Then try partial match (identifier contains pattern)
        for (const pattern of this.patterns) {
            const normalizedPattern = normalizeIdentifier(pattern.pattern);
            if (normalizedIdentifier.includes(normalizedPattern)) {
                return pattern;
            }
        }
        return null;
    }
}
exports.PatternRegistry = PatternRegistry;
//# sourceMappingURL=patternRegistry.js.map