const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { createRedisConnection } = require('../config/redis');

// Redis connection for rate limiting
const redisConnection = createRedisConnection();

// Rate limiter for free tier: 50 requests per day
const freeRateLimiter = rateLimit({
    store: new RedisStore({
        client: redisConnection
    }),
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 50, // Limit free accounts to 50 requests per day
    message: 'Rate limit exceeded for free account. Upgrade to paid for unlimited access.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limiter wrapper that applies based on account tier
const rateLimiter = (req, res, next) => {
    // If paid account, skip rate limiting entirely
    if (req.account && req.account.tier === 'paid') {
        return next();
    }
    
    // Apply free tier rate limiting
    return freeRateLimiter(req, res, next);
};

module.exports = {
    rateLimiter
};

