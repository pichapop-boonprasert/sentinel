/**
 * Health information patterns
 * Detects: medical record, diagnosis, and health-related patterns
 * Validates: Requirements 2.4
 */
import { MaskingPattern } from '../../types';
/**
 * Medical record patterns - detects medical record number fields
 */
export declare const medicalRecordPatterns: MaskingPattern;
/**
 * Diagnosis patterns - detects diagnosis and condition fields
 */
export declare const diagnosisPatterns: MaskingPattern;
/**
 * Treatment patterns - detects treatment and procedure fields
 */
export declare const treatmentPatterns: MaskingPattern;
/**
 * Health insurance patterns - detects insurance-related fields
 */
export declare const healthInsurancePatterns: MaskingPattern;
/**
 * Lab/Test results patterns - detects laboratory and test result fields
 */
export declare const labResultPatterns: MaskingPattern;
/**
 * Genetic/Biometric patterns - detects genetic and biometric data fields
 */
export declare const geneticPatterns: MaskingPattern;
/**
 * All health patterns combined
 */
export declare const healthPatterns: MaskingPattern[];
//# sourceMappingURL=health-patterns.d.ts.map