# Requirements Document

## Introduction

This document defines the requirements for enhancing the PII Checker VS Code extension to detect and flag a comprehensive set of sensitive data fields beyond the current `firstName` and `lastName` patterns. The enhancement will cover Personal Identifiable Information (PII), financial data (PCI-DSS), health information (HIPAA), and authentication credentials to help developers comply with data privacy regulations including GDPR, CCPA, and HIPAA.

## Glossary

- **PII_Detector**: The core detection engine that identifies sensitive field patterns in source code and configuration files
- **Logging_Analyzer**: The component that detects unmasked sensitive data being written to logging functions
- **Pattern_Matcher**: The utility that performs case-insensitive, format-agnostic matching of field names against known sensitive patterns
- **Sensitive_Field**: Any field, variable, property, or JSON key that contains or references personally identifiable, financial, health, or authentication data
- **Masking_Detector**: The component that identifies when sensitive data has been properly masked or redacted before logging

## Requirements

### Requirement 1: Personal Identifiable Information (PII) Detection

**User Story:** As a developer, I want the extension to detect all common PII fields, so that I can ensure personal data is properly protected before deployment.

#### Acceptance Criteria

1. WHEN a source file contains fields matching name patterns (firstName, lastName, fullName, middleName, maidenName, nickname, displayName), THE PII_Detector SHALL flag them as potential PII
2. WHEN a source file contains fields matching contact patterns (email, emailAddress, phoneNumber, phone, mobileNumber, faxNumber, homePhone, workPhone), THE PII_Detector SHALL flag them as potential PII
3. WHEN a source file contains fields matching identifier patterns (ssn, socialSecurityNumber, nationalId, passportNumber, driverLicense, driversLicense, taxId, tin), THE PII_Detector SHALL flag them as potential PII
4. WHEN a source file contains fields matching address patterns (address, homeAddress, streetAddress, billingAddress, shippingAddress, zipCode, postalCode), THE PII_Detector SHALL flag them as potential PII
5. WHEN a source file contains fields matching date patterns (dateOfBirth, dob, birthDate, birthYear), THE PII_Detector SHALL flag them as potential PII
6. THE Pattern_Matcher SHALL perform case-insensitive matching that normalizes camelCase, snake_case, kebab-case, and space-separated formats

### Requirement 2: Financial Data (PCI-DSS) Detection

**User Story:** As a developer, I want the extension to detect financial and payment-related fields, so that I can ensure PCI-DSS compliance and protect cardholder data.

#### Acceptance Criteria

1. WHEN a source file contains fields matching credit card patterns (creditCardNumber, cardNumber, cardHolderName, expirationDate, expiryDate, cvv, cvc, securityCode, pan), THE PII_Detector SHALL flag them as potential financial PII
2. WHEN a source file contains fields matching bank account patterns (bankAccountNumber, accountNumber, routingNumber, iban, swiftCode, bic, sortCode), THE PII_Detector SHALL flag them as potential financial PII
3. WHEN a source file contains fields matching payment patterns (paymentInfo, billingInfo, merchantId), THE PII_Detector SHALL flag them as potential financial PII

### Requirement 3: Health Information (HIPAA) Detection

**User Story:** As a developer working on healthcare applications, I want the extension to detect Protected Health Information (PHI) fields, so that I can ensure HIPAA compliance.

#### Acceptance Criteria

1. WHEN a source file contains fields matching patient identifier patterns (patientId, patientName, medicalRecordNumber, mrn, healthRecordId), THE PII_Detector SHALL flag them as potential PHI
2. WHEN a source file contains fields matching medical data patterns (diagnosis, diagnosisCode, treatment, prescription, prescriptionInfo, medicationList, labResults, medicalHistory), THE PII_Detector SHALL flag them as potential PHI
3. WHEN a source file contains fields matching insurance patterns (insuranceId, insurancePolicyNumber, insuranceGroupNumber, memberId, subscriberId), THE PII_Detector SHALL flag them as potential PHI
4. WHEN a source file contains fields matching provider patterns (physicianName, physicianNpi, providerNpi, npi), THE PII_Detector SHALL flag them as potential PHI

### Requirement 4: Authentication Credentials Detection

**User Story:** As a developer, I want the extension to detect authentication and secret fields, so that I can prevent credential leaks in logs and source code.

#### Acceptance Criteria

1. WHEN a source file contains fields matching password patterns (password, passwordHash, passcode, pin, secret, secretKey), THE PII_Detector SHALL flag them as potential credentials
2. WHEN a source file contains fields matching token patterns (accessToken, refreshToken, authToken, bearerToken, jwtToken, sessionToken, apiToken), THE PII_Detector SHALL flag them as potential credentials
3. WHEN a source file contains fields matching key patterns (apiKey, privateKey, publicKey, encryptionKey, signingKey, clientSecret, clientId), THE PII_Detector SHALL flag them as potential credentials
4. WHEN a source file contains fields matching connection patterns (connectionString, databaseUrl, dbPassword), THE PII_Detector SHALL flag them as potential credentials

### Requirement 5: Logging Context Detection for All Sensitive Fields

**User Story:** As a developer, I want the extension to warn me when any sensitive field is logged without masking, so that I can prevent data leaks in application logs.

#### Acceptance Criteria

1. WHEN a sensitive field is used inside a logging function call without masking, THE Logging_Analyzer SHALL generate a warning with code "pii-logging-unmasked"
2. WHEN a sensitive field is wrapped in a masking function (Mask, Redact, Anonymize, Hash), THE Logging_Analyzer SHALL suppress the logging warning
3. WHEN a sensitive field appears in a logging statement alongside mask literals ([REDACTED], [MASKED], ***), THE Logging_Analyzer SHALL suppress the logging warning
4. THE Logging_Analyzer SHALL detect logging in both .NET functions (Console.WriteLine, LogInformation, LogWarning, LogError, Debug.WriteLine) and JavaScript functions (console.log, console.warn, console.error)

### Requirement 6: Configurable Pattern Management

**User Story:** As a developer, I want to customize the sensitive field patterns, so that I can add domain-specific patterns or disable patterns that cause false positives.

#### Acceptance Criteria

1. THE PII_Detector SHALL load default patterns from a built-in configuration organized by category (pii, financial, health, credentials)
2. WHEN a user adds custom patterns via VS Code settings, THE PII_Detector SHALL include them in detection alongside default patterns
3. WHEN a user specifies patterns to exclude via VS Code settings, THE PII_Detector SHALL skip those patterns during detection
4. THE PII_Detector SHALL support enabling or disabling entire categories of patterns via VS Code settings

### Requirement 7: Diagnostic Categorization

**User Story:** As a developer, I want to see which category a detected sensitive field belongs to, so that I can understand the compliance implications.

#### Acceptance Criteria

1. WHEN a sensitive field is detected, THE PII_Detector SHALL include the category (PII, Financial, Health, Credentials) in the diagnostic message
2. WHEN a sensitive field is detected, THE PII_Detector SHALL reference the relevant compliance regulation (GDPR, PCI-DSS, HIPAA) in the diagnostic message
3. THE PII_Detector SHALL use distinct diagnostic codes for each category (pii-field-personal, pii-field-financial, pii-field-health, pii-field-credentials)
