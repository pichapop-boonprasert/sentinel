/**
 * Analysis Cache for caching scan and analysis results
 * 
 * Implements LRU/TTL eviction strategies to cache analysis results
 * by file hash for improved performance.
 * 
 * Validates: Requirements 8.2, 8.4
 */

import { AnalysisResult, CacheEntry } from '../types';
import * as crypto from 'crypto';

/**
 * Cache eviction policy
 */
export type EvictionPolicy = 'lru' | 'ttl';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of entries in the cache */
  maxSize: number;
  /** Time-to-live in milliseconds for TTL eviction */
  ttlMs: number;
  /** Eviction policy to use */
  evictionPolicy: EvictionPolicy;
  /** Whether the cache is enabled */
  enabled: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current number of entries */
  size: number;
  /** Maximum size */
  maxSize: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Number of evictions */
  evictions: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 1000,
  ttlMs: 300000, // 5 minutes
  evictionPolicy: 'lru',
  enabled: true,
};

/**
 * AnalysisCache class for caching analysis results
 */
export class AnalysisCache {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private config: CacheConfig;
  private stats: CacheStats;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
      evictions: 0,
    };
  }

  /**
   * Generates a hash for file content
   */
  generateFileHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Gets cached analysis results for a file
   * 
   * Validates: Requirements 8.2
   * 
   * @param filePath - Path to the file
   * @param fileHash - Hash of the file content
   * @returns Cached results if valid, null otherwise
   */
  get(filePath: string, fileHash: string): AnalysisResult[] | null {
    if (!this.config.enabled) {
      return null;
    }

    const cacheKey = this.getCacheKey(filePath);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if hash matches (file hasn't changed)
    if (entry.fileHash !== fileHash) {
      this.stats.misses++;
      this.updateHitRate();
      // Remove stale entry
      this.cache.delete(cacheKey);
      this.removeFromAccessOrder(cacheKey);
      this.stats.size = this.cache.size;
      return null;
    }

    // Check if entry has expired (TTL)
    if (this.isExpired(entry)) {
      this.stats.misses++;
      this.updateHitRate();
      this.cache.delete(cacheKey);
      this.removeFromAccessOrder(cacheKey);
      this.stats.size = this.cache.size;
      return null;
    }

    // Cache hit - update access order for LRU
    this.stats.hits++;
    this.updateHitRate();
    this.updateAccessOrder(cacheKey);

    return entry.analysisResults;
  }


  /**
   * Stores analysis results in the cache
   * 
   * Validates: Requirements 8.4
   * 
   * @param filePath - Path to the file
   * @param fileHash - Hash of the file content
   * @param results - Analysis results to cache
   */
  set(filePath: string, fileHash: string, results: AnalysisResult[]): void {
    if (!this.config.enabled) {
      return;
    }

    const cacheKey = this.getCacheKey(filePath);
    const now = Date.now();

    // Evict if necessary before adding
    while (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    const entry: CacheEntry = {
      filePath,
      fileHash,
      analysisResults: results,
      cachedAt: now,
      expiresAt: now + this.config.ttlMs,
    };

    this.cache.set(cacheKey, entry);
    this.updateAccessOrder(cacheKey);
    this.stats.size = this.cache.size;
  }

  /**
   * Invalidates cache entry for a file
   * 
   * @param filePath - Path to the file to invalidate
   * @returns true if entry was removed, false if not found
   */
  invalidate(filePath: string): boolean {
    const cacheKey = this.getCacheKey(filePath);
    const existed = this.cache.has(cacheKey);
    
    if (existed) {
      this.cache.delete(cacheKey);
      this.removeFromAccessOrder(cacheKey);
      this.stats.size = this.cache.size;
    }

    return existed;
  }

  /**
   * Invalidates all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats.size = 0;
  }

  /**
   * Checks if a file is cached and valid
   * 
   * @param filePath - Path to the file
   * @param fileHash - Hash of the file content
   * @returns true if cached and valid
   */
  has(filePath: string, fileHash: string): boolean {
    const cacheKey = this.getCacheKey(filePath);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return false;
    }

    return entry.fileHash === fileHash && !this.isExpired(entry);
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Resets cache statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.stats.hitRate = 0;
  }

  /**
   * Gets the current cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Updates cache configuration
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.stats.maxSize = this.config.maxSize;

    // Evict if new max size is smaller
    while (this.cache.size > this.config.maxSize) {
      this.evict();
    }
  }

  /**
   * Gets the current configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Enables or disables the cache
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clear();
    }
  }

  /**
   * Checks if the cache is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Removes expired entries (for TTL policy)
   * 
   * @returns Number of entries removed
   */
  cleanExpired(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        this.removeFromAccessOrder(key);
        removed++;
      }
    }

    this.stats.size = this.cache.size;
    this.stats.evictions += removed;

    return removed;
  }


  /**
   * Gets the cache key for a file path
   */
  private getCacheKey(filePath: string): string {
    return filePath;
  }

  /**
   * Checks if a cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Updates the access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Removes a key from the access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index >= 0) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evicts an entry based on the eviction policy
   */
  private evict(): void {
    if (this.cache.size === 0) {
      return;
    }

    let keyToEvict: string | null = null;

    if (this.config.evictionPolicy === 'lru') {
      // LRU: Remove least recently used (first in access order)
      keyToEvict = this.accessOrder[0] || null;
    } else {
      // TTL: Remove oldest entry or first expired
      let oldestTime = Infinity;
      const now = Date.now();

      for (const [key, entry] of this.cache) {
        // Prefer expired entries
        if (entry.expiresAt < now) {
          keyToEvict = key;
          break;
        }
        // Otherwise, find oldest
        if (entry.cachedAt < oldestTime) {
          oldestTime = entry.cachedAt;
          keyToEvict = key;
        }
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict);
      this.removeFromAccessOrder(keyToEvict);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  /**
   * Updates the hit rate statistic
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
  }

  /**
   * Gets all cached file paths
   */
  getCachedFiles(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Gets cache entry metadata (without results) for debugging
   */
  getEntryMetadata(filePath: string): Omit<CacheEntry, 'analysisResults'> | null {
    const entry = this.cache.get(this.getCacheKey(filePath));
    if (!entry) {
      return null;
    }

    return {
      filePath: entry.filePath,
      fileHash: entry.fileHash,
      cachedAt: entry.cachedAt,
      expiresAt: entry.expiresAt,
    };
  }
}

/**
 * Creates a new AnalysisCache instance
 */
export function createAnalysisCache(config?: Partial<CacheConfig>): AnalysisCache {
  return new AnalysisCache(config);
}
