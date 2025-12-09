const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { createCache } = require('../lib/cache');

// In-memory cache for public API key validations
const validationCache = createCache();

/**
 * Get cached validation result
 */
function getCachedValidation(trimmedKey) {
    return validationCache.get(trimmedKey);
}

/**
 * Set cached validation result
 */
function setCachedValidation(trimmedKey, keyData, ttlMs) {
    validationCache.set(trimmedKey, keyData, ttlMs);
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
    if (!origin || !domainPattern) {
        return false;
    }
    
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
    if (hostname === domainPattern) {
        return true;
    }
    
    // Localhost with wildcard port: localhost:*
    if (domainPattern === 'localhost:*' && hostname === 'localhost') {
        return true;
    }
    if (domainPattern.startsWith('localhost:') && hostname === 'localhost') {
        const patternPort = domainPattern.split(':')[1];
        if (patternPort === '*') {
            return true;
        }
        if (patternPort === port) {
            return true;
        }
    }
    
    // Wildcard subdomain: *.example.com
    if (domainPattern.startsWith('*.')) {
        const baseDomain = domainPattern.substring(2);
        // Match exact subdomain or nested subdomains
        if (hostname.endsWith('.' + baseDomain)) {
            return true;
        }
        if (hostname === baseDomain) {
            return true;
        }
    }
    
    // Domain with port
    const hostnameWithPort = port ? `${hostname}:${port}` : hostname;
    if (hostnameWithPort === domainPattern) {
        return true;
    }
    
    return false;
}

/**
 * Validate origin against authorized domains
 */
