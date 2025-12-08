const express = require('express');
const { verifySupabaseToken } = require('../../middleware/supabaseAuth');
const { getApiKeyForUser, rotateApiKey, createApiKeyForUser, deleteApiKey } = require('../../services/apiKeyService');
const { getDemoKeyForUser } = require('../../services/demoApiKeyService');
const { supabase } = require('../../config/supabase');
const { createCheckoutSession, updateSubscriptionPlan, cancelSubscription, getSubscription, stripe } = require('../../services/stripeService');
const { ensureCurrentBillingPeriod } = require('../../services/creditService');
const { reconcileSubscription } = require('../../services/subscriptionService');

const router = express.Router();

// Apply Supabase JWT verification to all user routes
router.use(verifySupabaseToken);

/**
 * GET /api/v1/user/profile
 * Get user profile with tier, credits, and usage information
 */
router.get('/profile', async (req, res) => {
    try {
        
        // Ensure user is in current billing period (lazy evaluation)
        const profile = await ensureCurrentBillingPeriod(req.user.id);
        
        
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
                subscription_period_end: profile.subscription_period_end,
                cancel_at_period_end: profile.cancel_at_period_end,
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
 * Get user's API key (returns null if no key exists)
 * Also includes demo key for documentation
 */
router.get('/api-key', async (req, res) => {
    try {
        const apiKey = await getApiKeyForUser(req.user.id);
        const demoKey = await getDemoKeyForUser(req.user.id);
        
        if (!apiKey) {
            return res.json({
                api_key: null,
                demo_key: demoKey
            });
        }
        
        res.json({
            api_key: apiKey,
            demo_key: demoKey
        });
    } catch (error) {
        console.error('Error getting API key:', error);
        res.status(500).json({ error: 'Failed to retrieve API key' });
    }
});

/**
 * POST /api/v1/user/api-key
 * Create a new API key for the user
 */
router.post('/api-key', async (req, res) => {
    try {
        // Check if user already has an API key
        const existingKey = await getApiKeyForUser(req.user.id);
        if (existingKey) {
            return res.status(400).json({ error: 'API key already exists. Delete it first to create a new one.' });
        }
        
        const newKey = await createApiKeyForUser(req.user.id);
        
        res.json({
            message: 'API key created successfully',
            api_key: {
                key: newKey.key,
                name: 'Default API Key',
                created_at: new Date().toISOString(),
                last_used_at: null
            }
        });
    } catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

/**
 * DELETE /api/v1/user/api-key
 * Delete user's API key
 */
router.delete('/api-key', async (req, res) => {
    try {
        await deleteApiKey(req.user.id);
        
        res.json({
            message: 'API key deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: 'Failed to delete API key' });
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
 * Create Stripe Checkout session for subscription
 */
router.post('/checkout', async (req, res) => {
    try {
        const { tier } = req.body;
        
        if (!['starter', 'pro'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier' });
        }
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('stripe_customer_id, stripe_subscription_id, subscription_status, tier')
            .eq('id', req.user.id)
            .single();
        
        if (profileError) {
            console.error('[checkout] error fetching profile:', profileError);
            return res.status(500).json({ error: 'Failed to fetch user profile' });
        }
        
        
        // Check if user has an active subscription
        const hasActiveSubscription = profile.stripe_subscription_id && 
            profile.subscription_status === 'active' && 
            profile.tier !== 'free';
        
        if (hasActiveSubscription) {
            
            // If requesting the same tier, return error
            if (profile.tier === tier) {
                console.warn('[checkout] user already on requested tier:', tier);
                return res.status(400).json({ 
                    error: 'Already subscribed',
                    message: `You are already subscribed to the ${tier} plan.`
                });
            }
            
            // Handle plan change (upgrade or downgrade)
            
            
            try {
                // If subscription is marked for cancellation, we need to remove that first
                if (profile.cancel_at_period_end) {
                    await stripe.subscriptions.update(profile.stripe_subscription_id, {
                        cancel_at_period_end: false
                    });
                }
                
                // Update the subscription plan with proration
                const updatedSubscription = await updateSubscriptionPlan(
                    profile.stripe_subscription_id,
                    tier
                );
                
                
                
                // Determine new credits based on tier
                const newMonthlyCredits = tier === 'starter' ? 1000 : 5000;
                
                // Find the metered item for overage billing
                const meteredItem = updatedSubscription.items.data.find(
                    item => item.price.recurring?.usage_type === 'metered'
                );
                
                // Safely convert timestamps to ISO strings
                let periodStart = null;
                let periodEnd = null;
                
                if (updatedSubscription.current_period_start) {
                    const startDate = new Date(updatedSubscription.current_period_start * 1000);
                    if (!isNaN(startDate.getTime())) {
                        periodStart = startDate.toISOString();
                    }
                }
                
                if (updatedSubscription.current_period_end) {
                    const endDate = new Date(updatedSubscription.current_period_end * 1000);
                    if (!isNaN(endDate.getTime())) {
                        periodEnd = endDate.toISOString();
                    }
                }
                
                
                
                // Prepare update data
                const updateData = {
                    tier,
                    monthly_credits: newMonthlyCredits,
                    stripe_price_id: updatedSubscription.items.data[0].price.id,
                    stripe_metered_item_id: meteredItem ? meteredItem.id : null,
                    subscription_status: updatedSubscription.status,
                    cancel_at_period_end: false // Remove cancellation flag
                };
                
                // Only add dates if they're valid
                if (periodStart) updateData.subscription_period_start = periodStart;
                if (periodEnd) updateData.subscription_period_end = periodEnd;
                
                // Update local database with new plan details
                const { error: updateError } = await supabase
                    .from('user_profiles')
                    .update(updateData)
                    .eq('id', req.user.id);
                
                if (updateError) {
                    console.error('[checkout] error updating local DB after plan change:', updateError);
                    throw updateError;
                }
                
                
                
                // Return success response (no redirect needed)
                return res.json({
                    updated: true,
                    message: `Successfully ${profile.tier === 'starter' ? 'upgraded' : 'downgraded'} to ${tier} plan`,
                    tier,
                    subscription: {
                        id: updatedSubscription.id,
                        status: updatedSubscription.status
                    }
                });
            } catch (updateError) {
                console.error('[checkout] error updating subscription plan:', updateError);
                return res.status(500).json({
                    error: 'Failed to update plan',
                    message: updateError.message || 'Could not update your subscription. Please try again.'
                });
            }
        }
        
        // Stripe-level guard: check live subscriptions for this customer
        if (profile.stripe_customer_id) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: profile.stripe_customer_id,
                    status: 'all',
                    limit: 10,
                });
                const activeSub = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status) && !s.cancel_at_period_end);
                if (activeSub) {
                    
                    // Sync DB if missing or inconsistent
                    try {
                        const liveSub = await stripe.subscriptions.retrieve(activeSub.id, { expand: ['items.data.price'] });
                        await reconcileSubscription(req.user.id, profile, liveSub);
                    } catch (syncError) {
                        console.error('[checkout] Failed to sync subscription during checkout guard:', syncError);
                        return res.status(500).json({
                            error: 'Subscription sync failed',
                            message: 'We found an active subscription but failed to sync it. Please try again.'
                        });
                    }

                    return res.status(400).json({
                        error: 'Subscription exists',
                        message: 'You already have an active subscription. Please cancel it in Settings before creating a new one.'
                    });
                }
            } catch (stripeErr) {
            }
        } else {
        }
        
        // Create Stripe Checkout session
        const session = await createCheckoutSession(
            req.user.id,
            tier,
            req.user.email,
            profile.stripe_customer_id
        );
        
        res.json({
            url: session.url,
            sessionId: session.id
        });
    } catch (error) {
        console.error('Error in checkout:', error);
        res.status(500).json({ 
            error: 'Failed to create checkout session',
            message: error.message 
        });
    }
});

/**
 * GET /api/v1/user/subscription
 * Get current subscription details from Stripe (with auto-sync)
 */
router.get('/subscription', async (req, res) => {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', req.user.id)
            .single();
        if (profileError) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        

        let subscriptionId = profile.stripe_subscription_id;
        // Attempt sync if missing sub id
        if (!subscriptionId && profile.stripe_customer_id) {
            try {
                const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'all', limit: 10 });
                
                const activeSub = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status) && !s.cancel_at_period_end);
                if (activeSub) {
                    subscriptionId = activeSub.id;
                }
            } catch (e) {
                
            }
        }

        if (!subscriptionId) {
            
            return res.json({ subscription: null, tier: profile.tier });
        }

        // Fetch live subscription with price expansion
        const liveSub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
        

        // Reconcile DB with Stripe truth
        const reconciledProfile = await reconcileSubscription(req.user.id, profile, liveSub);

        
        res.json({
            subscription: {
                id: liveSub.id,
                status: liveSub.status,
                current_period_end: liveSub.items.data[0]?.current_period_end ? new Date(liveSub.items.data[0].current_period_end * 1000).toISOString() : null,
                cancel_at_period_end: liveSub.cancel_at_period_end,
                canceled_at: liveSub.canceled_at ? new Date(liveSub.canceled_at * 1000).toISOString() : null
            },
            tier: reconciledProfile.tier
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription details' });
    }
});

/**
 * POST /api/v1/user/subscription/cancel
 * Cancel subscription at period end
 */
router.post('/subscription/cancel', async (req, res) => {
    try {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('stripe_subscription_id, tier')
            .eq('id', req.user.id)
            .single();
        
        if (profileError) {
            return res.status(404).json({ error: 'Profile not found' });
        }
        
        if (!profile.stripe_subscription_id) {
            return res.status(400).json({ error: 'No active subscription to cancel' });
        }
        
        if (profile.tier === 'free') {
            return res.status(400).json({ error: 'Free tier users do not have a subscription' });
        }
        
        // Cancel subscription in Stripe
        const subscription = await cancelSubscription(profile.stripe_subscription_id);
        
        // Update local database
        await supabase
            .from('user_profiles')
            .update({ cancel_at_period_end: true })
            .eq('id', req.user.id);
        
        res.json({
            message: 'Subscription will be canceled at the end of the billing period',
            cancel_at: new Date(subscription.cancel_at * 1000).toISOString()
        });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
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

