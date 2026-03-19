"use strict";
// Core types for Data Masking Suggestion Plugin
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginErrorCode = void 0;
/**
 * Plugin error codes for different error categories
 */
var PluginErrorCode;
(function (PluginErrorCode) {
    // Scanner errors (1xxx)
    PluginErrorCode[PluginErrorCode["SCAN_SYNTAX_ERROR"] = 1001] = "SCAN_SYNTAX_ERROR";
    PluginErrorCode[PluginErrorCode["SCAN_FILE_NOT_FOUND"] = 1002] = "SCAN_FILE_NOT_FOUND";
    PluginErrorCode[PluginErrorCode["SCAN_PERMISSION_DENIED"] = 1003] = "SCAN_PERMISSION_DENIED";
    PluginErrorCode[PluginErrorCode["SCAN_FILE_TOO_LARGE"] = 1004] = "SCAN_FILE_TOO_LARGE";
    // Analyzer errors (2xxx)
    PluginErrorCode[PluginErrorCode["ANALYZE_PATTERN_INVALID"] = 2001] = "ANALYZE_PATTERN_INVALID";
    PluginErrorCode[PluginErrorCode["ANALYZE_SERVICE_UNAVAILABLE"] = 2002] = "ANALYZE_SERVICE_UNAVAILABLE";
    PluginErrorCode[PluginErrorCode["ANALYZE_TIMEOUT"] = 2003] = "ANALYZE_TIMEOUT";
    // Configuration errors (3xxx)
    PluginErrorCode[PluginErrorCode["CONFIG_CORRUPTED"] = 3001] = "CONFIG_CORRUPTED";
    PluginErrorCode[PluginErrorCode["CONFIG_INVALID_JSON"] = 3002] = "CONFIG_INVALID_JSON";
    PluginErrorCode[PluginErrorCode["CONFIG_SCHEMA_INVALID"] = 3003] = "CONFIG_SCHEMA_INVALID";
    PluginErrorCode[PluginErrorCode["CONFIG_PERMISSION_DENIED"] = 3004] = "CONFIG_PERMISSION_DENIED";
    // Report errors (4xxx)
    PluginErrorCode[PluginErrorCode["REPORT_GENERATION_FAILED"] = 4001] = "REPORT_GENERATION_FAILED";
    PluginErrorCode[PluginErrorCode["REPORT_EXPORT_FAILED"] = 4002] = "REPORT_EXPORT_FAILED";
})(PluginErrorCode || (exports.PluginErrorCode = PluginErrorCode = {}));
//# sourceMappingURL=index.js.map