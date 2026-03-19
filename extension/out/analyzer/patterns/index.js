"use strict";
/**
 * Built-in sensitive data patterns for the Analyzer component
 *
 * This module exports pattern definitions for detecting:
 * - PII (Personally Identifiable Information) - Requirement 2.1
 * - Credentials (passwords, API keys, tokens) - Requirement 2.2
 * - Financial data (credit cards, bank accounts) - Requirement 2.3
 * - Health information (medical records, diagnoses) - Requirement 2.4
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInPatterns = void 0;
exports.getPatternsByType = getPatternsByType;
exports.getPatternById = getPatternById;
exports.getPatternIdsByType = getPatternIdsByType;
// Export individual pattern modules
__exportStar(require("./types"), exports);
__exportStar(require("./pii-patterns"), exports);
__exportStar(require("./credentials-patterns"), exports);
__exportStar(require("./financial-patterns"), exports);
__exportStar(require("./health-patterns"), exports);
// Import pattern collections
const pii_patterns_1 = require("./pii-patterns");
const credentials_patterns_1 = require("./credentials-patterns");
const financial_patterns_1 = require("./financial-patterns");
const health_patterns_1 = require("./health-patterns");
/**
 * All built-in patterns combined
 */
exports.builtInPatterns = [
    ...pii_patterns_1.piiPatterns,
    ...credentials_patterns_1.credentialsPatterns,
    ...financial_patterns_1.financialPatterns,
    ...health_patterns_1.healthPatterns,
];
/**
 * Get patterns by type
 * @param type - The masking pattern type to filter by
 * @returns Array of patterns matching the specified type
 */
function getPatternsByType(type) {
    switch (type) {
        case 'pii':
            return pii_patterns_1.piiPatterns;
        case 'credentials':
            return credentials_patterns_1.credentialsPatterns;
        case 'financial':
            return financial_patterns_1.financialPatterns;
        case 'health':
            return health_patterns_1.healthPatterns;
        case 'custom':
            return []; // Custom patterns are managed separately
        default:
            return [];
    }
}
/**
 * Get a pattern by its ID
 * @param id - The pattern ID to find
 * @returns The matching pattern or undefined
 */
function getPatternById(id) {
    return exports.builtInPatterns.find(pattern => pattern.id === id);
}
/**
 * Get all pattern IDs grouped by type
 * @returns Object mapping pattern types to arrays of pattern IDs
 */
function getPatternIdsByType() {
    return {
        pii: pii_patterns_1.piiPatterns.map(p => p.id),
        credentials: credentials_patterns_1.credentialsPatterns.map(p => p.id),
        financial: financial_patterns_1.financialPatterns.map(p => p.id),
        health: health_patterns_1.healthPatterns.map(p => p.id),
        custom: [],
    };
}
//# sourceMappingURL=index.js.map