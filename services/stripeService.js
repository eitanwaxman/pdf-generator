const Stripe = require('stripe');
const { supabase } = require('../config/supabase');

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Create a new Stripe customer
 * @param {string} email - User's email address
 * @param {string} userId - User's UUID from Supabase
 * @returns {Promise<string>} Stripe customer ID
 */
async function createCustomer(email, userId) {
    try {
        const customer = await stripe.customers.create({
            email,
            metadata: {
                user_id: userId
            }
        });
        
        // Update user profile with customer ID
        await supabase
            .from('user_profiles')
            .update({ stripe_customer_id: customer.id })
            .eq('id', userId);
        
        return customer.id;
    } catch (error) {
        console.error('Error creating Stripe customer:', error);
        throw error;
    }
}

/**
 * Create a Stripe Checkout session for subscription
 * @param {string} userId - User's UUID
 * @param {string} tier - 'starter' or 'pro'
 * @param {string} email - User's email
 * @param {string} customerId - Stripe customer ID (optional)
 * @returns {Promise<Object>} Checkout session object
 */
async function createCheckoutSession(userId, tier, email, customerId = null) {
    try {
        // Get or create customer
        let stripeCustomerId = customerId;
        
        // If we have a customer ID, verify it exists in Stripe
        if (stripeCustomerId) {
            try {
                await stripe.customers.retrieve(stripeCustomerId);
            } catch (error) {
                // Customer doesn't exist (deleted or from different mode)
                stripeCustomerId = null;
            }
        }
        
        // Create new customer if needed
        if (!stripeCustomerId) {
            stripeCustomerId = await createCustomer(email, userId);
        }
        
        // Determine price IDs based on tier
        const priceId = tier === 'starter' 
            ? process.env.STRIPE_STARTER_PRICE_ID 
            : process.env.STRIPE_PRO_PRICE_ID;
        
        const overagePriceId = tier === 'starter'
            ? process.env.STRIPE_STARTER_OVERAGE_PRICE_ID
            : process.env.STRIPE_PRO_OVERAGE_PRICE_ID;
        
        if (!priceId || !overagePriceId) {
            throw new Error('Stripe price IDs not configured. Check your .env file.');
        }
        
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        
        // Create checkout session with both fixed and metered prices
        // Both prices belong to the same product (licensed and metered billing model)
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            line_items: [
                {
                    // Fixed monthly subscription fee
                    price: priceId,
                    quantity: 1
                },
                {
                    // Metered overage price (same product, different price)
                    price: overagePriceId
                    // No quantity needed - usage is reported via API
                }
            ],
            success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/?checkout=canceled`,
            metadata: {
                user_id: userId,
                tier: tier
            }
        });
        
        return session;
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
}

/**
 * Update subscription plan with proration
 * @param {string} subscriptionId - Stripe subscription ID
 * @param {string} newTier - New tier ('starter' or 'pro')
 * @returns {Promise<Object>} Updated subscription object
 */
async function updateSubscriptionPlan(subscriptionId, newTier) {
    try {
        // Determine new price IDs based on tier
        const newFixedPriceId = newTier === 'starter' 
            ? process.env.STRIPE_STARTER_PRICE_ID 
            : process.env.STRIPE_PRO_PRICE_ID;
        
        const newMeteredPriceId = newTier === 'starter'
            ? process.env.STRIPE_STARTER_OVERAGE_PRICE_ID
            : process.env.STRIPE_PRO_OVERAGE_PRICE_ID;
        
        if (!newFixedPriceId || !newMeteredPriceId) {
            throw new Error('Stripe price IDs not configured for new tier');
        }
        
        // Retrieve current subscription to get item IDs
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
        });
        
        // Find the fixed and metered items
        const fixedItem = subscription.items.data.find(
            item => item.price.recurring?.usage_type !== 'metered'
        );
        const meteredItem = subscription.items.data.find(
            item => item.price.recurring?.usage_type === 'metered'
        );
        
        if (!fixedItem || !meteredItem) {
            throw new Error('Could not find subscription items');
        }
        
        
        
        // Update subscription with proration
        // Use 'always_invoice' to immediately charge/credit the prorated amount
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [
                {
                    id: fixedItem.id,
                    price: newFixedPriceId
                },
                {
                    id: meteredItem.id,
                    price: newMeteredPriceId
                }
            ],
            proration_behavior: 'always_invoice',
            billing_cycle_anchor: 'unchanged',
            cancel_at_period_end: false // Remove any cancellation if exists
        });
        
        // Retrieve the updated subscription with expanded data to get fresh period dates
        const refreshedSubscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['items.data.price']
        });
        
        
        
        return refreshedSubscription;
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        throw error;
    }
}

/**
 * Cancel a subscription at period end
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Updated subscription object
 */
async function cancelSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });
        
        return subscription;
    } catch (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }
}

/**
 * Retrieve subscription details
 * @param {string} subscriptionId - Stripe subscription ID
 * @returns {Promise<Object>} Subscription object
 */
async function getSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        return subscription;
    } catch (error) {
        console.error('Error retrieving subscription:', error);
        throw error;
    }
}

/**
 * Report usage for metered billing (overage)
 * @param {string} subscriptionItemId - Stripe subscription item ID for metered billing
 * @param {number} quantity - Number of credits used (default 1)
 * @returns {Promise<Object>} Usage record object
 */
async function reportUsage(subscriptionItemId, quantity = 1) {
    try {
        const usageRecord = await stripe.subscriptionItems.createUsageRecord(
            subscriptionItemId,
            {
                quantity: quantity,
                timestamp: Math.floor(Date.now() / 1000),
                action: 'increment'
            }
        );
        
        return usageRecord;
    } catch (error) {
        console.error('Error reporting usage to Stripe:', error);
        throw error;
    }
}

/**
 * Construct and verify webhook event
 * @param {string|Buffer} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @returns {Object} Verified Stripe event object
 */
function constructWebhookEvent(payload, signature) {
    try {
        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
        
        return event;
    } catch (error) {
        console.error('Error verifying webhook signature:', error);
        throw error;
    }
}

module.exports = {
    stripe,
    createCustomer,
    createCheckoutSession,
    updateSubscriptionPlan,
    cancelSubscription,
    getSubscription,
    reportUsage,
    constructWebhookEvent
};

