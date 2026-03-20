"use strict";
/**
 * Logging Analyzer for detecting unmasked sensitive fields in logging statements.
 *
 * This module detects sensitive fields being logged without proper masking
 * in both .NET and JavaScript/TypeScript code. It supports various masking
 * functions (Mask, Redact, Anonymize, Hash) and mask literals.
 *
 * Requirements: 4.2, 5.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingAnalyzer = void 0;
const vscode = require("vscode");
const patternMatcher_1 = require("../patterns/patternMatcher");
const patternRegistry_1 = require("../patterns/patternRegistry");
const diagnosticGenerator_1 = require("../diagnostics/diagnosticGenerator");
const loggingMethodRegistry_1 = require("../config/loggingMethodRegistry");
/**
 * Masking method patterns to detect.
 * Supports Mask, Redact, Anonymize, Hash functions as per requirements 5.2.
 */
const MASK_METHOD_PATTERNS = [
    '.Mask(', '.mask(',
    '.Redact(', '.redact(',
    '.Anonymize(', '.anonymize(',
    '.Hash(', '.hash(',
    // Also support standalone function calls
    'Mask(', 'mask(',
    'Redact(', 'redact(',
    'Anonymize(', 'anonymize(',
    'Hash(', 'hash(',
];
/**
 * Mask string literals that indicate data has been masked.
 * As per requirement 5.3.
 */
const MASK_STRING_LITERALS = [
    '***', '[REDACTED]', '[MASKED]', 'XXX', '****',
];
/**
 * LoggingAnalyzer detects sensitive fields in logging contexts and checks for masking.
 *
 * This analyzer integrates with:
 * - PatternRegistry: For getting effective patterns (respects category toggles, exclusions)
 * - LoggingMethodRegistry: For getting effective logging methods (respects user configuration)
 *
 * Requirements: 4.2, 5.1
 */
