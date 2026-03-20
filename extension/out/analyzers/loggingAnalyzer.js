"use strict";
/**
 * Logging Analyzer for detecting unmasked sensitive fields in logging statements.
 *
 * This module detects sensitive fields being logged without proper masking
 * in both .NET and JavaScript/TypeScript code. It supports various masking
 * functions (Mask, Redact, Anonymize, Hash) and mask literals.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingAnalyzer = exports.JS_LOG_FUNCTIONS = exports.DOTNET_LOG_FUNCTIONS = void 0;
const vscode = require("vscode");
const patternMatcher_1 = require("../patterns/patternMatcher");
const diagnosticGenerator_1 = require("../diagnostics/diagnosticGenerator");
/**
 * .NET logging functions to detect.
 */
exports.DOTNET_LOG_FUNCTIONS = [
    'Console.WriteLine', 'Console.Write',
    'Debug.WriteLine', 'Debug.Write', 'Debug.Log',
    'Trace.WriteLine', 'Trace.Write',
    'LogInformation', 'LogWarning', 'LogError', 'LogDebug', 'LogTrace', 'LogCritical',
    'Log.Information', 'Log.Warning', 'Log.Error', 'Log.Debug', 'Log.Verbose', 'Log.Fatal',
];
/**
 * JavaScript/TypeScript logging functions to detect.
 */
exports.JS_LOG_FUNCTIONS = [
    'console.log', 'console.warn', 'console.error',
    'console.info', 'console.debug', 'console.trace',
];
/**
 * Short method names that require a dot prefix (e.g., logger.Info()).
 */
const SHORT_LOG_METHODS = ['Info', 'Warn', 'Error', 'Debug', 'Fatal', 'Trace'];
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
 */
class LoggingAnalyzer {
    constructor() {
        this.patternMatcher = new patternMatcher_1.PatternMatcher();
        this.diagnosticGenerator = new diagnosticGenerator_1.DiagnosticGenerator();
    }
    /**
     * Find all logging function call spans in document text.
     *
     * @param text - The document text to analyze
     * @param languageId - The VS Code language ID (e.g., 'csharp', 'typescript')
     * @param extraFunctions - Additional logging functions to detect
     * @returns Array of LoggingSpan objects representing logging function arguments
     *
     * Requirements: 5.4
     */
    findLoggingSpans(text, languageId, extraFunctions = []) {
        const spans = [];
        const isJs = ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'].includes(languageId);
        const funcs = [
            ...(isJs ? exports.JS_LOG_FUNCTIONS : exports.DOTNET_LOG_FUNCTIONS),
            ...extraFunctions,
        ];
        // Find standard logging function calls
        for (const func of funcs) {
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
        // Short method names (Info, Warn, etc.) require dot prefix for .NET
        if (!isJs) {
            for (const method of SHORT_LOG_METHODS) {
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
     * 2. Mask literals appear in the same logging arguments ([REDACTED], [MASKED], ***)
     *
     * @param argText - The text of the logging function arguments
     * @param position - The position of the field within argText
     * @param extraMaskPatterns - Additional masking patterns to check
     * @returns true if the field is properly masked, false otherwise
     *
     * Requirements: 5.2, 5.3
     */
    isMasked(argText, position, extraMaskPatterns = []) {
        const allMaskMethods = [...MASK_METHOD_PATTERNS, ...extraMaskPatterns];
        // Check if PII is inside a mask method call
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
     * @param document - The VS Code text document to analyze
     * @param patterns - Array of sensitive patterns to check for
     * @param extraLoggingFunctions - Additional logging functions to detect
     * @param extraMaskingPatterns - Additional masking patterns to check
     * @returns Array of VS Code diagnostics for unmasked logging
     *
     * Requirements: 5.1, 5.2, 5.3, 5.4
     */
    analyze(document, patterns, extraLoggingFunctions = [], extraMaskingPatterns = []) {
        const diagnostics = [];
        const text = document.getText();
        const languageId = document.languageId;
        const spans = this.findLoggingSpans(text, languageId, extraLoggingFunctions);
        if (spans.length === 0) {
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
                // Use PatternMatcher to find matching sensitive pattern
                const matchedPattern = this.patternMatcher.matches(identifier, patterns);
                if (!matchedPattern) {
                    continue;
                }
                const relStart = m.index;
                if (this.isMasked(argText, relStart, extraMaskingPatterns)) {
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
}
exports.LoggingAnalyzer = LoggingAnalyzer;
//# sourceMappingURL=loggingAnalyzer.js.map