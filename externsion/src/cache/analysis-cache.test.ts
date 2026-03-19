/**
 * Tests for Analysis Cache
 * 
 * Validates: Requirements 8.2, 8.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnalysisCache,
  createAnalysisCache,
  DEFAULT_CACHE_CONFIG,
} from './analysis-cache';
import { AnalysisResult, FieldDeclaration } from '../types';

// Helper to create a mock analysis result
function createMockAnalysisResult(fieldName: string, filePath: string): AnalysisResult {
  const field: FieldDeclaration = {
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
  };

  return {
    field,
    isSensitive: true,
    confidenceScore: 85,
    detectedPatterns: ['pii'],
    reasoning: 'Test',
    priority: 'medium',
  };
}

describe('AnalysisCache', () => {
  let cache: AnalysisCache;

  beforeEach(() => {
    cache = createAnalysisCache();
  });

  describe('basic operations', () => {
    it('should store and retrieve analysis results', () => {
      const results = [createMockAnalysisResult('email', 'test.ts')];
      const hash = cache.generateFileHash('const email = "";');

      cache.set('test.ts', hash, results);
      const retrieved = cache.get('test.ts', hash);

      expect(retrieved).not.toBeNull();
      expect(retrieved).toHaveLength(1);
      expect(retrieved![0].field.name).toBe('email');
    });

    it('should return null for non-existent entries', () => {
      const hash = cache.generateFileHash('content');
      const result = cache.get('nonexistent.ts', hash);

      expect(result).toBeNull();
    });

    it('should return null when hash does not match', () => {
      const results = [createMockAnalysisResult('email', 'test.ts')];
      const hash1 = cache.generateFileHash('content1');
      const hash2 = cache.generateFileHash('content2');

      cache.set('test.ts', hash1, results);
      const retrieved = cache.get('test.ts', hash2);

      expect(retrieved).toBeNull();
    });

    it('should invalidate cache entry', () => {
      const results = [createMockAnalysisResult('email', 'test.ts')];
      const hash = cache.generateFileHash('content');

      cache.set('test.ts', hash, results);
      const removed = cache.invalidate('test.ts');

      expect(removed).toBe(true);
      expect(cache.get('test.ts', hash)).toBeNull();
    });

    it('should return false when invalidating non-existent entry', () => {
      const removed = cache.invalidate('nonexistent.ts');
      expect(removed).toBe(false);
    });

    it('should clear all entries', () => {
      const hash = cache.generateFileHash('content');
      cache.set('file1.ts', hash, []);
      cache.set('file2.ts', hash, []);

      cache.clear();

      expect(cache.getSize()).toBe(0);
    });
  });


  describe('incremental scanning - Validates: Requirements 8.2', () => {
    it('should use cached results for unchanged files', () => {
      const results = [createMockAnalysisResult('email', 'test.ts')];
      const content = 'const email = "";';
      const hash = cache.generateFileHash(content);

      // First access - cache miss
      cache.set('test.ts', hash, results);
      
      // Second access with same hash - cache hit
      const retrieved = cache.get('test.ts', hash);

      expect(retrieved).not.toBeNull();
      expect(cache.getStats().hits).toBe(1);
    });

    it('should invalidate cache when file content changes', () => {
      const results = [createMockAnalysisResult('email', 'test.ts')];
      const hash1 = cache.generateFileHash('const email = "";');
      const hash2 = cache.generateFileHash('const email = "changed";');

      cache.set('test.ts', hash1, results);
      
      // Access with different hash - should miss
      const retrieved = cache.get('test.ts', hash2);

      expect(retrieved).toBeNull();
      expect(cache.getStats().misses).toBe(1);
    });

    it('should track cache hit rate', () => {
      const hash = cache.generateFileHash('content');
      cache.set('test.ts', hash, []);

      // 2 hits
      cache.get('test.ts', hash);
      cache.get('test.ts', hash);
      
      // 1 miss
      cache.get('other.ts', hash);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(67); // 2/3 = 66.67% rounded
    });
  });

  describe('LRU eviction - Validates: Requirements 8.4', () => {
    it('should evict least recently used entry when full', () => {
      const smallCache = createAnalysisCache({ maxSize: 3 });
      const hash = smallCache.generateFileHash('content');

      smallCache.set('file1.ts', hash, []);
      smallCache.set('file2.ts', hash, []);
      smallCache.set('file3.ts', hash, []);

      // Access file1 to make it recently used
      smallCache.get('file1.ts', hash);

      // Add file4 - should evict file2 (least recently used)
      smallCache.set('file4.ts', hash, []);

      expect(smallCache.has('file1.ts', hash)).toBe(true);
      expect(smallCache.has('file2.ts', hash)).toBe(false); // Evicted
      expect(smallCache.has('file3.ts', hash)).toBe(true);
      expect(smallCache.has('file4.ts', hash)).toBe(true);
    });

    it('should track eviction count', () => {
      const smallCache = createAnalysisCache({ maxSize: 2 });
      const hash = smallCache.generateFileHash('content');

      smallCache.set('file1.ts', hash, []);
      smallCache.set('file2.ts', hash, []);
      smallCache.set('file3.ts', hash, []); // Triggers eviction

      expect(smallCache.getStats().evictions).toBe(1);
    });
  });

  describe('TTL eviction', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = createAnalysisCache({ ttlMs: 50 });
      const hash = shortTtlCache.generateFileHash('content');

      shortTtlCache.set('test.ts', hash, []);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const result = shortTtlCache.get('test.ts', hash);
      expect(result).toBeNull();
    });

    it('should clean expired entries', async () => {
      const shortTtlCache = createAnalysisCache({ ttlMs: 50 });
      const hash = shortTtlCache.generateFileHash('content');

      shortTtlCache.set('file1.ts', hash, []);
      shortTtlCache.set('file2.ts', hash, []);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 60));

      const removed = shortTtlCache.cleanExpired();
      expect(removed).toBe(2);
      expect(shortTtlCache.getSize()).toBe(0);
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      cache.updateConfig({ maxSize: 500, ttlMs: 60000 });
      const config = cache.getConfig();

      expect(config.maxSize).toBe(500);
      expect(config.ttlMs).toBe(60000);
    });

    it('should evict entries when max size is reduced', () => {
      const hash = cache.generateFileHash('content');
      cache.set('file1.ts', hash, []);
      cache.set('file2.ts', hash, []);
      cache.set('file3.ts', hash, []);

      cache.updateConfig({ maxSize: 2 });

      expect(cache.getSize()).toBe(2);
    });
  });

  describe('enable/disable', () => {
    it('should not cache when disabled', () => {
      cache.setEnabled(false);
      const hash = cache.generateFileHash('content');

      cache.set('test.ts', hash, []);
      const result = cache.get('test.ts', hash);

      expect(result).toBeNull();
      expect(cache.getSize()).toBe(0);
    });

    it('should clear cache when disabled', () => {
      const hash = cache.generateFileHash('content');
      cache.set('test.ts', hash, []);

      cache.setEnabled(false);

      expect(cache.getSize()).toBe(0);
      expect(cache.isEnabled()).toBe(false);
    });

    it('should resume caching when re-enabled', () => {
      cache.setEnabled(false);
      cache.setEnabled(true);

      const hash = cache.generateFileHash('content');
      cache.set('test.ts', hash, []);

      expect(cache.get('test.ts', hash)).not.toBeNull();
    });
  });

  describe('getCachedFiles', () => {
    it('should return all cached file paths', () => {
      const hash = cache.generateFileHash('content');
      cache.set('file1.ts', hash, []);
      cache.set('file2.ts', hash, []);
      cache.set('file3.ts', hash, []);

      const files = cache.getCachedFiles();

      expect(files).toHaveLength(3);
      expect(files).toContain('file1.ts');
      expect(files).toContain('file2.ts');
      expect(files).toContain('file3.ts');
    });
  });

  describe('getEntryMetadata', () => {
    it('should return metadata without analysis results', () => {
      const results = [createMockAnalysisResult('email', 'test.ts')];
      const hash = cache.generateFileHash('content');
      cache.set('test.ts', hash, results);

      const metadata = cache.getEntryMetadata('test.ts');

      expect(metadata).not.toBeNull();
      expect(metadata!.filePath).toBe('test.ts');
      expect(metadata!.fileHash).toBe(hash);
      expect(metadata!.cachedAt).toBeDefined();
      expect(metadata!.expiresAt).toBeDefined();
      expect((metadata as any).analysisResults).toBeUndefined();
    });

    it('should return null for non-existent entry', () => {
      const metadata = cache.getEntryMetadata('nonexistent.ts');
      expect(metadata).toBeNull();
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', () => {
      const hash = cache.generateFileHash('content');
      cache.set('test.ts', hash, []);
      cache.get('test.ts', hash); // hit
      cache.get('other.ts', hash); // miss

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('DEFAULT_CACHE_CONFIG', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_CACHE_CONFIG.maxSize).toBe(1000);
      expect(DEFAULT_CACHE_CONFIG.ttlMs).toBe(300000); // 5 minutes
      expect(DEFAULT_CACHE_CONFIG.evictionPolicy).toBe('lru');
      expect(DEFAULT_CACHE_CONFIG.enabled).toBe(true);
    });
  });
});
