"use strict";
/**
 * Diagnostic Generator for sensitive field detection.
 *
 * Creates VS Code diagnostics with category labels, compliance references,
 * and category-specific diagnostic codes for detected sensitive fields.
 *
 * Requirements: 7.1, 7.2, 7.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticGenerator = void 0;
const vscode = require("vscode");
const types_1 = require("../patterns/types");
const DIAGNOSTIC_SOURCE = 'PII Checker';
/**
 * Maps pattern categories to human-readable labels for diagnostic messages.
 */
const CATEGORY_LABELS = {
    [types_1.PatternCategory.PII]: 'PII',
    [types_1.PatternCategory.Financial]: 'Financial',
    [types_1.PatternCategory.Health]: 'Health',
    [types_1.PatternCategory.Credentials]: 'Credentials'
};
/**
 * Generates VS Code diagnostics for detected sensitive fields.
 * Includes category labels, compliance references, and category-specific codes.
 */
class DiagnosticGenerator {
    /**
     * Creates a diagnostic for a detected sensitive field.
     *
     * The diagnostic message includes:
     * 1. The category label (PII, Financial, Health, Credentials)
     * 2. The compliance regulations (GDPR, PCI-DSS, HIPAA, etc.)
     * 3. The field name that was detected
     *
     * @param identifier - The field name that was detected
     * @param pattern - The sensitive pattern that matched
     * @param range - The VS Code range where the field was found
     * @param severity - The diagnostic severity level
     * @returns A VS Code Diagnostic with category and compliance information
     *
     * Requirements: 7.1, 7.2, 7.3
     */
    createFieldDiagnostic(identifier, pattern, range, severity) {
        const categoryLabel = CATEGORY_LABELS[pattern.category];
        const complianceList = pattern.compliance.join(', ');
        const diagnosticCode = types_1.DIAGNOSTIC_CODES[pattern.category];
        const message = `⚠️ ${categoryLabel} data detected: "${identifier}" matches sensitive pattern "${pattern.pattern}". ` +
            `This field may contain ${categoryLabel.toLowerCase()} information subject to ${complianceList} regulations. ` +
            `Consider encrypting, hashing, or removing this field.`;
        const diagnostic = new vscode.Diagnostic(range, message, severity);
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostic.code = {
            value: diagnosticCode,
            target: vscode.Uri.parse('https://en.wikipedia.org/wiki/Personal_data')
        };
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostic.relatedInformation = [
            new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse('https://en.wikipedia.org/wiki/Personal_data'), new vscode.Position(0, 0)), `${categoryLabel} data should be protected to comply with ${complianceList}`)
        ];
        return diagnostic;
    }
    /**
     * Creates a diagnostic for unmasked sensitive field logging.
     *
     * Used when a sensitive field is detected inside a logging function call
     * without proper masking. Always uses Warning severity.
     *
     * @param identifier - The field name being logged
     * @param pattern - The sensitive pattern that matched
     * @param range - The VS Code range where the field was found
     * @returns A VS Code Diagnostic for unmasked logging
     *
     * Requirements: 5.1, 7.1, 7.2
     */
    createLoggingDiagnostic(identifier, pattern, range) {
        const categoryLabel = CATEGORY_LABELS[pattern.category];
        const complianceList = pattern.compliance.join(', ');
        const message = `⚠️ ${categoryLabel} data "${identifier}" is being logged without masking. ` +
            `This may violate ${complianceList} regulations. ` +
            `Consider using a masking utility, e.g. MaskHelper.Mask(${identifier})`;
        const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
        diagnostic.source = DIAGNOSTIC_SOURCE;
        diagnostic.code = {
            value: 'pii-logging-unmasked',
            target: vscode.Uri.parse('https://en.wikipedia.org/wiki/Personal_data')
        };
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostic.relatedInformation = [
            new vscode.DiagnosticRelatedInformation(new vscode.Location(vscode.Uri.parse('https://en.wikipedia.org/wiki/Personal_data'), new vscode.Position(0, 0)), `${categoryLabel} data should be masked before logging to prevent data leaks`)
        ];
        return diagnostic;
    }
}
exports.DiagnosticGenerator = DiagnosticGenerator;
//# sourceMappingURL=diagnosticGenerator.js.map