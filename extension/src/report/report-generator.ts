/**
 * Report Generator for creating and exporting masking reports
 * 
 * Generates comprehensive reports of detected sensitive fields,
 * supports multiple export formats, and provides clipboard functionality.
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import {
  IReportGenerator,
  Report,
  ReportOptions,
  ReportFinding,
  ReportSummary,
  Suggestion,
  ExportFormat,
  MaskingPatternType,
  SuggestionStatus,
} from '../types';

/**
 * Clipboard interface for abstraction (allows mocking in tests)
 */
export interface ClipboardService {
  writeText(text: string): Promise<void>;
}

/**
 * Default clipboard service - throws error as it needs to be provided by the IDE
 */
export const defaultClipboardService: ClipboardService = {
  async writeText(_text: string): Promise<void> {
    throw new Error('Clipboard service not configured. Please provide a clipboard implementation.');
  },
};

/**
 * ReportGenerator class for creating and exporting masking reports
 */
export class ReportGenerator implements IReportGenerator {
  private suggestions: Suggestion[] = [];
  private workspacePath: string;
  private clipboardService: ClipboardService;

  /**
   * Creates a new ReportGenerator
   * @param workspacePath - Path to the workspace root
   * @param clipboardService - Optional clipboard service for testing
   */
  constructor(
    workspacePath: string = '.',
    clipboardService: ClipboardService = defaultClipboardService
  ) {
    this.workspacePath = workspacePath;
    this.clipboardService = clipboardService;
  }

  /**
   * Sets the suggestions to include in reports
   * @param suggestions - Array of suggestions
   */
  setSuggestions(suggestions: Suggestion[]): void {
    this.suggestions = suggestions;
  }

  /**
   * Gets the current suggestions
   */
  getSuggestions(): Suggestion[] {
    return [...this.suggestions];
  }


  /**
   * Generates a summary report of all findings
   * 
   * Validates: Requirements 9.1, 9.3, 9.4
   * 
   * @param options - Report generation options for filtering
   * @returns Promise resolving to the generated report
   */
  async generateReport(options: ReportOptions = {}): Promise<Report> {
    // Filter suggestions based on options
    const filteredSuggestions = this.filterSuggestions(options);

    // Convert suggestions to findings
    const findings = this.createFindings(filteredSuggestions);

    // Calculate summary statistics
    const summary = this.calculateSummary(filteredSuggestions);

    // Get unique file count
    const uniqueFiles = new Set(filteredSuggestions.map(s => s.field.location.filePath));

    return {
      generatedAt: new Date(),
      workspacePath: this.workspacePath,
      totalFiles: uniqueFiles.size,
      totalSuggestions: filteredSuggestions.length,
      findings,
      summary,
    };
  }

  /**
   * Filters suggestions based on report options
   * 
   * Validates: Requirements 9.4
   */
  private filterSuggestions(options: ReportOptions): Suggestion[] {
    let filtered = [...this.suggestions];

    // Filter by pattern types
    if (options.includePatterns && options.includePatterns.length > 0) {
      filtered = filtered.filter(s => options.includePatterns!.includes(s.patternType));
    }

    // Filter by minimum confidence
    if (options.minConfidence !== undefined) {
      filtered = filtered.filter(s => s.confidenceScore >= options.minConfidence!);
    }

    // Filter by status
    if (options.includeStatus && options.includeStatus.length > 0) {
      filtered = filtered.filter(s => options.includeStatus!.includes(s.status));
    }

    return filtered;
  }

  /**
   * Creates report findings from suggestions
   * 
   * Validates: Requirements 9.3
   */
  private createFindings(suggestions: Suggestion[]): ReportFinding[] {
    return suggestions.map(suggestion => ({
      fieldName: suggestion.field.name,
      filePath: suggestion.field.location.filePath,
      lineNumber: suggestion.field.location.startLine,
      patternType: suggestion.patternType,
      confidenceScore: suggestion.confidenceScore,
      status: suggestion.status,
    }));
  }

  /**
   * Calculates summary statistics for the report
   */
  private calculateSummary(suggestions: Suggestion[]): ReportSummary {
    // Count by pattern type
    const byPatternType: Record<MaskingPatternType, number> = {
      pii: 0,
      credentials: 0,
      financial: 0,
      health: 0,
      custom: 0,
    };

    // Count by status
    const byStatus: Record<SuggestionStatus, number> = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      deferred: 0,
    };

    let totalConfidence = 0;

    for (const suggestion of suggestions) {
      byPatternType[suggestion.patternType]++;
      byStatus[suggestion.status]++;
      totalConfidence += suggestion.confidenceScore;
    }

    const averageConfidence = suggestions.length > 0
      ? Math.round(totalConfidence / suggestions.length)
      : 0;

