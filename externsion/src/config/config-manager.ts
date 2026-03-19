/**
 * Configuration Manager for masking configuration persistence
 * 
 * Handles loading, saving, import/export of masking configurations,
 * decision history tracking, and configuration inheritance.
 * 
 * Validates: Requirements 5.1, 5.2, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import {
  MaskingConfiguration,
  MaskedFieldEntry,
  RejectedFieldEntry,
  MaskingPattern,
  PluginSettings,
  DecisionRecord,
  HistoryFilter,
  UserDecision,
  ExportFormat,
  IConfigurationManager,
  Suggestion,
  KeyboardShortcuts,
} from '../types';

/**
 * File system interface for abstraction (allows mocking in tests)
 */
export interface FileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  rename(path: string, newPath: string): Promise<void>;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  scanOnSave: true,
  scanOnOpen: true,
  maxCpuPercent: 25,
  scanFrequencyMs: 1000,
  cacheEnabled: true,
  cacheTtlMs: 300000, // 5 minutes
  onDemandThreshold: 1000,
  keyboardShortcuts: {
    acceptSuggestion: 'Ctrl+Shift+A',
    rejectSuggestion: 'Ctrl+Shift+R',
    deferSuggestion: 'Ctrl+Shift+D',
    openPanel: 'Ctrl+Shift+M',
  },
};

/**
 * Default empty configuration
 */
