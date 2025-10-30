# Stripe Integration Setup Guide

This guide walks you through setting up Stripe for subscription billing and metered overage charges.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your application deployed and accessible via HTTPS (for webhooks)
3. Database migrations completed (see `supabase-setup.sql`)

## Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete the registration process
3. Verify your email address

## Step 2: Get API Keys

1. Navigate to **Developers > API keys** in the Stripe Dashboard
2. You'll see two keys in **Test mode**:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
3. Copy these keys to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Step 3: Create Products and Prices (Licensed and Metered Billing)

We're using Stripe's **licensed and metered billing** model, which combines a fixed monthly fee with usage-based overage charges. Each product will have TWO prices: one fixed, one metered.

Reference: https://docs.stripe.com/products-prices/pricing-models#licensed-and-metered

### Starter Plan Product

1. Go to **Product catalog > Products**
2. Click **+ Add product**
3. Fill in the details:
   - **Name**: Starter Plan
   - **Description**: 1,000 credits per month with no watermark

#### Add First Price (Fixed Monthly Fee)

4. Under **Pricing**:
   - **Pricing model**: Standard pricing
   - **Price**: $9.00 USD
   - **Billing period**: Recurring → Monthly
   - **Usage type**: Licensed (standard)
   - Check **Set as default price**
5. Click **Add product**

#### Add Second Price (Metered Overage)

6. On the product page, click **+ Add another price**
7. Fill in the details:
   - **Price**: $0.009 USD per unit
   - **Billing period**: Recurring → Monthly
   - **Usage is metered**: ✅ **CHECK THIS BOX**
   - Leave "Charge for metered usage" as default (Sum of usage values)
8. Click **Add price**

#### Copy Price IDs

9. You should now see **2 prices** for the Starter Plan product
10. Click on the **$9.00 USD** price → Copy its Price ID:

```env
STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
```

11. Click on the **$0.009 USD per unit** price → Copy its Price ID:

```env
STRIPE_STARTER_OVERAGE_PRICE_ID=price_xxxxxxxxxxxxx
```

### Pro Plan Product

Repeat the same process for Pro Plan:

1. Click **+ Add product**
2. Fill in:
   - **Name**: Pro Plan
   - **Description**: 5,000 credits per month with priority queue

#### Add First Price (Fixed Monthly Fee)

3. Under **Pricing**:
   - **Price**: $25.00 USD
   - **Billing period**: Recurring → Monthly
   - **Usage type**: Licensed (standard)
   - Check **Set as default price**
4. Click **Add product**

#### Add Second Price (Metered Overage)

5. Click **+ Add another price**
6. Fill in:
   - **Price**: $0.005 USD per unit
   - **Billing period**: Recurring → Monthly
   - **Usage is metered**: ✅ **CHECK THIS BOX**
7. Click **Add price**

#### Copy Price IDs

8. Copy both price IDs to `.env`:

```env
STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
STRIPE_PRO_OVERAGE_PRICE_ID=price_xxxxxxxxxxxxx
```

### Summary

You should have:
- ✅ **2 products** (Starter Plan, Pro Plan)
- ✅ **4 price IDs total** (2 prices per product: fixed + metered)
- ✅ Each product combines a fixed monthly fee with usage-based overage billing

## Step 4: Set Up Webhooks

Webhooks are critical for subscription lifecycle management (renewals, cancellations, payment failures).

### Development (Local Testing)

For local development, use Stripe CLI:

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe:
   ```bash
   stripe login
   ```
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to http://localhost:3000/webhooks/stripe
   ```
4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Production

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **+ Add endpoint**
3. Fill in the details:
   - **Endpoint URL**: `https://your-domain.com/webhooks/stripe`
   - **Description**: PDF Generator subscription webhooks
   - **Events to send**: Select the following events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Click **Add endpoint**
