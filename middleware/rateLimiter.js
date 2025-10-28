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

// Custom rate limiter using Redis directly
const checkRateLimit = async (apiKey) => {
    if (!redisConnection || initFailed) {
        return true; // Allow request if Redis unavailable
    }

    try {
        const key = `rate_limit:${apiKey}`;
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

// Rate limiter wrapper that applies based on account tier
const rateLimiter = async (req, res, next) => {
    // If paid account, skip rate limiting entirely
    if (req.account && req.account.tier === 'paid') {
        return next();
    }
    
    // If rate limiter initialization failed, allow all requests
    if (initFailed) {
        return next();
    }
    
    // If rate limiter is not ready yet, skip rate limiting temporarily
    if (!redisConnection) {
        return next();
    }
    
    // Check rate limit
    const allowed = await checkRateLimit(req.account.apiKey);
    
    if (!allowed) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded for free account. Upgrade to paid for unlimited access.' 
        });
    }
    
    return next();
};

module.exports = {
    rateLimiter
};
