# Stripe Integration Implementation Summary

## Overview

The Stripe payment integration has been successfully implemented to handle subscription billing and usage-based overage charges for the Docuskribe API. This document summarizes the implementation, architecture, and key features.

## Stripe Product Architecture (Licensed and Metered Billing)

This implementation uses Stripe's **licensed and metered billing** model, which combines fixed monthly fees with usage-based overage charges within a single product.

Reference: https://docs.stripe.com/products-prices/pricing-models#licensed-and-metered

### Product Structure

Instead of creating separate products for subscriptions and overage, we create:

**Starter Plan** (1 product, 2 prices)
- Price 1: **$9.00/month** (fixed, licensed) → `STRIPE_STARTER_PRICE_ID`
- Price 2: **$0.009/unit** (metered, overage) → `STRIPE_STARTER_OVERAGE_PRICE_ID`

**Pro Plan** (1 product, 2 prices)
- Price 1: **$25.00/month** (fixed, licensed) → `STRIPE_PRO_PRICE_ID`
- Price 2: **$0.005/unit** (metered, overage) → `STRIPE_PRO_OVERAGE_PRICE_ID`

### How Subscriptions Work

When a customer subscribes to the Starter Plan:
1. Stripe creates **one subscription** with **two line items**:
   - Line item 1: $9/month (charged automatically every billing period)
   - Line item 2: Metered usage (charged only if overage credits are used)
2. Throughout the month, overage usage is reported via `reportUsage()`
3. At billing period end, Stripe invoices: **$9 + (overage_credits × $0.009)**

### Benefits of This Model

- **Single subscription** manages both fixed and variable components
- **Simplified invoicing** - one line for base fee, one for overage
- **Easier management** - single subscription ID to track and cancel
- **Follows Stripe best practices** for combining licensed and usage-based pricing

## Implementation Scope

### ✅ Completed Features

1. **Stripe Checkout Integration**
   - Hosted payment pages for Starter ($9) and Pro ($25) plans
   - Automatic customer creation and management
   - Success/cancel URL handling

2. **Subscription Lifecycle Management**
   - Subscription creation via webhooks
   - Automatic renewal handling
   - Plan upgrades/downgrades
   - Cancel at period end functionality
   - Failed payment handling

3. **Metered Billing for Overage**
   - Real-time usage reporting to Stripe
   - Separate metered prices for Starter ($0.009/credit) and Pro ($0.005/credit)
   - Automatic billing at end of billing period

4. **Credit Reset System**
   - Primary: Webhook-based reset on `invoice.payment_succeeded`
   - Fallback: Lazy evaluation on API calls
   - No cron jobs required

5. **Frontend Updates**
   - Stripe Checkout redirect in Plans page
   - Subscription management in Settings (view status, cancel)
   - Overage usage display in Usage Card
   - Subscription status indicators

6. **Database Schema**
   - Added Stripe-related columns to `user_profiles`
   - Migration scripts included

## Architecture

### Backend Components

#### 1. Services Layer

**`services/stripeService.js`**
- Stripe client initialization
- `createCustomer()` - Create Stripe customer
- `createCheckoutSession()` - Generate Checkout URL
- `cancelSubscription()` - Cancel at period end
- `getSubscription()` - Fetch subscription details
- `reportUsage()` - Report metered billing usage
- `constructWebhookEvent()` - Verify webhook signatures

**`services/creditService.js`**
- `ensureCurrentBillingPeriod()` - Lazy evaluation for credit reset
- `checkCreditAvailability()` - Validate credit limits

#### 2. Routes Layer

**`routes/webhooks/stripe.js`**
Handles Stripe webhook events:
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan changes
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Reset credits
- `invoice.payment_failed` - Mark as past due

**`routes/v1/user.js`** (Updated)
- `POST /api/v1/user/checkout` - Create Stripe Checkout session
- `GET /api/v1/user/subscription` - Get subscription details
- `POST /api/v1/user/subscription/cancel` - Cancel subscription
- `GET /api/v1/user/profile` - Enhanced with lazy evaluation

**`routes/v1/jobs.js`** (Updated)
- Integrated lazy evaluation before job creation
- Metered billing reporting for overage usage
- Enhanced credit checking logic

#### 3. Application Layer

**`app.js`** (Updated)
- Webhook route registered BEFORE body-parser (critical for signature verification)
- Raw body access for Stripe webhooks

