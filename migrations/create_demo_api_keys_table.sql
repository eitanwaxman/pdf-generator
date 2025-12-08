-- Migration: Create demo_api_keys table
-- Demo keys are used for documentation testing only, with CORS protection

CREATE TABLE IF NOT EXISTS demo_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT one_demo_key_per_user UNIQUE (user_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_demo_api_keys_key ON demo_api_keys(key);
CREATE INDEX IF NOT EXISTS idx_demo_api_keys_user_id ON demo_api_keys(user_id);

-- Add comment
COMMENT ON TABLE demo_api_keys IS 'Demo API keys for documentation testing. Format: pdf_demo_<hex>. Only usable from docs pages with CORS protection.';

