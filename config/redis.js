require('dotenv').config();
const { Redis } = require('ioredis');
const { createClient } = require('redis');

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

// Create a Redis client for rate limiting (using 'redis' package)
const createRedisConnection = async () => {
    let client;
    
    if (process.env.REDIS_URL) {
        client = createClient({ url: process.env.REDIS_URL });
    } else {
        client = createClient({
            socket: {
                host: redisConfig.host,
                port: redisConfig.port,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('Redis connection failed after 10 retries');
                        return false; // Stop retrying
                    }
                    return retries * 100;
                },
            },
            password: redisConfig.password,
            database: redisConfig.db,
        });
    }
    
    client.on('error', (err) => {
        console.error('Redis connection error:', err);
    });
    
    try {
        await client.connect();
        console.log('Redis connected successfully');
    } catch (error) {
        console.error('Failed to connect to Redis:', error.message);
        throw error;
    }
    
    return client;
};

// Create a Redis connection specifically for BullMQ
// BullMQ requires maxRetriesPerRequest: null
const createBullMQConnection = () => {
    const bullConfig = {
        ...redisConfig,
        maxRetriesPerRequest: null, // Required for BullMQ
        retryStrategy: (times) => {
            if (times > 10) {
                console.error('BullMQ Redis connection failed after 10 retries');
                return null; // Stop retrying
            }
            return Math.min(times * 100, 2000);
        },
        enableReadyCheck: false,
        lazyConnect: false,
    };
    
    const connection = process.env.REDIS_URL 
        ? new Redis(process.env.REDIS_URL, { 
            maxRetriesPerRequest: null,
            retryStrategy: bullConfig.retryStrategy,
            enableReadyCheck: false,
        })
        : new Redis(bullConfig);
    
    connection.on('error', (err) => {
        console.error('BullMQ Redis connection error:', err.message);
    });
    
    connection.on('connect', () => {
        console.log('BullMQ Redis connected successfully');
    });
    
    connection.on('close', () => {
        console.log('BullMQ Redis connection closed');
    });
    
    return connection;
};

module.exports = {
    createRedisConnection,
    createBullMQConnection,
    redisConfig
};