5. Copy the **Signing secret** (starts with `whsec_`) and add to `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Step 5: Configure Application URL

Add your application URL to `.env` for Stripe redirect URLs:

```env
APP_URL=https://your-domain.com  # or http://localhost:5173 for development
```

## Step 6: Test the Integration

### Test Mode

Stripe provides test card numbers for testing:

- **Successful payment**: `4242 4242 4242 4242`
- **Declined payment**: `4000 0000 0000 0002`
- Use any future expiration date and any 3-digit CVC

### Testing Checklist

1. **Subscription Creation**:
   - Go to Plans page in your app
   - Click "Select Plan" for Starter or Pro
   - You should be redirected to Stripe Checkout
   - Complete payment with test card `4242 4242 4242 4242`
   - Verify you're redirected back to your app
   - Check that your tier is updated in Settings

2. **Webhook Verification**:
   - In Stripe Dashboard, go to **Developers > Webhooks**
   - Click on your webhook endpoint
   - View recent deliveries to ensure events are being received
   - Check your server logs for webhook processing

3. **Credit Reset**:
   - Wait for subscription renewal (or trigger manually in test mode)
   - Verify credits are reset when `invoice.payment_succeeded` fires

4. **Overage Billing**:
   - Enable overage in Settings
   - Use more credits than your monthly limit
   - Check Stripe Dashboard > **Customers** to see usage records

5. **Subscription Cancellation**:
   - Go to Settings
   - Click "Cancel Subscription"
   - Verify it's set to cancel at period end
   - After period ends, verify downgrade to free tier

## Step 7: Verify Your Setup

Before going live, verify your products are configured correctly:

1. Go to **Product catalog > Products**
2. You should see:
   - **Starter Plan** with 2 prices ($9.00 + $0.009 per unit metered)
   - **Pro Plan** with 2 prices ($25.00 + $0.005 per unit metered)
3. Click on each product to ensure:
   - The fixed price is marked as "Default"
   - The metered price shows "Usage is metered"

## Step 8: Go Live

When you're ready to accept real payments:

1. Complete your Stripe account activation:
   - Provide business details
   - Add bank account for payouts
   - Verify identity documents

2. Switch to live mode:
   - In Stripe Dashboard, toggle from **Test mode** to **Live mode**
   - Get your live API keys from **Developers > API keys**
   - Create live versions of products/prices (repeat Step 3)
   - Create live webhook endpoint (repeat Step 4)
   - Update `.env` with live keys

3. Update production environment variables with live keys

## Troubleshooting

### Webhooks Not Received

- Verify your webhook endpoint is publicly accessible (HTTPS required for production)
- Check Stripe Dashboard > Webhooks > Recent deliveries for error messages
- Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint's secret
- Check server logs for webhook processing errors

### Signature Verification Failed

- Ensure webhook route is registered BEFORE body-parser middleware in `app.js`
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Check that the raw request body is being passed to Stripe

### Checkout Session Not Created

- Verify all price IDs are set in `.env`
- Check server logs for detailed error messages
- Ensure Stripe API keys are valid

### Metered Billing Not Working

- Verify metered price IDs are correct
- Check that `stripe_metered_item_id` is saved in database after checkout
- Look for usage reporting errors in server logs
- Check Stripe Dashboard > Customers > [customer] > Usage records

## Security Best Practices

1. **Never expose secret keys**: Keep `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` server-side only
2. **Use HTTPS in production**: Stripe requires HTTPS for webhooks
3. **Verify webhook signatures**: Always validate webhook signatures (already implemented)
4. **Idempotency**: Webhook events may be delivered multiple times - ensure your handlers are idempotent
5. **Test mode vs Live mode**: Use test mode keys during development, live mode keys in production

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Subscriptions](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Metered Billing](https://stripe.com/docs/billing/subscriptions/usage-based)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Test Cards](https://stripe.com/docs/testing)

## Support

For Stripe-specific issues, contact Stripe support: https://support.stripe.com

For application integration issues, check the server logs and database state.

