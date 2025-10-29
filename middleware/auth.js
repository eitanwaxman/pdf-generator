const { validateApiKey } = require('../services/apiKeyService');

/**
 * Middleware to validate API key from request headers
 * Attaches account information to request object
 */
const authenticate = async (req, res, next) => {
    // Try both lowercase and original case header names
    const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'] || req.headers['X-API-Key'];
    
    if (!apiKey) {
        console.log('authenticate: No API key in headers. Available headers:', Object.keys(req.headers).filter(h => h.toLowerCase().includes('api')));
        return res.status(401).json({ error: 'API key required' });
    }
    
    // Log first few characters for debugging (without exposing full key)
    const trimmedKey = apiKey.trim();
    const keyPreview = trimmedKey.length > 20 ? `${trimmedKey.substring(0, 20)}...` : 'too short';
    console.log('authenticate: Validating API key:', keyPreview);
    
    try {
        const account = await validateApiKey(apiKey.trim());
        
        if (!account) {
            console.log('authenticate: API key validation failed');
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        console.log('authenticate: API key validated successfully for user:', account.userId);
        
        // Attach account info to request object for use in controllers
        req.account = {
            userId: account.userId,
            tier: account.tier,
            name: account.name,
            apiKey: account.apiKey
        };
        
        next();
    } catch (error) {
        console.error('authenticate: Error in authentication:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = {
    authenticate
};

