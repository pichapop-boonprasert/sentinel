"use strict";
/**
 * PII (Personally Identifiable Information) patterns
 * Detects: name, email, phone number, address, date of birth, social security number
 * Validates: Requirements 2.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.piiPatterns = exports.ssnPatterns = exports.dateOfBirthPatterns = exports.addressPatterns = exports.phonePatterns = exports.emailPatterns = exports.namePatterns = void 0;
const types_1 = require("./types");
/**
 * Name patterns - detects fields containing personal names
 */
exports.namePatterns = (0, types_1.createPattern)('pii-name', 'Personal Name', 'pii', [
    /^(first|last|middle|full|user|customer|client|patient|employee|person|display)[-_]?name$/i,
    /^name$/i,
    /^(given|family|sur)[-_]?name$/i,
    /^(first|last|middle)$/i,
    /^(author|owner|creator|recipient|sender)[-_]?name$/i,
    /name(first|last|middle|full)?$/i,
], [
    // Common name patterns (basic validation, not comprehensive)
    /^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/,
], ['user', 'customer', 'person', 'profile', 'account', 'identity', 'contact']);
/**
 * Email patterns - detects email address fields
 */
exports.emailPatterns = (0, types_1.createPattern)('pii-email', 'Email Address', 'pii', [
    /^e[-_]?mail$/i,
    /^(user|customer|client|contact|primary|secondary|work|personal|business)[-_]?e?mail$/i,
    /e[-_]?mail[-_]?(address|addr)?$/i,
    /^email[-_]?(id|address)?$/i,
], [
    // Email format validation
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
], ['contact', 'user', 'notification', 'communication', 'account', 'registration']);
/**
 * Phone number patterns - detects phone/mobile number fields
 */
exports.phonePatterns = (0, types_1.createPattern)('pii-phone', 'Phone Number', 'pii', [
    /^phone$/i,
    /^(phone|tel|telephone|mobile|cell|fax)[-_]?(number|num|no)?$/i,
    /^(home|work|office|business|personal|primary|secondary|emergency)[-_]?(phone|tel|mobile|cell)$/i,
    /(phone|tel|mobile|cell)[-_]?(number|num)?$/i,
], [
    // Various phone number formats
    /^\+?[1-9]\d{1,14}$/, // E.164 format
    /^\(\d{3}\)\s?\d{3}[-.]?\d{4}$/, // US format (xxx) xxx-xxxx
    /^\d{3}[-.]?\d{3}[-.]?\d{4}$/, // US format xxx-xxx-xxxx
    /^\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/, // International
], ['contact', 'phone', 'mobile', 'call', 'sms', 'communication']);
/**
 * Address patterns - detects physical address fields
 */
exports.addressPatterns = (0, types_1.createPattern)('pii-address', 'Physical Address', 'pii', [
    /^address$/i,
    /^(street|home|work|billing|shipping|mailing|postal|physical|residential)[-_]?address$/i,
    /^(address|addr)[-_]?(line)?[-_]?[1-3]?$/i,
    /^(street|city|state|province|country|zip|postal)[-_]?(code|name)?$/i,
    /^zip[-_]?code$/i,
    /^postal[-_]?code$/i,
], [
    // Basic address patterns
    /^\d+\s+[A-Za-z]+/, // Street address starting with number
    /^\d{5}(-\d{4})?$/, // US ZIP code
    /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, // Canadian postal code
], ['address', 'location', 'shipping', 'billing', 'delivery', 'residence']);
/**
 * Date of birth patterns - detects birth date fields
 */
exports.dateOfBirthPatterns = (0, types_1.createPattern)('pii-dob', 'Date of Birth', 'pii', [
    /^(date[-_]?of[-_]?)?birth$/i,
    /^dob$/i,
    /^birth[-_]?(date|day)$/i,
    /^(birthday|bday)$/i,
    /^born[-_]?(on|date)?$/i,
], [
    // Date formats
    /^\d{4}[-/]\d{2}[-/]\d{2}$/, // YYYY-MM-DD
    /^\d{2}[-/]\d{2}[-/]\d{4}$/, // MM/DD/YYYY or DD/MM/YYYY
    /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/, // Flexible date format
], ['birth', 'age', 'birthday', 'personal', 'identity', 'profile']);
/**
 * Social Security Number patterns - detects SSN fields
 */
exports.ssnPatterns = (0, types_1.createPattern)('pii-ssn', 'Social Security Number', 'pii', [
    /^ssn$/i,
    /^social[-_]?security[-_]?(number|num|no)?$/i,
    /^(national|tax)[-_]?id$/i,
    /^(sin|nin|nino)$/i, // Canadian SIN, UK NIN
    /^tax[-_]?(payer)?[-_]?id$/i,
], [
    // SSN format (US)
    /^\d{3}[-]?\d{2}[-]?\d{4}$/,
    // Masked SSN
    /^[*X]{3}[-]?[*X]{2}[-]?\d{4}$/i,
], ['social', 'security', 'tax', 'government', 'identity', 'national']);
/**
 * All PII patterns combined
 */
exports.piiPatterns = [
    exports.namePatterns,
    exports.emailPatterns,
    exports.phonePatterns,
    exports.addressPatterns,
    exports.dateOfBirthPatterns,
    exports.ssnPatterns,
];
//# sourceMappingURL=pii-patterns.js.map