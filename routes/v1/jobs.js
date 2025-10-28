const express = require('express');
const { addPdfJob, pdfQueue } = require('../../queue/pdfQueue');
const { isValidUrl } = require('../../services/pdfService');
const { validatePdfOptions } = require('../../config/validators');
const { SIZE } = require('../../config/constants');

const router = express.Router();

/**
 * POST /api/v1/jobs
 * Create a new PDF generation job
 */
router.post('/', async (req, res) => {
    const { url, options } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate PDF options if provided
    if (options) {
        const validation = validatePdfOptions(options);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Invalid PDF options',
                details: validation.errors
            });
        }
    }

    try {
        const jobId = await addPdfJob(url, options, req.account);
        res.status(202).json({ 
            jobId, 
            status: 'pending',
            message: 'Job created successfully'
        });
    } catch (error) {
        console.error('Error creating job:', {
            message: error.message,
            stack: error.stack,
            url,
            options
        });
        res.status(500).json({ 
            error: 'Failed to create job',
            details: error.message
        });
    }
});

/**
 * GET /api/v1/jobs/:jobId
 * Get job status and result
 */
router.get('/:jobId', async (req, res) => {
    const { jobId } = req.params;

    try {
        const job = await pdfQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Authorization check: verify the job belongs to the authenticated user
        const jobAccount = job.data?.account;
        if (jobAccount && jobAccount.apiKey !== req.account.apiKey) {
            return res.status(403).json({ error: 'Access forbidden: You can only access your own jobs' });
        }

        const state = await job.getState();
        const progress = job.progress;
        const attemptsMade = job.attemptsMade;
        const failedReason = job.failedReason;
        const returnValue = await job.returnvalue;
        const timestamps = {
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn
        };

        // Job is still pending or active
        if (state === 'waiting' || state === 'delayed') {
            return res.json({ status: 'pending', progress, attemptsMade, ...timestamps });
        }

        if (state === 'active') {
            return res.json({ status: 'processing', progress, attemptsMade, ...timestamps });
        }

        // Job is completed
        if (state === 'completed') {
            const result = returnValue;
            // augment result with size if present
            const sizeBytes = result && typeof result.sizeBytes === 'number' ? result.sizeBytes : undefined;
            const sizeMB = result && typeof result.sizeMB === 'number' ? result.sizeMB : (sizeBytes ? Number((sizeBytes / SIZE.MB).toFixed(2)) : undefined);
            return res.json({ 
                status: 'completed', 
                result,
                sizeBytes,
                sizeMB,
                progress,
                attemptsMade,
                ...timestamps
            });
        }

        // Job failed
        if (state === 'failed') {
            const reason = failedReason || 'Unknown error';
            return res.json({ 
                status: 'failed', 
                error: reason,
                attemptsMade,
                ...timestamps
            });
        }

        return res.json({ status: 'unknown' });

    } catch (error) {
        console.error('Error getting job:', { message: error.message, stack: error.stack, jobId });
        res.status(500).json({ error: 'Failed to retrieve job status', details: error.message });
    }
});

/**
 * DELETE /api/v1/jobs/:jobId
 * Cancel a job (if still pending)
 */
router.delete('/:jobId', async (req, res) => {
    const { jobId } = req.params;

    try {
        const job = await pdfQueue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Authorization check: verify the job belongs to the authenticated user
        const jobAccount = job.data?.account;
        if (jobAccount && jobAccount.apiKey !== req.account.apiKey) {
            return res.status(403).json({ error: 'Access forbidden: You can only delete your own jobs' });
        }

        const state = await job.getState();

        if (state === 'waiting' || state === 'delayed') {
            await job.remove();
            return res.json({ message: 'Job cancelled successfully' });
        }

        return res.status(400).json({ error: 'Cannot cancel job in current state' });
    } catch (error) {
        console.error('Error cancelling job:', error);
        res.status(500).json({ error: 'Failed to cancel job' });
    }
});

module.exports = router;

