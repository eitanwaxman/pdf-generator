const express = require('express');
const { verifySupabaseToken } = require('../../middleware/supabaseAuth');
const { getApiKeyForUser, rotateApiKey, createApiKeyForUser } = require('../../services/apiKeyService');
const { supabase } = require('../../config/supabase');

const router = express.Router();

// Apply Supabase JWT verification to all user routes
router.use(verifySupabaseToken);

/**
 * GET /api/v1/user/profile
 * Get user profile with tier, credits, and usage information
 */
router.get('/profile', async (req, res) => {
    try {
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('tier, monthly_credits, credits_used, overage_enabled, subscription_period_start, created_at, updated_at, stripe_customer_id, subscription_status')
            .eq('id', req.user.id)
            .single();
        
        if (error) {
            console.error('Error fetching user profile:', error);
            
            // Provide helpful error message for missing column
            if (error.code === '42703' && error.message.includes('monthly_credits')) {
                return res.status(500).json({ 
                    error: 'Database schema mismatch',
                    message: 'The monthly_credits column is missing from the user_profiles table.',
                    solution: 'Please run the migration SQL in your Supabase SQL Editor. See migration-add-credits.sql file.',
                    details: error.message
                });
            }
            
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        // Calculate credits remaining
        const creditsRemaining = Math.max(0, profile.monthly_credits - profile.credits_used);
        
        res.json({
            profile: {
                email: req.user.email,
                tier: profile.tier,
                monthly_credits: profile.monthly_credits,
                credits_used: profile.credits_used,
                credits_remaining: creditsRemaining,
                overage_enabled: profile.overage_enabled,
                subscription_period_start: profile.subscription_period_start,
                stripe_customer_id: profile.stripe_customer_id,
                subscription_status: profile.subscription_status,
                created_at: profile.created_at,
                updated_at: profile.updated_at
            }
        });
    } catch (error) {
        console.error('Error in get profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * GET /api/v1/user/api-key
 * Get user's API key
 */
router.get('/api-key', async (req, res) => {
    try {
        let apiKey = await getApiKeyForUser(req.user.id);
        
        // If no API key exists, create one
        if (!apiKey) {
            const newKey = await createApiKeyForUser(req.user.id);
            apiKey = {
                key: newKey.key,
                name: 'Default API Key',
                created_at: new Date().toISOString(),
                last_used_at: null
            };
        }
        
        res.json({
            api_key: apiKey
        });
    } catch (error) {
        console.error('Error getting API key:', error);
        res.status(500).json({ error: 'Failed to retrieve API key' });
    }
});

/**
 * POST /api/v1/user/api-key/rotate
 * Rotate user's API key (delete old, create new)
 */
router.post('/api-key/rotate', async (req, res) => {
    try {
        const newKey = await rotateApiKey(req.user.id);
        
        res.json({
            message: 'API key rotated successfully',
            api_key: {
                key: newKey.key,
                name: 'Default API Key',
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error rotating API key:', error);
        res.status(500).json({ error: 'Failed to rotate API key' });
    }
});

/**
 * PATCH /api/v1/user/settings
 * Update user-controllable settings (overage_enabled only)
 * Credits and tier CANNOT be modified by users
 */
router.patch('/settings', async (req, res) => {
    try {
        const { overage_enabled } = req.body;
        
        if (typeof overage_enabled !== 'boolean') {
            return res.status(400).json({ error: 'Invalid overage_enabled value' });
        }
        
        // Only allow updating overage_enabled
        const { data, error } = await supabase
            .from('user_profiles')
            .update({ overage_enabled })
            .eq('id', req.user.id)
            .select('overage_enabled')
            .single();
        
        if (error) {
            console.error('Error updating settings:', error);
            return res.status(500).json({ error: 'Failed to update settings' });
        }
        
        res.json({
            message: 'Settings updated successfully',
            settings: {
                overage_enabled: data.overage_enabled
            }
        });
    } catch (error) {
        console.error('Error in update settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * POST /api/v1/user/checkout
 * Initiate plan upgrade (placeholder for Stripe integration)
 */
router.post('/checkout', async (req, res) => {
    try {
        const { tier } = req.body;
        
        if (!['starter', 'pro'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        
        // TODO: Implement Stripe checkout session creation
        // For now, return a placeholder response
        res.json({
            message: 'Checkout not yet implemented',
            tier,
            note: 'Stripe integration coming soon'
        });
    } catch (error) {
        console.error('Error in checkout:', error);
        res.status(500).json({ error: 'Failed to initiate checkout' });
    }
});

/**
 * DELETE /api/v1/user/account
 * Delete user account and all associated data
 */
router.delete('/account', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Delete user from Supabase Auth (this will cascade delete profile and API keys)
        const { error } = await supabase.auth.admin.deleteUser(userId);
        
        if (error) {
            console.error('Error deleting user:', error);
            return res.status(500).json({ error: 'Failed to delete account' });
        }
        
        res.json({
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('Error in delete account:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});

module.exports = router;