    return {
      totalFields: suggestions.length,
      byPatternType,
      byStatus,
      averageConfidence,
    };
  }


  /**
   * Exports report to specified format
   * 
   * Validates: Requirements 9.2
   * 
   * @param report - Report to export
   * @param format - Export format (json, csv, markdown)
   * @returns Formatted report string
   */
  exportReport(report: Report, format: ExportFormat): string {
    switch (format) {
      case 'json':
        return this.exportToJson(report);
      case 'csv':
        return this.exportToCsv(report);
      case 'markdown':
        return this.exportToMarkdown(report);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Exports report to JSON format
   */
  private exportToJson(report: Report): string {
    return JSON.stringify({
      ...report,
      generatedAt: report.generatedAt.toISOString(),
    }, null, 2);
  }

  /**
   * Exports report to CSV format
   */
  private exportToCsv(report: Report): string {
    const lines: string[] = [];

    // Header
    lines.push('Field Name,File Path,Line Number,Pattern Type,Confidence Score,Status');

    // Data rows
    for (const finding of report.findings) {
      lines.push([
        this.escapeCsv(finding.fieldName),
        this.escapeCsv(finding.filePath),
        finding.lineNumber.toString(),
        finding.patternType,
        finding.confidenceScore.toString(),
        finding.status,
      ].join(','));
    }

    return lines.join('\n');
  }

  /**
   * Escapes a value for CSV
   */
  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Exports report to Markdown format
   */
  private exportToMarkdown(report: Report): string {
    const lines: string[] = [];

    // Title and metadata
    lines.push('# Data Masking Report');
    lines.push('');
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(`Workspace: ${report.workspacePath}`);
    lines.push('');

    // Summary section
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total Files Scanned: ${report.totalFiles}`);
    lines.push(`- Total Suggestions: ${report.totalSuggestions}`);
    lines.push(`- Average Confidence: ${report.summary.averageConfidence}%`);
    lines.push('');

    // By pattern type
    lines.push('### By Pattern Type');
    lines.push('');
    lines.push('| Pattern Type | Count |');
    lines.push('|--------------|-------|');
    for (const [type, count] of Object.entries(report.summary.byPatternType)) {
      if (count > 0) {
        lines.push(`| ${type} | ${count} |`);
      }
    }
    lines.push('');

    // By status
    lines.push('### By Status');
    lines.push('');
    lines.push('| Status | Count |');
    lines.push('|--------|-------|');
    for (const [status, count] of Object.entries(report.summary.byStatus)) {
      if (count > 0) {
        lines.push(`| ${status} | ${count} |`);
      }
    }
    lines.push('');

    // Findings table
    lines.push('## Findings');
    lines.push('');
    if (report.findings.length === 0) {
      lines.push('No findings to report.');
    } else {
      lines.push('| Field Name | File Path | Line | Pattern | Confidence | Status |');
      lines.push('|------------|-----------|------|---------|------------|--------|');
      for (const finding of report.findings) {
        lines.push(`| ${finding.fieldName} | ${finding.filePath} | ${finding.lineNumber} | ${finding.patternType} | ${finding.confidenceScore}% | ${finding.status} |`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }


  /**
   * Copies suggestion list to clipboard
   * 
   * Validates: Requirements 9.5
   * 
   * @param suggestions - Suggestions to copy
   */
  async copyToClipboard(suggestions: Suggestion[]): Promise<void> {
    // Format suggestions as a simple text list
    const lines: string[] = [];

    lines.push('Sensitive Field Suggestions');
    lines.push('===========================');
    lines.push('');

    for (const suggestion of suggestions) {
      lines.push(`Field: ${suggestion.field.name}`);
      lines.push(`  File: ${suggestion.field.location.filePath}:${suggestion.field.location.startLine}`);
      lines.push(`  Pattern: ${suggestion.patternType}`);
      lines.push(`  Confidence: ${suggestion.confidenceScore}%`);
      lines.push(`  Status: ${suggestion.status}`);
      lines.push('');
    }

    const text = lines.join('\n');
    await this.clipboardService.writeText(text);
  }

  /**
   * Formats suggestions as a simple text list (for clipboard or display)
   * @param suggestions - Suggestions to format
   * @returns Formatted text
   */
  formatSuggestionsAsText(suggestions: Suggestion[]): string {
    const lines: string[] = [];

    for (const suggestion of suggestions) {
      lines.push(`${suggestion.field.name} (${suggestion.field.location.filePath}:${suggestion.field.location.startLine}) - ${suggestion.patternType} [${suggestion.confidenceScore}%]`);
    }

    return lines.join('\n');
  }
}

/**
 * Creates a new ReportGenerator instance
 */
export function createReportGenerator(
  workspacePath?: string,
  clipboardService?: ClipboardService
): ReportGenerator {
  return new ReportGenerator(workspacePath, clipboardService);
}
