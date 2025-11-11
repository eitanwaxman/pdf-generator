const crypto = require('crypto');
const { supabase } = require('../config/supabase');

// In-memory cache for public API key validations
// Key: publicKey (trimmed)
// Value: { keyData: KeyObject|null, expiresAt: number }
const validationCache = new Map();
const CACHE_ENABLED = (process.env.API_KEY_CACHE_ENABLED || 'true').toLowerCase() === 'true';
const CACHE_TTL_SUCCESS = Number(process.env.API_KEY_CACHE_TTL || 45000); // 45s default
const CACHE_TTL_FAILURE = 10000; // 10s for negative cache
const MAX_CACHE_SIZE = Number(process.env.API_KEY_CACHE_MAX_SIZE || 1000);

/**
 * Get cached validation result
 */
function getCachedValidation(trimmedKey) {
    if (!CACHE_ENABLED) return undefined;
    const entry = validationCache.get(trimmedKey);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
        validationCache.delete(trimmedKey);
        return undefined;
    }
    return entry.keyData; // can be null for negative cache
}

/**
 * Set cached validation result
 */
function setCachedValidation(trimmedKey, keyData, ttlMs) {
    if (!CACHE_ENABLED) return;
    
    // Evict oldest entry if cache is full
    if (validationCache.size >= MAX_CACHE_SIZE) {
        const firstKey = validationCache.keys().next().value;
        if (firstKey) validationCache.delete(firstKey);
    }
    
    validationCache.set(trimmedKey, {
        keyData,
        expiresAt: Date.now() + ttlMs
    });
}

/**
 * Generate a secure public API key with pk_live_ prefix
 */
