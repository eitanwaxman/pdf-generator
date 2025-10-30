const express = require('express');
const { verifySupabaseToken } = require('../../middleware/supabaseAuth');
const { getApiKeyForUser, rotateApiKey, createApiKeyForUser } = require('../../services/apiKeyService');
const { supabase } = require('../../config/supabase');
const { createCheckoutSession, cancelSubscription, getSubscription, stripe } = require('../../services/stripeService');
const { ensureCurrentBillingPeriod } = require('../../services/creditService');

/**
 * Reconciles the local user profile with a Stripe subscription object.
 * Updates the database if there are any inconsistencies.
 * @param {string} userId The user's ID.
 * @param {object} profile The user's current profile from the database.
 * @param {object} liveSub The live Stripe subscription object, with 'items.data.price' expanded.
 * @returns {Promise<object>} The updated (or original) user profile.
 */
async function reconcileSubscription(userId, profile, liveSub) {
    const firstItem = liveSub.items.data[0];
    const priceId = firstItem?.price?.id;
    const periodStart = firstItem?.current_period_start;
    const periodEnd = firstItem?.current_period_end;

    // Determine correct tier and credits from Stripe price
    let mappedTier = profile.tier;
    let mappedCredits = profile.monthly_credits;
    if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
        mappedTier = 'starter';
        mappedCredits = 1000;
    } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        mappedTier = 'pro';
        mappedCredits = 5000;
    }

    const isNewSync = !profile.stripe_subscription_id && liveSub.id;

    // Check if the DB record is out of sync with the Stripe subscription
    const needsUpdate = (
        profile.stripe_subscription_id !== liveSub.id ||
        profile.subscription_status !== liveSub.status ||
        profile.cancel_at_period_end !== liveSub.cancel_at_period_end ||
        (mappedTier && mappedTier !== profile.tier) ||
        (mappedCredits && mappedCredits !== profile.monthly_credits)
    );

    if (needsUpdate || isNewSync) {
        const updates = {
            stripe_subscription_id: liveSub.id,
            subscription_status: liveSub.status,
            cancel_at_period_end: liveSub.cancel_at_period_end,
            stripe_price_id: priceId,
            tier: mappedTier,
            monthly_credits: mappedCredits,
        };

        if (periodStart) {
            updates.subscription_period_start = new Date(periodStart * 1000).toISOString();
        }
        if (periodEnd) {
            updates.subscription_period_end = new Date(periodEnd * 1000).toISOString();
        }

        // If this is the first time we're syncing this subscription, reset credits used.
        if (isNewSync) {
            updates.credits_used = 0;
        }

        console.log(`[reconcile] Reconciling DB for user ${userId} with:`, updates);
        
        const { data: updatedProfile, error } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) {
            console.error(`[reconcile] Error updating user profile for ${userId}:`, error);
            throw error;
        }
        return updatedProfile;
    }

    // Return original profile if no update was needed
    return profile;
}

const router = express.Router();

// Apply Supabase JWT verification to all user routes
router.use(verifySupabaseToken);

/**
 * GET /api/v1/user/profile
 * Get user profile with tier, credits, and usage information
 */