function isOriginAuthorized(origin, authorizedDomains) {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔐 isOriginAuthorized: Checking origin="${origin}" against authorized domains:`, authorizedDomains);
    }
    
    if (!origin || !Array.isArray(authorizedDomains)) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`  ❌ isOriginAuthorized: Invalid input - origin: ${origin}, authorizedDomains: ${Array.isArray(authorizedDomains) ? 'array' : typeof authorizedDomains}`);
        }
        return false;
    }
    if (authorizedDomains.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`  ❌ isOriginAuthorized: No authorized domains configured`);
        }
        return false;
    }
    
    if (process.env.NODE_ENV !== 'production') {
        console.log(`  🔍 isOriginAuthorized: Checking ${authorizedDomains.length} domain pattern(s)...`);
    }
    const result = authorizedDomains.some(domain => matchesDomain(origin, domain));
    
    if (process.env.NODE_ENV !== 'production') {
        if (result) {
            console.log(`  ✅ isOriginAuthorized: Origin authorized!`);
        } else {
            console.log(`  ❌ isOriginAuthorized: Origin NOT authorized - none of the patterns matched`);
        }
    }
    
    return result;
}

/**
 * Check if an origin is authorized for any public key (for preflight CORS requests)
 * This is used when we don't have the public key yet (e.g., OPTIONS preflight)
 * @param {string} origin - The origin to validate
 * @returns {Promise<boolean>} - True if origin is authorized for any public key
 */
const isOriginAuthorizedForAnyPublicKey = async (origin) => {
    try {
        if (!origin) {
            return false;
        }

        // Query all enabled public keys to check if any authorize this origin
        const { data: keys, error } = await supabase
            .from('public_api_keys')
            .select('authorized_domains')
            .eq('enabled', true);
        
        if (error || !keys || keys.length === 0) {
            return false;
        }

        // Check if origin matches any key's authorized domains
        return keys.some(key => isOriginAuthorized(origin, key.authorized_domains || []));
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error checking origin for any public key:', error);
        }
        return false;
    }
};

/**
 * Validate if an origin is allowed for a public key (for CORS middleware)
 * This is a lightweight check that doesn't do full authentication
 * @param {string} publicKey - The public API key
 * @param {string} origin - The origin to validate
 * @returns {Promise<boolean>} - True if origin is allowed
 */
const validatePublicKeyOrigin = async (publicKey, origin) => {
    try {
        if (!publicKey || !origin) {
            return false;
        }

        const trimmedKey = publicKey.trim();
        
        // Validate key format
        if (!trimmedKey.startsWith('pk_live_')) {
            return false;
        }

        // Check cache first
        const cached = getCachedValidation(trimmedKey);
        if (cached !== undefined && cached !== null) {
            // Use cached authorized domains
            return isOriginAuthorized(origin, cached.authorized_domains || []);
        }

        // Query public API key to get authorized domains
        const { data: keyData, error } = await supabase
            .from('public_api_keys')
            .select('authorized_domains, enabled')
            .eq('key', trimmedKey)
            .eq('enabled', true)
            .single();
        
        if (error || !keyData) {
            return false;
        }

        // Validate origin against authorized domains
        return isOriginAuthorized(origin, keyData.authorized_domains || []);
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Error validating public key origin:', error);
        }
        return false;
    }
};

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
    console.log('\n🔍 validatePublicKey: Starting validation');
    console.log('  Public Key:', publicKey ? `${publicKey.substring(0, 20)}...` : 'not provided');
    console.log('  Origin:', origin);
    
    try {
        if (!publicKey) {
            console.error('❌ validatePublicKey: No public key provided');
            return null;
        }
        
        // Validate key format
        if (!publicKey.startsWith('pk_live_')) {
            console.error('❌ validatePublicKey: Invalid public key format - must start with pk_live_');
            return null;
        }
        
        const trimmedKey = publicKey.trim();
        console.log('  ✅ validatePublicKey: Key format valid');
        
        // Check cache first
        const cached = getCachedValidation(trimmedKey);
        if (cached !== undefined) {
            console.log('  💾 validatePublicKey: Using cached validation result');
            // If cached key exists, validate origin
            if (cached === null) {
                console.log('  ❌ validatePublicKey: Key not found in cache (negative cache)');
                return null;
            }
            console.log('  📋 validatePublicKey: Cached key data - authorized_domains:', cached.authorized_domains);
            if (!isOriginAuthorized(origin, cached.authorized_domains)) {
                console.log('  ❌ validatePublicKey: Origin not authorized (from cache)');
                return null;
            }
            console.log('  ✅ validatePublicKey: Origin authorized (from cache)');
            return {
                userId: cached.user_id,
                tier: cached.tier,
                name: cached.key_name,
                keyId: cached.id
            };
        }
        
        console.log('  🔍 validatePublicKey: Key not in cache, querying database...');
        
        // Query public API key
        const { data: keyData, error: keyError } = await supabase
            .from('public_api_keys')
            .select('id, user_id, key, name, authorized_domains, enabled')
            .eq('key', trimmedKey)
            .eq('enabled', true)
            .single();
        
        if (keyError || !keyData) {
            if (keyError && keyError.code === 'PGRST116') {
                console.log('  ❌ validatePublicKey: Public key not found or disabled');
            } else {
                console.error('  ❌ validatePublicKey: Error fetching public key:', keyError);
            }
            setCachedValidation(trimmedKey, null, 10000); // 10 seconds for failed validations
            return null;
        }
        
        console.log('  ✅ validatePublicKey: Found public key in database');
        console.log('  📋 validatePublicKey: Key details:', {
            id: keyData.id,
            user_id: keyData.user_id,
            name: keyData.name,
            enabled: keyData.enabled,
            authorized_domains: keyData.authorized_domains
        });
        
        // Validate origin against authorized domains
        console.log('  🔐 validatePublicKey: Validating origin against authorized domains...');
        if (!isOriginAuthorized(origin, keyData.authorized_domains)) {
            console.log('  ❌ validatePublicKey: Origin NOT authorized');
            console.log('  📊 validatePublicKey: Summary:', {
                origin: origin,
                authorized_domains: keyData.authorized_domains,
                match: false
            });
            return null;
        }
        
        console.log('  ✅ validatePublicKey: Origin authorized!');
        
        // Get user profile for tier information
        console.log('  👤 validatePublicKey: Fetching user profile...');
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .select('tier')
            .eq('id', keyData.user_id)
            .single();
        
        if (profileError) {
            console.error('  ❌ validatePublicKey: Error fetching user profile:', profileError);
            return null;
        }
        
        console.log('  ✅ validatePublicKey: User profile fetched - tier:', profileData.tier);
        
        // Update last_used_at (don't wait for it)
        supabase
            .from('public_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyData.id)
            .then(({ error }) => {
                if (error) console.error('  ⚠️ validatePublicKey: Error updating last_used_at:', error);
            });
        
        const result = {
            userId: keyData.user_id,
            tier: profileData.tier,
            name: keyData.name,
            keyId: keyData.id
        };
        
        console.log('  ✅ validatePublicKey: Validation successful!');
        console.log('  📊 validatePublicKey: Final result:', {
            userId: result.userId,
            tier: result.tier,
            name: result.name,
            keyId: result.keyId
        });
        
        // Cache with profile data
        setCachedValidation(trimmedKey, {
            ...keyData,
            tier: profileData.tier,
            key_name: keyData.name
        }, 45000); // 45 seconds for successful validations
        
        console.log('  💾 validatePublicKey: Result cached\n');
        return result;
    } catch (error) {
        console.error('  ❌ validatePublicKey: Error:', error);
        console.error('  📋 validatePublicKey: Stack:', error.stack);
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
            validationCache.invalidate(data.key);
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
            validationCache.invalidate(data.key);
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
    validatePublicKeyOrigin,
    isOriginAuthorizedForAnyPublicKey,
    listPublicKeysForUser,
    updatePublicKey,
    deletePublicKey,
    isOriginAuthorized,
    matchesDomain
};



