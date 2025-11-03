# Stripe Testing Quickstart

Quick reference for testing the Stripe integration locally.

## Setup (One-time)

### 1. Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Linux:**
```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 2. Login to Stripe

```bash
stripe login
```

This opens your browser to authenticate with Stripe.

### 3. Create Test Products

#### Option A: Via Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Create products as described in `STRIPE_SETUP_GUIDE.md`

#### Option B: Via Stripe CLI (faster)

```bash
# Create Starter Plan product
STARTER_PRODUCT=$(stripe products create --name="Starter Plan" --description="1,000 credits per month" --format=json | jq -r '.id')

# Add fixed price ($9/month)
stripe prices create \
  --product=$STARTER_PRODUCT \
  --unit-amount=900 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Starter Fixed Fee"

# Add metered price ($0.009 per unit)
stripe prices create \
  --product=$STARTER_PRODUCT \
  --unit-amount=9 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[usage_type]=metered \
  --nickname="Starter Overage"

# Create Pro Plan product
PRO_PRODUCT=$(stripe products create --name="Pro Plan" --description="5,000 credits per month" --format=json | jq -r '.id')

# Add fixed price ($25/month)
stripe prices create \
  --product=$PRO_PRODUCT \
  --unit-amount=2500 \
  --currency=usd \
  --recurring[interval]=month \
  --nickname="Pro Fixed Fee"

# Add metered price ($0.005 per unit)
stripe prices create \
  --product=$PRO_PRODUCT \
  --unit-amount=5 \
  --currency=usd \
  --recurring[interval]=month \
  --recurring[usage_type]=metered \
  --nickname="Pro Overage"
```

This creates 2 products with 2 prices each (licensed + metered billing model).

Copy the price IDs (starting with `price_`) to your `.env` file.

### 4. Configure Environment

Update your `.env` file:

```env
# Get these from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Price IDs from products you created
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_STARTER_OVERAGE_PRICE_ID=price_...
STRIPE_PRO_OVERAGE_PRICE_ID=price_...

# Local development URL
APP_URL=http://localhost:5173
```

## Daily Testing Workflow

### 1. Start Webhook Forwarding

Open a new terminal and run:

```bash
stripe listen --forward-to http://localhost:3000/webhooks/stripe
```

Copy the webhook signing secret (starts with `whsec_`) and update `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Keep this terminal running** while testing.

### 2. Start Your Application

In another terminal:

```bash
# Start backend
npm run dev

# In another terminal, start frontend
npm run dev:frontend
```

### 3. Test Subscription Flow

1. **Create Account**
   - Go to http://localhost:5173
   - Sign up or log in

2. **Subscribe to Plan**
   - Navigate to "Plans" tab
   - Click "Select Plan" for Starter or Pro
   - You'll be redirected to Stripe Checkout

3. **Complete Payment**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiration date (e.g., 12/34)
   - Any 3-digit CVC (e.g., 123)
   - Click "Subscribe"

4. **Verify Subscription**
   - You'll be redirected back to your app
   - Go to "Settings" tab
   - Verify your plan is updated
   - Check subscription details

### 4. Test Overage

1. **Enable Overage**
   - Go to Settings → Overage Settings
   - Click "Enable"

2. **Use Credits Beyond Limit**
   - Go to Dashboard
   - Create jobs until you exceed your monthly limit
   - Watch the Usage Card turn purple

3. **Verify Metered Billing**
   - Check your webhook terminal for "Reported overage usage to Stripe"
   - Go to https://dashboard.stripe.com/test/customers
   - Click on your customer
   - Scroll to "Usage records" to see reported usage

### 5. Test Subscription Cancellation

1. **Cancel Subscription**
   - Go to Settings → Subscription Management
   - Click "Cancel Subscription"
   - Confirm the action

2. **Verify Cancellation**
   - Notice appears: "Your subscription is set to cancel on [date]"
   - You still have access until the period ends

3. **Simulate Period End**
   ```bash
   # In Stripe CLI terminal
   stripe trigger customer.subscription.deleted
   ```

4. **Check Downgrade**
   - Refresh Settings page
   - Verify you're on Free plan

## Stripe Test Cards

Use these cards to test different scenarios:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | ✅ Successful payment |
| `4000 0000 0000 0002` | ❌ Card declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |
| `4000 0000 0000 0341` | 🔐 Requires authentication (3D Secure) |
| `4000 0000 0000 0127` | ❌ Incorrect CVC |

More test cards: https://stripe.com/docs/testing

## Triggering Webhook Events

You can manually trigger webhook events for testing:

```bash
# Successful payment (credit reset)
stripe trigger invoice.payment_succeeded

# Failed payment
stripe trigger invoice.payment_failed

# Subscription updated
stripe trigger customer.subscription.updated

# Subscription deleted (cancel)
stripe trigger customer.subscription.deleted
```

## Viewing Stripe Dashboard

Monitor your test data in real-time:

- **Customers**: https://dashboard.stripe.com/test/customers
- **Subscriptions**: https://dashboard.stripe.com/test/subscriptions
- **Payments**: https://dashboard.stripe.com/test/payments
- **Webhooks**: https://dashboard.stripe.com/test/webhooks
- **Events**: https://dashboard.stripe.com/test/events
- **Logs**: https://dashboard.stripe.com/test/logs

## Debugging

### Check Server Logs

Your server logs will show:
- Webhook events received
- Subscription updates
- Credit resets
- Overage reporting
- Any errors

### Check Webhook Deliveries

In Stripe Dashboard:
1. Go to Developers → Webhooks
2. Click on your local webhook (or the CLI listener)
3. View "Recent deliveries"
4. Click on any event to see request/response details

### Common Issues

**"Webhook signature verification failed"**
- Make sure `STRIPE_WEBHOOK_SECRET` in `.env` matches the one from `stripe listen`
- Restart your server after updating `.env`

**"Price ID not found"**
- Verify all price IDs in `.env` are correct
- Make sure you're using test mode price IDs (start with `price_`)

**Webhooks not received**
- Check that `stripe listen` is still running
- Verify your server is running on port 3000
- Check server logs for errors

**Checkout fails silently**
- Check browser console for errors
- Verify all Stripe environment variables are set
- Check server logs for detailed error message

## Quick Reset

To start fresh:

```bash
# Delete test customers in Stripe Dashboard
# Go to https://dashboard.stripe.com/test/customers and delete all customers

# Or use CLI:
stripe customers list --limit=100 | jq -r '.data[].id' | xargs -I {} stripe customers delete {}

# Reset your database
# Run the migration SQL again in Supabase
```

## Understanding the Billing Model

Your setup uses Stripe's **licensed and metered** billing:

- **Licensed (Fixed Fee)**: Customer pays $9 or $25 every month regardless of usage
- **Metered (Overage)**: Additional charges only if customer exceeds their monthly credit limit

When a customer subscribes, they get ONE subscription with TWO line items:
1. Fixed monthly fee (auto-charged each period)
2. Metered usage (charged only if they use overage credits)

Reference: https://docs.stripe.com/products-prices/pricing-models#licensed-and-metered

## Going to Production

When ready for real payments:

1. Switch to live mode in Stripe Dashboard
2. Create live products/prices (same as test mode)
3. Get live API keys
4. Set up live webhook endpoint (HTTPS required)
5. Update production `.env` with live keys
6. Test with small real payment first

---

**Need help?** Check `STRIPE_SETUP_GUIDE.md` for detailed setup instructions or `STRIPE_IMPLEMENTATION_SUMMARY.md` for architecture details.

