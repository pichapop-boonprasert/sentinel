/**
 * Credentials patterns
 * Detects: password, API key, secret, token, and authentication-related patterns
 * Validates: Requirements 2.2
 */
import { MaskingPattern } from '../../types';
/**
 * Password patterns - detects password fields
 */
export declare const passwordPatterns: MaskingPattern;
/**
 * API Key patterns - detects API key fields
 */
export declare const apiKeyPatterns: MaskingPattern;
/**
 * Secret patterns - detects secret/sensitive configuration fields
 */
export declare const secretPatterns: MaskingPattern;
/**
 * Token patterns - detects authentication tokens
 */
export declare const tokenPatterns: MaskingPattern;
/**
 * Authentication patterns - detects general auth-related fields
 */
export declare const authPatterns: MaskingPattern;
/**
 * All credentials patterns combined
 */
export declare const credentialsPatterns: MaskingPattern[];
//# sourceMappingURL=credentials-patterns.d.ts.map