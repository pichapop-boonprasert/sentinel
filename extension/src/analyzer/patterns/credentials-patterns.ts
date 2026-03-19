/**
 * Credentials patterns
 * Detects: password, API key, secret, token, and authentication-related patterns
 * Validates: Requirements 2.2
 */

import { MaskingPattern } from '../../types';
import { createPattern } from './types';

/**
 * Password patterns - detects password fields
 */
export const passwordPatterns: MaskingPattern = createPattern(
  'credentials-password',
  'Password',
  'credentials',
  [
    /^pass(word)?$/i,
    /^(user|admin|root|db|database|app|application|service|system)[-_]?pass(word)?$/i,
    /^(new|old|current|confirm|temp|temporary)[-_]?pass(word)?$/i,
    /^pwd$/i,
    /^passwd$/i,
    /pass(word)?[-_]?(hash|salt)?$/i,
    /^(hashed|encrypted)[-_]?pass(word)?$/i,
  ],
  [
    // Password-like patterns (hashed or complex strings)
    /^\$2[aby]?\$\d{1,2}\$[./A-Za-z0-9]{53}$/,  // bcrypt hash
    /^[a-f0-9]{32}$/i,  // MD5 hash
    /^[a-f0-9]{64}$/i,  // SHA-256 hash
  ],
  ['auth', 'login', 'credential', 'security', 'authentication', 'password']
);

/**
 * API Key patterns - detects API key fields
 */
export const apiKeyPatterns: MaskingPattern = createPattern(
  'credentials-apikey',
  'API Key',
  'credentials',
  [
    /^api[-_]?key$/i,
    /^(access|private|public|service|client)[-_]?key$/i,
    /^(aws|azure|gcp|google|stripe|twilio|sendgrid|github|gitlab)[-_]?(api)?[-_]?key$/i,
    /key[-_]?(id|secret)?$/i,
    /^x[-_]?api[-_]?key$/i,
  ],
  [
    // Common API key formats
    /^[A-Za-z0-9]{20,}$/,  // Generic long alphanumeric
    /^sk[-_][a-zA-Z0-9]{24,}$/,  // Stripe-style secret key
    /^pk[-_][a-zA-Z0-9]{24,}$/,  // Stripe-style public key
    /^AKIA[0-9A-Z]{16}$/,  // AWS Access Key ID
  ],
  ['api', 'key', 'integration', 'service', 'external', 'third-party']
);

/**
 * Secret patterns - detects secret/sensitive configuration fields
 */
export const secretPatterns: MaskingPattern = createPattern(
  'credentials-secret',
  'Secret',
  'credentials',
  [
    /^secret$/i,
    /^(api|app|application|client|jwt|signing|encryption)[-_]?secret$/i,
    /^(aws|azure|gcp|google)[-_]?secret$/i,
    /secret[-_]?(key|value|token)?$/i,
    /^(shared|private)[-_]?secret$/i,
  ],
  [
    // Secret-like patterns (long random strings)
    /^[A-Za-z0-9+/]{40,}={0,2}$/,  // Base64-like
    /^[a-f0-9]{40,}$/i,  // Hex string
  ],
  ['secret', 'confidential', 'private', 'sensitive', 'security', 'encryption']
);

/**
 * Token patterns - detects authentication tokens
 */
export const tokenPatterns: MaskingPattern = createPattern(
  'credentials-token',
  'Authentication Token',
  'credentials',
  [
    /^token$/i,
    /^(access|refresh|auth|bearer|session|csrf|xsrf|jwt|oauth)[-_]?token$/i,
    /^(api|service|user|client)[-_]?token$/i,
    /token[-_]?(value|string|data)?$/i,
    /^id[-_]?token$/i,
  ],
  [
    // JWT format
    /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
    // Generic token patterns
    /^[A-Za-z0-9_-]{20,}$/,
  ],
  ['token', 'auth', 'session', 'bearer', 'oauth', 'jwt', 'authentication']
);

/**
 * Authentication patterns - detects general auth-related fields
 */
export const authPatterns: MaskingPattern = createPattern(
  'credentials-auth',
  'Authentication Credential',
  'credentials',
  [
    /^(auth|authentication)[-_]?(key|code|credential)?$/i,
    /^(private|signing|encryption)[-_]?key$/i,
    /^(connection|db|database)[-_]?string$/i,
    /^(certificate|cert)[-_]?(key|password)?$/i,
    /^(ssh|ssl|tls)[-_]?(key|cert|password)?$/i,
    /^credentials?$/i,
    /^(basic|digest)[-_]?auth$/i,
  ],
  [
    // Connection string patterns
    /^(mongodb|mysql|postgres|redis|amqp):\/\//i,
    // PEM key header
    /^-----BEGIN\s+(RSA\s+)?(PRIVATE|PUBLIC)\s+KEY-----/,
  ],
  ['auth', 'credential', 'certificate', 'connection', 'database', 'ssh', 'ssl']
);

/**
 * All credentials patterns combined
 */
export const credentialsPatterns: MaskingPattern[] = [
  passwordPatterns,
  apiKeyPatterns,
  secretPatterns,
  tokenPatterns,
  authPatterns,
];
