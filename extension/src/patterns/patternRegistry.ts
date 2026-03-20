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

import * as vscode from 'vscode';
import { PatternCategory, SensitivePattern, CATEGORY_COMPLIANCE } from './types';
import { DEFAULT_PATTERNS } from './defaultPatterns';
import { ConfigurationValidator } from '../config/configurationValidator';

/**
 * Configuration options for the PatternRegistry.
 */
export interface PatternRegistryConfig {
  /** Custom patterns to add by category */
  customPatterns?: Partial<Record<PatternCategory, string[]>>;
  /** Patterns to exclude from detection */
  excludedPatterns?: string[];
  /** Categories to enable (all enabled by default) */
  enabledCategories?: Partial<Record<PatternCategory, boolean>>;
}

/**
 * Normalizes an identifier for pattern matching.
 * Converts camelCase, snake_case, kebab-case, and space-separated to lowercase.
 */
function normalizeIdentifier(identifier: string): string {
  return identifier
    .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase to space
    .replace(/[_-]/g, ' ')                 // snake_case and kebab-case to space
    .toLowerCase()
    .replace(/\s+/g, ' ')                  // normalize multiple spaces
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
export class PatternRegistry {
  private readonly configSection = 'piiJsonChecker';
  private readonly validator: ConfigurationValidator;
  
  private patterns: SensitivePattern[] = [];
  private patternsByCategory: Map<PatternCategory, SensitivePattern[]> = new Map();
  private enabledCategories: Map<PatternCategory, boolean> = new Map();
  private excludedPatternsSet: Set<string> = new Set();
  private normalizedPatternMap: Map<string, SensitivePattern> = new Map();

  constructor(config?: PatternRegistryConfig) {
    this.validator = new ConfigurationValidator();
    
    if (config) {
      // Use provided config (for testing or manual configuration)
      this.initializeFromConfig(config);
    } else {
      // Load from VS Code settings
      this.refresh();
    }
  }

  /**
   * Initialize the registry from a provided configuration object.
   */
  private initializeFromConfig(config: PatternRegistryConfig): void {
    this.initializeEnabledCategories(config.enabledCategories);
    this.initializeExcludedPatterns(config.excludedPatterns);
    this.buildPatterns(config.customPatterns, config.excludedPatterns);
  }

  /**
   * Get the VS Code workspace configuration for the extension.
   */
  private getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this.configSection);
  }

  /**
   * Initialize enabled categories with defaults (all enabled).
   */
  private initializeEnabledCategories(
    enabledCategories?: Partial<Record<PatternCategory, boolean>>
  ): void {
    // Default all categories to enabled
    for (const category of Object.values(PatternCategory)) {
      this.enabledCategories.set(category, true);
    }

    // Apply user overrides
    if (enabledCategories) {
      for (const [category, enabled] of Object.entries(enabledCategories)) {
        if (Object.values(PatternCategory).includes(category as PatternCategory)) {
          this.enabledCategories.set(category as PatternCategory, enabled ?? true);
        }
      }
    }
  }

  /**
   * Initialize the excluded patterns set.
   */
  private initializeExcludedPatterns(excludedPatterns?: string[]): void {
    this.excludedPatternsSet = new Set(
      (excludedPatterns || []).map(p => normalizeIdentifier(p))
    );
  }

  /**
   * Build the pattern collection by merging defaults with custom patterns
   * and filtering out excluded patterns.
   */
  private buildPatterns(
    customPatterns?: Partial<Record<PatternCategory, string[]>>,
    excludedPatterns?: string[]
  ): void {
    // Initialize excluded set
    this.initializeExcludedPatterns(excludedPatterns);

    // Clear existing data
    this.normalizedPatternMap.clear();
    
    // Initialize category maps
    for (const category of Object.values(PatternCategory)) {
      this.patternsByCategory.set(category, []);
    }

    // Process each category
    for (const category of Object.values(PatternCategory)) {
      const defaultPatternsForCategory = DEFAULT_PATTERNS[category] || [];
      const customPatternsForCategory = customPatterns?.[category] || [];

      // Normalize and validate custom patterns
      const validCustomPatterns = this.validator.normalizePatterns(customPatternsForCategory);

      // Merge default and custom patterns using a Map to deduplicate by normalized form
      const seenNormalized = new Set<string>();
      const mergedPatterns: string[] = [];

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

        const sensitivePattern: SensitivePattern = {
          pattern,
          category,
          compliance: CATEGORY_COMPLIANCE[category]
        };

        // Add to category-specific collection
        this.patternsByCategory.get(category)!.push(sensitivePattern);

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
  private rebuildPatternsArray(): void {
    this.patterns = [];
    for (const category of Object.values(PatternCategory)) {
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
  getPatternsForCategory(category: PatternCategory): SensitivePattern[] {
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
  getAllEffectivePatterns(): SensitivePattern[] {
    return [...this.patterns];
  }

  /**
   * Check if a pattern is excluded.
   * Comparison is done using normalized form (case-insensitive, naming convention agnostic).
   * 
   * @param pattern - The pattern string to check
   * @returns true if the pattern is in the exclusion list
   */
  isExcluded(pattern: string): boolean {
    const normalized = normalizeIdentifier(pattern);
    return this.excludedPatternsSet.has(normalized);
  }

  /**
   * Reload patterns from VS Code configuration.
   * This method reads the current settings and rebuilds the pattern collections.
   * Should be called when configuration changes.
   */
  refresh(): void {
    const config = this.getConfig();

    // Read enabled categories
    const enabledCategories: Partial<Record<PatternCategory, boolean>> = {};
    for (const category of Object.values(PatternCategory)) {
      enabledCategories[category] = config.get<boolean>(`categories.${category}`, true);
    }
    this.initializeEnabledCategories(enabledCategories);

    // Read custom patterns for each category
    const customPatterns: Partial<Record<PatternCategory, string[]>> = {};
    for (const category of Object.values(PatternCategory)) {
      const patterns = config.get<string[]>(`customPatterns.${category}`, []);
      if (patterns.length > 0) {
        customPatterns[category] = patterns;
      }
    }

    // Read excluded patterns
    const excludedPatterns = config.get<string[]>('excludedPatterns', []);

    // Rebuild patterns with new configuration
    this.buildPatterns(customPatterns, excludedPatterns);
  }

  /**
   * Check if a category is enabled.
   */
  isCategoryEnabled(category: PatternCategory): boolean {
    return this.enabledCategories.get(category) ?? true;
  }

  /**
   * Get all enabled patterns across categories.
   * @deprecated Use getAllEffectivePatterns() instead
   */
  getPatterns(): SensitivePattern[] {
    return this.getAllEffectivePatterns();
  }

  /**
   * Get patterns for a specific category.
   * @deprecated Use getPatternsForCategory() instead
   */
  getPatternsByCategory(category: PatternCategory): SensitivePattern[] {
    return this.getPatternsForCategory(category);
  }

  /**
   * Match an identifier against all enabled patterns.
   * Returns the matching SensitivePattern or null if no match.
   */
  matchPattern(identifier: string): SensitivePattern | null {
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
