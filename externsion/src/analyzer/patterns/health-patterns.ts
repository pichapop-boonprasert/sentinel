/**
 * Health information patterns
 * Detects: medical record, diagnosis, and health-related patterns
 * Validates: Requirements 2.4
 */

import { MaskingPattern } from '../../types';
import { createPattern } from './types';

/**
 * Medical record patterns - detects medical record number fields
 */
export const medicalRecordPatterns: MaskingPattern = createPattern(
  'health-medicalrecord',
  'Medical Record Number',
  'health',
  [
    /^(medical|health)[-_]?record[-_]?(number|num|no|id)?$/i,
    /^mrn$/i,
    /^(patient|chart)[-_]?(id|number|num)?$/i,
    /^(health|medical)[-_]?id$/i,
    /^(emr|ehr)[-_]?(id|number)?$/i,
    /^(hospital|clinic)[-_]?(id|number|record)?$/i,
  ],
  [
    // Medical record number formats (varies by institution)
    /^[A-Z]{2,3}\d{6,10}$/,
    /^\d{6,12}$/,
    /^[A-Z]\d{7,9}$/,
  ],
  ['medical', 'patient', 'record', 'health', 'hospital', 'clinic', 'chart']
);

/**
 * Diagnosis patterns - detects diagnosis and condition fields
 */
export const diagnosisPatterns: MaskingPattern = createPattern(
  'health-diagnosis',
  'Medical Diagnosis',
  'health',
  [
    /^diagnosis$/i,
    /^(primary|secondary|principal)[-_]?diagnosis$/i,
    /^(icd|icd[-_]?10|icd[-_]?9)[-_]?(code|diagnosis)?$/i,
    /^(medical|health)[-_]?condition$/i,
    /^(disease|illness|disorder)[-_]?(name|code)?$/i,
    /^dx[-_]?(code)?$/i,
    /^(clinical|diagnostic)[-_]?(code|finding)?$/i,
  ],
  [
    // ICD-10 code format
    /^[A-Z]\d{2}(\.\d{1,4})?$/,
    // ICD-9 code format
    /^\d{3}(\.\d{1,2})?$/,
  ],
  ['diagnosis', 'condition', 'disease', 'medical', 'clinical', 'icd', 'health']
);

/**
 * Treatment patterns - detects treatment and procedure fields
 */
export const treatmentPatterns: MaskingPattern = createPattern(
  'health-treatment',
  'Medical Treatment',
  'health',
  [
    /^treatment$/i,
    /^(treatment|procedure)[-_]?(code|name|type)?$/i,
    /^(cpt|hcpcs)[-_]?(code)?$/i,
    /^(surgery|operation)[-_]?(type|name|code)?$/i,
    /^(therapy|medication|prescription)[-_]?(name|type)?$/i,
    /^(drug|medicine)[-_]?(name|code)?$/i,
  ],
  [
    // CPT code format
    /^\d{5}$/,
    // HCPCS code format
    /^[A-Z]\d{4}$/,
  ],
  ['treatment', 'procedure', 'surgery', 'therapy', 'medication', 'prescription']
);

/**
 * Health insurance patterns - detects insurance-related fields
 */
export const healthInsurancePatterns: MaskingPattern = createPattern(
  'health-insurance',
  'Health Insurance Information',
  'health',
  [
    /^(health|medical)[-_]?insurance[-_]?(id|number|policy)?$/i,
    /^(insurance|policy)[-_]?(id|number|num)?$/i,
    /^(member|subscriber|group)[-_]?(id|number)?$/i,
    /^(medicare|medicaid)[-_]?(id|number)?$/i,
    /^(npi|provider)[-_]?(id|number)?$/i,
    /^(beneficiary|enrollee)[-_]?(id|number)?$/i,
  ],
  [
    // Medicare Beneficiary Identifier (MBI)
    /^\d[A-Z][A-Z0-9]\d[A-Z][A-Z0-9]\d[A-Z]{2}\d{2}$/,
    // Generic insurance ID
    /^[A-Z]{3}\d{9,12}$/,
    // NPI (10 digits)
    /^\d{10}$/,
  ],
  ['insurance', 'policy', 'medicare', 'medicaid', 'member', 'coverage', 'health']
);

/**
 * Lab/Test results patterns - detects laboratory and test result fields
 */
export const labResultPatterns: MaskingPattern = createPattern(
  'health-labresult',
  'Laboratory Results',
  'health',
  [
    /^(lab|test)[-_]?(result|value|finding)?$/i,
    /^(blood|urine|specimen)[-_]?(test|result|sample)?$/i,
    /^(loinc|snomed)[-_]?(code)?$/i,
    /^(vital|vitals)[-_]?(sign|reading)?$/i,
    /^(blood[-_]?pressure|bp|heart[-_]?rate|pulse|temperature|weight|height|bmi)$/i,
    /^(glucose|cholesterol|hemoglobin|a1c)[-_]?(level|value)?$/i,
  ],
  [
    // LOINC code format
    /^\d{3,5}[-]?\d$/,
    // SNOMED CT code
    /^\d{6,18}$/,
  ],
  ['lab', 'test', 'result', 'blood', 'specimen', 'vital', 'clinical']
);

/**
 * Genetic/Biometric patterns - detects genetic and biometric data fields
 */
export const geneticPatterns: MaskingPattern = createPattern(
  'health-genetic',
  'Genetic/Biometric Data',
  'health',
  [
    /^(genetic|dna|genome|genomic)[-_]?(data|sequence|info)?$/i,
    /^(biometric|fingerprint|retina|iris)[-_]?(data|scan|id)?$/i,
    /^(face|facial)[-_]?(recognition|data|id)?$/i,
    /^(gene|allele|mutation)[-_]?(name|variant)?$/i,
    /^(ancestry|ethnicity|race)[-_]?(data|info)?$/i,
  ],
  [],  // No specific value patterns for genetic data
  ['genetic', 'dna', 'biometric', 'fingerprint', 'genome', 'ancestry']
);

/**
 * All health patterns combined
 */
export const healthPatterns: MaskingPattern[] = [
  medicalRecordPatterns,
  diagnosisPatterns,
  treatmentPatterns,
  healthInsurancePatterns,
  labResultPatterns,
  geneticPatterns,
];
