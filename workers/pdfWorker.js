const { Worker } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');
const { generateOutput } = require('../services/outputService');
const { isValidUrl } = require('../config/validators');
const { RESPONSE_TYPES, RESULT_TYPES, WORKER_CONCURRENCY } = require('../config/constants');
const fs = require('fs');

const connection = createBullMQConnection();

async function incrementActiveCounter(apiKey) {
    try {
        const key = `concurrent:active:${apiKey}`;
        await connection.incr(key);
    } catch (e) {
        console.error('Failed to increment active counter:', e.message);
    }
}

async function decrementActiveCounter(apiKey) {
    try {
        const key = `concurrent:active:${apiKey}`;
        await connection.decr(key);
    } catch (e) {
        console.error('Failed to decrement active counter:', e.message);
    }
}

const worker = new Worker(
    'pdf-generation',
    async (job) => {
        const { url, options = {}, account } = job.data;
        const apiKey = account?.apiKey;
        if (apiKey) {
            await incrementActiveCounter(apiKey);
        }
        
        try {
            // Validate URL
            if (!isValidUrl(url)) {
                throw new Error('Invalid URL provided');
            }

            // Enforce hard 60s timeout for generation
            const HARD_TIMEOUT_MS = 60 * 1000;
            const timeoutPromise = new Promise((_, reject) => {
                const t = setTimeout(() => {
                    clearTimeout(t);
                    reject(new Error('Generation exceeded 60 seconds timeout'));
                }, HARD_TIMEOUT_MS);
            });

            // Generate output (PDF or screenshot) with timeout race
            const generationPromise = generateOutput({
                url,
                options,
                account
            });

            const { buffer, fileUrl, outputType } = await Promise.race([generationPromise, timeoutPromise]);

            // Calculate size for response
            const MB = 1024 * 1024; // 1MB in bytes
            const sizeBytes = buffer.length;
            const sizeMB = Number((sizeBytes / MB).toFixed(2));

            // Store result based on response type
            const responseType = options.responseType || RESPONSE_TYPES.BUFFER;

            // Build result
            const result = {
                outputType,
                sizeBytes,
                sizeMB
            };

            if (responseType === RESPONSE_TYPES.URL) {
                result.type = RESULT_TYPES.URL;
                result.url = fileUrl;
            } else {
                result.type = RESULT_TYPES.BUFFER;
                result.data = buffer.toString('base64');
                // Keep 'pdf' field for backward compatibility
                if (outputType === 'pdf') {
                    result.pdf = buffer.toString('base64');
                }
            }

            return result;
        } finally {
            if (apiKey) {
                await decrementActiveCounter(apiKey);
            }
        }
    },
    {
        connection,
        concurrency: WORKER_CONCURRENCY,
    }
);

worker.on('completed', (job) => {
    const outputType = job.data?.options?.outputType || 'pdf';
    console.log(`Job ${job.id} completed successfully (${outputType})`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err.message);
});

worker.on('error', (err) => {
    console.error('Worker error:', err);
    if (err.message && err.message.includes('ECONNREFUSED')) {
        console.error('Redis connection failed. Please start Redis server.');
        console.error('On Windows: Download and run Redis from https://redis.io/download');
        console.error('Or use a cloud Redis service and set REDIS_URL in .env');
    }
});

module.exports = worker;

