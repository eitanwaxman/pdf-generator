const express = require('express');
const { constructWebhookEvent } = require('../../services/stripeService');
const { supabase } = require('../../config/supabase');

const router = express.Router();

/**
 * Stripe webhook endpoint
 * Handles subscription lifecycle events
 * 
 * IMPORTANT: This route must be registered BEFORE body-parser middleware
 * to access raw request body for signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    let event;
    
    try {
        // Verify webhook signature
        event = constructWebhookEvent(req.body, signature);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    console.log(`Received Stripe webhook: ${event.type}`);
    
    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object);
                break;
            
            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object);
                break;
            
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            
            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            
            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object);
                break;
            
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true });
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

/**
 * Handle successful checkout completion
 * Updates user profile with subscription details
 */
async function handleCheckoutCompleted(session) {
    console.log('Processing checkout.session.completed');
    console.log('Session data:', {
        user_id: session.metadata?.user_id,
        tier: session.metadata?.tier,
        customer: session.customer,
        subscription: session.subscription
    });
    
    const userId = session.metadata.user_id;
    const tier = session.metadata.tier;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    
    if (!userId || !tier) {
        console.error('Missing user_id or tier in checkout session metadata');
        console.error('Full metadata:', session.metadata);
        return;
    }
    
    // Check if user already has a different active subscription
    const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('stripe_subscription_id, subscription_status')
        .eq('id', userId)
        .single();
    
    if (existingProfile?.stripe_subscription_id && 
        existingProfile.stripe_subscription_id !== subscriptionId &&
        (existingProfile.subscription_status === 'active' || existingProfile.subscription_status === 'trialing')) {
        
        console.log(`⚠️ User ${userId} has existing subscription ${existingProfile.stripe_subscription_id}, canceling it`);
        
        // Cancel the old subscription immediately
        try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            await stripe.subscriptions.cancel(existingProfile.stripe_subscription_id);
            console.log(`✅ Canceled old subscription ${existingProfile.stripe_subscription_id}`);
        } catch (cancelError) {
            console.error('Error canceling old subscription:', cancelError);
            // Continue anyway - new subscription should take precedence
        }
    }
    
    // Fetch subscription details to get line items
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price']
    });
    
    console.log('Retrieved subscription:', {
        id: subscription.id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        items_count: subscription.items.data.length
    });
    
    // Find the metered billing item (overage)
    const meteredItem = subscription.items.data.find(
        item => item.price.recurring?.usage_type === 'metered'
    );
    
    // Determine credits based on tier
    const monthlyCredits = tier === 'starter' ? 1000 : 5000;
    
    // Validate dates
    if (!subscription.current_period_start || !subscription.current_period_end) {
        console.error('Invalid subscription period dates:', {
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end
        });
        throw new Error('Invalid subscription period dates');
    }
    
    // Prepare update data with safe date conversion
    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);
    
    // Double-check dates are valid
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        console.error('Invalid date conversion:', {
            raw_start: subscription.current_period_start,
            raw_end: subscription.current_period_end,
            converted_start: periodStart,
            converted_end: periodEnd
        });
        throw new Error('Failed to convert subscription dates');
    }
    
    const updateData = {
        tier,
        monthly_credits: monthlyCredits,
        credits_used: 0, // Reset on new subscription
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: subscription.items.data[0].price.id,
        stripe_metered_item_id: meteredItem ? meteredItem.id : null,
        subscription_status: subscription.status,
        subscription_period_start: periodStart.toISOString(),
        subscription_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false
    };
    
    console.log('Updating user profile with:', updateData);
    
    // Update user profile
    const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId)
        .select();
    
    if (error) {
        console.error('Error updating user profile after checkout:', error);
        throw error;
    }
    
    if (!data || data.length === 0) {
        console.error('No rows updated for user:', userId);
        throw new Error('User profile not found or not updated');
    }
    
    console.log(`✅ Subscription created successfully for user ${userId}, tier: ${tier}`);
    console.log('Updated profile:', data[0]);
}

/**
 * Handle subscription updates
 * Handles plan changes, cancellations, renewals
 */
