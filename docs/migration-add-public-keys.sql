-- Migration: Add public API keys table for embed widget
-- Purpose: Allow users to create public API keys restricted to specific domains
-- for use in client-side embed widgets

-- Create public_api_keys table
CREATE TABLE IF NOT EXISTS public_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    authorized_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_public_api_keys_user_id ON public_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_public_api_keys_key ON public_api_keys(key) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_public_api_keys_enabled ON public_api_keys(enabled);

-- Add RLS (Row Level Security) policies
ALTER TABLE public_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own public keys
CREATE POLICY "Users can view their own public keys"
    ON public_api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own public keys
CREATE POLICY "Users can create their own public keys"
    ON public_api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own public keys
CREATE POLICY "Users can update their own public keys"
    ON public_api_keys
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own public keys
CREATE POLICY "Users can delete their own public keys"
    ON public_api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public_api_keys IS 'Public API keys for client-side embed widgets with domain restrictions';
COMMENT ON COLUMN public_api_keys.key IS 'Public API key with pk_live_ prefix';
COMMENT ON COLUMN public_api_keys.authorized_domains IS 'Array of allowed domains (supports wildcards like *.example.com)';
COMMENT ON COLUMN public_api_keys.enabled IS 'Whether the key is active and can be used';
COMMENT ON COLUMN public_api_keys.last_used_at IS 'Timestamp of last successful API request with this key';



