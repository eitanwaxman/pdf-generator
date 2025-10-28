const { Queue } = require('bullmq');
const { createBullMQConnection } = require('../config/redis');
const { QUEUE, PRIORITY } = require('../config/constants');

const connection = createBullMQConnection();

const pdfQueue = new Queue('pdf-generation', {
    connection,
    defaultJobOptions: {
        attempts: QUEUE.MAX_ATTEMPTS,
        backoff: {
            type: 'exponential',
            delay: QUEUE.BACKOFF_DELAY,
        },
        removeOnComplete: {
            age: QUEUE.JOB_KEEP_COMPLETED_SECONDS,
            count: QUEUE.JOB_KEEP_COMPLETED_COUNT,
        },
        removeOnFail: {
            age: QUEUE.JOB_KEEP_FAILED_SECONDS,
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
    const priority = account && account.tier === 'paid' ? PRIORITY.PAID_TIER : PRIORITY.FREE_TIER;
    
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

