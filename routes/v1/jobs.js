const express = require('express');
const { addPdfJob, pdfQueue } = require('../../queue/pdfQueue');
const { isValidUrl } = require('../../services/pdfService');

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

    try {
        const jobId = await addPdfJob(url, options, req.account);
        res.status(202).json({ 
            jobId, 
            status: 'pending',
            message: 'Job created successfully'
        });
    } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ error: 'Failed to create job' });
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

        const state = await job.getState();
        const progress = job.progress;

        // Job is still pending or active
        if (state === 'waiting' || state === 'delayed') {
            return res.json({ status: 'pending' });
        }

        if (state === 'active') {
            return res.json({ status: 'processing' });
        }

        // Job is completed
        if (state === 'completed') {
            const result = await job.returnvalue;
            return res.json({ 
                status: 'completed', 
                result 
            });
        }

        // Job failed
        if (state === 'failed') {
            const failedReason = job.failedReason || 'Unknown error';
            return res.json({ 
                status: 'failed', 
                error: failedReason 
            });
        }

        return res.json({ status: 'unknown' });

    } catch (error) {
        console.error('Error getting job:', error);
        res.status(500).json({ error: 'Failed to retrieve job status' });
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

        const state = await job.getState();

        if (state === 'pending' || state === 'delayed') {
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