async function handleSubscriptionUpdated(subscription) {
    console.log('Processing customer.subscription.updated');
    
    const customerId = subscription.customer;
    
    // Find user by customer ID
    const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, tier, monthly_credits')
        .eq('stripe_customer_id', customerId)
        .single();
    
    if (fetchError || !profile) {
        console.error('User not found for customer:', customerId);
        return;
    }
    
    // Check if plan changed (price ID changed)
    const newPriceId = subscription.items.data[0].price.id;
    const starterPriceId = process.env.STRIPE_STARTER_PRICE_ID;
    const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
    
    let newTier = profile.tier;
    let newMonthlyCredits = profile.monthly_credits;
    
    if (newPriceId === starterPriceId) {
        newTier = 'starter';
        newMonthlyCredits = 1000;
    } else if (newPriceId === proPriceId) {
        newTier = 'pro';
        newMonthlyCredits = 5000;
    }
    
    // Find metered item
    const meteredItem = subscription.items.data.find(
        item => item.price.recurring?.usage_type === 'metered'
    );
    
    // Update profile
    const { error } = await supabase
        .from('user_profiles')
        .update({
            tier: newTier,
            monthly_credits: newMonthlyCredits,
            subscription_status: subscription.status,
            subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            stripe_price_id: newPriceId,
            stripe_metered_item_id: meteredItem ? meteredItem.id : null
        })
        .eq('id', profile.id);
    
    if (error) {
        console.error('Error updating subscription:', error);
        throw error;
    }
    
    console.log(`Subscription updated for user ${profile.id}`);
}

/**
 * Handle subscription deletion/cancellation
 * Downgrade user to free tier
 */
async function handleSubscriptionDeleted(subscription) {
    console.log('Processing customer.subscription.deleted');
    
    const customerId = subscription.customer;
    
    // Find user by customer ID
    const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
    
    if (fetchError || !profile) {
        console.error('User not found for customer:', customerId);
        return;
    }
    
    // Downgrade to free tier
    const { error } = await supabase
        .from('user_profiles')
        .update({
            tier: 'free',
            monthly_credits: 100,
            subscription_status: 'canceled',
            stripe_subscription_id: null,
            stripe_price_id: null,
            stripe_metered_item_id: null,
            cancel_at_period_end: false,
            subscription_period_end: null
        })
        .eq('id', profile.id);
    
    if (error) {
        console.error('Error downgrading user to free tier:', error);
        throw error;
    }
    
    console.log(`User ${profile.id} downgraded to free tier after subscription deletion`);
}

/**
 * Handle successful invoice payment
 * Reset credits for new billing period
 */
async function handleInvoicePaymentSucceeded(invoice) {
    console.log('Processing invoice.payment_succeeded');
    
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    // Skip if not a subscription invoice
    if (!subscriptionId) {
        return;
    }
    
    // Find user by customer ID
    const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
    
    if (fetchError || !profile) {
        console.error('User not found for customer:', customerId);
        return;
    }
    
    // Fetch subscription to get period dates
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Validate and convert dates
    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);
    
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        console.error('Invalid date in invoice.payment_succeeded:', {
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end
        });
        return; // Skip this update if dates are invalid
    }
    
    // Reset credits for new billing period
    const { error } = await supabase
        .from('user_profiles')
        .update({
            credits_used: 0,
            subscription_period_start: periodStart.toISOString(),
            subscription_period_end: periodEnd.toISOString(),
            subscription_status: 'active'
        })
        .eq('id', profile.id);
    
    if (error) {
        console.error('Error resetting credits after payment:', error);
        throw error;
    }
    
    console.log(`Credits reset for user ${profile.id} after successful payment`);
}

/**
 * Handle failed invoice payment
 * Update subscription status
 */
async function handleInvoicePaymentFailed(invoice) {
    console.log('Processing invoice.payment_failed');
    
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    // Skip if not a subscription invoice
    if (!subscriptionId) {
        return;
    }
    
    // Find user by customer ID
    const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
    
    if (fetchError || !profile) {
        console.error('User not found for customer:', customerId);
        return;
    }
    
    // Update subscription status to past_due
    const { error } = await supabase
        .from('user_profiles')
        .update({
            subscription_status: 'past_due'
        })
        .eq('id', profile.id);
    
    if (error) {
        console.error('Error updating subscription status after failed payment:', error);
        throw error;
    }
    
    console.log(`Subscription marked as past_due for user ${profile.id}`);
    // TODO: Send notification email to user about failed payment
}

module.exports = router;

