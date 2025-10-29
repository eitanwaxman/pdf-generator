-- Supabase Database Setup for PDF Generator
-- Run these SQL commands in your Supabase SQL Editor

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro')),
    stripe_customer_id TEXT,
    subscription_status TEXT,
    monthly_credits INTEGER NOT NULL DEFAULT 100,
    credits_used INTEGER NOT NULL DEFAULT 0,
    overage_enabled BOOLEAN NOT NULL DEFAULT false,
    subscription_period_start TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT 'Default API Key',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON public.api_keys(key);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON public.user_profiles(tier);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS Policies for user_profiles
-- Users can read their own profile
CREATE POLICY "Users can view their own profile" 
    ON public.user_profiles 
    FOR SELECT 
    USING (auth.uid() = id);

-- Users can only update overage_enabled (not credits, tier, etc.)
CREATE POLICY "Users can update overage settings" 
    ON public.user_profiles 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Ensure critical fields are not modified by users
        tier = (SELECT tier FROM public.user_profiles WHERE id = auth.uid()) AND
        monthly_credits = (SELECT monthly_credits FROM public.user_profiles WHERE id = auth.uid()) AND
        credits_used = (SELECT credits_used FROM public.user_profiles WHERE id = auth.uid()) AND
        stripe_customer_id IS NOT DISTINCT FROM (SELECT stripe_customer_id FROM public.user_profiles WHERE id = auth.uid()) AND
        subscription_status IS NOT DISTINCT FROM (SELECT subscription_status FROM public.user_profiles WHERE id = auth.uid())
    );

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role has full access to profiles" 
    ON public.user_profiles 
    FOR ALL 
    USING (auth.role() = 'service_role');

-- 6. Create RLS Policies for api_keys
-- Users can read their own API keys
CREATE POLICY "Users can view their own API keys" 
    ON public.api_keys 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can delete their own API keys (for rotation)
CREATE POLICY "Users can delete their own API keys" 
    ON public.api_keys 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role has full access to api_keys" 
    ON public.api_keys 
    FOR ALL 
    USING (auth.role() = 'service_role');

-- 7. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to auto-update updated_at on user_profiles
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 9. Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT ON public.api_keys TO authenticated;

-- 10. Migration: Add new columns to existing user_profiles table (if already created)
-- Run these if you're updating an existing database:
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS monthly_credits INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS overage_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMPTZ DEFAULT NOW();

-- Add tier constraint if not exists
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_tier_check CHECK (tier IN ('free', 'starter', 'pro'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update existing free tier users with 100 credits
UPDATE public.user_profiles SET monthly_credits = 100 WHERE tier = 'free' AND monthly_credits = 0;

-- Done! Your Supabase database is now set up.
-- Next steps:
-- 1. Go to Supabase Dashboard > Authentication > Settings
-- 2. Enable email confirmation
-- 3. Configure email templates
-- 4. Set up redirect URLs for your application
-- 5. Copy your SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to .env

