const { Worker } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const { generatePdf, isValidUrl } = require('../services/pdfService');
const fs = require('fs');

const connection = createRedisConnection();

const worker = new Worker(
    'pdf-generation',
    async (job) => {
        const { url, options, account } = job.data;
        
        // Validate URL
        if (!isValidUrl(url)) {
            throw new Error('Invalid URL provided');
        }
        
        // Generate PDF (map legacy options to new parameter shape)
        const { pdfBuffer, fileUrl } = await generatePdf({
            url,
            pdfOptions: options,
            account,
            env: options && typeof options.wix !== 'undefined' ? (options.wix ? 'wix' : 'generic') : 'generic'
        });
        
        // Check file size limit (default 50MB)
        const maxSizeMB = parseInt(process.env.MAX_PDF_SIZE_MB) || 50;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        if (pdfBuffer.length > maxSizeBytes) {
            throw new Error(`PDF size (${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
        }
        
        // Store result based on response type
        const responseType = options.responseType || 'buffer';
        
        if (responseType === 'url') {
            return {
                type: 'url',
                url: fileUrl
            };
        } else {
            // Convert buffer to base64
            return {
                type: 'buffer',
                pdf: pdfBuffer.toString('base64')
            };
        }
    },
    {
        connection,
        concurrency: 1, // Process one PDF at a time to avoid overwhelming the system
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
});

module.exports = worker;

