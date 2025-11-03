const crypto = require('crypto');
const { supabase } = require('../config/supabase');

// In-memory cache for API key validations
// Key: apiKey (trimmed)
// Value: { account: AccountObject|null, expiresAt: number }
const validationCache = new Map();
const CACHE_ENABLED = (process.env.API_KEY_CACHE_ENABLED || 'true').toLowerCase() === 'true';
const CACHE_TTL_SUCCESS = Number(process.env.API_KEY_CACHE_TTL || 45000); // 45s default
const CACHE_TTL_FAILURE = 10000; // 10s for negative cache
const MAX_CACHE_SIZE = Number(process.env.API_KEY_CACHE_MAX_SIZE || 1000);

function getCachedValidation(trimmedKey) {
    if (!CACHE_ENABLED) return undefined;
    const entry = validationCache.get(trimmedKey);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
        validationCache.delete(trimmedKey);
        return undefined;
    }
    return entry.account; // can be null for negative cache
}

function setCachedValidation(trimmedKey, account, ttlMs) {
    if (!CACHE_ENABLED) return;
    // Simple size control: drop oldest entry when exceeding max size
    if (validationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = validationCache.keys().next().value;
        if (firstKey) validationCache.delete(firstKey);
    }
    validationCache.set(trimmedKey, {
        account,
        expiresAt: Date.now() + ttlMs
    });
}

function invalidateCacheForApiKey(apiKey) {
    if (!apiKey) return;
    const trimmedKey = apiKey.trim();
    validationCache.delete(trimmedKey);
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
 * Validate an API key and return user information
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<{userId: string, tier: string, name: string, apiKey: string} | null>}
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

        // Query API key first
        const { data: keyData, error: keyError } = await supabase
            .from('api_keys')
            .select('id, user_id, key, name, last_used_at')
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
            // Negative cache to avoid DB hammering
            setCachedValidation(trimmedKey, null, CACHE_TTL_FAILURE);
            return null;
        }

        console.log('validateApiKey: Found API key for user:', keyData.user_id);
        
        // Now get user profile separately
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('tier')
            .eq('id', keyData.user_id)
            .single();
        
        if (profileError) {
            console.error('validateApiKey: Error fetching user profile:', profileError);
            // Continue anyway with default tier
        }
        
        // Update last_used_at timestamp (fire and forget)
        supabase
            .from('api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyData.id)
            .then()
            .catch(err => console.error('Error updating last_used_at:', err));
        
        // Get user email for name
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

        // Cache successful validation
        setCachedValidation(trimmedKey, account, CACHE_TTL_SUCCESS);

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

