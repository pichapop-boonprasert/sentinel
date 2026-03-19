/**
 * Feedback Recorder for ML improvement
 *
 * Records user feedback on sensitivity detection to enable future
 * machine learning improvements. Stores expected vs actual sensitivity
 * classifications along with field information and pattern match results.
 *
 * Validates: Requirements 3.4
 */
import { MaskingPatternType, UserFeedback } from '../types';
/**
 * Extended feedback record with additional metadata for ML training
 */
export interface FeedbackRecord {
    /** Unique identifier for the feedback record */
    id: string;
    /** Timestamp when feedback was recorded */
    timestamp: Date;
    /** The original user feedback */
    feedback: UserFeedback;
    /** Pattern match results at the time of feedback */
    patternMatchResults: PatternMatchInfo | null;
    /** Confidence score that was assigned */
    originalConfidenceScore: number | null;
    /** File path where the field was found */
    filePath: string | null;
    /** Additional metadata for ML training */
    metadata: FeedbackMetadata;
}
/**
 * Pattern match information at the time of feedback
 */
export interface PatternMatchInfo {
    /** Whether a pattern matched */
    matched: boolean;
    /** The pattern type that matched */
    patternType: MaskingPatternType | null;
    /** Match score from pattern matching */
    matchScore: number;
    /** Context indicators that were found */
    contextIndicatorsFound: string[];
}
/**
 * Additional metadata for ML training
 */
export interface FeedbackMetadata {
    /** User identifier (anonymized) */
    userId?: string;
    /** Session identifier */
    sessionId?: string;
    /** Any additional tags */
    tags?: string[];
}
/**
 * Statistics about recorded feedback
 */
export interface FeedbackStatistics {
    /** Total number of feedback records */
    totalRecords: number;
    /** Number of true positives (correctly identified as sensitive) */
    truePositives: number;
    /** Number of false positives (incorrectly identified as sensitive) */
    falsePositives: number;
    /** Number of true negatives (correctly identified as not sensitive) */
    trueNegatives: number;
    /** Number of false negatives (missed sensitive fields) */
    falseNegatives: number;
    /** Precision: TP / (TP + FP) */
    precision: number;
    /** Recall: TP / (TP + FN) */
    recall: number;
    /** F1 Score: 2 * (precision * recall) / (precision + recall) */
    f1Score: number;
    /** Breakdown by pattern type */
    byPatternType: Record<MaskingPatternType, PatternTypeStats>;
}
/**
 * Statistics for a specific pattern type
 */
export interface PatternTypeStats {
    total: number;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
}
/**
 * Filter options for retrieving feedback
 */
export interface FeedbackFilter {
    /** Filter by pattern type */
    patternType?: MaskingPatternType;
    /** Filter by date range start */
    startDate?: Date;
    /** Filter by date range end */
    endDate?: Date;
    /** Filter by expected sensitivity */
    expectedSensitive?: boolean;
    /** Filter by actual sensitivity */
    actualSensitive?: boolean;
    /** Filter by field name pattern (regex) */
    fieldNamePattern?: RegExp;
    /** Maximum number of records to return */
    limit?: number;
}
/**
 * Options for recording feedback
 */
export interface RecordFeedbackOptions {
    /** Pattern match information */
    patternMatchInfo?: PatternMatchInfo;
    /** Original confidence score */
    confidenceScore?: number;
    /** File path */
    filePath?: string;
    /** Additional metadata */
    metadata?: FeedbackMetadata;
}
/**
 * FeedbackRecorder class for storing and managing user feedback
 * to improve ML detection accuracy over time.
 */
export declare class FeedbackRecorder {
    private records;
    private idCounter;
    /**
     * Creates a new FeedbackRecorder
     * @param initialRecords - Optional initial records to load
     */
    constructor(initialRecords?: FeedbackRecord[]);
    /**
     * Records user feedback for ML improvement
     * @param feedback - The user feedback to record
     * @param options - Additional options and metadata
     * @returns The created feedback record
     *
     * Validates: Requirements 3.4
     */
    recordFeedback(feedback: UserFeedback, options?: RecordFeedbackOptions): FeedbackRecord;
    /**
     * Gets all feedback records
     * @returns Array of all feedback records
     */
    getAllFeedback(): FeedbackRecord[];
    /**
     * Gets feedback records matching the filter criteria
     * @param filter - Filter options
     * @returns Filtered feedback records
     */
    getFeedback(filter: FeedbackFilter): FeedbackRecord[];
    /**
     * Gets feedback for ML training data export
     * Returns records formatted for machine learning training
     * @param filter - Optional filter to apply
     * @returns Array of training data records
     */
    getTrainingData(filter?: FeedbackFilter): MLTrainingRecord[];
    /**
     * Calculates statistics about the recorded feedback
     * @returns Aggregated statistics
     */
    getStatistics(): FeedbackStatistics;
    /**
     * Gets the count of feedback records
     * @returns Number of records
     */
    getRecordCount(): number;
    /**
     * Gets a feedback record by ID
     * @param id - The record ID
     * @returns The record if found, undefined otherwise
     */
    getRecordById(id: string): FeedbackRecord | undefined;
    /**
     * Removes a feedback record by ID
     * @param id - The record ID to remove
     * @returns true if removed, false if not found
     */
    removeRecord(id: string): boolean;
    /**
     * Clears all feedback records
     */
    clearAllRecords(): void;
    /**
     * Exports all records for persistence
     * @returns Array of feedback records for serialization
     */
    exportRecords(): FeedbackRecord[];
    /**
     * Imports records from persistence
     * @param records - Records to import
     * @param merge - If true, merges with existing records. If false, replaces all.
     */
    importRecords(records: FeedbackRecord[], merge?: boolean): void;
    /**
     * Generates a unique ID for a feedback record
     */
    private generateId;
}
/**
 * ML Training record format for export
 */
export interface MLTrainingRecord {
    fieldName: string;
    expectedSensitive: boolean;
    actualSensitive: boolean;
    patternType: MaskingPatternType | null;
    context: string;
    patternMatched: boolean;
    matchScore: number;
    confidenceScore: number;
    contextIndicators: string[];
    isCorrectPrediction: boolean;
}
/**
 * Creates a new FeedbackRecorder instance
 * @param initialRecords - Optional initial records
 * @returns A new FeedbackRecorder
 */
export declare function createFeedbackRecorder(initialRecords?: FeedbackRecord[]): FeedbackRecorder;
//# sourceMappingURL=feedback-recorder.d.ts.map