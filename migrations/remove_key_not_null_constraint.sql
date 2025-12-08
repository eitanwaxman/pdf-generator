-- Migration: Remove NOT NULL constraint from api_keys.key column
-- This allows us to store only key_hash for security, without storing the plain key

-- Make the key column nullable
ALTER TABLE api_keys 
ALTER COLUMN key DROP NOT NULL;

-- Optional: Add a comment explaining why key can be null
COMMENT ON COLUMN api_keys.key IS 'Deprecated: Plain key is no longer stored for security. Use key_hash for validation.';

