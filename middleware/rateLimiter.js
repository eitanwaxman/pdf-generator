const { createRedisConnection } = require('../config/redis');
const { RATE_LIMIT } = require('../config/constants');

// Redis connection for rate limiting
let redisConnection;
let initAttempted = false;
let initFailed = false;

// In-memory fallback rate limiter
// Structure: Map<apiKey, { requests: number[], windowStart: number }>
const inMemoryRateLimit = new Map();
const CLEANUP_INTERVAL_MS = 60000; // Clean up old entries every minute

// Cleanup function to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    const windowMs = RATE_LIMIT.PER_MINUTE.WINDOW_MS;
    
    for (const [key, data] of inMemoryRateLimit.entries()) {
        // Remove requests outside the window
        data.requests = data.requests.filter(timestamp => now - timestamp < windowMs);
        
        // Remove entry if no requests in window
        if (data.requests.length === 0) {
            inMemoryRateLimit.delete(key);
        }
    }
}, CLEANUP_INTERVAL_MS);

// Initialize Redis connection asynchronously
(async () => {
    try {
        initAttempted = true;
        redisConnection = await createRedisConnection();
        if (redisConnection === null) {
            console.log('Redis connection unavailable - rate limiting will use in-memory fallback');
            initFailed = true;
        } else {
            console.log('Rate limiter initialized successfully with Redis');
        }
    } catch (error) {
        console.error('Failed to initialize rate limiter:', error.message);
        console.log('Rate limiting will use in-memory fallback. Starting without Redis...');
        initFailed = true;
    }
})();

// In-memory per-minute throttle fallback
const checkPerMinuteLimitInMemory = (apiKey, tier) => {
    const now = Date.now();
    const windowMs = RATE_LIMIT.PER_MINUTE.WINDOW_MS;
    const maxRequests = RATE_LIMIT.PER_MINUTE[tier] ?? RATE_LIMIT.PER_MINUTE.free;

    let data = inMemoryRateLimit.get(apiKey);
    
    if (!data) {
        data = { requests: [], windowStart: now };
        inMemoryRateLimit.set(apiKey, data);
    }

    // Remove requests outside the window
    data.requests = data.requests.filter(timestamp => now - timestamp < windowMs);

    // Check if limit exceeded
    if (data.requests.length >= maxRequests) {
        return false;
    }

    // Add current request
    data.requests.push(now);
    return true;
};

// Per-minute throttle using Redis INCR with TTL window, with in-memory fallback
const checkPerMinuteLimit = async (apiKey, tier) => {
    // Try Redis first if available
    if (redisConnection && !initFailed) {
        try {
            const windowMs = RATE_LIMIT.PER_MINUTE.WINDOW_MS;
            const maxRequests = RATE_LIMIT.PER_MINUTE[tier] ?? RATE_LIMIT.PER_MINUTE.free;

            const key = `rate_limit:minute:${apiKey}`;

            // Use INCR and set TTL only when key is first created
            const current = await redisConnection.incr(key);
            if (current === 1) {
                await redisConnection.pExpire(key, windowMs);
            }

            if (current > maxRequests) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Per-minute rate limit check error (falling back to in-memory):', error.message);
            // Fall through to in-memory fallback
        }
    }

    // Use in-memory fallback when Redis is unavailable or fails
    return checkPerMinuteLimitInMemory(apiKey, tier);
};

// Rate limiter wrapper that applies based on account tier
const rateLimiter = async (req, res, next) => {
    // Skip rate limiting for demo keys (used in documentation)
    if (req.account?.isDemoKey) {
        return next();
    }
    
    const tier = req.account?.tier || 'free';
    
    // Get identifier for rate limiting:
    // - For secret keys: use apiKey
    // - For public keys: use publicKeyId (if available) or userId as fallback
    // - Fallback to userId if neither is available
    const rateLimitKey = req.account.apiKey || 
                        (req.account.isPublicKey ? req.account.publicKeyId : null) || 
                        req.account.userId;
    
    if (!rateLimitKey) {
        // If no key available, allow request (shouldn't happen, but fail-safe)
        return next();
    }
    
    // Per-minute limit (applies to both free and paid, with different caps)
    // This will use Redis if available, or in-memory fallback if not
    const minuteAllowed = await checkPerMinuteLimit(rateLimitKey, tier);
    if (!minuteAllowed) {
        return res.status(429).json({ 
            error: 'Too many requests in a short period. Please slow down.'
        });
    }

    // No daily limit for free tier anymore
    
    return next();
};

module.exports = {
    rateLimiter
};
