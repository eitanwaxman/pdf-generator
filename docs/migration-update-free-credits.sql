-- Migration: Update Free Tier Credits from 100 to 50
-- Run this SQL in your Supabase SQL Editor to update the default value for free tier users
-- This is safe to run multiple times

-- 1. Update the default value for monthly_credits column
-- Note: This only affects new inserts, not existing rows
ALTER TABLE public.user_profiles 
    ALTER COLUMN monthly_credits SET DEFAULT 50;

-- 2. Update existing free tier users to have 50 credits instead of 100
-- This ensures existing free tier users are updated to match the new plan
UPDATE public.user_profiles 
SET monthly_credits = 50 
WHERE tier = 'free' AND monthly_credits = 100;

-- Migration complete!
-- New free tier users will now get 50 credits by default.