### Frontend Components

**`src/components/PlansView.jsx`** (Updated)
- Redirects to Stripe Checkout URL on plan selection
- Shows loading state during checkout initiation
- Validates current plan to prevent duplicate subscriptions

**`src/components/SettingsView.jsx`** (Updated)
- New Subscription Management section
- Displays subscription status and next billing date
- Cancel subscription button
- Shows cancellation notice when set to cancel at period end

**`src/components/UsageCard.jsx`** (Updated)
- Overage usage indicator (purple progress bar)
- Estimated overage cost calculation
- Overage-enabled vs disabled states
- Enhanced billing period display

### Database Schema

New columns added to `user_profiles`:
```sql
stripe_subscription_id TEXT
stripe_price_id TEXT
subscription_period_end TIMESTAMPTZ
stripe_metered_item_id TEXT
cancel_at_period_end BOOLEAN DEFAULT false
```

## Payment Flow

### 1. Subscription Creation

```
User clicks "Select Plan" 
  → Frontend calls POST /api/v1/user/checkout
  → Backend creates Stripe Checkout session
  → User redirected to Stripe Checkout
  → User completes payment
  → Stripe sends checkout.session.completed webhook
  → Backend updates user profile with subscription details
  → User redirected back to app
```

### 2. Overage Billing

```
User creates job exceeding monthly credits
  → Backend checks overage_enabled = true
  → Job is created
  → Backend reports usage to Stripe via reportUsage()
  → Stripe accumulates usage throughout month
  → At end of billing period, Stripe charges for total overage
```

### 3. Credit Reset

```
Billing period ends
  → Stripe sends invoice.payment_succeeded webhook
  → Backend resets credits_used to 0
  → Backend updates subscription_period_start and subscription_period_end
  
OR (fallback):

User makes API call
  → Backend checks if subscription_period_end < now
  → If true, reset credits and update periods
```

### 4. Subscription Cancellation

```
User clicks "Cancel Subscription" in Settings
  → Frontend calls POST /api/v1/user/subscription/cancel
  → Backend calls Stripe to cancel at period end
  → Backend updates cancel_at_period_end = true
  → User retains access until period_end
  → At period_end, Stripe sends customer.subscription.deleted webhook
  → Backend downgrades user to free tier
```

## Environment Configuration

Required environment variables:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_STARTER_OVERAGE_PRICE_ID=price_...
STRIPE_PRO_OVERAGE_PRICE_ID=price_...

# Application URL
APP_URL=http://localhost:5173
```

## API Endpoints

### User-Facing

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/user/checkout` | POST | Create Stripe Checkout session |
| `/api/v1/user/subscription` | GET | Get subscription details |
| `/api/v1/user/subscription/cancel` | POST | Cancel subscription at period end |
| `/api/v1/user/profile` | GET | Get user profile (with lazy billing period check) |

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/stripe` | POST | Receive Stripe webhook events (public, signature-verified) |

## Security Features

1. **Webhook Signature Verification**
   - All webhooks verified using `STRIPE_WEBHOOK_SECRET`
   - Prevents unauthorized webhook requests

2. **Raw Body Parsing**
   - Webhook route registered before body-parser middleware
   - Ensures signature verification works correctly

3. **Service Role Protection**
   - Subscription updates only via webhooks or internal routes
   - RLS policies prevent user modification of critical fields

4. **Idempotent Webhook Handlers**
   - Handlers designed to safely handle duplicate events
   - Database updates use upsert patterns where appropriate

## Testing Guide

### Local Development Testing

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to http://localhost:3000/webhooks/stripe`
4. Copy webhook secret to `.env`
5. Use test card: `4242 4242 4242 4242`

### Test Scenarios

1. **New Subscription**
   - Navigate to Plans page
   - Select Starter or Pro plan
   - Complete checkout with test card
   - Verify tier updated in profile
   - Verify credits reset to plan amount

2. **Overage Usage**
   - Enable overage in Settings
   - Use more credits than monthly limit
   - Check Stripe Dashboard for usage records
   - Verify overage display in Usage Card

3. **Subscription Cancellation**
   - Go to Settings
   - Click "Cancel Subscription"
   - Verify cancel notice appears
   - Simulate period end using Stripe CLI
   - Verify downgrade to free tier

