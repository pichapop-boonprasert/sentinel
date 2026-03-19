/**
 * PII (Personally Identifiable Information) patterns
 * Detects: name, email, phone number, address, date of birth, social security number
 * Validates: Requirements 2.1
 */
import { MaskingPattern } from '../../types';
/**
 * Name patterns - detects fields containing personal names
 */
export declare const namePatterns: MaskingPattern;
/**
 * Email patterns - detects email address fields
 */
export declare const emailPatterns: MaskingPattern;
/**
 * Phone number patterns - detects phone/mobile number fields
 */
export declare const phonePatterns: MaskingPattern;
/**
 * Address patterns - detects physical address fields
 */
export declare const addressPatterns: MaskingPattern;
/**
 * Date of birth patterns - detects birth date fields
 */
export declare const dateOfBirthPatterns: MaskingPattern;
/**
 * Social Security Number patterns - detects SSN fields
 */
export declare const ssnPatterns: MaskingPattern;
/**
 * All PII patterns combined
 */
export declare const piiPatterns: MaskingPattern[];
//# sourceMappingURL=pii-patterns.d.ts.map