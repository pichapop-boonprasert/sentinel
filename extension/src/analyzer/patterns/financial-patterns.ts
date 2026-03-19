/**
 * Financial data patterns
 * Detects: credit card number, bank account, and payment-related patterns
 * Validates: Requirements 2.3
 */

import { MaskingPattern } from '../../types';
import { createPattern } from './types';

/**
 * Credit card patterns - detects credit card number fields
 */
export const creditCardPatterns: MaskingPattern = createPattern(
  'financial-creditcard',
  'Credit Card Number',
  'financial',
  [
    /^(credit|debit)[-_]?card$/i,
    /^card[-_]?(number|num|no)$/i,
    /^(cc|ccn)[-_]?(number|num)?$/i,
    /^(pan|primary[-_]?account[-_]?number)$/i,
    /^(visa|mastercard|amex|discover)[-_]?(number|card)?$/i,
    /card[-_]?number$/i,
  ],
  [
    // Credit card number formats (with or without spaces/dashes)
    /^\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}$/,  // 16 digits
    /^\d{4}[-\s]?\d{6}[-\s]?\d{5}$/,  // 15 digits (Amex)
    /^\d{13,19}$/,  // Raw digits
    // Masked card numbers
    /^[*X]{4}[-\s]?[*X]{4}[-\s]?[*X]{4}[-\s]?\d{4}$/i,
  ],
  ['payment', 'card', 'credit', 'debit', 'checkout', 'billing', 'transaction']
);

/**
 * CVV/CVC patterns - detects card security codes
 */
export const cvvPatterns: MaskingPattern = createPattern(
  'financial-cvv',
  'Card Security Code',
  'financial',
  [
    /^cvv$/i,
    /^cvc$/i,
    /^(cvv|cvc|cv2|cid)[-_]?(code|number)?$/i,
    /^(card|security)[-_]?(code|verification)$/i,
    /^(card[-_]?)?verification[-_]?(value|code)$/i,
  ],
  [
    // CVV formats (3-4 digits)
    /^\d{3,4}$/,
  ],
  ['cvv', 'cvc', 'security', 'verification', 'card', 'payment']
);

/**
 * Bank account patterns - detects bank account number fields
 */
export const bankAccountPatterns: MaskingPattern = createPattern(
  'financial-bankaccount',
  'Bank Account Number',
  'financial',
  [
    /^bank[-_]?account$/i,
    /^(bank|account)[-_]?(number|num|no)$/i,
    /^(checking|savings|current)[-_]?(account|acct)$/i,
    /^acct[-_]?(number|num|no)?$/i,
    /^(iban|bban)$/i,
    /^(routing|aba|sort)[-_]?(number|code)?$/i,
    /^swift[-_]?(code|bic)?$/i,
  ],
  [
    // IBAN format
    /^[A-Z]{2}\d{2}[A-Z0-9]{4,30}$/,
    // US routing number (9 digits)
    /^\d{9}$/,
    // Generic account numbers
    /^\d{8,17}$/,
    // UK sort code
    /^\d{2}[-]?\d{2}[-]?\d{2}$/,
  ],
  ['bank', 'account', 'routing', 'iban', 'swift', 'transfer', 'wire']
);

/**
 * Payment patterns - detects general payment-related fields
 */
export const paymentPatterns: MaskingPattern = createPattern(
  'financial-payment',
  'Payment Information',
  'financial',
  [
    /^payment[-_]?(method|info|details|data)?$/i,
    /^(billing|payment)[-_]?(address|info)$/i,
    /^(expiry|expiration)[-_]?(date|month|year)?$/i,
    /^exp[-_]?(date|month|year)$/i,
    /^card[-_]?(holder|owner)[-_]?(name)?$/i,
    /^(paypal|stripe|venmo)[-_]?(id|account|email)?$/i,
  ],
  [
    // Expiry date formats
    /^\d{2}\/\d{2}$/,  // MM/YY
    /^\d{2}\/\d{4}$/,  // MM/YYYY
    /^\d{4}[-/]\d{2}$/,  // YYYY-MM
  ],
  ['payment', 'billing', 'checkout', 'purchase', 'transaction', 'order']
);

/**
 * Tax/Financial ID patterns - detects tax-related identifiers
 */
export const taxIdPatterns: MaskingPattern = createPattern(
  'financial-taxid',
  'Tax Identification',
  'financial',
  [
    /^(tax|ein|tin|vat)[-_]?(id|number|num)?$/i,
    /^(employer|business)[-_]?id$/i,
    /^(federal|state)[-_]?tax[-_]?id$/i,
    /^vat[-_]?(number|registration)?$/i,
    /^gst[-_]?(number|id)?$/i,
  ],
  [
    // EIN format (US)
    /^\d{2}[-]?\d{7}$/,
    // VAT number formats
    /^[A-Z]{2}\d{8,12}$/,
    /^[A-Z]{2}[A-Z0-9]{8,12}$/,
  ],
  ['tax', 'ein', 'vat', 'business', 'employer', 'government', 'fiscal']
);

/**
 * All financial patterns combined
 */
export const financialPatterns: MaskingPattern[] = [
  creditCardPatterns,
  cvvPatterns,
  bankAccountPatterns,
  paymentPatterns,
  taxIdPatterns,
];
