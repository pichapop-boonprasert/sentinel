"use strict";
/**
 * Analysis Cache for caching scan and analysis results
 *
 * Implements LRU/TTL eviction strategies to cache analysis results
 * by file hash for improved performance.
 *
 * Validates: Requirements 8.2, 8.4
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisCache = exports.DEFAULT_CACHE_CONFIG = void 0;
exports.createAnalysisCache = createAnalysisCache;
const crypto = __importStar(require("crypto"));
/**
 * Default cache configuration
 */
exports.DEFAULT_CACHE_CONFIG = {
    maxSize: 1000,
    ttlMs: 300000, // 5 minutes
    evictionPolicy: 'lru',
    enabled: true,
};
/**
 * AnalysisCache class for caching analysis results
 */
class AnalysisCache {
    cache = new Map();
    accessOrder = []; // For LRU tracking
    config;
    stats;
    constructor(config) {
        this.config = { ...exports.DEFAULT_CACHE_CONFIG, ...config };
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
    generateFileHash(content) {
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
    get(filePath, fileHash) {
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
    set(filePath, fileHash, results) {
        if (!this.config.enabled) {
            return;
        }
        const cacheKey = this.getCacheKey(filePath);
        const now = Date.now();
        // Evict if necessary before adding
        while (this.cache.size >= this.config.maxSize) {
            this.evict();
        }
        const entry = {
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
    invalidate(filePath) {
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
    clear() {
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
    has(filePath, fileHash) {
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
    getStats() {
        return { ...this.stats };
    }
    /**
     * Resets cache statistics
     */
    resetStats() {
        this.stats.hits = 0;
        this.stats.misses = 0;
        this.stats.evictions = 0;
        this.stats.hitRate = 0;
    }
    /**
     * Gets the current cache size
     */
    getSize() {
        return this.cache.size;
    }
    /**
     * Updates cache configuration
     */
    updateConfig(config) {
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
    getConfig() {
        return { ...this.config };
    }
    /**
     * Enables or disables the cache
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }
    /**
     * Checks if the cache is enabled
     */
    isEnabled() {
        return this.config.enabled;
    }
    /**
     * Removes expired entries (for TTL policy)
     *
     * @returns Number of entries removed
     */
    cleanExpired() {
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
    getCacheKey(filePath) {
        return filePath;
    }
    /**
     * Checks if a cache entry has expired
     */
    isExpired(entry) {
        return Date.now() > entry.expiresAt;
    }
    /**
     * Updates the access order for LRU tracking
     */
    updateAccessOrder(key) {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }
    /**
     * Removes a key from the access order
     */
    removeFromAccessOrder(key) {
        const index = this.accessOrder.indexOf(key);
        if (index >= 0) {
            this.accessOrder.splice(index, 1);
        }
    }
    /**
     * Evicts an entry based on the eviction policy
     */
    evict() {
        if (this.cache.size === 0) {
            return;
        }
        let keyToEvict = null;
        if (this.config.evictionPolicy === 'lru') {
            // LRU: Remove least recently used (first in access order)
            keyToEvict = this.accessOrder[0] || null;
        }
        else {
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
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? Math.round((this.stats.hits / total) * 100) : 0;
    }
    /**
     * Gets all cached file paths
     */
    getCachedFiles() {
        return Array.from(this.cache.keys());
    }
    /**
     * Gets cache entry metadata (without results) for debugging
     */
    getEntryMetadata(filePath) {
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
exports.AnalysisCache = AnalysisCache;
/**
 * Creates a new AnalysisCache instance
 */
function createAnalysisCache(config) {
    return new AnalysisCache(config);
}
//# sourceMappingURL=analysis-cache.js.map