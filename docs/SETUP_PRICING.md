# Quick Setup Guide for Pricing System

## 1. Database Migration

Run the migration SQL in your Supabase SQL Editor:

```bash
# Navigate to your Supabase project
# Go to SQL Editor
# Run the migration section from supabase-setup.sql (lines 104-120)
```

Or run this SQL:

```sql
-- Add new columns
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS monthly_credits INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS overage_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMPTZ DEFAULT NOW();

-- Add tier constraint
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_tier_check CHECK (tier IN ('free', 'starter', 'pro'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update existing free tier users with 100 credits
UPDATE public.user_profiles SET monthly_credits = 100 WHERE tier = 'free';
```

## 2. Environment Variables

Ensure you have the service role key in your `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

This is required for internal billing endpoints.

## 3. Install Dependencies (if needed)

```bash
npm install
```

## 4. Start the Development Server

```bash
# Backend
npm start

# Frontend (in another terminal)
npm run dev
```

## 5. Test the System

### Create a Test Account
1. Go to http://localhost:5173
2. Click "Register" tab
3. Create an account
4. Verify your email

### Test Credit System
1. Log in to your account
2. Check Dashboard - should show 100 credits
3. Create a PDF job - credits should decrement
4. Create 100 PDFs - should hit limit
5. Try creating 101st PDF - should see error

### Test Plans Page
1. Click "Plans" tab
2. View three pricing tiers
3. Free plan should be highlighted as current

### Test Settings
1. Click "Settings" tab
2. View API key management
3. Try toggling overage (only works for paid plans)
4. See account deletion option

### Test Docs
1. Click "Docs" tab
2. API key should be auto-filled
3. Try the interactive "Try It Out" section
4. Copy code examples

## 6. Manually Upgrade a Test User (for testing paid features)

Use the internal billing API:

```bash
curl -X POST http://localhost:3000/internal/billing/update-plan \
  -H "Content-Type: application/json" \
  -H "x-service-key: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -d '{
    "user_id": "USER_UUID_FROM_SUPABASE",
    "tier": "starter",
    "monthly_credits": 1000
  }'
```

Now:
- Refresh the dashboard
- PDFs won't have watermarks
- Overage toggle will be available in Settings
- "Starter" badge will show in Plans

## 7. Production Deployment

### Update Database
Run the same migration SQL in your production Supabase instance.

### Update Environment
Ensure all environment variables are set in production.

### Build React App
```bash
npm run build
```

### Deploy
Follow your normal deployment process.

## Common Issues

### "Credit limit reached" immediately
- Check if credits_used was initialized properly
- Run: `UPDATE user_profiles SET credits_used = 0 WHERE tier = 'free'`

### Overage toggle not showing
- Only visible for starter/pro tiers
- Manually upgrade user tier using internal API

### Watermark still showing for paid user
- Check tier is set to 'starter' or 'pro', not 'paid'
- Clear browser cache

### Cannot delete account
- Check that Supabase Auth admin API is accessible
- Verify service role key is correct

## Next Steps

1. **Integrate Stripe**: Implement actual payment processing
2. **Set up Webhooks**: Handle subscription events from Stripe
3. **Add Cron Job**: Reset credits monthly
4. **Email Notifications**: Alert users when approaching limit
5. **Analytics**: Track credit usage patterns

