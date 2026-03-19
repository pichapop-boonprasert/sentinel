"use strict";
/**
 * Usage Context Analyzer for sensitive data detection
 *
 * Detects how fields are used in code (logging, serialization, API response, storage, display)
 * and assigns risk levels based on the context type.
 *
 * High-risk contexts (logging, serialization, API response) receive higher priority
 * as they are more likely to expose sensitive data.
 *
 * Validates: Requirements 3.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsageContextAnalyzer = exports.MEDIUM_RISK_CONTEXT_TYPES = exports.HIGH_RISK_CONTEXT_TYPES = void 0;
exports.createUsageContextAnalyzer = createUsageContextAnalyzer;
exports.analyzeUsageContext = analyzeUsageContext;
exports.isHighRiskUsage = isHighRiskUsage;
/**
 * Patterns for detecting different usage contexts
 */
const CONTEXT_PATTERNS = [
    {
        type: 'logging',
        patterns: [
            // Common logging methods
            /\b(?:console|logger|log|logging)\s*\.\s*(?:log|info|warn|error|debug|trace|verbose|fatal)\s*\(/i,
            // Logging frameworks
            /\b(?:winston|bunyan|pino|log4j|slf4j|logback|nlog|serilog)\b/i,
            // Print statements
            /\b(?:print|println|printf|puts|echo|write(?:line)?)\s*\(/i,
            // Debug output
            /\b(?:debug|trace|dump|inspect)\s*\(/i,
        ],
        baseRisk: 'high',
        isHighRisk: true,
    },
    {
        type: 'serialization',
        patterns: [
            // JSON serialization
            /\bJSON\s*\.\s*(?:stringify|parse)\s*\(/i,
            // Object serialization
            /\b(?:serialize|serializer|marshal|pickle|yaml\.dump|toJSON|toObject)\s*\(/i,
            // XML serialization
            /\b(?:XMLSerializer|XmlSerializer|toXml|writeXml)\b/i,
            // Binary serialization
            /\b(?:protobuf|msgpack|avro|thrift)\b/i,
            // Data transfer objects
            /\b(?:DTO|DataTransferObject|toDto|fromDto)\b/i,
        ],
        baseRisk: 'high',
        isHighRisk: true,
    },
    {
        type: 'api_response',
        patterns: [
            // HTTP response methods
            /\b(?:res|response)\s*\.\s*(?:json|send|write|end|status)\s*\(/i,
            // REST/API patterns
            /\b(?:return|respond|reply)\s+.*(?:json|response|result)\b/i,
            // Framework-specific response patterns
            /\b(?:JsonResult|OkObjectResult|ActionResult|ResponseEntity|HttpResponse)\b/i,
            // API endpoint indicators
            /@(?:Get|Post|Put|Delete|Patch|Api|Route|Controller|RequestMapping)\b/i,
            // Response body
            /\b(?:responseBody|body|payload|output)\s*[=:]/i,
        ],
        baseRisk: 'high',
        isHighRisk: true,
    },
    {
        type: 'storage',
        patterns: [
            // Database operations
            /\b(?:INSERT|UPDATE|SELECT|DELETE|UPSERT)\s+(?:INTO|FROM|SET)?\s*/i,
            // ORM patterns
            /\b(?:save|persist|store|create|update|insert|upsert)\s*\(/i,
            // File operations
            /\b(?:writeFile|writeFileSync|fwrite|file_put_contents|save(?:To)?File)\s*\(/i,
            // Cache operations
            /\b(?:cache|redis|memcache|localStorage|sessionStorage)\s*\.\s*(?:set|put|store|save)\s*\(/i,
            // Database clients
            /\b(?:mongoose|sequelize|typeorm|prisma|knex|sqlalchemy)\b/i,
        ],
        baseRisk: 'medium',
        isHighRisk: false,
    },
    {
        type: 'display',
        patterns: [
            // UI rendering
            /\b(?:render|display|show|print|draw|paint)\s*\(/i,
            // Template interpolation
            /\{\{\s*\w+\s*\}\}|\$\{\s*\w+\s*\}|<%[=]?\s*\w+\s*%>/,
            // DOM manipulation
            /\b(?:innerHTML|innerText|textContent|appendChild|insertBefore)\b/i,
            // React/Vue/Angular patterns
            /\b(?:useState|setState|v-model|ngModel|\[.*\])\b/i,
            // Form display
            /\b(?:input|textarea|label|placeholder|value)\s*[=:]/i,
        ],
        baseRisk: 'medium',
        isHighRisk: false,
    },
];
/**
 * High-risk context types that should receive elevated priority
 */
exports.HIGH_RISK_CONTEXT_TYPES = ['logging', 'serialization', 'api_response'];
/**
 * Medium-risk context types
 */
exports.MEDIUM_RISK_CONTEXT_TYPES = ['storage', 'display'];
/**
 * UsageContextAnalyzer class for detecting how fields are used in code
 */
class UsageContextAnalyzer {
    contextPatterns;
    /**
     * Creates a new UsageContextAnalyzer
     * @param customPatterns - Optional custom patterns to add to default patterns
     */
    constructor(customPatterns = []) {
        this.contextPatterns = [...CONTEXT_PATTERNS, ...customPatterns];
    }
    /**
     * Analyzes a field's surrounding code to detect usage contexts
     * @param field - The field declaration to analyze
     * @returns Analysis result with detected contexts
     */
    analyzeField(field) {
        const contexts = [];
        const contextText = this.buildContextText(field);
        for (const pattern of this.contextPatterns) {
            const matchResult = this.matchContextPattern(contextText, pattern, field);
            if (matchResult) {
                contexts.push(matchResult);
            }
        }
        // Determine highest risk and whether high-risk context exists
        const hasHighRiskContext = contexts.some(ctx => exports.HIGH_RISK_CONTEXT_TYPES.includes(ctx.type) || ctx.risk === 'high');
        const highestRisk = this.determineHighestRisk(contexts);
        const contextTypes = [...new Set(contexts.map(ctx => ctx.type))];
        return {
            contexts,
            hasHighRiskContext,
            highestRisk,
            contextTypes,
        };
    }
    /**
     * Analyzes multiple fields for usage contexts
     * @param fields - Array of field declarations to analyze
     * @returns Array of analysis results
     */
    analyzeFields(fields) {
        return fields.map(field => this.analyzeField(field));
    }
    /**
     * Checks if a specific context type is present in the surrounding code
     * @param field - The field to check
     * @param contextType - The context type to look for
     * @returns true if the context type is detected
     */
    hasContextType(field, contextType) {
        const result = this.analyzeField(field);
        return result.contextTypes.includes(contextType);
    }
    /**
     * Gets the risk level for a field based on its usage contexts
     * @param field - The field to analyze
     * @returns The highest risk level found, or 'low' if no contexts detected
     */
    getRiskLevel(field) {
        const result = this.analyzeField(field);
        return result.highestRisk;
    }
    /**
     * Determines if a field is used in any high-risk context
     * @param field - The field to check
     * @returns true if used in logging, serialization, or API response contexts
     */
    isHighRiskUsage(field) {
        const result = this.analyzeField(field);
        return result.hasHighRiskContext;
    }
    /**
     * Builds combined context text from field context for pattern matching
     */
    buildContextText(field) {
        const parts = [];
        // Add surrounding code (primary source for context detection)
        if (field.context.surroundingCode) {
            parts.push(field.context.surroundingCode);
        }
        // Add comments (may contain context hints)
        if (field.context.comments && field.context.comments.length > 0) {
            parts.push(...field.context.comments);
        }
        // Add parent scope (class/function name may indicate context)
        if (field.context.parentScope) {
            parts.push(field.context.parentScope);
        }
        return parts.join('\n');
    }
    /**
     * Matches context text against a pattern and creates UsageContext if matched
     */
    matchContextPattern(contextText, pattern, field) {
        for (const regex of pattern.patterns) {
            if (regex.test(contextText)) {
                // Determine risk level based on pattern and additional factors
                const risk = this.determineRiskLevel(contextText, pattern, field);
                return {
                    type: pattern.type,
                    location: field.location,
                    risk,
                };
            }
        }
        return null;
    }
    /**
     * Determines the risk level for a detected context
     */
    determineRiskLevel(contextText, pattern, field) {
        // Start with base risk from pattern
        let risk = pattern.baseRisk;
        // Elevate risk if field name suggests sensitivity
        const sensitiveFieldPatterns = [
            /password/i, /secret/i, /token/i, /key/i, /credential/i,
            /ssn/i, /social/i, /credit/i, /card/i, /account/i,
            /email/i, /phone/i, /address/i, /birth/i,
        ];
        const hasSensitiveFieldName = sensitiveFieldPatterns.some(p => p.test(field.name));
        if (hasSensitiveFieldName && risk !== 'high') {
            risk = 'high';
        }
        // Elevate risk if context contains error/exception handling (data may leak in errors)
        const errorPatterns = /\b(?:error|exception|catch|throw|fail)\b/i;
        if (errorPatterns.test(contextText) && pattern.type === 'logging') {
            risk = 'high';
        }
        // Elevate risk for external/public API contexts
        const publicApiPatterns = /\b(?:public|external|api|endpoint|route)\b/i;
        if (publicApiPatterns.test(contextText) && pattern.type === 'api_response') {
            risk = 'high';
        }
        return risk;
    }
    /**
     * Determines the highest risk level from a list of contexts
     */
    determineHighestRisk(contexts) {
        if (contexts.length === 0) {
            return 'low';
        }
        const riskOrder = ['high', 'medium', 'low'];
        for (const risk of riskOrder) {
            if (contexts.some(ctx => ctx.risk === risk)) {
                return risk;
            }
        }
        return 'low';
    }
    /**
     * Registers a custom context pattern
     * @param pattern - The custom pattern to register
     */
    registerPattern(pattern) {
        this.contextPatterns.push(pattern);
    }
    /**
     * Gets all registered context patterns
     */
    getPatterns() {
        return [...this.contextPatterns];
    }
}
exports.UsageContextAnalyzer = UsageContextAnalyzer;
/**
 * Creates a new UsageContextAnalyzer instance
 * @param customPatterns - Optional custom patterns
 * @returns A new UsageContextAnalyzer
 */
function createUsageContextAnalyzer(customPatterns = []) {
    return new UsageContextAnalyzer(customPatterns);
}
/**
 * Convenience function to analyze usage contexts for a field
 * @param field - The field to analyze
 * @returns Analysis result with detected contexts
 */
function analyzeUsageContext(field) {
    const analyzer = new UsageContextAnalyzer();
    return analyzer.analyzeField(field);
}
/**
 * Convenience function to check if a field is used in high-risk contexts
 * @param field - The field to check
 * @returns true if used in logging, serialization, or API response contexts
 */
function isHighRiskUsage(field) {
    const analyzer = new UsageContextAnalyzer();
    return analyzer.isHighRiskUsage(field);
}
//# sourceMappingURL=usage-context-analyzer.js.map