const { Worker } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');
const { generatePdf } = require('../services/pdfService');
const { isValidUrl } = require('../config/validators');
const { RESPONSE_TYPES, RESULT_TYPES, WORKER_CONCURRENCY } = require('../config/constants');
const fs = require('fs');

const connection = createBullMQConnection();

const worker = new Worker(
    'pdf-generation',
    async (job) => {
        const { url, options, account } = job.data;
        
        // Validate URL
        if (!isValidUrl(url)) {
            throw new Error('Invalid URL provided');
        }
        
        // Generate PDF
        const { pdfBuffer, fileUrl } = await generatePdf({
            url,
            pdfOptions: options,
            account
        });
        
        // Calculate size for response
        const MB = 1024 * 1024; // 1MB in bytes
        const sizeBytes = pdfBuffer.length;
        const sizeMB = Number((sizeBytes / MB).toFixed(2));
        
        // Store result based on response type
        const responseType = options.responseType || RESPONSE_TYPES.BUFFER;
        
        if (responseType === RESPONSE_TYPES.URL) {
            return {
                type: RESULT_TYPES.URL,
                url: fileUrl,
                sizeBytes,
                sizeMB
            };
        } else {
            // Convert buffer to base64
            return {
                type: RESULT_TYPES.BUFFER,
                pdf: pdfBuffer.toString('base64'),
                sizeBytes,
                sizeMB
            };
        }
    },
    {
        connection,
        concurrency: WORKER_CONCURRENCY,
    }
);

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
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