export function createDefaultConfiguration(): MaskingConfiguration {
  return {
    version: '1.0.0',
    maskedFields: [],
    rejectedFields: [],
    customPatterns: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * ConfigurationManager class for handling masking configuration persistence
 */
export class ConfigurationManager implements IConfigurationManager {
  private config: MaskingConfiguration;
  private decisionHistory: DecisionRecord[] = [];
  private configPath: string;
  private userConfigPath: string | null;
  private fs: FileSystem;
  private userId: string;

  /**
   * Creates a new ConfigurationManager
   * @param fs - File system interface
   * @param configPath - Path to workspace configuration file
   * @param userConfigPath - Optional path to user-level configuration file
   * @param userId - Current user identifier
   */
  constructor(
    fs: FileSystem,
    configPath: string = '.kiro/masking-config.json',
    userConfigPath: string | null = null,
    userId: string = 'anonymous'
  ) {
    this.fs = fs;
    this.configPath = configPath;
    this.userConfigPath = userConfigPath;
    this.userId = userId;
    this.config = createDefaultConfiguration();
  }

  /**
   * Loads configuration from disk
   * Implements configuration inheritance: user-level settings override workspace-level
   * 
   * Validates: Requirements 6.3, 6.6
   */
  async load(): Promise<MaskingConfiguration> {
    // Start with default configuration
    let config = createDefaultConfiguration();

    // Load user-level configuration first (if exists)
    if (this.userConfigPath) {
      try {
        const userConfig = await this.loadConfigFile(this.userConfigPath);
        if (userConfig) {
          config = this.mergeConfigurations(config, userConfig);
        }
      } catch (error) {
        // User config is optional, continue with defaults
        console.warn('Failed to load user configuration:', error);
      }
    }

    // Load workspace-level configuration (overrides user-level)
    try {
      const workspaceConfig = await this.loadConfigFile(this.configPath);
      if (workspaceConfig) {
        config = this.mergeConfigurations(config, workspaceConfig);
      }
    } catch (error) {
      // If workspace config doesn't exist, use merged defaults
      console.warn('Failed to load workspace configuration:', error);
    }

    this.config = config;
    return this.config;
  }

  /**
   * Loads a configuration file with corruption recovery
   * 
   * Validates: Requirements 6.5
   */
  private async loadConfigFile(path: string): Promise<MaskingConfiguration | null> {
    try {
      const exists = await this.fs.exists(path);
      if (!exists) {
        return null;
      }

      const content = await this.fs.readFile(path);
      const parsed = JSON.parse(content);

      // Validate the configuration
      const validation = this.validateConfiguration(parsed);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Convert date strings back to Date objects
      return this.deserializeConfiguration(parsed);
    } catch (error) {
      // Configuration is corrupted - create backup and return null
      await this.handleCorruptedConfig(path, error);
      return null;
    }
  }

  /**
   * Handles corrupted configuration by creating backup
   * 
   * Validates: Requirements 6.5
   */
  private async handleCorruptedConfig(path: string, error: unknown): Promise<void> {
    try {
      const exists = await this.fs.exists(path);
      if (exists) {
        const backupPath = `${path}.backup.${Date.now()}`;
        await this.fs.rename(path, backupPath);
        console.warn(`Corrupted config backed up to: ${backupPath}`);
      }
    } catch (backupError) {
      console.error('Failed to backup corrupted config:', backupError);
    }
  }

  /**
   * Validates a configuration object
   */
  validateConfiguration(config: unknown): ConfigValidationResult {
    const errors: string[] = [];

    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuration must be an object'] };
    }

    const cfg = config as Record<string, unknown>;

    // Validate version
    if (typeof cfg.version !== 'string') {
      errors.push('Missing or invalid version');
    }

    // Validate maskedFields
    if (!Array.isArray(cfg.maskedFields)) {
      errors.push('maskedFields must be an array');
    }

    // Validate rejectedFields
    if (!Array.isArray(cfg.rejectedFields)) {
      errors.push('rejectedFields must be an array');
    }

    // Validate customPatterns
    if (!Array.isArray(cfg.customPatterns)) {
      errors.push('customPatterns must be an array');
    }

    // Validate settings
    if (cfg.settings && typeof cfg.settings !== 'object') {
      errors.push('settings must be an object');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Deserializes configuration, converting date strings to Date objects
   * Note: Does NOT apply DEFAULT_SETTINGS - that's handled by mergeConfigurations
   */
  private deserializeConfiguration(config: Record<string, unknown>): MaskingConfiguration {
    const result = config as unknown as MaskingConfiguration;

    // Convert date strings in maskedFields
    if (result.maskedFields) {
      result.maskedFields = result.maskedFields.map(field => ({
        ...field,
        addedAt: new Date(field.addedAt),
      }));
    }

    // Convert date strings in rejectedFields
    if (result.rejectedFields) {
      result.rejectedFields = result.rejectedFields.map(field => ({
        ...field,
        rejectedAt: new Date(field.rejectedAt),
      }));
    }

    // Preserve settings as-is (don't apply defaults here - mergeConfigurations handles that)
    // Only ensure settings object exists
    if (!result.settings) {
      result.settings = {} as PluginSettings;
    }

    return result;
  }

  /**
   * Merges two configurations, with source overriding target
   * 
   * Validates: Requirements 6.6
   */
  private mergeConfigurations(
    target: MaskingConfiguration,
    source: MaskingConfiguration
  ): MaskingConfiguration {
    return {
      version: source.version || target.version,
      maskedFields: [...target.maskedFields, ...source.maskedFields],
      rejectedFields: [...target.rejectedFields, ...source.rejectedFields],
      customPatterns: [...target.customPatterns, ...source.customPatterns],
      settings: {
        ...target.settings,
        ...source.settings,
        keyboardShortcuts: {
          ...target.settings.keyboardShortcuts,
          ...source.settings?.keyboardShortcuts,
        },
      },
    };
  }

  /**
   * Saves current configuration to disk
   * 
   * Validates: Requirements 6.1
   */
  async save(config: MaskingConfiguration): Promise<void> {
    this.config = config;

    // Ensure directory exists
    const dir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
    if (dir) {
      try {
        await this.fs.mkdir(dir);
      } catch {
        // Directory may already exist
      }
    }

    // Serialize and save
    const serialized = this.serializeConfiguration(config);
    await this.fs.writeFile(this.configPath, JSON.stringify(serialized, null, 2));
  }

  /**
   * Serializes configuration for storage
   */
  private serializeConfiguration(config: MaskingConfiguration): Record<string, unknown> {
    return {
      ...config,
      maskedFields: config.maskedFields.map(field => ({
        ...field,
        addedAt: field.addedAt.toISOString(),
      })),
      rejectedFields: config.rejectedFields.map(field => ({
        ...field,
        rejectedAt: field.rejectedAt.toISOString(),
      })),
      // Convert RegExp to string for custom patterns
      customPatterns: config.customPatterns.map(pattern => ({
        ...pattern,
        fieldNamePatterns: pattern.fieldNamePatterns.map(r => r.source),
        valuePatterns: pattern.valuePatterns.map(r => r.source),
      })),
    };
  }

  /**
   * Gets the current configuration
   */
  getConfiguration(): MaskingConfiguration {
    return this.config;
  }

  /**
   * Updates settings
   */
  async updateSettings(settings: Partial<PluginSettings>): Promise<void> {
    this.config.settings = {
      ...this.config.settings,
      ...settings,
    };
    await this.save(this.config);
  }

  /**
   * Exports configuration to specified format
   * 
   * Validates: Requirements 6.2
   */
  async export(format: ExportFormat): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(this.serializeConfiguration(this.config), null, 2);

      case 'csv':
        return this.exportToCsv();

      case 'markdown':
        return this.exportToMarkdown();

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Exports configuration to CSV format
   */
  private exportToCsv(): string {
    const lines: string[] = [];

    // Header
    lines.push('Type,Field Name,File Path,Pattern Type,Date,Added By/Reason');

    // Masked fields
    for (const field of this.config.maskedFields) {
      lines.push([
        'masked',
        this.escapeCsv(field.fieldName),
        this.escapeCsv(field.filePath),
        field.patternType,
        field.addedAt.toISOString(),
        this.escapeCsv(field.addedBy),
      ].join(','));
    }

    // Rejected fields
    for (const field of this.config.rejectedFields) {
      lines.push([
        'rejected',
        this.escapeCsv(field.fieldName),
        this.escapeCsv(field.filePath),
        '',
        field.rejectedAt.toISOString(),
        this.escapeCsv(field.reason),
      ].join(','));
    }

    return lines.join('\n');
  }

  /**
   * Escapes a value for CSV
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Exports configuration to Markdown format
   */
  private exportToMarkdown(): string {
    const lines: string[] = [];

    lines.push('# Masking Configuration');
    lines.push('');
    lines.push(`Version: ${this.config.version}`);
    lines.push('');

    // Masked fields
    lines.push('## Masked Fields');
    lines.push('');
    if (this.config.maskedFields.length === 0) {
      lines.push('No masked fields configured.');
    } else {
      lines.push('| Field Name | File Path | Pattern Type | Added At | Added By |');
      lines.push('|------------|-----------|--------------|----------|----------|');
      for (const field of this.config.maskedFields) {
        lines.push(`| ${field.fieldName} | ${field.filePath} | ${field.patternType} | ${field.addedAt.toISOString()} | ${field.addedBy} |`);
      }
    }
    lines.push('');

    // Rejected fields
    lines.push('## Rejected Fields');
    lines.push('');
    if (this.config.rejectedFields.length === 0) {
      lines.push('No rejected fields.');
    } else {
      lines.push('| Field Name | File Path | Reason | Rejected At |');
      lines.push('|------------|-----------|--------|-------------|');
      for (const field of this.config.rejectedFields) {
        lines.push(`| ${field.fieldName} | ${field.filePath} | ${field.reason} | ${field.rejectedAt.toISOString()} |`);
      }
    }
    lines.push('');

    // Custom patterns
    lines.push('## Custom Patterns');
    lines.push('');
    if (this.config.customPatterns.length === 0) {
      lines.push('No custom patterns defined.');
    } else {
      for (const pattern of this.config.customPatterns) {
        lines.push(`### ${pattern.name} (${pattern.id})`);
        lines.push(`- Type: ${pattern.type}`);
        lines.push(`- Field patterns: ${pattern.fieldNamePatterns.map(r => r.source).join(', ')}`);
        lines.push(`- Context indicators: ${pattern.contextIndicators.join(', ')}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Imports configuration from file
   * 
   * Validates: Requirements 6.2
   */
  async import(filePath: string): Promise<MaskingConfiguration> {
    const content = await this.fs.readFile(filePath);
    const parsed = JSON.parse(content);

    const validation = this.validateConfiguration(parsed);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const imported = this.deserializeConfiguration(parsed);

    // Convert string patterns back to RegExp for custom patterns
    if (imported.customPatterns) {
      imported.customPatterns = imported.customPatterns.map(pattern => ({
        ...pattern,
        fieldNamePatterns: (pattern.fieldNamePatterns as unknown as string[]).map(
          s => typeof s === 'string' ? new RegExp(s, 'i') : s
        ),
        valuePatterns: (pattern.valuePatterns as unknown as string[]).map(
          s => typeof s === 'string' ? new RegExp(s) : s
        ),
      }));
    }

    this.config = imported;
    await this.save(this.config);

    return this.config;
  }

  /**
   * Adds a field to the masked fields list
   * 
   * Validates: Requirements 5.1
   */
  async addMaskedField(suggestion: Suggestion): Promise<void> {
    const entry: MaskedFieldEntry = {
      fieldName: suggestion.field.name,
      filePath: suggestion.field.location.filePath,
      patternType: suggestion.patternType,
      addedAt: new Date(),
      addedBy: this.userId,
    };

    // Check if already exists
    const exists = this.config.maskedFields.some(
      f => f.fieldName === entry.fieldName && f.filePath === entry.filePath
    );

    if (!exists) {
      this.config.maskedFields.push(entry);
      await this.save(this.config);
    }
  }

  /**
   * Adds a field to the rejected fields list
   * 
   * Validates: Requirements 5.2
   */
  async addRejectedField(suggestion: Suggestion, reason: string = ''): Promise<void> {
    const entry: RejectedFieldEntry = {
      fieldName: suggestion.field.name,
      filePath: suggestion.field.location.filePath,
      reason,
      rejectedAt: new Date(),
    };

    // Check if already exists
    const exists = this.config.rejectedFields.some(
      f => f.fieldName === entry.fieldName && f.filePath === entry.filePath
    );

    if (!exists) {
      this.config.rejectedFields.push(entry);
      await this.save(this.config);
    }
  }

  /**
   * Checks if a field is in the masked list
   */
  isFieldMasked(fieldName: string, filePath: string): boolean {
    return this.config.maskedFields.some(
      f => f.fieldName === fieldName && f.filePath === filePath
    );
  }

  /**
   * Checks if a field is in the rejected list
   */
  isFieldRejected(fieldName: string, filePath: string): boolean {
    return this.config.rejectedFields.some(
      f => f.fieldName === fieldName && f.filePath === filePath
    );
  }

  /**
   * Removes a field from the masked list
   */
  async removeMaskedField(fieldName: string, filePath: string): Promise<boolean> {
    const index = this.config.maskedFields.findIndex(
      f => f.fieldName === fieldName && f.filePath === filePath
    );

    if (index >= 0) {
      this.config.maskedFields.splice(index, 1);
      await this.save(this.config);
      return true;
    }

    return false;
  }

  /**
   * Removes a field from the rejected list
   */
  async removeRejectedField(fieldName: string, filePath: string): Promise<boolean> {
    const index = this.config.rejectedFields.findIndex(
      f => f.fieldName === fieldName && f.filePath === filePath
    );

    if (index >= 0) {
      this.config.rejectedFields.splice(index, 1);
      await this.save(this.config);
      return true;
    }

    return false;
  }

  /**
   * Registers a custom pattern
   * 
   * Validates: Requirements 6.4
   */
  async registerCustomPattern(pattern: MaskingPattern): Promise<void> {
    // Check for duplicate ID
    const existingIndex = this.config.customPatterns.findIndex(p => p.id === pattern.id);
    
    if (existingIndex >= 0) {
      // Replace existing pattern
      this.config.customPatterns[existingIndex] = pattern;
    } else {
      this.config.customPatterns.push(pattern);
    }

    await this.save(this.config);
  }

  /**
   * Removes a custom pattern
   */
  async removeCustomPattern(patternId: string): Promise<boolean> {
    const index = this.config.customPatterns.findIndex(p => p.id === patternId);

    if (index >= 0) {
      this.config.customPatterns.splice(index, 1);
      await this.save(this.config);
      return true;
    }

    return false;
  }

  /**
   * Gets all custom patterns
   */
  getCustomPatterns(): MaskingPattern[] {
    return [...this.config.customPatterns];
  }

  /**
   * Records a decision in the history
   * 
   * Validates: Requirements 5.6
   */
  recordDecision(suggestionId: string, suggestion: Suggestion, decision: UserDecision): void {
    const record: DecisionRecord = {
      suggestionId,
      fieldName: suggestion.field.name,
      filePath: suggestion.field.location.filePath,
      decision,
      timestamp: new Date(),
      userId: this.userId,
    };

    this.decisionHistory.push(record);
  }

  /**
   * Gets decision history with optional filtering
   * 
   * Validates: Requirements 5.6
   */
  getDecisionHistory(filter?: HistoryFilter): DecisionRecord[] {
    let results = [...this.decisionHistory];

    if (!filter) {
      return results;
    }

    // Filter by date range
    if (filter.startDate) {
      results = results.filter(r => r.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      results = results.filter(r => r.timestamp <= filter.endDate!);
    }

    // Filter by user
    if (filter.userId) {
      results = results.filter(r => r.userId === filter.userId);
    }

    // Filter by action
    if (filter.action) {
      results = results.filter(r => r.decision.action === filter.action);
    }

    // Filter by file path
    if (filter.filePath) {
      results = results.filter(r => r.filePath === filter.filePath);
    }

    return results;
  }

  /**
   * Clears decision history
   */
  clearDecisionHistory(): void {
    this.decisionHistory = [];
  }

  /**
   * Exports decision history
   */
  exportDecisionHistory(): DecisionRecord[] {
    return this.decisionHistory.map(record => ({
      ...record,
      timestamp: new Date(record.timestamp),
    }));
  }

  /**
   * Imports decision history
   */
  importDecisionHistory(records: DecisionRecord[], merge: boolean = false): void {
    const imported = records.map(record => ({
      ...record,
      timestamp: new Date(record.timestamp),
    }));

    if (merge) {
      this.decisionHistory.push(...imported);
    } else {
      this.decisionHistory = imported;
    }
  }
}

/**
 * Creates a new ConfigurationManager instance
 */
export function createConfigurationManager(
  fs: FileSystem,
  configPath?: string,
  userConfigPath?: string,
  userId?: string
): ConfigurationManager {
  return new ConfigurationManager(fs, configPath, userConfigPath, userId);
}
