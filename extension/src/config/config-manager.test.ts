/**
 * Tests for Configuration Manager
 * 
 * Validates: Requirements 5.1, 5.2, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConfigurationManager,
  createConfigurationManager,
  createDefaultConfiguration,
  DEFAULT_SETTINGS,
  FileSystem,
} from './config-manager';
import {
  MaskingConfiguration,
  Suggestion,
  UserDecision,
  MaskingPattern,
  HistoryFilter,
} from '../types';

// Mock file system
function createMockFileSystem(): FileSystem & {
  files: Map<string, string>;
  renamedFiles: Array<{ from: string; to: string }>;
} {
  const files = new Map<string, string>();
  const renamedFiles: Array<{ from: string; to: string }> = [];

  return {
    files,
    renamedFiles,
    async readFile(path: string): Promise<string> {
      const content = files.get(path);
      if (content === undefined) {
        throw new Error(`File not found: ${path}`);
      }
      return content;
    },
    async writeFile(path: string, content: string): Promise<void> {
      files.set(path, content);
    },
    async exists(path: string): Promise<boolean> {
      return files.has(path);
    },
    async mkdir(_path: string): Promise<void> {
      // No-op for mock
    },
    async rename(path: string, newPath: string): Promise<void> {
      const content = files.get(path);
      if (content !== undefined) {
        files.set(newPath, content);
        files.delete(path);
        renamedFiles.push({ from: path, to: newPath });
      }
    },
  };
}

// Helper to create a mock suggestion
function createMockSuggestion(
  fieldName: string,
  filePath: string = 'test.ts',
  patternType: 'pii' | 'credentials' | 'financial' | 'health' | 'custom' = 'pii'
): Suggestion {
  return {
    id: `suggestion-${Date.now()}`,
    field: {
      name: fieldName,
      type: 'string',
      location: {
        filePath,
        startLine: 1,
        startColumn: 0,
        endLine: 1,
        endColumn: fieldName.length,
      },
      context: {
        surroundingCode: '',
        comments: [],
        parentScope: '',
        usageContexts: [],
      },
    },
    confidenceScore: 85,
    patternType,
    status: 'pending',
    recommendedAction: { type: 'mask', description: 'Test' },
    createdAt: new Date(),
    reviewedAt: null,
  };
}

describe('ConfigurationManager', () => {
  let fs: ReturnType<typeof createMockFileSystem>;
  let manager: ConfigurationManager;

  beforeEach(() => {
    fs = createMockFileSystem();
    manager = new ConfigurationManager(fs, '.kiro/masking-config.json', null, 'test-user');
  });

  describe('createDefaultConfiguration', () => {
    it('should create valid default configuration', () => {
      const config = createDefaultConfiguration();

      expect(config.version).toBe('1.0.0');
      expect(config.maskedFields).toEqual([]);
      expect(config.rejectedFields).toEqual([]);
      expect(config.customPatterns).toEqual([]);
      expect(config.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('load - Validates: Requirements 6.3', () => {
    it('should return default configuration when no file exists', async () => {
      const config = await manager.load();

      expect(config.version).toBe('1.0.0');
      expect(config.maskedFields).toEqual([]);
      expect(config.settings.scanOnSave).toBe(true);
    });

    it('should load existing configuration', async () => {
      const existingConfig: MaskingConfiguration = {
        version: '1.0.0',
        maskedFields: [
          {
            fieldName: 'email',
            filePath: 'src/user.ts',
            patternType: 'pii',
            addedAt: new Date('2024-01-15'),
            addedBy: 'developer',
          },
        ],
        rejectedFields: [],
        customPatterns: [],
        settings: DEFAULT_SETTINGS,
      };

      fs.files.set('.kiro/masking-config.json', JSON.stringify({
        ...existingConfig,
        maskedFields: existingConfig.maskedFields.map(f => ({
          ...f,
          addedAt: f.addedAt.toISOString(),
        })),
      }));

      const config = await manager.load();

      expect(config.maskedFields).toHaveLength(1);
      expect(config.maskedFields[0].fieldName).toBe('email');
      expect(config.maskedFields[0].addedAt).toBeInstanceOf(Date);
    });

    it('should restore all fields, patterns, and settings', async () => {
      const existingConfig = {
        version: '1.0.0',
        maskedFields: [
          { fieldName: 'email', filePath: 'a.ts', patternType: 'pii', addedAt: new Date().toISOString(), addedBy: 'user1' },
          { fieldName: 'password', filePath: 'b.ts', patternType: 'credentials', addedAt: new Date().toISOString(), addedBy: 'user2' },
        ],
        rejectedFields: [
          { fieldName: 'username', filePath: 'c.ts', reason: 'Not sensitive', rejectedAt: new Date().toISOString() },
        ],
        customPatterns: [
          { id: 'custom-1', name: 'Custom', type: 'custom', fieldNamePatterns: ['test'], valuePatterns: [], contextIndicators: [] },
        ],
        settings: {
          ...DEFAULT_SETTINGS,
          scanOnSave: false,
          maxCpuPercent: 50,
        },
      };

      fs.files.set('.kiro/masking-config.json', JSON.stringify(existingConfig));

      const config = await manager.load();

      expect(config.maskedFields).toHaveLength(2);
      expect(config.rejectedFields).toHaveLength(1);
      expect(config.customPatterns).toHaveLength(1);
      expect(config.settings.scanOnSave).toBe(false);
      expect(config.settings.maxCpuPercent).toBe(50);
    });
  });

  describe('corrupted configuration recovery - Validates: Requirements 6.5', () => {
    it('should handle corrupted JSON and create backup', async () => {
      fs.files.set('.kiro/masking-config.json', 'not valid json {{{');

      const config = await manager.load();

      // Should return default config
      expect(config.version).toBe('1.0.0');
      expect(config.maskedFields).toEqual([]);

      // Should have created backup
      expect(fs.renamedFiles.length).toBe(1);
      expect(fs.renamedFiles[0].from).toBe('.kiro/masking-config.json');
      expect(fs.renamedFiles[0].to).toContain('.backup.');
    });

    it('should handle invalid schema and create backup', async () => {
      fs.files.set('.kiro/masking-config.json', JSON.stringify({
        version: 123, // Should be string
        maskedFields: 'not an array',
      }));

      const config = await manager.load();

      // Should return default config
      expect(config.version).toBe('1.0.0');
      expect(Array.isArray(config.maskedFields)).toBe(true);

      // Should have created backup
      expect(fs.renamedFiles.length).toBe(1);
    });
  });

  describe('configuration inheritance - Validates: Requirements 6.6', () => {
    it('should merge user-level and workspace-level configurations', async () => {
      const userConfig = {
        version: '1.0.0',
        maskedFields: [
          { fieldName: 'userEmail', filePath: 'user.ts', patternType: 'pii', addedAt: new Date().toISOString(), addedBy: 'user' },
        ],
        rejectedFields: [],
        customPatterns: [],
        settings: {
          ...DEFAULT_SETTINGS,
          maxCpuPercent: 30,
        },
      };

      // Workspace config only overrides scanOnSave, not maxCpuPercent
      const workspaceConfig = {
        version: '1.0.0',
        maskedFields: [
          { fieldName: 'workspaceEmail', filePath: 'workspace.ts', patternType: 'pii', addedAt: new Date().toISOString(), addedBy: 'workspace' },
        ],
        rejectedFields: [],
        customPatterns: [],
        settings: {
          scanOnSave: false,
        },
      };

      fs.files.set('~/.kiro/masking-config.json', JSON.stringify(userConfig));
      fs.files.set('.kiro/masking-config.json', JSON.stringify(workspaceConfig));

      const managerWithUserConfig = new ConfigurationManager(
        fs,
        '.kiro/masking-config.json',
        '~/.kiro/masking-config.json',
        'test-user'
      );

      const config = await managerWithUserConfig.load();

      // Should have both masked fields
      expect(config.maskedFields).toHaveLength(2);

      // Workspace settings should override user settings for specified keys
      expect(config.settings.scanOnSave).toBe(false);
      // User config maxCpuPercent should be preserved since workspace didn't override it
      expect(config.settings.maxCpuPercent).toBe(30);
    });
  });

  describe('save - Validates: Requirements 6.1', () => {
    it('should save configuration to file', async () => {
      const config = createDefaultConfiguration();
      config.maskedFields.push({
        fieldName: 'email',
        filePath: 'test.ts',
        patternType: 'pii',
        addedAt: new Date(),
        addedBy: 'test-user',
      });

      await manager.save(config);

      expect(fs.files.has('.kiro/masking-config.json')).toBe(true);

      const saved = JSON.parse(fs.files.get('.kiro/masking-config.json')!);
      expect(saved.maskedFields).toHaveLength(1);
      expect(saved.maskedFields[0].fieldName).toBe('email');
    });

    it('should serialize dates as ISO strings', async () => {
      const config = createDefaultConfiguration();
      const date = new Date('2024-01-15T10:30:00Z');
      config.maskedFields.push({
        fieldName: 'email',
        filePath: 'test.ts',
        patternType: 'pii',
        addedAt: date,
        addedBy: 'test-user',
      });

      await manager.save(config);

      const saved = JSON.parse(fs.files.get('.kiro/masking-config.json')!);
      expect(saved.maskedFields[0].addedAt).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('export/import - Validates: Requirements 6.2', () => {
    beforeEach(async () => {
      const config = createDefaultConfiguration();
      config.maskedFields.push({
        fieldName: 'email',
        filePath: 'test.ts',
        patternType: 'pii',
        addedAt: new Date(),
        addedBy: 'test-user',
      });
      config.rejectedFields.push({
        fieldName: 'username',
        filePath: 'test.ts',
        reason: 'Not sensitive',
        rejectedAt: new Date(),
      });
      await manager.save(config);
    });

    it('should export to JSON format', async () => {
      const exported = await manager.export('json');
      const parsed = JSON.parse(exported);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.maskedFields).toHaveLength(1);
      expect(parsed.rejectedFields).toHaveLength(1);
    });

    it('should export to CSV format', async () => {
      const exported = await manager.export('csv');
      const lines = exported.split('\n');

      expect(lines[0]).toContain('Type,Field Name,File Path');
      expect(lines.some(l => l.includes('masked,email'))).toBe(true);
      expect(lines.some(l => l.includes('rejected,username'))).toBe(true);
    });

    it('should export to Markdown format', async () => {
      const exported = await manager.export('markdown');

      expect(exported).toContain('# Masking Configuration');
      expect(exported).toContain('## Masked Fields');
      expect(exported).toContain('## Rejected Fields');
      expect(exported).toContain('email');
      expect(exported).toContain('username');
    });

    it('should import configuration from file', async () => {
      const importConfig = {
        version: '1.0.0',
        maskedFields: [
          { fieldName: 'imported', filePath: 'import.ts', patternType: 'credentials', addedAt: new Date().toISOString(), addedBy: 'importer' },
        ],
        rejectedFields: [],
        customPatterns: [],
        settings: DEFAULT_SETTINGS,
      };

      fs.files.set('import.json', JSON.stringify(importConfig));

      const imported = await manager.import('import.json');

      expect(imported.maskedFields).toHaveLength(1);
      expect(imported.maskedFields[0].fieldName).toBe('imported');
    });

    it('should round-trip configuration correctly', async () => {
      const original = manager.getConfiguration();
      const exported = await manager.export('json');

      // Create new manager and import
      const newManager = new ConfigurationManager(fs, '.kiro/new-config.json');
      fs.files.set('exported.json', exported);
      const imported = await newManager.import('exported.json');

      expect(imported.version).toBe(original.version);
      expect(imported.maskedFields.length).toBe(original.maskedFields.length);
      expect(imported.maskedFields[0].fieldName).toBe(original.maskedFields[0].fieldName);
    });
  });

  describe('addMaskedField - Validates: Requirements 5.1', () => {
    it('should add field to masked list', async () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');

      await manager.addMaskedField(suggestion);

      const config = manager.getConfiguration();
      expect(config.maskedFields).toHaveLength(1);
      expect(config.maskedFields[0].fieldName).toBe('email');
      expect(config.maskedFields[0].filePath).toBe('src/user.ts');
    });

    it('should not add duplicate fields', async () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');

      await manager.addMaskedField(suggestion);
      await manager.addMaskedField(suggestion);

      const config = manager.getConfiguration();
      expect(config.maskedFields).toHaveLength(1);
    });

    it('should persist to file', async () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');

      await manager.addMaskedField(suggestion);

      expect(fs.files.has('.kiro/masking-config.json')).toBe(true);
    });
  });

  describe('addRejectedField - Validates: Requirements 5.2', () => {
    it('should add field to rejected list', async () => {
      const suggestion = createMockSuggestion('username', 'src/user.ts');

      await manager.addRejectedField(suggestion, 'Not actually sensitive');

      const config = manager.getConfiguration();
      expect(config.rejectedFields).toHaveLength(1);
      expect(config.rejectedFields[0].fieldName).toBe('username');
      expect(config.rejectedFields[0].reason).toBe('Not actually sensitive');
    });

    it('should not add duplicate fields', async () => {
      const suggestion = createMockSuggestion('username', 'src/user.ts');

      await manager.addRejectedField(suggestion);
      await manager.addRejectedField(suggestion);

      const config = manager.getConfiguration();
      expect(config.rejectedFields).toHaveLength(1);
    });
  });

  describe('field checks', () => {
    it('should check if field is masked', async () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');
      await manager.addMaskedField(suggestion);

      expect(manager.isFieldMasked('email', 'src/user.ts')).toBe(true);
      expect(manager.isFieldMasked('email', 'other.ts')).toBe(false);
      expect(manager.isFieldMasked('other', 'src/user.ts')).toBe(false);
    });

    it('should check if field is rejected', async () => {
      const suggestion = createMockSuggestion('username', 'src/user.ts');
      await manager.addRejectedField(suggestion);

      expect(manager.isFieldRejected('username', 'src/user.ts')).toBe(true);
      expect(manager.isFieldRejected('username', 'other.ts')).toBe(false);
    });

    it('should remove masked field', async () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');
      await manager.addMaskedField(suggestion);

      const removed = await manager.removeMaskedField('email', 'src/user.ts');

      expect(removed).toBe(true);
      expect(manager.isFieldMasked('email', 'src/user.ts')).toBe(false);
    });

    it('should remove rejected field', async () => {
      const suggestion = createMockSuggestion('username', 'src/user.ts');
      await manager.addRejectedField(suggestion);

      const removed = await manager.removeRejectedField('username', 'src/user.ts');

      expect(removed).toBe(true);
      expect(manager.isFieldRejected('username', 'src/user.ts')).toBe(false);
    });
  });

  describe('custom patterns - Validates: Requirements 6.4', () => {
    it('should register custom pattern', async () => {
      const pattern: MaskingPattern = {
        id: 'custom-employee-id',
        name: 'Employee ID',
        type: 'custom',
        fieldNamePatterns: [/^emp(loyee)?[-_]?id$/i],
        valuePatterns: [/^EMP-\d{6}$/],
        contextIndicators: ['employee', 'staff'],
      };

      await manager.registerCustomPattern(pattern);

      const patterns = manager.getCustomPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].id).toBe('custom-employee-id');
    });

    it('should replace existing pattern with same ID', async () => {
      const pattern1: MaskingPattern = {
        id: 'custom-1',
        name: 'Pattern 1',
        type: 'custom',
        fieldNamePatterns: [/test1/],
        valuePatterns: [],
        contextIndicators: [],
      };

      const pattern2: MaskingPattern = {
        id: 'custom-1',
        name: 'Pattern 2',
        type: 'custom',
        fieldNamePatterns: [/test2/],
        valuePatterns: [],
        contextIndicators: [],
      };

      await manager.registerCustomPattern(pattern1);
      await manager.registerCustomPattern(pattern2);

      const patterns = manager.getCustomPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].name).toBe('Pattern 2');
    });

    it('should remove custom pattern', async () => {
      const pattern: MaskingPattern = {
        id: 'custom-1',
        name: 'Pattern',
        type: 'custom',
        fieldNamePatterns: [/test/],
        valuePatterns: [],
        contextIndicators: [],
      };

      await manager.registerCustomPattern(pattern);
      const removed = await manager.removeCustomPattern('custom-1');

      expect(removed).toBe(true);
      expect(manager.getCustomPatterns()).toHaveLength(0);
    });
  });

  describe('decision history - Validates: Requirements 5.6', () => {
    it('should record decision', () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');
      const decision: UserDecision = { action: 'accept' };

      manager.recordDecision('suggestion-1', suggestion, decision);

      const history = manager.getDecisionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].suggestionId).toBe('suggestion-1');
      expect(history[0].fieldName).toBe('email');
      expect(history[0].decision.action).toBe('accept');
      expect(history[0].timestamp).toBeInstanceOf(Date);
      expect(history[0].userId).toBe('test-user');
    });

    it('should filter history by date range', () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');
      manager.recordDecision('s1', suggestion, { action: 'accept' });

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const inRange = manager.getDecisionHistory({ startDate: yesterday, endDate: tomorrow });
      expect(inRange).toHaveLength(1);

      const outOfRange = manager.getDecisionHistory({ startDate: tomorrow });
      expect(outOfRange).toHaveLength(0);
    });

    it('should filter history by action', () => {
      const suggestion1 = createMockSuggestion('email', 'src/user.ts');
      const suggestion2 = createMockSuggestion('password', 'src/auth.ts');

      manager.recordDecision('s1', suggestion1, { action: 'accept' });
      manager.recordDecision('s2', suggestion2, { action: 'reject' });

      const accepts = manager.getDecisionHistory({ action: 'accept' });
      expect(accepts).toHaveLength(1);
      expect(accepts[0].fieldName).toBe('email');

      const rejects = manager.getDecisionHistory({ action: 'reject' });
      expect(rejects).toHaveLength(1);
      expect(rejects[0].fieldName).toBe('password');
    });

    it('should filter history by file path', () => {
      const suggestion1 = createMockSuggestion('email', 'src/user.ts');
      const suggestion2 = createMockSuggestion('password', 'src/auth.ts');

      manager.recordDecision('s1', suggestion1, { action: 'accept' });
      manager.recordDecision('s2', suggestion2, { action: 'accept' });

      const filtered = manager.getDecisionHistory({ filePath: 'src/user.ts' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].fieldName).toBe('email');
    });

    it('should clear decision history', () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');
      manager.recordDecision('s1', suggestion, { action: 'accept' });

      manager.clearDecisionHistory();

      expect(manager.getDecisionHistory()).toHaveLength(0);
    });

    it('should export and import decision history', () => {
      const suggestion = createMockSuggestion('email', 'src/user.ts');
      manager.recordDecision('s1', suggestion, { action: 'accept' });

      const exported = manager.exportDecisionHistory();

      const newManager = new ConfigurationManager(fs);
      newManager.importDecisionHistory(exported);

      const history = newManager.getDecisionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].fieldName).toBe('email');
    });
  });

  describe('settings', () => {
    it('should update settings', async () => {
      await manager.updateSettings({ scanOnSave: false, maxCpuPercent: 50 });

      const config = manager.getConfiguration();
      expect(config.settings.scanOnSave).toBe(false);
      expect(config.settings.maxCpuPercent).toBe(50);
      // Other settings should remain unchanged
      expect(config.settings.scanOnOpen).toBe(true);
    });
  });
});

describe('createConfigurationManager factory', () => {
  it('should create manager with default paths', () => {
    const fs = createMockFileSystem();
    const manager = createConfigurationManager(fs);

    expect(manager).toBeInstanceOf(ConfigurationManager);
  });

  it('should create manager with custom paths', () => {
    const fs = createMockFileSystem();
    const manager = createConfigurationManager(
      fs,
      'custom/config.json',
      'user/config.json',
      'custom-user'
    );

    expect(manager).toBeInstanceOf(ConfigurationManager);
  });
});
