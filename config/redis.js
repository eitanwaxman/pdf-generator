require('dotenv').config();
const { Redis } = require('ioredis');
const { createClient } = require('redis');
const { REDIS_RETRY } = require('./constants');

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

// Singleton cache for redis (node-redis) client
let redisClientPromise = null;

// Create a Redis client for rate limiting (using 'redis' package)
const createRedisConnection = async () => {
    if (redisClientPromise) return redisClientPromise;

    redisClientPromise = (async () => {
        let client;
        
        if (process.env.REDIS_URL) {
            client = createClient({ url: process.env.REDIS_URL });
        } else {
            client = createClient({
                socket: {
                    host: redisConfig.host,
                    port: redisConfig.port,
                    reconnectStrategy: (retries) => {
                        if (retries > REDIS_RETRY.MAX_RETRIES) {
                            console.error(`Redis connection failed after ${REDIS_RETRY.MAX_RETRIES} retries`);
                            return false; // Stop retrying
                        }
                        return Math.min(retries * REDIS_RETRY.BACKOFF_MULTIPLIER, REDIS_RETRY.MAX_BACKOFF_MS);
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
    })();

    return redisClientPromise;
};

// Singleton cache for BullMQ (ioredis) connection
let bullConnection = null;

// Create a Redis connection specifically for BullMQ
// BullMQ requires maxRetriesPerRequest: null
const createBullMQConnection = () => {
    if (bullConnection) return bullConnection;

    const bullConfig = {
        ...redisConfig,
        maxRetriesPerRequest: null, // Required for BullMQ
        retryStrategy: (times) => {
            if (times > REDIS_RETRY.MAX_RETRIES) {
                console.error(`BullMQ Redis connection failed after ${REDIS_RETRY.MAX_RETRIES} retries`);
                return null; // Stop retrying
            }
            return Math.min(times * REDIS_RETRY.BACKOFF_MULTIPLIER, REDIS_RETRY.MAX_BACKOFF_MS);
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
    
    bullConnection = connection;
    return bullConnection;
};

module.exports = {
    createRedisConnection,
    createBullMQConnection,
    redisConfig
};

