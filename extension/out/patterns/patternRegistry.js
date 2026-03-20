"use strict";
/**
 * Pattern Registry for managing sensitive field patterns.
 *
 * This module provides a centralized registry for sensitive field patterns,
 * supporting default patterns, custom patterns, exclusions, and category toggles.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternRegistry = void 0;
const types_1 = require("./types");
const defaultPatterns_1 = require("./defaultPatterns");
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
 */
class PatternRegistry {
    constructor(config = {}) {
        this.patterns = [];
        this.patternsByCategory = new Map();
        this.enabledCategories = new Map();
        this.normalizedPatternMap = new Map();
        this.initializeEnabledCategories(config.enabledCategories);
        this.buildPatterns(config.customPatterns, config.excludedPatterns);
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
     * Build the pattern collection by merging defaults with custom patterns
     * and filtering out excluded patterns.
     */
    buildPatterns(customPatterns, excludedPatterns) {
        const excludedSet = new Set((excludedPatterns || []).map(p => normalizeIdentifier(p)));
        // Initialize category maps
        for (const category of Object.values(types_1.PatternCategory)) {
            this.patternsByCategory.set(category, []);
        }
        // Process each category
        for (const category of Object.values(types_1.PatternCategory)) {
            const defaultPatternsForCategory = defaultPatterns_1.DEFAULT_PATTERNS[category] || [];
            const customPatternsForCategory = customPatterns?.[category] || [];
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
     * Get all enabled patterns across categories.
     */
    getPatterns() {
        return [...this.patterns];
    }
    /**
     * Get patterns for a specific category.
     * Returns empty array if category is disabled.
     */
    getPatternsByCategory(category) {
        if (!this.isCategoryEnabled(category)) {
            return [];
        }
        return [...(this.patternsByCategory.get(category) || [])];
    }
    /**
     * Check if a category is enabled.
     */
    isCategoryEnabled(category) {
        return this.enabledCategories.get(category) ?? true;
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