/**
 * Analysis Cache for caching scan and analysis results
 *
 * Implements LRU/TTL eviction strategies to cache analysis results
 * by file hash for improved performance.
 *
 * Validates: Requirements 8.2, 8.4
 */
import { AnalysisResult, CacheEntry } from '../types';
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
export declare const DEFAULT_CACHE_CONFIG: CacheConfig;
/**
 * AnalysisCache class for caching analysis results
 */
export declare class AnalysisCache {
    private cache;
    private accessOrder;
    private config;
    private stats;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Generates a hash for file content
     */
    generateFileHash(content: string): string;
    /**
     * Gets cached analysis results for a file
     *
     * Validates: Requirements 8.2
     *
     * @param filePath - Path to the file
     * @param fileHash - Hash of the file content
     * @returns Cached results if valid, null otherwise
     */
    get(filePath: string, fileHash: string): AnalysisResult[] | null;
    /**
     * Stores analysis results in the cache
     *
     * Validates: Requirements 8.4
     *
     * @param filePath - Path to the file
     * @param fileHash - Hash of the file content
     * @param results - Analysis results to cache
     */
    set(filePath: string, fileHash: string, results: AnalysisResult[]): void;
    /**
     * Invalidates cache entry for a file
     *
     * @param filePath - Path to the file to invalidate
     * @returns true if entry was removed, false if not found
     */
    invalidate(filePath: string): boolean;
    /**
     * Invalidates all cache entries
     */
    clear(): void;
    /**
     * Checks if a file is cached and valid
     *
     * @param filePath - Path to the file
     * @param fileHash - Hash of the file content
     * @returns true if cached and valid
     */
    has(filePath: string, fileHash: string): boolean;
    /**
     * Gets cache statistics
     */
    getStats(): CacheStats;
    /**
     * Resets cache statistics
     */
    resetStats(): void;
    /**
     * Gets the current cache size
     */
    getSize(): number;
    /**
     * Updates cache configuration
     */
    updateConfig(config: Partial<CacheConfig>): void;
    /**
     * Gets the current configuration
     */
    getConfig(): CacheConfig;
    /**
     * Enables or disables the cache
     */
    setEnabled(enabled: boolean): void;
    /**
     * Checks if the cache is enabled
     */
    isEnabled(): boolean;
    /**
     * Removes expired entries (for TTL policy)
     *
     * @returns Number of entries removed
     */
    cleanExpired(): number;
    /**
     * Gets the cache key for a file path
     */
    private getCacheKey;
    /**
     * Checks if a cache entry has expired
     */
    private isExpired;
    /**
     * Updates the access order for LRU tracking
     */
    private updateAccessOrder;
    /**
     * Removes a key from the access order
     */
    private removeFromAccessOrder;
    /**
     * Evicts an entry based on the eviction policy
     */
    private evict;
    /**
     * Updates the hit rate statistic
     */
    private updateHitRate;
    /**
     * Gets all cached file paths
     */
    getCachedFiles(): string[];
    /**
     * Gets cache entry metadata (without results) for debugging
     */
    getEntryMetadata(filePath: string): Omit<CacheEntry, 'analysisResults'> | null;
}
/**
 * Creates a new AnalysisCache instance
 */
export declare function createAnalysisCache(config?: Partial<CacheConfig>): AnalysisCache;
//# sourceMappingURL=analysis-cache.d.ts.map