function generatePublicKey() {
    const randomBytes = crypto.randomBytes(32);
    const key = randomBytes.toString('base64')
        .replace(/\+/g, '')
        .replace(/\//g, '')
        .replace(/=/g, '')
        .substring(0, 32);
    return `pk_live_${key}`;
}

/**
 * Check if an origin matches a domain pattern
 * Supports wildcards: *.example.com matches app.example.com, demo.example.com, etc.
 * Also supports localhost:* for development
 */
function matchesDomain(origin, domainPattern) {
    if (!origin || !domainPattern) return false;
    
    // Parse origin to get hostname and port
    let hostname, port;
    try {
        const url = new URL(origin);
        hostname = url.hostname;
        port = url.port;
    } catch (e) {
        // If origin is not a valid URL, try to parse it as hostname:port
        const parts = origin.split(':');
        hostname = parts[0];
        port = parts[1] || '';
    }
    
    // Exact match
    if (hostname === domainPattern) return true;
    
    // Localhost with wildcard port: localhost:*
    if (domainPattern === 'localhost:*' && hostname === 'localhost') return true;
    if (domainPattern.startsWith('localhost:') && hostname === 'localhost') {
        const patternPort = domainPattern.split(':')[1];
        if (patternPort === '*') return true;
        if (patternPort === port) return true;
    }
    
    // Wildcard subdomain: *.example.com
    if (domainPattern.startsWith('*.')) {
        const baseDomain = domainPattern.substring(2);
        // Match exact subdomain or nested subdomains
        if (hostname.endsWith('.' + baseDomain)) return true;
        if (hostname === baseDomain) return true;
    }
    
    // Domain with port
    const hostnameWithPort = port ? `${hostname}:${port}` : hostname;
    if (hostnameWithPort === domainPattern) return true;
    
    return false;
}

/**
 * Validate origin against authorized domains
 */
function isOriginAuthorized(origin, authorizedDomains) {
    if (!origin || !Array.isArray(authorizedDomains)) return false;
    if (authorizedDomains.length === 0) return false;
    
    return authorizedDomains.some(domain => matchesDomain(origin, domain));
}

/**
 * Create a new public API key for a user
 */
const createPublicKeyForUser = async (userId, name, authorizedDomains = []) => {
    try {
        if (!userId || !name) {
            throw new Error('userId and name are required');
        }
        
        // Validate authorized domains
        if (!Array.isArray(authorizedDomains)) {
            throw new Error('authorizedDomains must be an array');
        }
        
        const key = generatePublicKey();
        
        const { data, error } = await supabase
            .from('public_api_keys')
            .insert({
                user_id: userId,
                key,
                name,
                authorized_domains: authorizedDomains,
                enabled: true
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating public API key:', error);
            throw error;
        }
        
        console.log('Created public API key for user:', userId);
        return data;
    } catch (error) {
        console.error('Error in createPublicKeyForUser:', error);
        throw error;
    }
};

/**
 * Validate a public API key and check origin
 * @param {string} publicKey - The public API key to validate
 * @param {string} origin - The origin header from the request
 * @returns {Promise<{userId: string, tier: string, name: string, keyId: string} | null>}
 */
const validatePublicKey = async (publicKey, origin) => {
    try {
        if (!publicKey) {
            console.error('validatePublicKey: No public key provided');
            return null;
        }
        
        // Validate key format
        if (!publicKey.startsWith('pk_live_')) {
            console.error('validatePublicKey: Invalid public key format');
            return null;
        }
        
        const trimmedKey = publicKey.trim();
        
        // Check cache first
        const cached = getCachedValidation(trimmedKey);
        if (cached !== undefined) {
            // If cached key exists, validate origin
            if (cached === null) return null;
            if (!isOriginAuthorized(origin, cached.authorized_domains)) {
                console.log('validatePublicKey: Origin not authorized:', origin);
                return null;
            }
            return {
                userId: cached.user_id,
                tier: cached.tier,
                name: cached.key_name,
                keyId: cached.id
            };
        }
        
        // Query public API key
        const { data: keyData, error: keyError } = await supabase
            .from('public_api_keys')
            .select('id, user_id, key, name, authorized_domains, enabled')
            .eq('key', trimmedKey)
            .eq('enabled', true)
            .single();
        
        if (keyError || !keyData) {
            if (keyError && keyError.code === 'PGRST116') {
                console.log('validatePublicKey: Public key not found or disabled');
            } else {
                console.error('validatePublicKey: Error fetching public key:', keyError);
            }
            setCachedValidation(trimmedKey, null, CACHE_TTL_FAILURE);
            return null;
        }
        
        console.log('validatePublicKey: Found public key for user:', keyData.user_id);
        
        // Validate origin against authorized domains
        if (!isOriginAuthorized(origin, keyData.authorized_domains)) {
            console.log('validatePublicKey: Origin not authorized:', origin, 'Allowed:', keyData.authorized_domains);
            return null;
        }
        
        // Get user profile for tier information
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('tier')
            .eq('id', keyData.user_id)
            .single();
        
        if (profileError) {
            console.error('validatePublicKey: Error fetching user profile:', profileError);
            return null;
        }
        
        // Update last_used_at (don't wait for it)
        supabase
            .from('public_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyData.id)
            .then(({ error }) => {
                if (error) console.error('Error updating last_used_at:', error);
            });
        
        const result = {
            userId: keyData.user_id,
            tier: profileData.tier,
            name: keyData.name,
            keyId: keyData.id
        };
        
        // Cache with profile data
        setCachedValidation(trimmedKey, {
            ...keyData,
            tier: profileData.tier,
            key_name: keyData.name
        }, CACHE_TTL_SUCCESS);
        
        return result;
    } catch (error) {
        console.error('validatePublicKey: Error:', error);
        return null;
    }
};

/**
 * List all public keys for a user
 */
const listPublicKeysForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('public_api_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error listing public keys:', error);
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('Error in listPublicKeysForUser:', error);
        throw error;
    }
};

/**
 * Update authorized domains for a public key
 */
const updatePublicKey = async (keyId, userId, updates) => {
    try {
        const allowedUpdates = {};
        
        if (updates.name !== undefined) {
            allowedUpdates.name = updates.name;
        }
        
        if (updates.authorized_domains !== undefined) {
            if (!Array.isArray(updates.authorized_domains)) {
                throw new Error('authorized_domains must be an array');
            }
            allowedUpdates.authorized_domains = updates.authorized_domains;
        }
        
        if (updates.enabled !== undefined) {
            allowedUpdates.enabled = updates.enabled;
        }
        
        const { data, error } = await supabase
            .from('public_api_keys')
            .update(allowedUpdates)
            .eq('id', keyId)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating public key:', error);
            throw error;
        }
        
        // Invalidate cache for this key
        if (data) {
            validationCache.delete(data.key);
        }
        
        return data;
    } catch (error) {
        console.error('Error in updatePublicKey:', error);
        throw error;
    }
};

/**
 * Delete (disable) a public key
 */
const deletePublicKey = async (keyId, userId) => {
    try {
        // Soft delete by setting enabled to false
        const { data, error } = await supabase
            .from('public_api_keys')
            .update({ enabled: false })
            .eq('id', keyId)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) {
            console.error('Error deleting public key:', error);
            throw error;
        }
        
        // Invalidate cache for this key
        if (data) {
            validationCache.delete(data.key);
        }
        
        return data;
    } catch (error) {
        console.error('Error in deletePublicKey:', error);
        throw error;
    }
};

module.exports = {
    createPublicKeyForUser,
    validatePublicKey,
    listPublicKeysForUser,
    updatePublicKey,
    deletePublicKey,
    isOriginAuthorized,
    matchesDomain
};



