const { supabase } = require('../config/supabase');

/**
 * Ensure user is in current billing period
 * If subscription_period_end has passed, reset credits and update period
 * This is a fallback mechanism - primary reset happens via Stripe webhooks
 * 
 * @param {string} userId - User's UUID
 * @returns {Promise<Object>} User profile object
 */
async function ensureCurrentBillingPeriod(userId) {
    try {
        // Fetch current profile
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        // If profile doesn't exist (PGRST116), create a default one
        if (error && error.code === 'PGRST116') {
            console.log(`Profile not found for user ${userId}, creating default profile`);
            
            const { data: newProfile, error: createError } = await supabase
                .from('user_profiles')
                .insert({
                    id: userId,
                    tier: 'free',
                    monthly_credits: 50,
                    credits_used: 0,
                    overage_enabled: false,
                    subscription_period_start: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (createError) {
                console.error('Error creating default profile:', createError);
                throw createError;
            }
            
            return newProfile;
        }
        
        if (error) {
            throw error;
        }
        
        // If no subscription_period_end, nothing to check
        if (!profile.subscription_period_end) {
            return profile;
        }
        
        const now = new Date();
        const periodEnd = new Date(profile.subscription_period_end);
        
        // Check if billing period has ended
        if (now > periodEnd) {
            console.log(`Billing period ended for user ${userId}. Resetting credits via lazy evaluation.`);
            
            // Calculate new period dates (advance by 1 month)
            const newPeriodStart = new Date(profile.subscription_period_end);
            const newPeriodEnd = new Date(newPeriodStart);
            newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
            
            // Reset credits and update period
            const { data: updatedProfile, error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    credits_used: 0,
                    subscription_period_start: newPeriodStart.toISOString(),
                    subscription_period_end: newPeriodEnd.toISOString()
                })
                .eq('id', userId)
                .select()
                .single();
            
            if (updateError) {
                throw updateError;
            }
            
            return updatedProfile;
        }
        
        return profile;
    } catch (error) {
        console.error('Error in ensureCurrentBillingPeriod:', error);
        throw error;
    }
}

const { MAX_MONTHLY_CREDITS } = require('../config/constants');

/**
 * @typedef {Object} UserProfile
 * @property {string} id - User's unique identifier
 * @property {string} tier - Subscription tier ('free' | 'starter' | 'pro')
 * @property {number} monthly_credits - Monthly credit allowance
 * @property {number} credits_used - Credits used in current period
 * @property {boolean} overage_enabled - Whether overage billing is enabled
 * @property {string} [stripe_metered_item_id] - Stripe metered item ID for overage
 * @property {string} [subscription_period_start] - Billing period start date
 * @property {string} [subscription_period_end] - Billing period end date
 */

/**
 * @typedef {Object} CreditCheckResult
 * @property {boolean} allowed - Whether the operation is allowed
 * @property {string} [reason] - Reason if not allowed
 * @property {Object} [details] - Additional details
 * @property {boolean} [isOverage] - Whether this is an overage usage
 * @property {number} [overageAmount] - Amount of overage
 */

/**
 * Check if user has sufficient credits to create a job
 * Applies runtime caps based on tier, regardless of DB values
 * Takes into account monthly credits, usage, and overage settings
 * 
 * @param {UserProfile} profile - User profile object
 * @returns {CreditCheckResult} Credit availability check result
 */
function checkCreditAvailability(profile) {
    const tier = profile.tier || 'free';
    const cap = MAX_MONTHLY_CREDITS[tier] ?? MAX_MONTHLY_CREDITS.free;
    const effectiveMonthlyCredits = Math.min(profile.monthly_credits ?? 0, cap);
    const creditsRemaining = effectiveMonthlyCredits - profile.credits_used;
    
    // User has credits remaining
    if (creditsRemaining > 0) {
        return { allowed: true };
    }
    
    // User exceeded limit - check if overage is enabled
    if (profile.overage_enabled && profile.tier !== 'free') {
        return { 
            allowed: true, 
            isOverage: true,
            overageAmount: Math.abs(creditsRemaining) + 1 // +1 for current job
        };
    }
    
    // No credits and no overage
    return {
        allowed: false,
        reason: 'Credit limit reached',
        details: {
            monthly_credits: effectiveMonthlyCredits,
            credits_used: profile.credits_used,
            credits_remaining: 0,
            overage_enabled: profile.overage_enabled,
            message: profile.tier === 'free'
                ? 'You have used all your monthly credits. Upgrade to a paid plan for more credits.'
                : 'You have used all your monthly credits. Enable overage in Settings or upgrade your plan.'
        }
    };
}

module.exports = {
    ensureCurrentBillingPeriod,
    checkCreditAvailability
};

