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
        
        const { data, error } = await supabase
            .from('api_keys')
            .insert({
                user_id: userId,
                key: apiKey,
                name: name,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating API key:', error);
            throw new Error('Failed to create API key');
        }
        
        return {
            key: data.key,
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

        // Query API key with user profile in a single JOIN query
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('id, user_id, key, name, last_used_at, user_profiles(tier)')
            .eq('key', trimmedKey)
            .single();
        
        if (keyError || !keyData) {
            // PGRST116 means no rows found - this is expected for invalid keys
            if (keyError && keyError.code === 'PGRST116') {
                console.log('validateApiKey: API key not found in database');
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

        console.log('validateApiKey: Found API key for user:', keyData.user_id);
        
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
        
        const account = {
            userId: keyData.user_id,
            tier: profileData?.tier || 'free',
            name: userData?.user?.email || 'Unknown User',
            apiKey: keyData.key
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
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{key: string, name: string, created_at: string, last_used_at: string} | null>}
 */
const getApiKeyForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('api_keys')
            .select('key, name, created_at, last_used_at')
            .eq('user_id', userId)
            .single();
        
        if (error || !data) {
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error getting API key:', error);
        return null;
    }
};

module.exports = {
    generateApiKey,
    createApiKeyForUser,
    validateApiKey,
    rotateApiKey,
    getApiKeyForUser
};

