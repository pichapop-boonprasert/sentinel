/**
 * Configuration Manager for masking configuration persistence
 *
 * Handles loading, saving, import/export of masking configurations,
 * decision history tracking, and configuration inheritance.
 *
 * Validates: Requirements 5.1, 5.2, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
import { MaskingConfiguration, MaskingPattern, PluginSettings, DecisionRecord, HistoryFilter, UserDecision, ExportFormat, IConfigurationManager, Suggestion } from '../types';
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
export declare const DEFAULT_SETTINGS: PluginSettings;
/**
 * Default empty configuration
 */
export declare function createDefaultConfiguration(): MaskingConfiguration;
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
export declare class ConfigurationManager implements IConfigurationManager {
    private config;
    private decisionHistory;
    private configPath;
    private userConfigPath;
    private fs;
    private userId;
    /**
     * Creates a new ConfigurationManager
     * @param fs - File system interface
     * @param configPath - Path to workspace configuration file
     * @param userConfigPath - Optional path to user-level configuration file
     * @param userId - Current user identifier
     */
    constructor(fs: FileSystem, configPath?: string, userConfigPath?: string | null, userId?: string);
    /**
     * Loads configuration from disk
     * Implements configuration inheritance: user-level settings override workspace-level
     *
     * Validates: Requirements 6.3, 6.6
     */
    load(): Promise<MaskingConfiguration>;
    /**
     * Loads a configuration file with corruption recovery
     *
     * Validates: Requirements 6.5
     */
    private loadConfigFile;
    /**
     * Handles corrupted configuration by creating backup
     *
     * Validates: Requirements 6.5
     */
    private handleCorruptedConfig;
    /**
     * Validates a configuration object
     */
    validateConfiguration(config: unknown): ConfigValidationResult;
    /**
     * Deserializes configuration, converting date strings to Date objects
     * Note: Does NOT apply DEFAULT_SETTINGS - that's handled by mergeConfigurations
     */
    private deserializeConfiguration;
    /**
     * Merges two configurations, with source overriding target
     *
     * Validates: Requirements 6.6
     */
    private mergeConfigurations;
    /**
     * Saves current configuration to disk
     *
     * Validates: Requirements 6.1
     */
    save(config: MaskingConfiguration): Promise<void>;
    /**
     * Serializes configuration for storage
     */
    private serializeConfiguration;
    /**
     * Gets the current configuration
     */
    getConfiguration(): MaskingConfiguration;
    /**
     * Updates settings
     */
    updateSettings(settings: Partial<PluginSettings>): Promise<void>;
    /**
     * Exports configuration to specified format
     *
     * Validates: Requirements 6.2
     */
    export(format: ExportFormat): Promise<string>;
    /**
     * Exports configuration to CSV format
     */
    private exportToCsv;
    /**
     * Escapes a value for CSV
     */
    private escapeCsv;
    /**
     * Exports configuration to Markdown format
     */
    private exportToMarkdown;
    /**
     * Imports configuration from file
     *
     * Validates: Requirements 6.2
     */
    import(filePath: string): Promise<MaskingConfiguration>;
    /**
     * Adds a field to the masked fields list
     *
     * Validates: Requirements 5.1
     */
    addMaskedField(suggestion: Suggestion): Promise<void>;
    /**
     * Adds a field to the rejected fields list
     *
     * Validates: Requirements 5.2
     */
    addRejectedField(suggestion: Suggestion, reason?: string): Promise<void>;
    /**
     * Checks if a field is in the masked list
     */
    isFieldMasked(fieldName: string, filePath: string): boolean;
    /**
     * Checks if a field is in the rejected list
     */
    isFieldRejected(fieldName: string, filePath: string): boolean;
    /**
     * Removes a field from the masked list
     */
    removeMaskedField(fieldName: string, filePath: string): Promise<boolean>;
    /**
     * Removes a field from the rejected list
     */
    removeRejectedField(fieldName: string, filePath: string): Promise<boolean>;
    /**
     * Registers a custom pattern
     *
     * Validates: Requirements 6.4
     */
    registerCustomPattern(pattern: MaskingPattern): Promise<void>;
    /**
     * Removes a custom pattern
     */
    removeCustomPattern(patternId: string): Promise<boolean>;
    /**
     * Gets all custom patterns
     */
    getCustomPatterns(): MaskingPattern[];
    /**
     * Records a decision in the history
     *
     * Validates: Requirements 5.6
     */
    recordDecision(suggestionId: string, suggestion: Suggestion, decision: UserDecision): void;
    /**
     * Gets decision history with optional filtering
     *
     * Validates: Requirements 5.6
     */
    getDecisionHistory(filter?: HistoryFilter): DecisionRecord[];
    /**
     * Clears decision history
     */
    clearDecisionHistory(): void;
    /**
     * Exports decision history
     */
    exportDecisionHistory(): DecisionRecord[];
    /**
     * Imports decision history
     */
    importDecisionHistory(records: DecisionRecord[], merge?: boolean): void;
}
/**
 * Creates a new ConfigurationManager instance
 */
export declare function createConfigurationManager(fs: FileSystem, configPath?: string, userConfigPath?: string, userId?: string): ConfigurationManager;
//# sourceMappingURL=config-manager.d.ts.map