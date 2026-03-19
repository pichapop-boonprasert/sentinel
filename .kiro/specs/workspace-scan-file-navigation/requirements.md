# Requirements Document

## Introduction

This feature enhances the workspace scan functionality of the Data Masking Suggestion Plugin by adding file navigation capabilities. Currently, when users scan the entire workspace, results are shown in a popup but users cannot see a list of affected files or navigate to specific files from the scan results. This feature will provide a file-centric view of scan results with clickable navigation to jump directly to files containing sensitive data findings.

## Glossary

- **Workspace_Scanner**: The component that scans all files in the workspace for sensitive data patterns
- **File_List_View**: A VS Code QuickPick or TreeView UI component that displays files containing sensitive data findings
- **File_Navigation_Handler**: The component responsible for opening files and navigating to specific locations
- **Scan_Results_Aggregator**: The component that groups and aggregates scan findings by file
- **Finding**: A detected instance of sensitive data in a file (field name, location, pattern type, confidence)

## Requirements

### Requirement 1: Display File List After Workspace Scan

**User Story:** As a developer, I want to see a list of files containing sensitive data after a workspace scan, so that I can understand which files need attention.

#### Acceptance Criteria

1. WHEN a workspace scan completes, THE File_List_View SHALL display a list of all files that contain at least one sensitive data finding
2. THE File_List_View SHALL show the file path relative to the workspace root for each file
3. THE File_List_View SHALL show the count of findings for each file
4. THE File_List_View SHALL sort files by finding count in descending order by default
5. IF no files contain sensitive data findings, THEN THE Workspace_Scanner SHALL display a message indicating no sensitive data was found

### Requirement 2: Navigate to File from Results List

**User Story:** As a developer, I want to click on a file in the scan results to open it, so that I can review and address the sensitive data findings.

#### Acceptance Criteria

1. WHEN a user selects a file from the File_List_View, THE File_Navigation_Handler SHALL open that file in the editor
2. WHEN a file is opened from the File_List_View, THE File_Navigation_Handler SHALL position the cursor at the first finding in that file
3. WHEN a file is opened from the File_List_View, THE File_Navigation_Handler SHALL highlight all sensitive data findings in that file

### Requirement 3: Show Finding Details in File List

**User Story:** As a developer, I want to see a summary of finding types for each file, so that I can prioritize which files to review first.

#### Acceptance Criteria

1. THE File_List_View SHALL display the highest confidence score among findings for each file
2. THE File_List_View SHALL display the pattern types detected in each file as icons or labels
3. WHEN a user hovers over a file entry, THE File_List_View SHALL show a tooltip with a breakdown of findings by pattern type

### Requirement 4: Persist File List for Re-navigation

**User Story:** As a developer, I want to access the scan results list again after closing it, so that I can continue reviewing files without re-scanning.

#### Acceptance Criteria

1. THE Scan_Results_Aggregator SHALL store the most recent workspace scan results in memory
2. WHEN the user invokes the show scan results command, THE File_List_View SHALL display the stored results
3. IF no scan results exist, THEN THE File_List_View SHALL prompt the user to run a workspace scan
4. WHEN a new workspace scan is performed, THE Scan_Results_Aggregator SHALL replace the previous results with the new results

### Requirement 5: Filter and Search File List

**User Story:** As a developer, I want to filter the file list by pattern type or search by file name, so that I can quickly find specific files of interest.

#### Acceptance Criteria

1. THE File_List_View SHALL provide a search input that filters files by path
2. WHEN a user types in the search input, THE File_List_View SHALL filter the list to show only files whose paths contain the search text
3. THE File_List_View SHALL provide filter options to show only files with specific pattern types
4. WHEN a filter is applied, THE File_List_View SHALL update the displayed list immediately