4. **Failed Payment**
   - Use test card: `4000 0000 0000 0341` (requires authentication)
   - Let it fail
   - Verify status changes to `past_due`

5. **Credit Reset**
   - Simulate month passing using Stripe CLI
   - Trigger `invoice.payment_succeeded` event
   - Verify credits_used reset to 0

## Monitoring & Logs

### Server Logs

The implementation includes comprehensive logging:
- Webhook event types received
- Subscription updates
- Credit resets
- Overage reporting
- Error messages

### Stripe Dashboard

Monitor in real-time:
- **Customers**: View all users and their subscriptions
- **Subscriptions**: See active, canceled, and past_due subscriptions
- **Usage Records**: Track metered billing for overage
- **Webhooks**: View webhook delivery status and errors
- **Events**: Search all Stripe events for debugging

## Known Limitations

1. **No Customer Portal**
   - Users manage subscriptions through app UI only
   - Can be added later if needed

2. **Plan Downgrades**
   - Currently not supported
   - Users must cancel and wait for period end

3. **Refunds**
   - Not automatically handled
   - Must be processed manually in Stripe Dashboard

4. **Multiple Subscriptions**
   - Each user can have only one active subscription
   - Enforced at application level

## Future Enhancements

Potential improvements for future iterations:

1. **Stripe Customer Portal**
   - Let users manage payment methods
   - View invoices and receipts
   - Update billing information

2. **Plan Change Logic**
   - Allow mid-cycle plan upgrades with proration
   - Handle plan downgrades gracefully

3. **Usage Analytics**
   - Detailed usage reports
   - Cost predictions
   - Usage trends and insights

4. **Email Notifications**
   - Payment receipt emails
   - Upcoming renewal reminders
   - Failed payment alerts
   - Credit limit warnings

5. **Annual Billing**
   - Add annual subscription options
   - Offer discount for annual plans

6. **Tax Handling**
   - Integrate Stripe Tax for automatic tax calculation
   - Handle VAT for EU customers

## Troubleshooting

### Common Issues

**Webhook signature verification fails**
- Ensure webhook route is registered before body-parser
- Verify `STRIPE_WEBHOOK_SECRET` matches the endpoint

**Checkout session not created**
- Check all price IDs are set in environment
- Verify Stripe API key is valid
- Check server logs for detailed errors

**Credits not resetting**
- Verify webhook is receiving `invoice.payment_succeeded`
- Check Stripe Dashboard webhook deliveries
- Lazy evaluation should catch missed webhooks

**Overage not charged**
- Verify metered price IDs are correct
- Check `stripe_metered_item_id` is saved after checkout
- Look for usage reporting errors in logs

## Files Modified/Created

### New Files
- `services/stripeService.js` - Stripe SDK wrapper
- `services/creditService.js` - Credit management utilities
- `routes/webhooks/stripe.js` - Webhook handler
- `STRIPE_SETUP_GUIDE.md` - Setup instructions
- `STRIPE_IMPLEMENTATION_SUMMARY.md` - This file

### Modified Files
- `.env.example` - Added Stripe configuration
- `supabase-setup.sql` - Added Stripe columns
- `routes/v1/user.js` - Checkout and subscription endpoints
- `routes/v1/jobs.js` - Metered billing integration
- `app.js` - Webhook route registration
- `src/components/PlansView.jsx` - Stripe redirect
- `src/components/SettingsView.jsx` - Subscription management UI
- `src/components/UsageCard.jsx` - Overage display
- `package.json` - Added stripe dependency

## Deployment Checklist

Before deploying to production:

- [ ] Complete Stripe account verification
- [ ] Create live products and prices in Stripe
- [ ] Set up production webhook endpoint
- [ ] Update `.env` with live Stripe keys
- [ ] Run database migrations
- [ ] Test complete flow in test mode
- [ ] Switch to live mode and test with small amount
- [ ] Monitor webhook deliveries in Stripe Dashboard
- [ ] Set up error alerting for webhook failures

## Support

For questions or issues:
1. Check server logs for detailed error messages
2. Review Stripe Dashboard for webhook/event details
3. Consult `STRIPE_SETUP_GUIDE.md` for setup instructions
4. Review Stripe documentation: https://stripe.com/docs

---

**Implementation Date**: October 2025  
**Stripe API Version**: Latest (2024)  
**Integration Type**: Server-side (backend) with Checkout (hosted pages)

