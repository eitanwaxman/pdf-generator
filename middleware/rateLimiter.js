const { createRedisConnection } = require('../config/redis');
const { RATE_LIMIT } = require('../config/constants');

// Redis connection for rate limiting
let redisConnection;
let initAttempted = false;
let initFailed = false;

// Initialize Redis connection asynchronously
(async () => {
    try {
        initAttempted = true;
        redisConnection = await createRedisConnection();
        console.log('Rate limiter initialized successfully');
    } catch (error) {
        console.error('Failed to initialize rate limiter:', error.message);
        console.log('Rate limiting will be disabled. Starting without Redis...');
        initFailed = true;
    }
})();

// Custom daily rate limiter using Redis directly
const checkDailyLimit = async (apiKey) => {
    if (!redisConnection || initFailed) {
        return true; // Allow request if Redis unavailable
    }

    try {
        const key = `rate_limit:daily:${apiKey}`;
        const windowMs = RATE_LIMIT.WINDOW_MS;
        const maxRequests = RATE_LIMIT.MAX_REQUESTS_FREE;
        
        const current = await redisConnection.get(key);
        
        if (current === null) {
            // First request in window
            await redisConnection.setEx(key, windowMs / 1000, '1');
            return true;
        }
        
        const count = parseInt(current);
        if (count >= maxRequests) {
            return false; // Rate limit exceeded
        }
        
        // Increment count
        await redisConnection.incr(key);
        return true;
        
    } catch (error) {
        console.error('Rate limit check error:', error.message);
        return true; // Allow request on error
    }
};

// Per-minute throttle using Redis INCR with TTL window
const checkPerMinuteLimit = async (apiKey, tier) => {
    if (!redisConnection || initFailed) {
        return true; // Allow when Redis unavailable
    }

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
        console.error('Per-minute rate limit check error:', error.message);
        return true; // Fail-open on errors
    }
};

// Rate limiter wrapper that applies based on account tier
const rateLimiter = async (req, res, next) => {
    const tier = req.account?.tier || 'free';
    
    // If rate limiter initialization failed, allow all requests
    if (initFailed) {
        return next();
    }
    
    // If rate limiter is not ready yet, skip rate limiting temporarily
    if (!redisConnection) {
        return next();
    }
    
    // Per-minute limit (applies to both free and paid, with different caps)
    const minuteAllowed = await checkPerMinuteLimit(req.account.apiKey, tier);
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
