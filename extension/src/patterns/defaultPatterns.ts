/**
 * Default pattern definitions for sensitive field detection.
 * 
 * This module contains the built-in patterns organized by category:
 * - PII: Personal Identifiable Information (names, contacts, identifiers, addresses, dates)
 * - Financial: Credit cards, bank accounts, payment info (PCI-DSS)
 * - Health: Patient identifiers, medical data, insurance, providers (HIPAA)
 * - Credentials: Passwords, tokens, API keys, connection strings
 */

import { PatternCategory } from './types';

/**
 * Default patterns for sensitive field detection, organized by category.
 * Each category maps to an array of field name patterns to match.
 */
export const DEFAULT_PATTERNS: Record<PatternCategory, string[]> = {
  [PatternCategory.PII]: [
    // Names
    "firstName", "lastName", "fullName", "middleName", "maidenName",
    "nickname", "displayName",
    // Contact
    "email", "emailAddress", "phoneNumber", "phone", "mobileNumber",
    "faxNumber", "homePhone", "workPhone",
    // Identifiers
    "ssn", "socialSecurityNumber", "nationalId", "passportNumber",
    "driverLicense", "driversLicense", "taxId", "tin",
    // Address
    "address", "homeAddress", "streetAddress", "billingAddress",
    "shippingAddress", "zipCode", "postalCode",
    // Dates
    "dateOfBirth", "dob", "birthDate", "birthYear"
  ],

  [PatternCategory.Financial]: [
    // Credit Card
    "creditCardNumber", "cardNumber", "cardHolderName", "expirationDate",
    "expiryDate", "cvv", "cvc", "securityCode", "pan",
    // Bank Account
    "bankAccountNumber", "accountNumber", "routingNumber", "iban",
    "swiftCode", "bic", "sortCode",
    // Payment
    "paymentInfo", "billingInfo", "merchantId"
  ],

  [PatternCategory.Health]: [
    // Patient Identifiers
    "patientId", "patientName", "medicalRecordNumber", "mrn", "healthRecordId",
    // Medical Data
    "diagnosis", "diagnosisCode", "treatment", "prescription",
    "prescriptionInfo", "medicationList", "labResults", "medicalHistory",
    // Insurance
    "insuranceId", "insurancePolicyNumber", "insuranceGroupNumber",
    "memberId", "subscriberId",
    // Provider
    "physicianName", "physicianNpi", "providerNpi", "npi"
  ],

  [PatternCategory.Credentials]: [
    // Passwords
    "password", "passwordHash", "passcode", "pin", "secret", "secretKey",
    // Tokens
    "accessToken", "refreshToken", "authToken", "bearerToken",
    "jwtToken", "sessionToken", "apiToken",
    // Keys
    "apiKey", "privateKey", "publicKey", "encryptionKey",
    "signingKey", "clientSecret", "clientId",
    // Connection
    "connectionString", "databaseUrl", "dbPassword"
  ]
};
