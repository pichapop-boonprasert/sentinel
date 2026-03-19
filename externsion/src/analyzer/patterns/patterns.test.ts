/**
 * Tests for built-in sensitive data patterns
 */

import { describe, it, expect } from 'vitest';
import {
  builtInPatterns,
  getPatternsByType,
  getPatternById,
  getPatternIdsByType,
  piiPatterns,
  credentialsPatterns,
  financialPatterns,
  healthPatterns,
} from './index';

describe('Pattern Collections', () => {
  describe('builtInPatterns', () => {
    it('should contain all pattern types', () => {
      const types = new Set(builtInPatterns.map(p => p.type));
      expect(types.has('pii')).toBe(true);
      expect(types.has('credentials')).toBe(true);
      expect(types.has('financial')).toBe(true);
      expect(types.has('health')).toBe(true);
    });

    it('should have unique IDs for all patterns', () => {
      const ids = builtInPatterns.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have non-empty names for all patterns', () => {
      builtInPatterns.forEach(pattern => {
        expect(pattern.name).toBeTruthy();
        expect(pattern.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getPatternsByType', () => {
    it('should return PII patterns for pii type', () => {
      const patterns = getPatternsByType('pii');
      expect(patterns).toEqual(piiPatterns);
      expect(patterns.every(p => p.type === 'pii')).toBe(true);
    });

    it('should return credentials patterns for credentials type', () => {
      const patterns = getPatternsByType('credentials');
      expect(patterns).toEqual(credentialsPatterns);
      expect(patterns.every(p => p.type === 'credentials')).toBe(true);
    });

    it('should return financial patterns for financial type', () => {
      const patterns = getPatternsByType('financial');
      expect(patterns).toEqual(financialPatterns);
      expect(patterns.every(p => p.type === 'financial')).toBe(true);
    });

    it('should return health patterns for health type', () => {
      const patterns = getPatternsByType('health');
      expect(patterns).toEqual(healthPatterns);
      expect(patterns.every(p => p.type === 'health')).toBe(true);
    });

    it('should return empty array for custom type', () => {
      const patterns = getPatternsByType('custom');
      expect(patterns).toEqual([]);
    });
  });

  describe('getPatternById', () => {
    it('should find pattern by ID', () => {
      const pattern = getPatternById('pii-email');
      expect(pattern).toBeDefined();
      expect(pattern?.name).toBe('Email Address');
      expect(pattern?.type).toBe('pii');
    });

    it('should return undefined for non-existent ID', () => {
      const pattern = getPatternById('non-existent-id');
      expect(pattern).toBeUndefined();
    });
  });

  describe('getPatternIdsByType', () => {
    it('should return IDs grouped by type', () => {
      const idsByType = getPatternIdsByType();
      expect(idsByType.pii.length).toBe(piiPatterns.length);
      expect(idsByType.credentials.length).toBe(credentialsPatterns.length);
      expect(idsByType.financial.length).toBe(financialPatterns.length);
      expect(idsByType.health.length).toBe(healthPatterns.length);
      expect(idsByType.custom).toEqual([]);
    });
  });
});

describe('PII Patterns', () => {
  describe('Name patterns', () => {
    const namePattern = getPatternById('pii-name')!;

    it('should match common name field patterns', () => {
      const testFields = ['firstName', 'lastName', 'fullName', 'userName', 'name', 'displayName'];
      testFields.forEach(field => {
        const matches = namePattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });

    it('should have appropriate context indicators', () => {
      expect(namePattern.contextIndicators).toContain('user');
      expect(namePattern.contextIndicators).toContain('customer');
      expect(namePattern.contextIndicators).toContain('person');
    });
  });

  describe('Email patterns', () => {
    const emailPattern = getPatternById('pii-email')!;

    it('should match email field patterns', () => {
      const testFields = ['email', 'userEmail', 'emailAddress', 'contactEmail'];
      testFields.forEach(field => {
        const matches = emailPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });

    it('should match email value patterns', () => {
      const testValues = ['test@example.com', 'user.name@domain.org'];
      testValues.forEach(value => {
        const matches = emailPattern.valuePatterns.some(regex => regex.test(value));
        expect(matches).toBe(true);
      });
    });
  });

  describe('Phone patterns', () => {
    const phonePattern = getPatternById('pii-phone')!;

    it('should match phone field patterns', () => {
      const testFields = ['phone', 'phoneNumber', 'mobilePhone', 'cellPhone', 'telephone'];
      testFields.forEach(field => {
        const matches = phonePattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });
  });

  describe('SSN patterns', () => {
    const ssnPattern = getPatternById('pii-ssn')!;

    it('should match SSN field patterns', () => {
      const testFields = ['ssn', 'socialSecurityNumber', 'social_security', 'taxId'];
      testFields.forEach(field => {
        const matches = ssnPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });

    it('should match SSN value patterns', () => {
      const testValues = ['123-45-6789', '123456789'];
      testValues.forEach(value => {
        const matches = ssnPattern.valuePatterns.some(regex => regex.test(value));
        expect(matches).toBe(true);
      });
    });
  });
});

describe('Credentials Patterns', () => {
  describe('Password patterns', () => {
    const passwordPattern = getPatternById('credentials-password')!;

    it('should match password field patterns', () => {
      const testFields = ['password', 'userPassword', 'pwd', 'passwd', 'newPassword'];
      testFields.forEach(field => {
        const matches = passwordPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });
  });

  describe('API Key patterns', () => {
    const apiKeyPattern = getPatternById('credentials-apikey')!;

    it('should match API key field patterns', () => {
      const testFields = ['apiKey', 'api_key', 'accessKey', 'privateKey', 'stripeApiKey'];
      testFields.forEach(field => {
        const matches = apiKeyPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });
  });

  describe('Token patterns', () => {
    const tokenPattern = getPatternById('credentials-token')!;

    it('should match token field patterns', () => {
      const testFields = ['token', 'accessToken', 'refreshToken', 'authToken', 'bearerToken'];
      testFields.forEach(field => {
        const matches = tokenPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });

    it('should match JWT value patterns', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const matches = tokenPattern.valuePatterns.some(regex => regex.test(jwt));
      expect(matches).toBe(true);
    });
  });
});

describe('Financial Patterns', () => {
  describe('Credit Card patterns', () => {
    const ccPattern = getPatternById('financial-creditcard')!;

    it('should match credit card field patterns', () => {
      const testFields = ['creditCard', 'cardNumber', 'ccNumber', 'pan'];
      testFields.forEach(field => {
        const matches = ccPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });

    it('should match credit card value patterns', () => {
      const testValues = ['4111111111111111', '4111-1111-1111-1111', '4111 1111 1111 1111'];
      testValues.forEach(value => {
        const matches = ccPattern.valuePatterns.some(regex => regex.test(value));
        expect(matches).toBe(true);
      });
    });
  });

  describe('Bank Account patterns', () => {
    const bankPattern = getPatternById('financial-bankaccount')!;

    it('should match bank account field patterns', () => {
      const testFields = ['bankAccount', 'accountNumber', 'iban', 'routingNumber'];
      testFields.forEach(field => {
        const matches = bankPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });
  });
});

describe('Health Patterns', () => {
  describe('Medical Record patterns', () => {
    const mrPattern = getPatternById('health-medicalrecord')!;

    it('should match medical record field patterns', () => {
      const testFields = ['medicalRecord', 'mrn', 'patientId', 'chartNumber'];
      testFields.forEach(field => {
        const matches = mrPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });
  });

  describe('Diagnosis patterns', () => {
    const diagnosisPattern = getPatternById('health-diagnosis')!;

    it('should match diagnosis field patterns', () => {
      const testFields = ['diagnosis', 'icd10Code', 'medicalCondition', 'dxCode'];
      testFields.forEach(field => {
        const matches = diagnosisPattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });

    it('should match ICD-10 code patterns', () => {
      const testValues = ['A00', 'A00.1', 'Z99.89'];
      testValues.forEach(value => {
        const matches = diagnosisPattern.valuePatterns.some(regex => regex.test(value));
        expect(matches).toBe(true);
      });
    });
  });

  describe('Health Insurance patterns', () => {
    const insurancePattern = getPatternById('health-insurance')!;

    it('should match health insurance field patterns', () => {
      const testFields = ['insuranceId', 'memberId', 'policyNumber', 'medicareId'];
      testFields.forEach(field => {
        const matches = insurancePattern.fieldNamePatterns.some(regex => regex.test(field));
        expect(matches).toBe(true);
      });
    });
  });
});
