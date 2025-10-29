const express = require('express');
const { supabase } = require('../../config/supabase');

const router = express.Router();

/**
 * Middleware to verify internal/service role requests
 * These endpoints should ONLY be accessible with SUPABASE_SERVICE_ROLE_KEY
 * NOT accessible via user JWT tokens
 */
const verifyServiceRole = (req, res, next) => {
    const serviceKey = req.headers['x-service-key'];
    
    if (!serviceKey || serviceKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(403).json({ error: 'Forbidden: Service role required' });
    }
    
    next();
};

// Apply service role verification to all internal routes
router.use(verifyServiceRole);

/**
 * POST /internal/billing/update-plan
 * Update user's subscription plan and credits
 * Body: { user_id, tier, monthly_credits }
 */
router.post('/update-plan', async (req, res) => {
    try {
        const { user_id, tier, monthly_credits } = req.body;
        
        if (!user_id || !tier || !monthly_credits) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (!['free', 'starter', 'pro'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                tier,
                monthly_credits,
                subscription_period_start: new Date().toISOString()
            })
            .eq('id', user_id)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating plan:', error);
            return res.status(500).json({ error: 'Failed to update plan' });
        }
        
        res.json({
            message: 'Plan updated successfully',
            profile: data
        });
    } catch (error) {
        console.error('Error in update plan:', error);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

/**
 * POST /internal/billing/add-credits
 * Add credits to user's account
 * Body: { user_id, credits }
 */
router.post('/add-credits', async (req, res) => {
    try {
        const { user_id, credits } = req.body;
        
        if (!user_id || typeof credits !== 'number') {
            return res.status(400).json({ error: 'Missing or invalid fields' });
        }
        
        // Get current profile
        const { data: profile, error: fetchError } = await supabase
            .from('user_profiles')
            .select('monthly_credits')
            .eq('id', user_id)
            .single();
        
        if (fetchError) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                monthly_credits: profile.monthly_credits + credits
            })
            .eq('id', user_id)
            .select()
            .single();
        
        if (error) {
            console.error('Error adding credits:', error);
            return res.status(500).json({ error: 'Failed to add credits' });
        }
        
        res.json({
            message: 'Credits added successfully',
            profile: data
        });
    } catch (error) {
        console.error('Error in add credits:', error);
        res.status(500).json({ error: 'Failed to add credits' });
    }
});

/**
 * POST /internal/billing/reset-credits
 * Reset monthly credits for all users (called by cron job)
 * Optionally reset for specific user
 * Body: { user_id? }
 */
router.post('/reset-credits', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        let query = supabase
            .from('user_profiles')
            .update({
                credits_used: 0,
                subscription_period_start: new Date().toISOString()
            });
        
        if (user_id) {
            query = query.eq('id', user_id);
        }
        
        const { data, error } = await query.select();
        
        if (error) {
            console.error('Error resetting credits:', error);
            return res.status(500).json({ error: 'Failed to reset credits' });
        }
        
        res.json({
            message: 'Credits reset successfully',
            updated_count: data.length
        });
    } catch (error) {
        console.error('Error in reset credits:', error);
        res.status(500).json({ error: 'Failed to reset credits' });
    }
});

/**
 * POST /internal/billing/increment-usage
 * Increment credits_used for a user (called when job is created)
 * Body: { user_id, credits }
 */
router.post('/increment-usage', async (req, res) => {
    try {
        const { user_id, credits = 1 } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ error: 'Missing user_id' });
        }
        
        // Get current profile
        const { data: profile, error: fetchError } = await supabase
            .from('user_profiles')
            .select('credits_used')
            .eq('id', user_id)
            .single();
        
        if (fetchError) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                credits_used: profile.credits_used + credits
            })
            .eq('id', user_id)
            .select()
            .single();
        
        if (error) {
            console.error('Error incrementing usage:', error);
            return res.status(500).json({ error: 'Failed to increment usage' });
        }
        
        res.json({
            message: 'Usage incremented successfully',
            profile: data
        });
    } catch (error) {
        console.error('Error in increment usage:', error);
        res.status(500).json({ error: 'Failed to increment usage' });
    }
});

module.exports = router;

