const express = require('express');
const { addPdfJob, pdfQueue } = require('../../queue/pdfQueue');
const { validateJobOptions, isValidUrl } = require('../../config/validators');
const { QUEUE } = require('../../config/constants');
const { supabase } = require('../../config/supabase');

const router = express.Router();

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
        // Check credit limits before creating job
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('tier, monthly_credits, credits_used, overage_enabled')
            .eq('id', req.account.userId)
            .single();
        
        if (profileError) {
            console.error('Error fetching profile:', profileError);
            
            // Provide helpful error message for missing column
            if (profileError.code === '42703' && profileError.message.includes('monthly_credits')) {
                return res.status(500).json({ 
                    error: 'Database schema mismatch',
                    message: 'The monthly_credits column is missing from the user_profiles table.',
                    solution: 'Please run the migration SQL in your Supabase SQL Editor. See migration-add-credits.sql file.',
                    details: profileError.message
                });
            }
            
            return res.status(500).json({ error: 'Failed to verify account credits' });
        }
        
        const creditsRemaining = profile.monthly_credits - profile.credits_used;
        
        // Check if user has credits remaining or overage enabled
        if (creditsRemaining <= 0 && !profile.overage_enabled) {
            return res.status(429).json({ 
                error: 'Credit limit reached',
                details: {
                    monthly_credits: profile.monthly_credits,
                    credits_used: profile.credits_used,
                    credits_remaining: 0,
                    overage_enabled: false,
                    message: 'You have used all your monthly credits. Enable overage in settings or upgrade your plan.'
                }
            });
        }
        
        // Create the job
        const jobId = await addPdfJob(url, options, req.account);
        const outputType = options?.outputType || 'pdf';
        
        // Increment credits_used counter using service role
        const { error: incrementError } = await supabase
            .from('user_profiles')
            .update({ credits_used: profile.credits_used + 1 })
            .eq('id', req.account.userId);
        
        if (incrementError) {
            console.error('Error incrementing credits:', incrementError);
            // Don't fail the job, but log the error
        }
        
        const newCreditsRemaining = Math.max(0, creditsRemaining - 1);
        
        res.status(202).json({ 
            jobId, 
            status: 'pending',
            outputType,
            message: 'Job created successfully',
            credits: {
                used: profile.credits_used + 1,
                remaining: newCreditsRemaining,
                monthly_limit: profile.monthly_credits
            }
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

