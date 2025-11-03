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
        
        // Timeout and connection settings for deployment environments
        const socketOptions = {
            connectTimeout: 10000, // 10 seconds to connect
            // socketTimeout removed - was causing 30s timeout errors on reconnect attempts
            keepAlive: 30000, // Keep connection alive (30 seconds)
            reconnectStrategy: (retries) => {
                // Disable automatic reconnection to prevent background retry loops
                // If Redis is unavailable, we gracefully degrade instead of constantly retrying
                return false; // Don't retry
            },
        };
        
        if (process.env.REDIS_URL) {
            client = createClient({ 
                url: process.env.REDIS_URL,
                socket: socketOptions
            });
        } else {
            client = createClient({
                socket: {
                    host: redisConfig.host,
                    port: redisConfig.port,
                    ...socketOptions,
                },
                password: redisConfig.password,
                database: redisConfig.db,
            });
        }
        
        client.on('error', (err) => {
            console.error('Redis connection error:', err);
            // Disconnect to prevent retry loops
            try {
                client.disconnect().catch(() => {});
            } catch (e) {
                // Ignore disconnect errors
            }
        });
        
        try {
            // Set a timeout for the connection attempt
            const connectPromise = client.connect();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
            );
            
            await Promise.race([connectPromise, timeoutPromise]);
            console.log('Redis connected successfully');
            return client;
        } catch (error) {
            console.error('Failed to connect to Redis:', error.message);
            console.log('Continuing without Redis - rate limiting will be disabled');
            
            // Disconnect the client to stop any background retry attempts
            try {
                await client.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
            
            // Reset cached promise so future calls don't get a broken connection
            redisClientPromise = null;
            
            // Return null to allow graceful degradation
            return null;
        }
    })();

    return redisClientPromise;
};

// Singleton cache for BullMQ (ioredis) connection
let bullConnection = null;

// Create a Redis connection specifically for BullMQ
// BullMQ requires maxRetriesPerRequest: null
const createBullMQConnection = () => {
    if (bullConnection) return bullConnection;

    // Timeout and connection settings for deployment environments
    const connectionOptions = {
        maxRetriesPerRequest: null, // Required for BullMQ
        connectTimeout: 10000, // 10 seconds to connect
        commandTimeout: 30000, // 30 seconds for commands
        keepAlive: 30000, // Keep connection alive
        enableReadyCheck: false,
        lazyConnect: true, // Connect lazily to prevent blocking startup
        retryStrategy: (times) => {
            if (times > REDIS_RETRY.MAX_RETRIES) {
                console.error(`BullMQ Redis connection failed after ${REDIS_RETRY.MAX_RETRIES} retries`);
                return null; // Stop retrying
            }
            return Math.min(times * REDIS_RETRY.BACKOFF_MULTIPLIER, REDIS_RETRY.MAX_BACKOFF_MS);
        },
        reconnectOnError: (err) => {
            const targetError = 'READONLY';
            if (err.message.includes(targetError)) {
                // Reconnect on READONLY error
                return true;
            }
            return false;
        },
    };
    
    const connection = process.env.REDIS_URL 
        ? new Redis(process.env.REDIS_URL, connectionOptions)
        : new Redis({
            ...redisConfig,
            ...connectionOptions,
        });
    
    connection.on('error', (err) => {
        console.error('BullMQ Redis connection error:', err.message);
        // Log but don't crash - allow graceful degradation
    });
    
    connection.on('connect', () => {
        console.log('BullMQ Redis connected successfully');
    });
    
    connection.on('ready', () => {
        console.log('BullMQ Redis ready');
    });
    
    connection.on('close', () => {
        console.log('BullMQ Redis connection closed');
    });
    
    // With lazyConnect: true, connection happens automatically on first command
    // This prevents blocking during startup and handles connection on-demand
    
    bullConnection = connection;
    return bullConnection;
};

module.exports = {
    createRedisConnection,
    createBullMQConnection,
    redisConfig
};

