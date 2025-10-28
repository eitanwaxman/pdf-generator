const { Queue } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');

const connection = createBullMQConnection();

const pdfQueue = new Queue('pdf-generation', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100,
        },
        removeOnFail: {
            age: 24 * 3600, // Keep failed jobs for 24 hours
        },
    },
});

/**
 * Add a PDF generation job to the queue
 * @param {string} url - Website URL to convert
 * @param {object} options - PDF generation options
 * @param {object} account - Account information
 * @returns {Promise<string>} - Job ID
 */
async function addPdfJob(url, options, account) {
    // Determine priority based on account tier
    const priority = account && account.tier === 'paid' ? 10 : 1;
    
    const job = await pdfQueue.add(
        'generate-pdf',
        {
            url,
            options,
            account: {
                tier: account.tier,
                apiKey: account.apiKey
            }
        },
        {
            priority,
            jobId: require('uuid').v4()
        }
    );
    
    return job.id;
}

module.exports = {
    pdfQueue,
    addPdfJob
};

