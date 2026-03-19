/**
 * Financial data patterns
 * Detects: credit card number, bank account, and payment-related patterns
 * Validates: Requirements 2.3
 */
import { MaskingPattern } from '../../types';
/**
 * Credit card patterns - detects credit card number fields
 */
export declare const creditCardPatterns: MaskingPattern;
/**
 * CVV/CVC patterns - detects card security codes
 */
export declare const cvvPatterns: MaskingPattern;
/**
 * Bank account patterns - detects bank account number fields
 */
export declare const bankAccountPatterns: MaskingPattern;
/**
 * Payment patterns - detects general payment-related fields
 */
export declare const paymentPatterns: MaskingPattern;
/**
 * Tax/Financial ID patterns - detects tax-related identifiers
 */
export declare const taxIdPatterns: MaskingPattern;
/**
 * All financial patterns combined
 */
export declare const financialPatterns: MaskingPattern[];
//# sourceMappingURL=financial-patterns.d.ts.map