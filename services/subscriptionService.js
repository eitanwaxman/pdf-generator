const { supabase } = require('../config/supabase');

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

module.exports = {
    reconcileSubscription
};

