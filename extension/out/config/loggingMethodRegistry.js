"use strict";
/**
 * Logging Method Registry for PII JSON Checker extension.
 *
 * This module manages logging method detection configuration, supporting
 * both default methods and user-configured overrides. User-configured
 * methods use REPLACE mode (not additive) per Requirement 8.1.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingMethodRegistry = void 0;
const vscode = require("vscode");
/**
 * Default .NET logging methods to detect.
 * Includes common logging frameworks: Microsoft.Extensions.Logging, Serilog, Console, Debug.
 */
const DEFAULT_DOTNET_METHODS = [
    // Microsoft.Extensions.Logging
    'LogInformation', 'LogWarning', 'LogError', 'LogDebug', 'LogTrace', 'LogCritical',
    // Console and Debug
    'Console.WriteLine', 'Console.Write',
    'Debug.WriteLine', 'Debug.Write', 'Debug.Log',
    // Trace
    'Trace.WriteLine', 'Trace.Write',
    // Serilog
    'Log.Information', 'Log.Warning', 'Log.Error', 'Log.Debug', 'Log.Verbose', 'Log.Fatal',
];
/**
 * Default JavaScript/TypeScript logging methods to detect.
 */
const DEFAULT_JS_METHODS = [
    'console.log', 'console.info', 'console.warn', 'console.error', 'console.debug', 'console.trace',
];
/**
 * Short method names that require a dot prefix (e.g., logger.Info()).
 * These are detected with a preceding dot to avoid false positives.
 */
const SHORT_LOG_METHODS = ['Info', 'Warn', 'Error', 'Debug', 'Fatal', 'Trace'];
/**
 * Language IDs that are considered JavaScript/TypeScript.
 */
const JS_LANGUAGE_IDS = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'];
/**
 * Language IDs that are considered .NET/C#.
 */
const DOTNET_LANGUAGE_IDS = ['csharp', 'fsharp', 'vb'];
/**
 * LoggingMethodRegistry manages logging method detection configuration.
 *
 * Key behaviors:
 * - User-configured methods use REPLACE mode (Requirement 8.1)
 * - Empty user config disables logging detection (Requirement 4.4)
 * - Supports both fully qualified and short method names (Requirement 4.5)
 */
class LoggingMethodRegistry {
    constructor() {
        this.configSection = 'piiJsonChecker';
        this.cachedUserMethods = null;
        this.cacheValid = false;
    }
    /**
     * Get the VS Code workspace configuration for the extension.
     */
    getConfig() {
        return vscode.workspace.getConfiguration(this.configSection);
    }
    /**
     * Get effective logging methods based on configuration.
     *
     * If user has configured custom logging methods, ONLY those methods are used
     * (replace mode per Requirement 8.1). If no user configuration exists,
     * default methods for the language are returned.
     *
     * @param languageId - The VS Code language ID (e.g., 'csharp', 'typescript')
     * @returns Array of logging method names to detect
     *
     * Requirements: 4.1, 4.3, 8.1
     */
    getEffectiveMethods(languageId) {
        const userMethods = this.getUserConfiguredMethods();
        // If user has configured methods, use ONLY those (replace mode)
        if (userMethods !== null) {
            // Empty array means logging detection is disabled (Requirement 4.4)
            return userMethods;
        }
        // No user configuration - use defaults for the language
        return this.getDefaultMethods(languageId);
    }
    /**
     * Check if a method name should trigger logging detection.
     *
     * Supports both fully qualified method names (e.g., "Console.WriteLine")
     * and short method names (e.g., "Info") per Requirement 4.5.
     *
     * @param methodName - The method name to check
     * @param languageId - The VS Code language ID
     * @returns true if the method should trigger detection, false otherwise
     *
     * Requirements: 4.2, 4.5
     */
    isLoggingMethod(methodName, languageId) {
        const effectiveMethods = this.getEffectiveMethods(languageId);
        // Empty methods list means detection is disabled
        if (effectiveMethods.length === 0) {
            return false;
        }
        // Check for exact match (case-sensitive for fully qualified names)
        if (effectiveMethods.includes(methodName)) {
            return true;
        }
        // Check for short method name match (e.g., "Info" matches "logger.Info")
        // Short methods are matched case-sensitively
        for (const method of effectiveMethods) {
            // If the configured method is a short name (no dot), check if methodName ends with it
            if (!method.includes('.') && methodName.endsWith(`.${method}`)) {
                return true;
            }
            // If methodName is a short name, check if any configured method ends with it
            if (!methodName.includes('.') && method.endsWith(`.${methodName}`)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Get default logging methods for a language.
     *
     * @param languageId - The VS Code language ID
     * @returns Array of default logging method names for the language
     *
     * Requirements: 4.3
     */
    getDefaultMethods(languageId) {
        if (JS_LANGUAGE_IDS.includes(languageId)) {
            return [...DEFAULT_JS_METHODS];
        }
        if (DOTNET_LANGUAGE_IDS.includes(languageId)) {
            return [...DEFAULT_DOTNET_METHODS];
        }
        // For unknown languages, return combined defaults
        return [...DEFAULT_DOTNET_METHODS, ...DEFAULT_JS_METHODS];
    }
    /**
     * Get the short method names that require a dot prefix.
     * These are used by LoggingAnalyzer for pattern matching.
     *
     * @returns Array of short method names
     */
    getShortMethods() {
        return [...SHORT_LOG_METHODS];
    }
    /**
     * Refresh the registry from configuration.
     * Invalidates the cache so next access reads fresh configuration.
     *
     * Requirements: 4.6
     */
    refresh() {
        this.cacheValid = false;
        this.cachedUserMethods = null;
    }
    /**
     * Get user-configured logging methods from VS Code settings.
     * Returns null if no user configuration exists (use defaults).
     * Returns empty array if user explicitly configured empty list (disable detection).
     *
     * @returns User-configured methods, or null if not configured
     */
    getUserConfiguredMethods() {
        if (this.cacheValid) {
            return this.cachedUserMethods;
        }
        const config = this.getConfig();
        const userMethods = config.get('loggingFunctions');
        // Check if the setting was explicitly set (not just using default)
        const inspected = config.inspect('loggingFunctions');
        const hasUserConfig = inspected?.globalValue !== undefined ||
            inspected?.workspaceValue !== undefined ||
            inspected?.workspaceFolderValue !== undefined;
        if (!hasUserConfig) {
            this.cachedUserMethods = null;
            this.cacheValid = true;
            return null;
        }
        // User has configured methods - validate and return
        const validMethods = this.validateMethods(userMethods || []);
        this.cachedUserMethods = validMethods;
        this.cacheValid = true;
        return validMethods;
    }
    /**
     * Validate and normalize logging method names.
     * Filters out invalid entries (non-strings, empty strings).
     *
     * @param methods - Array of method names to validate
     * @returns Array of valid, trimmed method names
     *
     * Requirements: 7.3, 7.4
     */
    validateMethods(methods) {
        if (!Array.isArray(methods)) {
            return [];
        }
        return methods
            .filter((m) => typeof m === 'string')
            .map(m => m.trim())
            .filter(m => m.length > 0);
    }
    /**
     * Check if logging detection is enabled.
     * Detection is disabled if user configured an empty methods list.
     *
     * @param languageId - The VS Code language ID
     * @returns true if logging detection is enabled, false otherwise
     *
     * Requirements: 4.4
     */
    isDetectionEnabled(languageId) {
        const methods = this.getEffectiveMethods(languageId);
        return methods.length > 0;
    }
}
exports.LoggingMethodRegistry = LoggingMethodRegistry;
//# sourceMappingURL=loggingMethodRegistry.js.map