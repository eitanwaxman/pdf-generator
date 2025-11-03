const express = require('express');
const { addPdfJob, pdfQueue } = require('../../queue/pdfQueue');
const { validateJobOptions, isValidUrl } = require('../../config/validators');
const { QUEUE, CONCURRENCY, BYTES } = require('../../config/constants');
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

// In-memory fallback for poll throttling when Redis is unavailable
const pollThrottleMemory = new Map(); // key: `${apiKey}:${jobId}` -> number (last timestamp ms)
const POLL_MIN_INTERVAL_MS = 5000; // 5 seconds

async function checkPollThrottle(apiKey, jobId) {
    const key = `poll_limit:${apiKey}:${jobId}`;

    // Prefer Redis when available
    if (redisConnection && !redisInitFailed) {
        try {
            // SET key 1 NX EX 5  -> allow only once per 5 seconds
            const result = await redisConnection.set(key, '1', { NX: true, EX: Math.ceil(POLL_MIN_INTERVAL_MS / 1000) });
            return result === 'OK';
        } catch (e) {
            // fall through to in-memory if Redis op fails
        }
    }

    // In-memory fallback
    const memKey = `${apiKey}:${jobId}`;
    const lastTs = pollThrottleMemory.get(memKey) || 0;
    const now = Date.now();
    if (now - lastTs < POLL_MIN_INTERVAL_MS) {
        return false;
    }
    pollThrottleMemory.set(memKey, now);
    // best-effort cleanup to prevent unbounded growth
    if (pollThrottleMemory.size > 5000) {
        const firstKey = pollThrottleMemory.keys().next().value;
        if (firstKey) pollThrottleMemory.delete(firstKey);
    }
    return true;
}

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
        // Use apiKey for standard auth, or userId for public key auth
        const trackingKey = req.account.apiKey || req.account.userId;
        const activeCount = await getActiveCount(trackingKey);
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
        // Currently each job costs 1 credit (can be made configurable in the future)
        const jobCredits = 1;
        const jobId = await addPdfJob(url, options, req.account, jobCredits);
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
 * Calculate estimated time to completion based on queue position
 * @param {Object} job - BullMQ job object
 * @returns {Object|null} - Estimated time info or null if not waiting
 */
async function calculateEstimatedTime(job) {
    try {
        const state = await job.getState();
        
        // Only calculate for waiting jobs
        if (state !== 'waiting') {
            return null;
        }

        // Get all waiting jobs ordered by priority and creation time
        const waitingJobs = await pdfQueue.getWaiting();
        
        // Find this job's position in the queue
        let position = 0;
        for (let i = 0; i < waitingJobs.length; i++) {
            if (waitingJobs[i].id === job.id) {
                position = i;
                break;
            }
        }

        // Get active jobs count to understand current processing capacity
        const activeJobs = await pdfQueue.getActive();
        const activeCount = activeJobs.length;
        
        // Average processing time per job (in seconds) - this is an estimate
        // Based on 60s timeout, most jobs complete in 10-30 seconds, average ~20s
        const AVG_PROCESSING_TIME_SEC = 20;
        
        // Worker concurrency from constants
        const { WORKER_CONCURRENCY } = require('../config/constants');
        
        // Calculate available worker slots
        const availableSlots = Math.max(0, WORKER_CONCURRENCY - activeCount);
        
        // Estimate: if there are available slots, job might start soon
        // Otherwise, need to wait for jobs ahead to complete
        let estimatedSeconds = 0;
        
        if (position === 0 && availableSlots > 0) {
            // First in queue and workers available - start soon
            estimatedSeconds = 5; // Small buffer for job pickup
        } else if (availableSlots > 0) {
            // Not first, but workers available
            // Estimate based on jobs ahead and available capacity
            const jobsAheadPerSlot = Math.ceil(position / availableSlots);
            estimatedSeconds = jobsAheadPerSlot * AVG_PROCESSING_TIME_SEC;
        } else {
            // No available slots - need to wait for active jobs to finish
            // Estimate remaining time for active jobs + time for jobs ahead
            const activeJobRemainingTime = AVG_PROCESSING_TIME_SEC * 0.5; // Assume active jobs are halfway
            const jobsAheadTime = Math.ceil(position / WORKER_CONCURRENCY) * AVG_PROCESSING_TIME_SEC;
            estimatedSeconds = activeJobRemainingTime + jobsAheadTime;
        }

        // Add processing time for this job itself
        estimatedSeconds += AVG_PROCESSING_TIME_SEC;

        return {
            estimatedSeconds: Math.round(estimatedSeconds),
            estimatedMinutes: Math.round(estimatedSeconds / 60 * 10) / 10, // Round to 1 decimal
            queuePosition: position + 1, // 1-indexed for user display
            jobsAhead: position,
            activeJobs: activeCount,
            workerConcurrency: WORKER_CONCURRENCY
        };
    } catch (error) {
        console.error('Error calculating estimated time:', error);
        return null;
    }
}

/**
 * GET /api/v1/jobs/:jobId
 * Get job status and result
 */
router.get('/:jobId', async (req, res) => {
    const { jobId } = req.params;

    try {
        // Enforce max 1 poll per 5 seconds per API key per job
        const allowed = await checkPollThrottle(req.account.apiKey, jobId);
        if (!allowed) {
            return res.status(429).json({
                error: 'Too many status checks. Please poll at most once every 5 seconds.'
            });
        }

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

        // Get credits information from job data
        const credits = job.data?.credits ?? 1; // Default to 1 if not set (for backwards compatibility)

        // Calculate estimated time if job is waiting
        const estimatedTime = await calculateEstimatedTime(job);

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
                credits,
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
            const response = { 
                status: 'pending', 
                progress, 
                attemptsMade, 
                credits,
                retryInfo,
                ...timestamps 
            };
            
            // Add estimated time if available
            if (estimatedTime) {
                response.estimatedTime = estimatedTime;
            }
            
            return res.json(response);
        }

        // Job is delayed (waiting for retry backoff) - this means it's being retried after a failure
        if (state === 'delayed') {
            return res.json({ 
                status: 'processing', 
                progress, 
                attemptsMade,
                credits,
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
                credits,
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
            const sizeMB = result && typeof result.sizeMB === 'number' ? result.sizeMB : (sizeBytes ? Number((sizeBytes / BYTES.MB).toFixed(2)) : undefined);
            return res.json({ 
                status: 'completed', 
                result,
                sizeBytes,
                sizeMB,
                progress,
                attemptsMade,
                credits,
                retryInfo: {
                    ...retryInfo,
                    succeeded: true,
                    // BullMQ's attemptsMade reflects number of attempts that have been made.
                    // On completion without retries, attemptsMade === 1. Treat 1 as first attempt.
                    message: attemptsMade <= 1
                        ? 'Succeeded on first attempt'
                        : `Succeeded on attempt ${attemptsMade} of ${QUEUE.MAX_ATTEMPTS}`
                },
                ...timestamps
            });
        }

        return res.json({ 
            status: 'unknown',
            credits
        });

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

