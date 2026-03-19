/**
 * Tests for UsageContextAnalyzer
 * 
 * Validates: Requirements 3.3 - High-Risk Context Priority
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  UsageContextAnalyzer,
  createUsageContextAnalyzer,
  analyzeUsageContext,
  isHighRiskUsage,
  HIGH_RISK_CONTEXT_TYPES,
  MEDIUM_RISK_CONTEXT_TYPES,
} from './usage-context-analyzer';
import { FieldDeclaration, UsageContext } from '../types';

// Helper to create a mock field declaration
function createMockField(overrides: Partial<FieldDeclaration> = {}): FieldDeclaration {
  return {
    name: 'testField',
    type: null,
    location: {
      filePath: 'test.ts',
      startLine: 1,
      startColumn: 0,
      endLine: 1,
      endColumn: 10,
    },
    context: {
      surroundingCode: '',
      comments: [],
      parentScope: '',
      usageContexts: [],
    },
    ...overrides,
  };
}

describe('UsageContextAnalyzer', () => {
  let analyzer: UsageContextAnalyzer;

  beforeEach(() => {
    analyzer = new UsageContextAnalyzer();
  });

  describe('logging context detection', () => {
    it('should detect console.log usage', () => {
      const field = createMockField({
        name: 'userEmail',
        context: {
          surroundingCode: 'console.log("User email:", userEmail);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('logging');
      expect(result.hasHighRiskContext).toBe(true);
    });

    it('should detect logger.info usage', () => {
      const field = createMockField({
        name: 'password',
        context: {
          surroundingCode: 'logger.info("Processing request", { password });',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('logging');
      expect(result.hasHighRiskContext).toBe(true);
      expect(result.highestRisk).toBe('high');
    });

    it('should detect winston logging framework', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'winston.error("Failed to process", data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('logging');
    });

    it('should detect print statements', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'print(f"User data: {userData}")',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('logging');
    });

    it('should assign high risk for logging with sensitive field names', () => {
      const field = createMockField({
        name: 'creditCardNumber',
        context: {
          surroundingCode: 'console.log(creditCardNumber);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.highestRisk).toBe('high');
    });
  });

  describe('serialization context detection', () => {
    it('should detect JSON.stringify usage', () => {
      const field = createMockField({
        name: 'userData',
        context: {
          surroundingCode: 'const json = JSON.stringify(userData);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('serialization');
      expect(result.hasHighRiskContext).toBe(true);
    });

    it('should detect serialize method calls', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'const data = serializer.serialize(user);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('serialization');
    });

    it('should detect toJSON method', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'return this.toJSON();',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('serialization');
    });

    it('should detect protobuf usage', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'const message = protobuf.encode(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('serialization');
    });
  });

  describe('API response context detection', () => {
    it('should detect res.json usage', () => {
      const field = createMockField({
        name: 'userProfile',
        context: {
          surroundingCode: 'res.json({ user: userProfile });',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('api_response');
      expect(result.hasHighRiskContext).toBe(true);
    });

    it('should detect response.send usage', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'response.send(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('api_response');
    });

    it('should detect API decorators', () => {
      const field = createMockField({
        context: {
          surroundingCode: '@Get("/users")\nasync getUsers() { return users; }',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('api_response');
    });

    it('should detect JsonResult return type', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'return new JsonResult(userData);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('api_response');
    });

    it('should assign high risk for public API contexts', () => {
      const field = createMockField({
        name: 'userData',
        context: {
          surroundingCode: '@Api()\npublic endpoint() { res.json(userData); }',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.highestRisk).toBe('high');
    });
  });

  describe('storage context detection', () => {
    it('should detect database INSERT operations', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'INSERT INTO users (email) VALUES (?)',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('storage');
    });

    it('should detect ORM save operations', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'await userRepository.save(user);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('storage');
    });

    it('should detect file write operations', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'fs.writeFileSync("data.json", JSON.stringify(data));',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('storage');
    });

    it('should detect cache operations', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'redis.set("user:123", userData);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('storage');
    });

    it('should assign medium risk for storage by default', () => {
      const field = createMockField({
        name: 'data',
        context: {
          surroundingCode: 'await db.save(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      // Storage has medium base risk, but sensitive field names elevate it
      expect(['medium', 'high']).toContain(result.highestRisk);
    });
  });

  describe('display context detection', () => {
    it('should detect render method calls', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'render(<UserProfile data={userData} />);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('display');
    });

    it('should detect template interpolation', () => {
      const field = createMockField({
        context: {
          surroundingCode: '<div>{{ userName }}</div>',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('display');
    });

    it('should detect innerHTML usage', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'element.innerHTML = userContent;',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('display');
    });

    it('should detect React useState', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'const [user, setUser] = useState(null);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('display');
    });
  });

  describe('multiple context detection', () => {
    it('should detect multiple contexts in same code', () => {
      const field = createMockField({
        context: {
          surroundingCode: `
            console.log("Saving user:", user);
            await db.save(user);
            res.json({ success: true });
          `,
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('logging');
      expect(result.contextTypes).toContain('storage');
      expect(result.contextTypes).toContain('api_response');
      expect(result.contexts.length).toBeGreaterThanOrEqual(3);
    });

    it('should return highest risk when multiple contexts present', () => {
      const field = createMockField({
        name: 'password',
        context: {
          surroundingCode: `
            console.log(password);
            localStorage.set("pwd", password);
          `,
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.highestRisk).toBe('high');
    });
  });

  describe('no context detection', () => {
    it('should return empty contexts for code without patterns', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'const x = 1 + 2;',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contexts).toHaveLength(0);
      expect(result.hasHighRiskContext).toBe(false);
      expect(result.highestRisk).toBe('low');
    });

    it('should return empty contexts for empty surrounding code', () => {
      const field = createMockField();

      const result = analyzer.analyzeField(field);

      expect(result.contexts).toHaveLength(0);
    });
  });

  describe('risk elevation', () => {
    it('should elevate risk for sensitive field names in logging', () => {
      const field = createMockField({
        name: 'secretKey',
        context: {
          surroundingCode: 'console.log(secretKey);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.highestRisk).toBe('high');
    });

    it('should elevate risk for error logging contexts', () => {
      const field = createMockField({
        name: 'data',
        context: {
          surroundingCode: 'catch (error) { console.log("Error:", data); }',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.highestRisk).toBe('high');
    });
  });

  describe('analyzeFields', () => {
    it('should analyze multiple fields', () => {
      const fields = [
        createMockField({
          name: 'email',
          context: {
            surroundingCode: 'console.log(email);',
            comments: [],
            parentScope: '',
            usageContexts: [],
          },
        }),
        createMockField({
          name: 'password',
          context: {
            surroundingCode: 'res.json({ password });',
            comments: [],
            parentScope: '',
            usageContexts: [],
          },
        }),
      ];

      const results = analyzer.analyzeFields(fields);

      expect(results).toHaveLength(2);
      expect(results[0].contextTypes).toContain('logging');
      expect(results[1].contextTypes).toContain('api_response');
    });
  });

  describe('hasContextType', () => {
    it('should return true when context type is present', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'console.log(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      expect(analyzer.hasContextType(field, 'logging')).toBe(true);
    });

    it('should return false when context type is not present', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'const x = 1;',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      expect(analyzer.hasContextType(field, 'logging')).toBe(false);
    });
  });

  describe('getRiskLevel', () => {
    it('should return high for high-risk contexts', () => {
      const field = createMockField({
        name: 'password',
        context: {
          surroundingCode: 'console.log(password);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      expect(analyzer.getRiskLevel(field)).toBe('high');
    });

    it('should return low for no contexts', () => {
      const field = createMockField();

      expect(analyzer.getRiskLevel(field)).toBe('low');
    });
  });

  describe('isHighRiskUsage', () => {
    it('should return true for logging context', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'console.log(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      expect(analyzer.isHighRiskUsage(field)).toBe(true);
    });

    it('should return true for serialization context', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'JSON.stringify(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      expect(analyzer.isHighRiskUsage(field)).toBe(true);
    });

    it('should return true for API response context', () => {
      const field = createMockField({
        context: {
          surroundingCode: 'res.json(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      expect(analyzer.isHighRiskUsage(field)).toBe(true);
    });

    it('should return false for storage-only context', () => {
      const field = createMockField({
        name: 'data', // non-sensitive name
        context: {
          surroundingCode: 'await db.save(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      // Storage is medium risk, not high risk by default
      // But the isHighRiskUsage checks for high-risk context TYPES
      expect(analyzer.isHighRiskUsage(field)).toBe(false);
    });

    it('should return false for no contexts', () => {
      const field = createMockField();

      expect(analyzer.isHighRiskUsage(field)).toBe(false);
    });
  });

  describe('registerPattern', () => {
    it('should allow registering custom patterns', () => {
      analyzer.registerPattern({
        type: 'other',
        patterns: [/customPattern/i],
        baseRisk: 'high',
        isHighRisk: true,
      });

      const field = createMockField({
        context: {
          surroundingCode: 'customPattern(data);',
          comments: [],
          parentScope: '',
          usageContexts: [],
        },
      });

      const result = analyzer.analyzeField(field);

      expect(result.contextTypes).toContain('other');
    });
  });
});

describe('createUsageContextAnalyzer', () => {
  it('should create analyzer with default patterns', () => {
    const analyzer = createUsageContextAnalyzer();
    expect(analyzer.getPatterns().length).toBeGreaterThan(0);
  });

  it('should create analyzer with custom patterns', () => {
    const customPattern = {
      type: 'other' as const,
      patterns: [/myCustom/i],
      baseRisk: 'medium' as const,
      isHighRisk: false,
    };

    const analyzer = createUsageContextAnalyzer([customPattern]);
    const patterns = analyzer.getPatterns();

    expect(patterns.some(p => p.patterns.some(r => r.source === 'myCustom'))).toBe(true);
  });
});

describe('analyzeUsageContext', () => {
  it('should analyze field using convenience function', () => {
    const field = createMockField({
      context: {
        surroundingCode: 'console.log(data);',
        comments: [],
        parentScope: '',
        usageContexts: [],
      },
    });

    const result = analyzeUsageContext(field);

    expect(result.contextTypes).toContain('logging');
  });
});

describe('isHighRiskUsage convenience function', () => {
  it('should detect high-risk usage', () => {
    const field = createMockField({
      context: {
        surroundingCode: 'res.json(userData);',
        comments: [],
        parentScope: '',
        usageContexts: [],
      },
    });

    expect(isHighRiskUsage(field)).toBe(true);
  });
});

describe('HIGH_RISK_CONTEXT_TYPES', () => {
  it('should include logging, serialization, and api_response', () => {
    expect(HIGH_RISK_CONTEXT_TYPES).toContain('logging');
    expect(HIGH_RISK_CONTEXT_TYPES).toContain('serialization');
    expect(HIGH_RISK_CONTEXT_TYPES).toContain('api_response');
  });
});

describe('MEDIUM_RISK_CONTEXT_TYPES', () => {
  it('should include storage and display', () => {
    expect(MEDIUM_RISK_CONTEXT_TYPES).toContain('storage');
    expect(MEDIUM_RISK_CONTEXT_TYPES).toContain('display');
  });
});
