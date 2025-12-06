const { Worker } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');
const { generateOutput } = require('../services/outputService');
const { isValidUrl } = require('../config/validators');
const { RESPONSE_TYPES, RESULT_TYPES, WORKER_CONCURRENCY, TIME, BYTES } = require('../config/constants');
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
        const attemptsMade = job.attemptsMade || 0;
        
        console.log(`[Worker] Processing job ${job.id}, attempt ${attemptsMade + 1}, URL: ${url}`);
        
        if (apiKey) {
            await incrementActiveCounter(apiKey);
        }
        
        try {
            // Validate URL
            if (!isValidUrl(url)) {
                throw new Error('Invalid URL provided');
            }

            console.log(`[Worker] Starting generation for job ${job.id} (attempt ${attemptsMade + 1})`);

            // Enforce hard timeout for generation with immediate abort
            const controller = new AbortController();
            const timeoutPromise = new Promise((_, reject) => {
                const t = setTimeout(() => {
                    clearTimeout(t);
                    try { controller.abort(); } catch (e) {}
                    reject(new Error(`Generation exceeded ${TIME.GENERATION_TIMEOUT_MS / 1000} seconds timeout`));
                }, TIME.GENERATION_TIMEOUT_MS);
            });

            // Generate output (PDF or screenshot) with timeout race
            const generationPromise = generateOutput({
                url,
                options,
                account,
                signal: controller.signal
            });

            const { buffer, fileUrl, outputType } = await Promise.race([generationPromise, timeoutPromise]);
            
            console.log(`[Worker] Generation completed for job ${job.id} (attempt ${attemptsMade + 1}): ${outputType}, size: ${(buffer.length / BYTES.MB).toFixed(2)}MB`);

            // Calculate size for response
            const sizeBytes = buffer.length;
            const sizeMB = Number((sizeBytes / BYTES.MB).toFixed(2));

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
            }

            return result;
        } catch (error) {
            console.error(`[Worker] Error processing job ${job.id} (attempt ${attemptsMade + 1}):`, error.message);
            throw error;
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

worker.on('active', (job) => {
    const attemptsMade = job.attemptsMade || 0;
    const maxAttempts = job.opts?.attempts || 3;
    const outputType = job.data?.options?.outputType || 'pdf';
    console.log(`[Worker] Job ${job.id} active: attempt ${attemptsMade + 1}/${maxAttempts} (${outputType})`);
});

worker.on('completed', (job) => {
    const attemptsMade = job.attemptsMade || 0;
    const maxAttempts = job.opts?.attempts || 3;
    const outputType = job.data?.options?.outputType || 'pdf';
    // On completion, BullMQ increments attemptsMade for the final run as well.
    // So attemptsMade === 1 means first attempt success.
    const finishedAttempt = Math.max(1, attemptsMade);
    console.log(`[Worker] Job ${job.id} completed successfully: attempt ${finishedAttempt}/${maxAttempts} (${outputType})`);
});

worker.on('failed', (job, err) => {
    const attemptsMade = job.attemptsMade || 0;
    const maxAttempts = job.opts?.attempts || 3;
    console.error(`[Worker] Job ${job.id} failed on attempt ${attemptsMade}/${maxAttempts}: ${err.message}`);
    if (err.stack) {
        console.error(`[Worker] Stack trace:`, err.stack);
    }
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

