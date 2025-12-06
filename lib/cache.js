/**
 * Shared caching utility for API key validation
 * Provides a consistent caching interface with TTL support and size limits
 */

/**
 * Create a cache instance with configurable options
 * @param {Object} options - Cache configuration options
 * @param {boolean} [options.enabled=true] - Whether caching is enabled
 * @param {number} [options.ttlSuccess=45000] - TTL for successful validations (ms)
 * @param {number} [options.ttlFailure=10000] - TTL for failed validations (ms)
 * @param {number} [options.maxSize=1000] - Maximum cache size
 * @returns {Object} Cache instance with get, set, and invalidate methods
 */
function createCache(options = {}) {
    const CACHE_ENABLED = (options.enabled !== undefined 
        ? options.enabled 
        : (process.env.API_KEY_CACHE_ENABLED || 'true').toLowerCase() === 'true');
    const CACHE_TTL_SUCCESS = options.ttlSuccess || Number(process.env.API_KEY_CACHE_TTL || 45000);
    const CACHE_TTL_FAILURE = options.ttlFailure || 10000;
    const MAX_CACHE_SIZE = options.maxSize || Number(process.env.API_KEY_CACHE_MAX_SIZE || 1000);

    const validationCache = new Map();

    /**
     * Get cached validation result
     * @param {string} key - Cache key (typically trimmed API key)
     * @returns {*} Cached value or undefined if not found/expired
     */
    function get(key) {
        if (!CACHE_ENABLED) return undefined;
        const entry = validationCache.get(key);
        if (!entry) return undefined;
        if (Date.now() >= entry.expiresAt) {
            validationCache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    /**
     * Set cached validation result
     * @param {string} key - Cache key (typically trimmed API key)
     * @param {*} value - Value to cache (can be null for negative cache)
     * @param {number} [ttlMs] - Optional TTL override (defaults to success TTL)
     */
    function set(key, value, ttlMs) {
        if (!CACHE_ENABLED) return;
        
        // Evict oldest entry if cache is full
        if (validationCache.size >= MAX_CACHE_SIZE) {
            const firstKey = validationCache.keys().next().value;
            if (firstKey) validationCache.delete(firstKey);
        }
        
        const ttl = ttlMs !== undefined ? ttlMs : (value === null ? CACHE_TTL_FAILURE : CACHE_TTL_SUCCESS);
        validationCache.set(key, {
            value,
            expiresAt: Date.now() + ttl
        });
    }

    /**
     * Invalidate a specific cache entry
     * @param {string} key - Cache key to invalidate
     */
    function invalidate(key) {
        if (!key) return;
        validationCache.delete(key);
    }

    /**
     * Clear all cache entries
     */
    function clear() {
        validationCache.clear();
    }

    /**
     * Get current cache size
     * @returns {number} Number of entries in cache
     */
    function size() {
        return validationCache.size;
    }

    return {
        get,
        set,
        invalidate,
        clear,
        size
    };
}

module.exports = {
    createCache
};