class LoggingAnalyzer {
    constructor(patternRegistry, loggingMethodRegistry) {
        this.patternMatcher = new patternMatcher_1.PatternMatcher();
        this.diagnosticGenerator = new diagnosticGenerator_1.DiagnosticGenerator();
        this.patternRegistry = patternRegistry || new patternRegistry_1.PatternRegistry();
        this.loggingMethodRegistry = loggingMethodRegistry || new loggingMethodRegistry_1.LoggingMethodRegistry();
    }
    /**
     * Find all logging function call spans in document text.
     *
     * Uses LoggingMethodRegistry to get effective logging methods based on configuration.
     * This respects user-configured logging methods (replace mode per Requirement 8.1).
     *
     * @param text - The document text to analyze
     * @param languageId - The VS Code language ID (e.g., 'csharp', 'typescript')
     * @param extraFunctions - Additional logging functions to detect (deprecated, use configuration instead)
     * @returns Array of LoggingSpan objects representing logging function arguments
     *
     * Requirements: 4.2, 5.1
     */
    findLoggingSpans(text, languageId, extraFunctions = []) {
        const spans = [];
        // Get effective logging methods from registry (respects user configuration)
        const effectiveMethods = this.loggingMethodRegistry.getEffectiveMethods(languageId);
        // If no methods configured (empty array), logging detection is disabled
        if (effectiveMethods.length === 0) {
            return spans;
        }
        // Combine with any extra functions passed directly (for backward compatibility)
        const allMethods = [...effectiveMethods, ...extraFunctions];
        // Find standard logging function calls
        for (const func of allMethods) {
            const escaped = func.replace(/\./g, '\\.');
            const pattern = new RegExp(`\\b${escaped}\\s*\\(`, 'g');
            let m;
            while ((m = pattern.exec(text)) !== null) {
                const parenStart = text.indexOf('(', m.index);
                if (parenStart === -1) {
                    continue;
                }
                const argEnd = this.findMatchingParen(text, parenStart);
                if (argEnd !== -1) {
                    spans.push({ argStart: parenStart + 1, argEnd });
                }
            }
        }
        // Get short method names from registry and find calls with dot prefix
        const shortMethods = this.loggingMethodRegistry.getShortMethods();
        const isJs = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId);
        // Short method names (Info, Warn, etc.) require dot prefix for .NET
        if (!isJs) {
            for (const method of shortMethods) {
                const pattern = new RegExp(`\\.${method}\\s*\\(`, 'g');
                let m;
                while ((m = pattern.exec(text)) !== null) {
                    const parenStart = text.indexOf('(', m.index);
                    if (parenStart === -1) {
                        continue;
                    }
                    const argEnd = this.findMatchingParen(text, parenStart);
                    if (argEnd !== -1) {
                        spans.push({ argStart: parenStart + 1, argEnd });
                    }
                }
            }
        }
        return spans;
    }
    /**
     * Find the matching closing parenthesis for an opening parenthesis.
     * Handles nested parentheses and string literals.
     *
     * @param text - The text to search
     * @param openPos - Position of the opening parenthesis
     * @returns Position of the closing parenthesis, or -1 if not found
     */
    findMatchingParen(text, openPos) {
        let depth = 1;
        let i = openPos + 1;
        while (i < text.length && depth > 0) {
            const ch = text[i];
            if (ch === '(') {
                depth++;
            }
            else if (ch === ')') {
                depth--;
            }
            else if (ch === '"' || ch === "'" || ch === '`') {
                // Skip string literals
                i++;
                while (i < text.length && text[i] !== ch) {
                    if (text[i] === '\\') {
                        i++;
                    }
                    i++;
                }
            }
            if (depth > 0) {
                i++;
            }
        }
        return depth === 0 ? i : -1;
    }
    /**
     * Check if a field reference at a given position is properly masked.
     *
     * A field is considered masked if:
     * 1. It's wrapped in a masking function (Mask, Redact, Anonymize, Hash)
     * 2. The field is followed by a masking method call (e.g., field.Mask())
     * 3. Mask literals appear in the same logging arguments ([REDACTED], [MASKED], ***)
     *
     * @param argText - The text of the logging function arguments
     * @param position - The position of the field within argText
     * @param extraMaskPatterns - Additional masking patterns to check
     * @param identifierLength - The length of the identifier (optional, for checking suffix patterns)
     * @returns true if the field is properly masked, false otherwise
     *
     * Requirements: 5.2, 5.3
     */
    isMasked(argText, position, extraMaskPatterns = [], identifierLength = 0) {
        const allMaskMethods = [...MASK_METHOD_PATTERNS, ...extraMaskPatterns];
        // Check if PII is inside a mask method call (mask function wraps the field)
        for (const mp of allMaskMethods) {
            const base = mp.endsWith('(') ? mp.slice(0, -1) : mp;
            const idx = argText.lastIndexOf(base, position);
            if (idx !== -1) {
                const afterBase = argText.indexOf('(', idx + base.length);
                if (afterBase !== -1 && afterBase <= position) {
                    return true;
                }
            }
        }
        // Check if PII is followed by a masking method call (e.g., field.Mask(), field.abc())
        // Look for patterns like ".methodName(" after the identifier
        const afterIdentifier = position + identifierLength;
        for (const mp of allMaskMethods) {
            if (mp.startsWith('.')) {
                // For patterns like ".Mask(", ".abc(" - check if it appears right after the field
                // Look in the text starting from after the identifier
                const textAfter = argText.substring(afterIdentifier);
                // Check if the masking pattern appears at or near the start (allowing for whitespace)
                const trimmedAfter = textAfter.trimStart();
                if (trimmedAfter.startsWith(mp) || trimmedAfter.startsWith(mp.substring(1))) {
                    return true;
                }
                // Also check for chained calls like .Something.abc()
                const idx = textAfter.indexOf(mp);
                if (idx !== -1 && idx < 30) {
                    // Make sure there's no comma before the mask (same expression)
                    const beforeMask = textAfter.substring(0, idx);
                    if (!beforeMask.includes(',') && !beforeMask.includes(';')) {
                        return true;
                    }
                }
            }
        }
        // Check if mask string literals appear in the same logging args
        for (const ms of MASK_STRING_LITERALS) {
            if (argText.includes(ms)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Analyze document for unmasked sensitive field logging.
     *
     * Uses PatternRegistry to get effective patterns (respects category toggles, exclusions).
     * Uses LoggingMethodRegistry to get effective logging methods (respects user configuration).
     *
     * @param document - The VS Code text document to analyze
     * @param patterns - Array of sensitive patterns to check for (optional, uses PatternRegistry if not provided)
     * @param extraLoggingFunctions - Additional logging functions to detect (deprecated, use configuration instead)
     * @param extraMaskingPatterns - Additional masking patterns to check
     * @returns Array of VS Code diagnostics for unmasked logging
     *
     * Requirements: 4.2, 5.1
     */
    analyze(document, patterns, extraLoggingFunctions = [], extraMaskingPatterns = []) {
        const diagnostics = [];
        const text = document.getText();
        const languageId = document.languageId;
        // Check if logging detection is enabled for this language
        if (!this.loggingMethodRegistry.isDetectionEnabled(languageId)) {
            return diagnostics;
        }
        const spans = this.findLoggingSpans(text, languageId, extraLoggingFunctions);
        if (spans.length === 0) {
            return diagnostics;
        }
        // Use provided patterns or get effective patterns from registry
        // PatternRegistry respects category toggles and exclusions (Requirements 5.1, 5.3, 8.3)
        const effectivePatterns = patterns || this.patternRegistry.getAllEffectivePatterns();
        if (effectivePatterns.length === 0) {
            return diagnostics;
        }
        // Scan each logging span for sensitive identifiers
        const identifierRegex = /\b(\w+)\b/g;
        for (const span of spans) {
            const argText = text.substring(span.argStart, span.argEnd);
            identifierRegex.lastIndex = 0;
            let m;
            while ((m = identifierRegex.exec(argText)) !== null) {
                const identifier = m[1];
                // Use PatternRegistry.matchPattern() for pattern matching
                // This respects category toggles and exclusions
                const matchedPattern = this.patternRegistry.matchPattern(identifier);
                if (!matchedPattern) {
                    continue;
                }
                const relStart = m.index;
                if (this.isMasked(argText, relStart, extraMaskingPatterns, identifier.length)) {
                    continue;
                }
                const absStart = span.argStart + relStart;
                const startPos = document.positionAt(absStart);
                const endPos = document.positionAt(absStart + identifier.length);
                const range = new vscode.Range(startPos, endPos);
                // Avoid duplicate diagnostics on the same range
                const isDuplicate = diagnostics.some((d) => d.range.isEqual(range));
                if (!isDuplicate) {
                    diagnostics.push(this.diagnosticGenerator.createLoggingDiagnostic(identifier, matchedPattern, range));
                }
            }
        }
        return diagnostics;
    }
    /**
     * Refresh the analyzer's registries from configuration.
     * Should be called when configuration changes.
     *
     * Requirements: 3.6, 4.6
     */
    refresh() {
        this.patternRegistry.refresh();
        this.loggingMethodRegistry.refresh();
    }
}
exports.LoggingAnalyzer = LoggingAnalyzer;
//# sourceMappingURL=loggingAnalyzer.js.map