"use strict";
/**
 * Feedback Recorder for ML improvement
 *
 * Records user feedback on sensitivity detection to enable future
 * machine learning improvements. Stores expected vs actual sensitivity
 * classifications along with field information and pattern match results.
 *
 * Validates: Requirements 3.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackRecorder = void 0;
exports.createFeedbackRecorder = createFeedbackRecorder;
/**
 * FeedbackRecorder class for storing and managing user feedback
 * to improve ML detection accuracy over time.
 */
class FeedbackRecorder {
    records = [];
    idCounter = 0;
    /**
     * Creates a new FeedbackRecorder
     * @param initialRecords - Optional initial records to load
     */
    constructor(initialRecords = []) {
        this.records = [...initialRecords];
        // Set idCounter to max existing id + 1
        if (initialRecords.length > 0) {
            const maxId = Math.max(...initialRecords.map(r => parseInt(r.id.replace('feedback-', ''), 10) || 0));
            this.idCounter = maxId + 1;
        }
    }
    /**
     * Records user feedback for ML improvement
     * @param feedback - The user feedback to record
     * @param options - Additional options and metadata
     * @returns The created feedback record
     *
     * Validates: Requirements 3.4
     */
    recordFeedback(feedback, options = {}) {
        const record = {
            id: this.generateId(),
            timestamp: new Date(),
            feedback: { ...feedback },
            patternMatchResults: options.patternMatchInfo || null,
            originalConfidenceScore: options.confidenceScore ?? null,
            filePath: options.filePath || null,
            metadata: options.metadata || {},
        };
        this.records.push(record);
        return record;
    }
    /**
     * Gets all feedback records
     * @returns Array of all feedback records
     */
    getAllFeedback() {
        return [...this.records];
    }
    /**
     * Gets feedback records matching the filter criteria
     * @param filter - Filter options
     * @returns Filtered feedback records
     */
    getFeedback(filter) {
        let results = [...this.records];
        // Filter by pattern type
        if (filter.patternType !== undefined) {
            results = results.filter(r => r.feedback.patternType === filter.patternType);
        }
        // Filter by date range
        if (filter.startDate !== undefined) {
            results = results.filter(r => r.timestamp >= filter.startDate);
        }
        if (filter.endDate !== undefined) {
            results = results.filter(r => r.timestamp <= filter.endDate);
        }
        // Filter by expected sensitivity
        if (filter.expectedSensitive !== undefined) {
            results = results.filter(r => r.feedback.expectedSensitive === filter.expectedSensitive);
        }
        // Filter by actual sensitivity
        if (filter.actualSensitive !== undefined) {
            results = results.filter(r => r.feedback.actualSensitive === filter.actualSensitive);
        }
        // Filter by field name pattern
        if (filter.fieldNamePattern !== undefined) {
            results = results.filter(r => filter.fieldNamePattern.test(r.feedback.fieldName));
        }
        // Apply limit
        if (filter.limit !== undefined && filter.limit > 0) {
            results = results.slice(0, filter.limit);
        }
        return results;
    }
    /**
     * Gets feedback for ML training data export
     * Returns records formatted for machine learning training
     * @param filter - Optional filter to apply
     * @returns Array of training data records
     */
    getTrainingData(filter) {
        const records = filter ? this.getFeedback(filter) : this.records;
        return records.map(record => ({
            fieldName: record.feedback.fieldName,
            expectedSensitive: record.feedback.expectedSensitive,
            actualSensitive: record.feedback.actualSensitive,
            patternType: record.feedback.patternType,
            context: record.feedback.context,
            patternMatched: record.patternMatchResults?.matched ?? false,
            matchScore: record.patternMatchResults?.matchScore ?? 0,
            confidenceScore: record.originalConfidenceScore ?? 0,
            contextIndicators: record.patternMatchResults?.contextIndicatorsFound ?? [],
            isCorrectPrediction: record.feedback.expectedSensitive === record.feedback.actualSensitive,
        }));
    }
    /**
     * Calculates statistics about the recorded feedback
     * @returns Aggregated statistics
     */
    getStatistics() {
        const stats = {
            totalRecords: this.records.length,
            truePositives: 0,
            falsePositives: 0,
            trueNegatives: 0,
            falseNegatives: 0,
            precision: 0,
            recall: 0,
            f1Score: 0,
            byPatternType: {
                pii: { total: 0, truePositives: 0, falsePositives: 0, falseNegatives: 0 },
                credentials: { total: 0, truePositives: 0, falsePositives: 0, falseNegatives: 0 },
                financial: { total: 0, truePositives: 0, falsePositives: 0, falseNegatives: 0 },
                health: { total: 0, truePositives: 0, falsePositives: 0, falseNegatives: 0 },
                custom: { total: 0, truePositives: 0, falsePositives: 0, falseNegatives: 0 },
            },
        };
        for (const record of this.records) {
            const { expectedSensitive, actualSensitive, patternType } = record.feedback;
            // Calculate confusion matrix values
            if (expectedSensitive && actualSensitive) {
                // True Positive: Expected sensitive, detected as sensitive
                stats.truePositives++;
            }
            else if (!expectedSensitive && actualSensitive) {
                // False Positive: Not expected sensitive, but detected as sensitive
                stats.falsePositives++;
            }
            else if (!expectedSensitive && !actualSensitive) {
                // True Negative: Not expected sensitive, not detected as sensitive
                stats.trueNegatives++;
            }
            else if (expectedSensitive && !actualSensitive) {
                // False Negative: Expected sensitive, but not detected
                stats.falseNegatives++;
            }
            // Update pattern type stats
            if (patternType) {
                const typeStats = stats.byPatternType[patternType];
                typeStats.total++;
                if (expectedSensitive && actualSensitive) {
                    typeStats.truePositives++;
                }
                else if (!expectedSensitive && actualSensitive) {
                    typeStats.falsePositives++;
                }
                else if (expectedSensitive && !actualSensitive) {
                    typeStats.falseNegatives++;
                }
            }
        }
        // Calculate precision, recall, and F1 score
        const tp = stats.truePositives;
        const fp = stats.falsePositives;
        const fn = stats.falseNegatives;
        stats.precision = tp + fp > 0 ? tp / (tp + fp) : 0;
        stats.recall = tp + fn > 0 ? tp / (tp + fn) : 0;
        stats.f1Score = stats.precision + stats.recall > 0
            ? 2 * (stats.precision * stats.recall) / (stats.precision + stats.recall)
            : 0;
        return stats;
    }
    /**
     * Gets the count of feedback records
     * @returns Number of records
     */
    getRecordCount() {
        return this.records.length;
    }
    /**
     * Gets a feedback record by ID
     * @param id - The record ID
     * @returns The record if found, undefined otherwise
     */
    getRecordById(id) {
        return this.records.find(r => r.id === id);
    }
    /**
     * Removes a feedback record by ID
     * @param id - The record ID to remove
     * @returns true if removed, false if not found
     */
    removeRecord(id) {
        const index = this.records.findIndex(r => r.id === id);
        if (index >= 0) {
            this.records.splice(index, 1);
            return true;
        }
        return false;
    }
    /**
     * Clears all feedback records
     */
    clearAllRecords() {
        this.records = [];
    }
    /**
     * Exports all records for persistence
     * @returns Array of feedback records for serialization
     */
    exportRecords() {
        return this.records.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp),
        }));
    }
    /**
     * Imports records from persistence
     * @param records - Records to import
     * @param merge - If true, merges with existing records. If false, replaces all.
     */
    importRecords(records, merge = false) {
        const importedRecords = records.map(record => ({
            ...record,
            timestamp: new Date(record.timestamp),
        }));
        if (merge) {
            // Merge, avoiding duplicates by ID
            const existingIds = new Set(this.records.map(r => r.id));
            const newRecords = importedRecords.filter(r => !existingIds.has(r.id));
            this.records.push(...newRecords);
        }
        else {
            this.records = importedRecords;
        }
        // Update idCounter
        if (this.records.length > 0) {
            const maxId = Math.max(...this.records.map(r => parseInt(r.id.replace('feedback-', ''), 10) || 0));
            this.idCounter = Math.max(this.idCounter, maxId + 1);
        }
    }
    /**
     * Generates a unique ID for a feedback record
     */
    generateId() {
        return `feedback-${++this.idCounter}`;
    }
}
exports.FeedbackRecorder = FeedbackRecorder;
/**
 * Creates a new FeedbackRecorder instance
 * @param initialRecords - Optional initial records
 * @returns A new FeedbackRecorder
 */
function createFeedbackRecorder(initialRecords) {
    return new FeedbackRecorder(initialRecords);
}
//# sourceMappingURL=feedback-recorder.js.map