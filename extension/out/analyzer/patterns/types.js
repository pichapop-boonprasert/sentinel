"use strict";
/**
 * Pattern definition types for sensitive data detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPattern = createPattern;
/**
 * Creates a MaskingPattern with the given parameters
 */
function createPattern(id, name, type, fieldNamePatterns, valuePatterns, contextIndicators) {
    return {
        id,
        name,
        type,
        fieldNamePatterns,
        valuePatterns,
        contextIndicators,
    };
}
//# sourceMappingURL=types.js.map