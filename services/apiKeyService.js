const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { createCache } = require('../lib/cache');

// In-memory cache for API key validations
const validationCache = createCache();

function getCachedValidation(trimmedKey) {
    return validationCache.get(trimmedKey);
}

function setCachedValidation(trimmedKey, account, ttlMs) {
    validationCache.set(trimmedKey, account, ttlMs);
}

function invalidateCacheForApiKey(apiKey) {
    if (!apiKey) return;
    const trimmedKey = apiKey.trim();
    validationCache.invalidate(trimmedKey);
}

/**
 * Hash an API key using SHA-256
 * @param {string} apiKey - The API key to hash
 * @returns {string} - The hashed key (hex string)
 */
const hashApiKey = (apiKey) => {
    return crypto.createHash('sha256').update(apiKey.trim()).digest('hex');
};

/**
 * Generate a secure random API key with prefix
 * Format: pdf_live_<random_hex>
 */
const generateApiKey = () => {
    const randomBytes = crypto.randomBytes(32);
    const randomString = randomBytes.toString('hex');
    return `pdf_live_${randomString}`;
};

/**
 * Create an API key for a user
 * @param {string} userId - Supabase user ID
 * @param {string} name - Optional name for the API key
 * @returns {Promise<{key: string, id: string}>}
 */
const createApiKeyForUser = async (userId, name = 'Default API Key') => {
    try {
        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);
        
        // Store only the hash for security - the plain key is never stored
        // The plain key is returned to the user once, then never stored
        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                user_id: userId,
                key_hash: keyHash,  // Store hash only for security
                name: name,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating API key:', error);
            throw new Error('Failed to create API key');
        }
        
        // Return the plain key to the user (they see it once)
        // The hash is stored in the database
        return {
            key: apiKey,
            id: data.id
        };
    } catch (error) {
        console.error('Error in createApiKeyForUser:', error);
        throw error;
    }
};

/**
 * @typedef {Object} Account
 * @property {string} userId - User's unique identifier
 * @property {string} tier - User's subscription tier ('free' | 'starter' | 'pro')
 * @property {string} name - User's display name (typically email)
 * @property {string} apiKey - The API key used for authentication
 */

/**
 * Validate an API key and return user information
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<Account | null>} Account object if valid, null otherwise
 */
const validateApiKey = async (apiKey) => {
    try {
        if (!apiKey) {
            console.error('validateApiKey: No API key provided');
            return null;
        }

        // Trim whitespace from API key
        const trimmedKey = apiKey.trim();

        // Check cache first
        const cached = getCachedValidation(trimmedKey);
        if (cached !== undefined) {
            // cached can be null (negative cache) or account object
            return cached;
        }

        // Hash the provided key for comparison
        const keyHash = hashApiKey(trimmedKey);

        // Query API key by hash only (no backward compatibility)
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('id, user_id, key_hash, name, last_used_at, user_profiles(tier)')
            .eq('key_hash', keyHash)
            .single();
        
        if (keyError || !keyData) {
            // PGRST116 means no rows found - this is expected for invalid keys
            if (keyError && keyError.code === 'PGRST116') {
                if (process.env.NODE_ENV !== 'production') {
                    console.log('validateApiKey: API key not found in database');
                }
            } else {
                console.error('validateApiKey: Error fetching API key:', {
                    code: keyError?.code,
                    message: keyError?.message,
                    details: keyError?.details,
                    hint: keyError?.hint
                });
            }
            // Negative cache to avoid DB hammering (10s TTL for failures)
            setCachedValidation(trimmedKey, null, 10000);
            return null;
        }

        if (process.env.NODE_ENV !== 'production') {
            console.log('validateApiKey: Found API key for user:', keyData.user_id);
        }
        
        // Extract tier from joined profile data
        const profileData = Array.isArray(keyData.user_profiles) 
            ? keyData.user_profiles[0] 
            : keyData.user_profiles;
        
        // Update last_used_at timestamp (fire and forget)
        supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyData.id)
            .then()
            .catch(err => console.error('Error updating last_used_at:', err));
        
        // Get user email for name (still requires separate auth call)
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(keyData.user_id);
        
        if (userError) {
            console.error('validateApiKey: Error fetching user data:', userError);
        }
        
        // Use the trimmed key for the account object (not the stored hash)
        const account = {
            userId: keyData.user_id,
            tier: profileData?.tier || 'free',
            name: userData?.user?.email || 'Unknown User',
            apiKey: trimmedKey  // Use the provided key, not the stored hash
        };

        // Cache successful validation (uses default success TTL from cache utility)
        setCachedValidation(trimmedKey, account);

        return account;
    } catch (error) {
        console.error('validateApiKey: Unexpected error:', error);
        return null;
    }
};

/**
 * Rotate (delete old and create new) API key for a user
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{key: string}>}
 */
const rotateApiKey = async (userId) => {
    try {
        // Delete existing API key(s)
        const { error: deleteError } = await supabase
            .from('api_keys')
            .delete()
            .eq('user_id', userId);
        
        if (deleteError) {
            console.error('Error deleting old API key:', deleteError);
            throw new Error('Failed to delete old API key');
        }
        
        // Create new API key
        const newKey = await createApiKeyForUser(userId, 'Default API Key');
        // Best-effort: clear any cached entries that might reference the old key
        // (We don't know the old key here; a coarse approach is acceptable due to short TTLs.)
        // Optional: clear whole cache when rotating to avoid stale entries
        validationCache.clear();
        
        return newKey;
    } catch (error) {
        console.error('Error rotating API key:', error);
        throw error;
    }
};

/**
 * Get API key for a user
 * Note: This returns metadata only. The actual key is only shown once during creation.
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{name: string, created_at: string, last_used_at: string} | null>}
 */
const getApiKeyForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .select('name, created_at, last_used_at')
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        // Don't return the key or hash - keys are only shown once during creation
        return {
            name: data.name,
            created_at: data.created_at,
            last_used_at: data.last_used_at
        };
    } catch (error) {
        console.error('Error getting API key:', error);
        return null;
    }
};

/**
 * Delete API key for a user
 * @param {string} userId - Supabase user ID
 * @returns {Promise<void>}
 */
const deleteApiKey = async (userId) => {
    try {
        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('user_id', userId);
        
        if (error) {
            console.error('Error deleting API key:', error);
            throw new Error('Failed to delete API key');
        }
        
        // Clear cache to invalidate any cached validations
        validationCache.clear();
    } catch (error) {
        console.error('Error in deleteApiKey:', error);
        throw error;
    }
};

module.exports = {
    generateApiKey,
    createApiKeyForUser,
    validateApiKey,
    rotateApiKey,
    getApiKeyForUser,
    deleteApiKey,
    hashApiKey
};

