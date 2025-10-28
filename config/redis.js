require('dotenv').config();
const { Redis } = require('ioredis');

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
};

// For Redis Cloud or other providers that use connection strings
if (process.env.REDIS_URL) {
    redisConfig.host = undefined;
    redisConfig.port = undefined;
}

const createRedisConnection = () => {
    const connection = process.env.REDIS_URL 
        ? new Redis(process.env.REDIS_URL)
        : new Redis(redisConfig);
    
    connection.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
    
    connection.on('connect', () => {
        console.log('Redis connected successfully');
    });
    
    return connection;
};

module.exports = {
    createRedisConnection,
    redisConfig
};

