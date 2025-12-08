const crypto = require('crypto');
const { supabase } = require('../config/supabase');

/**
 * Generate a demo API key
 * Format: pdf_demo_<64-character-hex>
 * @returns {string} Demo API key
 */
const generateDemoKey = () => {
    const randomBytes = crypto.randomBytes(32);
    const randomString = randomBytes.toString('hex');
    return `pdf_demo_${randomString}`;
};

/**
 * Validate if an origin is allowed for demo keys (docs pages only)
 * @param {string} origin - The origin to validate
 * @returns {boolean} True if origin is allowed
 */
const isDemoKeyOriginAllowed = (origin) => {
    if (!origin) {
        return false;
    }

    try {
        const url = new URL(origin);
        const hostname = url.hostname;
        const pathname = url.pathname || '';
        
        // Allowed origins for demo keys (docs pages only)
        const allowedOrigins = [
            'docuskribe.com',
            'www.docuskribe.com',
            'localhost'
        ];
        
        const allowedPaths = ['/docs', '/'];
        
        // Check if hostname matches
        const hostnameMatches = allowedOrigins.some(allowed => {
            if (allowed === 'localhost') {
                return hostname === 'localhost' || hostname === '127.0.0.1';
            }
            return hostname === allowed || hostname.endsWith(`.${allowed}`);
        });
        
        // Check if pathname is docs or root
        const pathMatches = allowedPaths.some(path => pathname.startsWith(path));
        
        // Check port for localhost (5173, 5174, 3000)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            const port = url.port || (url.protocol === 'https:' ? '443' : '80');
            const allowedPorts = ['5173', '5174', '3000', '80', '443', ''];
            const portMatches = allowedPorts.includes(port);
            return hostnameMatches && portMatches && pathMatches;
        }
        
        return hostnameMatches && pathMatches;
    } catch (error) {
        console.error('Error validating demo key origin:', error);
        return false;
    }
};

/**
 * Validate a demo API key and check origin
 * @param {string} demoKey - The demo API key to validate
 * @param {string} origin - The origin header from the request
 * @returns {Promise<{userId: string, tier: string, name: string, keyId: string} | null>}
 */
const validateDemoKey = async (demoKey, origin) => {
    try {
        if (!demoKey) {
            return null;
        }

        const trimmedKey = demoKey.trim();

        // Validate key format
        if (!trimmedKey.startsWith('pdf_demo_')) {
            return null;
        }

        // Validate origin is allowed (docs pages only)
        if (!isDemoKeyOriginAllowed(origin)) {
            console.log('Demo key validation failed: origin not allowed', { origin, key: trimmedKey.substring(0, 20) + '...' });
            return null;
        }

        // Query demo key (stored in plain text)
        const { data: keyData, error: keyError } = await supabase
            .from('demo_api_keys')
            .select('id, user_id, key, last_used_at, user_profiles(tier)')
            .eq('key', trimmedKey)
            .single();

        if (keyError || !keyData) {
            if (keyError && keyError.code !== 'PGRST116') {
                console.error('Error fetching demo key:', keyError);
            }
            return null;
        }

        // Extract tier from joined profile data
        const profileData = Array.isArray(keyData.user_profiles)
            ? keyData.user_profiles[0]
            : keyData.user_profiles;

        // Update last_used_at timestamp (fire and forget)
        supabase
            .from('demo_api_keys')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', keyData.id)
            .then()
            .catch(err => console.error('Error updating demo key last_used_at:', err));

        // Get user email for name
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(keyData.user_id);

        if (userError) {
            console.error('Error fetching user data for demo key:', userError);
        }

        return {
            userId: keyData.user_id,
            tier: profileData?.tier || 'free',
            name: userData?.user?.email || 'Unknown User',
            keyId: keyData.id,
            isDemoKey: true
        };
    } catch (error) {
        console.error('Error validating demo key:', error);
        return null;
    }
};

/**
 * Create a demo API key for a user
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{key: string, id: string}>}
 */
const createDemoKeyForUser = async (userId) => {
    try {
        // Check if demo key already exists
        const { data: existing } = await supabase
            .from('demo_api_keys')
            .select('id, key')
            .eq('user_id', userId)
            .single();

        if (existing) {
            // Return existing key
            return {
                key: existing.key,
                id: existing.id
            };
        }

        // Generate new demo key
        const demoKey = generateDemoKey();

        // Insert demo key (stored in plain text)
        const { data, error } = await supabase
            .from('demo_api_keys')
            .insert({
                user_id: userId,
                key: demoKey,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating demo key:', error);
            throw new Error('Failed to create demo key');
        }

        return {
            key: demoKey,
            id: data.id
        };
    } catch (error) {
        console.error('Error in createDemoKeyForUser:', error);
        throw error;
    }
};

/**
 * Get demo key for a user
 * @param {string} userId - Supabase user ID
 * @returns {Promise<{key: string, created_at: string, last_used_at: string} | null>}
 */
const getDemoKeyForUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('demo_api_keys')
            .select('key, created_at, last_used_at')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            key: data.key,
            created_at: data.created_at,
            last_used_at: data.last_used_at
        };
    } catch (error) {
        console.error('Error getting demo key:', error);
        return null;
    }
};

module.exports = {
    generateDemoKey,
    validateDemoKey,
    createDemoKeyForUser,
    getDemoKeyForUser,
    isDemoKeyOriginAllowed
};

