# Requirements Document

## Introduction

This feature enhances the PII JSON Checker VS Code extension by making sensitive field detection fully configurable. Currently, the extension uses hardcoded lists of sensitive field names and logging methods. This feature allows users to configure which field names/parameters should be considered sensitive and which logging methods should trigger masking warnings, providing flexibility for different codebases and compliance requirements.

The configuration experience prioritizes simplicity and ease of use, with sensible defaults that work out-of-the-box and intuitive settings that require minimal effort to customize.

## Glossary

- **Extension**: The PII JSON Checker VS Code extension that analyzes code for sensitive data being logged
- **Sensitive_Field**: A field name or parameter that contains potentially sensitive data (e.g., "password", "ssn", "creditCardNumber")
- **Logging_Method**: A function or method call that outputs data to logs (e.g., "console.log", "LogInformation")
- **Masking_Warning**: A diagnostic warning shown when a sensitive field is logged without proper masking
- **Configuration_Manager**: The component responsible for reading and managing VS Code workspace settings
- **Pattern_Matcher**: The component that matches identifiers against configured sensitive field patterns
- **Settings_UI**: The VS Code settings interface where users configure extension options

## Requirements

### Requirement 1: Simple Default Configuration

**User Story:** As a developer, I want the extension to work immediately with sensible defaults, so that I can start detecting sensitive fields without any configuration.

#### Acceptance Criteria

1. THE Extension SHALL work out-of-the-box with zero configuration required
2. THE Extension SHALL provide comprehensive default patterns for common sensitive fields (PII, Financial, Health, Credentials)
3. THE Extension SHALL enable all detection categories by default
4. WHEN a user installs the extension, THE Extension SHALL immediately start detecting sensitive fields using default patterns
5. THE Extension SHALL use "Warning" as the default severity level for all detections

### Requirement 2: Intuitive Setting Names

**User Story:** As a developer, I want configuration settings to have clear, self-explanatory names, so that I can understand what each setting does without reading documentation.

#### Acceptance Criteria

1. THE Extension SHALL use plain English setting names that describe their purpose (e.g., "Enable PII Detection" instead of "categories.pii")
2. THE Extension SHALL provide descriptive tooltips for each setting in the Settings_UI
3. THE Extension SHALL group related settings together under clear section headings
4. THE Extension SHALL use consistent naming conventions across all settings
5. WHEN a setting name contains technical terms, THE Settings_UI SHALL include a brief explanation

### Requirement 3: Configurable Sensitive Field Names

**User Story:** As a developer, I want to configure which field names should be considered sensitive, so that I can customize detection for my specific codebase and compliance requirements.

#### Acceptance Criteria

1. THE Extension SHALL allow users to define custom sensitive field names via VS Code settings
2. WHEN a custom sensitive field name is configured, THE Pattern_Matcher SHALL detect that field name as sensitive
3. THE Extension SHALL support adding sensitive field names to existing categories (PII, Financial, Health, Credentials)
4. WHEN a user adds a field name that already exists in default patterns, THE Extension SHALL not create duplicate entries
5. THE Extension SHALL support field name patterns in multiple formats (camelCase, snake_case, kebab-case)
6. WHEN configuration changes, THE Extension SHALL re-analyze open documents without requiring a restart

### Requirement 4: Configurable Logging Method Detection

**User Story:** As a developer, I want to configure which logging methods should trigger masking warnings, so that only relevant logging calls in my codebase are analyzed.

#### Acceptance Criteria

1. THE Extension SHALL allow users to define which logging methods trigger masking warnings via VS Code settings
2. WHEN a logging method is NOT in the configured list, THE Extension SHALL NOT show masking warnings for that method
3. THE Extension SHALL provide a default set of logging methods that can be overridden by user configuration
4. WHEN a user configures an empty logging methods list, THE Extension SHALL disable logging detection entirely
5. THE Extension SHALL support both fully qualified method names (e.g., "Console.WriteLine") and short method names (e.g., "Info")
6. WHEN configuration changes, THE Extension SHALL re-analyze open documents without requiring a restart

### Requirement 5: Minimal Configuration for Common Use Cases

**User Story:** As a developer, I want to make common configuration changes with minimal effort, so that I can quickly adapt the extension to my needs.

#### Acceptance Criteria

1. THE Extension SHALL allow enabling/disabling entire categories with a single toggle (e.g., turn off all Financial detection)
2. THE Extension SHALL allow adding a single custom pattern with just one setting entry
3. THE Extension SHALL allow excluding a specific pattern with just one setting entry
4. WHEN a user wants to add custom patterns, THE Extension SHALL NOT require them to re-specify default patterns
5. THE Extension SHALL support quick severity changes via a single dropdown selection

### Requirement 6: Clear Examples in Settings UI

**User Story:** As a developer, I want to see examples of valid configuration values, so that I can configure the extension correctly on my first attempt.

#### Acceptance Criteria

1. THE Settings_UI SHALL display example values for array-type settings (e.g., "Example: ['employeeId', 'staffNumber']")
2. THE Settings_UI SHALL show placeholder text indicating expected format for each setting
3. WHEN a setting accepts multiple formats, THE Settings_UI SHALL show examples of each accepted format
4. THE Extension SHALL include example configurations in the extension README
5. THE Settings_UI SHALL indicate which settings are optional vs required

### Requirement 7: Configuration Persistence and Validation

**User Story:** As a developer, I want my configuration to be validated and persisted correctly, so that I can rely on consistent behavior across sessions.

#### Acceptance Criteria

1. THE Configuration_Manager SHALL persist user settings in VS Code workspace or user settings
2. WHEN invalid configuration values are provided, THE Configuration_Manager SHALL fall back to default values
3. THE Extension SHALL validate that configured field names are non-empty strings
4. THE Extension SHALL validate that configured logging methods are non-empty strings
5. IF a configuration file contains malformed entries, THEN THE Extension SHALL log a warning and skip the invalid entries
6. WHEN falling back to defaults due to invalid configuration, THE Extension SHALL display a notification explaining the issue

### Requirement 8: Configuration Override Behavior

**User Story:** As a developer, I want to understand how my custom configuration interacts with defaults, so that I can predictably control the extension's behavior.

#### Acceptance Criteria

1. WHEN user configures custom logging methods, THE Extension SHALL use ONLY the user-configured methods (replace mode)
2. WHEN user configures custom sensitive fields, THE Extension SHALL ADD them to the default patterns (additive mode)
3. THE Extension SHALL allow users to exclude specific default sensitive field patterns
4. THE Extension SHALL document the configuration override behavior in the extension README
5. THE Settings_UI SHALL clearly indicate whether each setting is additive or replaces defaults
