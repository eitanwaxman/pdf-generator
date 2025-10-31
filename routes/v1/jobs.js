const express = require('express');
const { addPdfJob, pdfQueue } = require('../../queue/pdfQueue');
const { validateJobOptions, isValidUrl } = require('../../config/validators');
const { QUEUE, CONCURRENCY } = require('../../config/constants');
const { createRedisConnection } = require('../../config/redis');
const { supabase } = require('../../config/supabase');
const { ensureCurrentBillingPeriod, checkCreditAvailability } = require('../../services/creditService');
const { reportUsage } = require('../../services/stripeService');

const router = express.Router();

// Redis connection for concurrency tracking (shared with rate limiter pattern)
let redisConnection;
let redisInitFailed = false;
(async () => {
    try {
        redisConnection = await createRedisConnection();
    } catch (e) {
        console.error('Jobs route: failed to init Redis for concurrency tracking:', e.message);
        redisInitFailed = true;
    }
})();

async function getActiveCount(apiKey) {
    if (!redisConnection || redisInitFailed) return 0;
    try {
        const key = `concurrent:active:${apiKey}`;
        const val = await redisConnection.get(key);
        return val ? parseInt(val, 10) : 0;
    } catch (e) {
        return 0;
    }
}

/**
 * POST /api/v1/jobs
 * Create a new PDF or Screenshot generation job
 */
router.post('/', async (req, res) => {
    const { url, options } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate job options (PDF or Screenshot)
    if (options) {
        const validation = validateJobOptions(options);
        if (!validation.valid) {
            return res.status(400).json({ 
                error: 'Invalid options',
                details: validation.errors
            });
        }
    }

    try {
        // Enforce per-user active job concurrency limit
        const tier = req.account?.tier || 'free';
        const limit = tier === 'paid' ? CONCURRENCY.PAID_ACTIVE_MAX : CONCURRENCY.FREE_ACTIVE_MAX;
        const activeCount = await getActiveCount(req.account.apiKey);
        if (activeCount >= limit) {
            return res.status(429).json({
                error: 'Too many concurrent jobs',
                details: `Limit is ${limit} active jobs for ${tier} tier. Please wait for existing jobs to finish.`
            });
        }

        // Ensure user is in current billing period (lazy evaluation fallback)
        let profile = await ensureCurrentBillingPeriod(req.account.userId);
        
        // Check credit availability
        const creditCheck = checkCreditAvailability(profile);
        
        if (!creditCheck.allowed) {
            return res.status(429).json({ 
                error: creditCheck.reason,
                details: creditCheck.details
            });
        }
        
        // Create the job
        const jobId = await addPdfJob(url, options, req.account);
        const outputType = options?.outputType || 'pdf';
        
        // Increment credits_used counter
        const { error: incrementError } = await supabase
            .from('user_profiles')
            .update({ credits_used: profile.credits_used + 1 })
            .eq('id', req.account.userId);
        
        if (incrementError) {
            console.error('Error incrementing credits:', incrementError);
            // Don't fail the job, but log the error
        }
        
        // Report overage usage to Stripe if applicable
        if (creditCheck.isOverage && profile.stripe_metered_item_id) {
            try {
                await reportUsage(profile.stripe_metered_item_id, 1);
                console.log(`Reported overage usage to Stripe for user ${req.account.userId}`);
            } catch (stripeError) {
                console.error('Error reporting usage to Stripe:', stripeError);
                // Don't fail the job, overage will be tracked in credits_used
            }
        }
        
        const creditsRemaining = Math.max(0, profile.monthly_credits - profile.credits_used - 1);
        const isOverage = creditCheck.isOverage || false;
        
        const response = { 
            jobId, 
            status: 'pending',
            outputType,
            message: 'Job created successfully',
            credits: {
                used: profile.credits_used + 1,
                remaining: creditsRemaining,
                monthly_limit: profile.monthly_credits
            }
        };
        
        // Add overage info if applicable
        if (isOverage) {
            response.credits.overage = true;
            response.credits.overage_amount = profile.credits_used + 1 - profile.monthly_credits;
        }
        
        res.status(202).json(response);
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

        // Prepare retry information
        const retryInfo = {
            attemptsMade,
            maxAttempts: QUEUE.MAX_ATTEMPTS,
            hasRetriesRemaining: attemptsMade < QUEUE.MAX_ATTEMPTS,
            currentAttempt: attemptsMade + 1
        };

        // Check if job has failed (either in failed state or exhausted retries)
        if (state === 'failed' || (attemptsMade >= QUEUE.MAX_ATTEMPTS && failedReason)) {
            const reason = failedReason || 'Unknown error';
            return res.json({ 
                status: 'failed', 
                error: reason,
                attemptsMade,
                retryInfo: {
                    ...retryInfo,
                    exhausted: true,
                    message: `Failed after ${attemptsMade} of ${QUEUE.MAX_ATTEMPTS} attempts`
                },
                ...timestamps
            });
        }

        // Job is still pending (waiting to be processed initially)
        if (state === 'waiting') {
            return res.json({ 
                status: 'pending', 
                progress, 
                attemptsMade, 
                retryInfo,
                ...timestamps 
            });
        }

        // Job is delayed (waiting for retry backoff) - this means it's being retried after a failure
        if (state === 'delayed') {
            return res.json({ 
                status: 'processing', 
                progress, 
                attemptsMade,
                retryInfo: {
                    ...retryInfo,
                    isRetrying: attemptsMade > 0,
                    message: attemptsMade > 0 
                        ? `Retrying (attempt ${attemptsMade + 1} of ${QUEUE.MAX_ATTEMPTS})`
                        : 'Processing',
                    previousAttemptFailed: failedReason || null
                },
                ...timestamps 
            });
        }

        // Job is active (being processed)
        if (state === 'active') {
            return res.json({ 
                status: 'processing', 
                progress, 
                attemptsMade,
                retryInfo: {
                    ...retryInfo,
                    isRetrying: attemptsMade > 0,
                    message: attemptsMade > 0 
                        ? `Processing (attempt ${attemptsMade + 1} of ${QUEUE.MAX_ATTEMPTS})`
                        : 'Processing',
                    previousAttemptFailed: attemptsMade > 0 ? (failedReason || null) : null
                },
                ...timestamps 
            });
        }

        // Job is completed
        if (state === 'completed') {
            const result = returnValue;
            // augment result with size if present
            const sizeBytes = result && typeof result.sizeBytes === 'number' ? result.sizeBytes : undefined;
            const MB = 1024 * 1024; // 1MB in bytes
            const sizeMB = result && typeof result.sizeMB === 'number' ? result.sizeMB : (sizeBytes ? Number((sizeBytes / MB).toFixed(2)) : undefined);
            return res.json({ 
                status: 'completed', 
                result,
                sizeBytes,
                sizeMB,
                progress,
                attemptsMade,
                retryInfo: {
                    ...retryInfo,
                    succeeded: true,
                    message: attemptsMade > 0 
                        ? `Succeeded on attempt ${attemptsMade + 1} of ${QUEUE.MAX_ATTEMPTS}`
                        : 'Succeeded on first attempt'
                },
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