router.get('/profile', async (req, res) => {
    try {
        console.log('[profile:get] user:', req.user?.id);
        // Ensure user is in current billing period (lazy evaluation)
        const profile = await ensureCurrentBillingPeriod(req.user.id);
        console.log('[profile:get] profile after ensureCurrentBillingPeriod:', {
            id: req.user.id,
            tier: profile?.tier,
            monthly_credits: profile?.monthly_credits,
            credits_used: profile?.credits_used,
            subscription_status: profile?.subscription_status,
            stripe_subscription_id: profile?.stripe_subscription_id,
            stripe_customer_id: profile?.stripe_customer_id,
            subscription_period_end: profile?.subscription_period_end
        });
        
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
 * Create Stripe Checkout session for subscription
 */
router.post('/checkout', async (req, res) => {
    try {
        const { tier } = req.body;
        console.log('[checkout] user:', req.user?.id, 'requested tier:', tier);
        
        if (!['starter', 'pro'].includes(tier)) {
            console.warn('[checkout] invalid tier:', tier);
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
        console.log('[checkout] profile:', profile);
        
        // App-level guard using DB fields
        if (profile.stripe_subscription_id && 
            profile.subscription_status === 'active' && 
            profile.tier !== 'free') {
            console.warn('[checkout] blocked by DB guard: existing active subscription', {
                stripe_subscription_id: profile.stripe_subscription_id,
                subscription_status: profile.subscription_status,
                tier_current: profile.tier,
                tier_requested: tier
            });
            if (profile.tier === tier) {
                return res.status(400).json({ 
                    error: 'Already subscribed',
                    message: `You are already subscribed to the ${tier} plan.`
                });
            }
            return res.status(400).json({ 
                error: 'Subscription exists',
                message: `You already have an active ${profile.tier} subscription. Please cancel your current subscription before changing plans.`
            });
        }
        
        // Stripe-level guard: check live subscriptions for this customer
        if (profile.stripe_customer_id) {
            try {
                console.log('[checkout] querying Stripe subscriptions for customer:', profile.stripe_customer_id);
                const subs = await stripe.subscriptions.list({
                    customer: profile.stripe_customer_id,
                    status: 'all',
                    limit: 10,
                });
                console.log('[checkout] Stripe subscriptions found:', subs.data.map(s => ({ id: s.id, status: s.status, cancel_at_period_end: s.cancel_at_period_end })));
                const activeSub = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status) && !s.cancel_at_period_end);
                if (activeSub) {
                    console.warn('[checkout] blocked by Stripe guard: found active subscription', { id: activeSub.id, status: activeSub.status });
                    
                    // Sync DB if missing or inconsistent
                    try {
                        console.log('[checkout] Verifying/syncing subscription from checkout guard');
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
                console.warn('[checkout] Stripe subscription check failed:', stripeErr?.message || stripeErr);
            }
        } else {
            console.log('[checkout] no stripe_customer_id on profile; checkout will create one');
        }
        
        // Create Stripe Checkout session
        console.log('[checkout] creating checkout session...');
        const session = await createCheckoutSession(
            req.user.id,
            tier,
            req.user.email,
            profile.stripe_customer_id
        );
        console.log('[checkout] session created:', { id: session.id, url: session.url });
        
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
        console.log('[subscription:get] profile before sync:', profile);

        let subscriptionId = profile.stripe_subscription_id;
        // Attempt sync if missing sub id
        if (!subscriptionId && profile.stripe_customer_id) {
            try {
                console.log('[subscription:get] syncing from Stripe for customer:', profile.stripe_customer_id);
                const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: 'all', limit: 10 });
                console.log('[subscription:get] Stripe subs:', subs.data.map(s => ({ id: s.id, status: s.status })));
                const activeSub = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status) && !s.cancel_at_period_end);
                if (activeSub) {
                    subscriptionId = activeSub.id;
                }
            } catch (e) {
                console.warn('[subscription:get] Stripe list failed:', e?.message || e);
            }
        }

        if (!subscriptionId) {
            console.log('[subscription:get] no active subscription');
            return res.json({ subscription: null, tier: profile.tier });
        }

        // Fetch live subscription with price expansion
        const liveSub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
        console.log('[subscription:get] RAW STRIPE SUBSCRIPTION:', JSON.stringify(liveSub, null, 2));
        console.log('[subscription:get] live sub:', { id: liveSub.id, status: liveSub.status });

        // Reconcile DB with Stripe truth
        const reconciledProfile = await reconcileSubscription(req.user.id, profile, liveSub);

        console.log('[subscription:get] returning live subscription:', { id: liveSub.id, status: liveSub.status, mappedTier: reconciledProfile.tier });
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

