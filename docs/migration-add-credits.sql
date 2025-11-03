-- Migration: Add credit tracking columns to user_profiles table
-- Run this SQL in your Supabase SQL Editor if you get "column monthly_credits does not exist" errors
-- This is safe to run multiple times - it uses IF NOT EXISTS

-- Add new columns with default values
ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS monthly_credits INTEGER NOT NULL DEFAULT 100;

ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS overage_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles 
    ADD COLUMN IF NOT EXISTS subscription_period_start TIMESTAMPTZ DEFAULT NOW();

-- Add tier constraint if not exists
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles 
        ADD CONSTRAINT user_profiles_tier_check 
        CHECK (tier IN ('free', 'starter', 'pro'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update existing free tier users with 100 credits if they have 0 or NULL
UPDATE public.user_profiles 
SET monthly_credits = 100 
WHERE tier = 'free' AND (monthly_credits IS NULL OR monthly_credits = 0);

-- Migration complete!
-- After running this, restart your server and the API calls should work.

