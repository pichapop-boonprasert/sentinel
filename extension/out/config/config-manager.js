"use strict";
/**
 * Configuration Manager for masking configuration persistence
 *
 * Handles loading, saving, import/export of masking configurations,
 * decision history tracking, and configuration inheritance.
 *
 * Validates: Requirements 5.1, 5.2, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationManager = exports.DEFAULT_SETTINGS = void 0;
exports.createDefaultConfiguration = createDefaultConfiguration;
exports.createConfigurationManager = createConfigurationManager;
/**
 * Default plugin settings
 */
exports.DEFAULT_SETTINGS = {
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
function createDefaultConfiguration() {
    return {
        version: '1.0.0',
        maskedFields: [],
        rejectedFields: [],
        customPatterns: [],
        settings: { ...exports.DEFAULT_SETTINGS },
    };
}
/**
 * ConfigurationManager class for handling masking configuration persistence
 */
class ConfigurationManager {
    config;
    decisionHistory = [];
    configPath;
    userConfigPath;
    fs;
    userId;
    /**
     * Creates a new ConfigurationManager
     * @param fs - File system interface
     * @param configPath - Path to workspace configuration file
     * @param userConfigPath - Optional path to user-level configuration file
     * @param userId - Current user identifier
     */
    constructor(fs, configPath = '.kiro/masking-config.json', userConfigPath = null, userId = 'anonymous') {
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
    async load() {
        // Start with default configuration
        let config = createDefaultConfiguration();
        // Load user-level configuration first (if exists)
        if (this.userConfigPath) {
            try {
                const userConfig = await this.loadConfigFile(this.userConfigPath);
                if (userConfig) {
                    config = this.mergeConfigurations(config, userConfig);
                }
            }
            catch (error) {
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
        }
        catch (error) {
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
    async loadConfigFile(path) {
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
        }
        catch (error) {
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
    async handleCorruptedConfig(path, error) {
        try {
            const exists = await this.fs.exists(path);
            if (exists) {
                const backupPath = `${path}.backup.${Date.now()}`;
                await this.fs.rename(path, backupPath);
                console.warn(`Corrupted config backed up to: ${backupPath}`);
            }
        }
        catch (backupError) {
            console.error('Failed to backup corrupted config:', backupError);
        }
    }
    /**
     * Validates a configuration object
     */
    validateConfiguration(config) {
        const errors = [];
        if (!config || typeof config !== 'object') {
            return { valid: false, errors: ['Configuration must be an object'] };
        }
        const cfg = config;
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
    deserializeConfiguration(config) {
        const result = config;
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
            result.settings = {};
        }
        return result;
    }
    /**
     * Merges two configurations, with source overriding target
     *
     * Validates: Requirements 6.6
     */
    mergeConfigurations(target, source) {
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
    async save(config) {
        this.config = config;
        // Ensure directory exists
        const dir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
        if (dir) {
            try {
                await this.fs.mkdir(dir);
            }
            catch {
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
    serializeConfiguration(config) {
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
    getConfiguration() {
        return this.config;
    }
    /**
     * Updates settings
     */
    async updateSettings(settings) {
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
    async export(format) {
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
    exportToCsv() {
        const lines = [];
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
    escapeCsv(value) {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
    /**
     * Exports configuration to Markdown format
     */
    exportToMarkdown() {
        const lines = [];
        lines.push('# Masking Configuration');
        lines.push('');
        lines.push(`Version: ${this.config.version}`);
        lines.push('');
        // Masked fields
        lines.push('## Masked Fields');
        lines.push('');
        if (this.config.maskedFields.length === 0) {
            lines.push('No masked fields configured.');
        }
        else {
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
        }
        else {
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
        }
        else {
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
    async import(filePath) {
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
                fieldNamePatterns: pattern.fieldNamePatterns.map(s => typeof s === 'string' ? new RegExp(s, 'i') : s),
                valuePatterns: pattern.valuePatterns.map(s => typeof s === 'string' ? new RegExp(s) : s),
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
    async addMaskedField(suggestion) {
        const entry = {
            fieldName: suggestion.field.name,
            filePath: suggestion.field.location.filePath,
            patternType: suggestion.patternType,
            addedAt: new Date(),
            addedBy: this.userId,
        };
        // Check if already exists
        const exists = this.config.maskedFields.some(f => f.fieldName === entry.fieldName && f.filePath === entry.filePath);
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
    async addRejectedField(suggestion, reason = '') {
        const entry = {
            fieldName: suggestion.field.name,
            filePath: suggestion.field.location.filePath,
            reason,
            rejectedAt: new Date(),
        };
        // Check if already exists
        const exists = this.config.rejectedFields.some(f => f.fieldName === entry.fieldName && f.filePath === entry.filePath);
        if (!exists) {
            this.config.rejectedFields.push(entry);
            await this.save(this.config);
        }
    }
    /**
     * Checks if a field is in the masked list
     */
    isFieldMasked(fieldName, filePath) {
        return this.config.maskedFields.some(f => f.fieldName === fieldName && f.filePath === filePath);
    }
    /**
     * Checks if a field is in the rejected list
     */
    isFieldRejected(fieldName, filePath) {
        return this.config.rejectedFields.some(f => f.fieldName === fieldName && f.filePath === filePath);
    }
    /**
     * Removes a field from the masked list
     */
    async removeMaskedField(fieldName, filePath) {
        const index = this.config.maskedFields.findIndex(f => f.fieldName === fieldName && f.filePath === filePath);
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
    async removeRejectedField(fieldName, filePath) {
        const index = this.config.rejectedFields.findIndex(f => f.fieldName === fieldName && f.filePath === filePath);
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
    async registerCustomPattern(pattern) {
        // Check for duplicate ID
        const existingIndex = this.config.customPatterns.findIndex(p => p.id === pattern.id);
        if (existingIndex >= 0) {
            // Replace existing pattern
            this.config.customPatterns[existingIndex] = pattern;
        }
        else {
            this.config.customPatterns.push(pattern);
        }
        await this.save(this.config);
    }
    /**
     * Removes a custom pattern
     */
    async removeCustomPattern(patternId) {
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
    getCustomPatterns() {
        return [...this.config.customPatterns];
    }
    /**
     * Records a decision in the history
     *
     * Validates: Requirements 5.6
     */
    recordDecision(suggestionId, suggestion, decision) {
        const record = {
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
    getDecisionHistory(filter) {
        let results = [...this.decisionHistory];
        if (!filter) {
            return results;
        }
        // Filter by date range
        if (filter.startDate) {
            results = results.filter(r => r.timestamp >= filter.startDate);
        }
        if (filter.endDate) {
            results = results.filter(r => r.timestamp <= filter.endDate);
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
    clearDecisionHistory() {
        this.decisionHistory = [];
    }
    /**
     * Exports decision history
     */
    exportDecisionHistory() {
        return this.decisionHistory.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp),
        }));
    }
    /**
     * Imports decision history
     */
    importDecisionHistory(records, merge = false) {
        const imported = records.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp),
        }));
        if (merge) {
            this.decisionHistory.push(...imported);
        }
        else {
            this.decisionHistory = imported;
        }
    }
}
exports.ConfigurationManager = ConfigurationManager;
/**
 * Creates a new ConfigurationManager instance
 */
function createConfigurationManager(fs, configPath, userConfigPath, userId) {
    return new ConfigurationManager(fs, configPath, userConfigPath, userId);
}
//# sourceMappingURL=config-manager.js.map