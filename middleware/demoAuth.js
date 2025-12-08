const { validateDemoKey } = require('../services/demoApiKeyService');

/**
 * Middleware to validate demo API key from request headers
 * Demo keys can only be used from docs pages (CORS protection)
 * Attaches account information to request object
 */
const authenticateDemo = async (req, res, next) => {
    // Try both lowercase and original case header names
    const apiKey = req.headers['x-api-key'] || req.headers['X-Api-Key'] || req.headers['X-API-Key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    const trimmedKey = apiKey.trim();
    
    // Only process if it's a demo key
    if (!trimmedKey.startsWith('pdf_demo_')) {
        // Not a demo key, let other middleware handle it
        return next();
    }
    
    // Get origin from request
    const origin = req.headers['origin'] || 
                   req.headers['referer'] || 
                   req.headers['referrer'];
    
    if (!origin) {
        return res.status(401).json({ 
            error: 'Origin validation failed',
            details: 'Request must include Origin or Referer header for demo keys'
        });
    }
    
    try {
        const account = await validateDemoKey(trimmedKey, origin);
        
        if (!account) {
            return res.status(401).json({ 
                error: 'Invalid demo key or unauthorized origin',
                details: 'Demo keys can only be used from documentation pages'
            });
        }
        
        // Attach account info to request object
        req.account = {
            userId: account.userId,
            tier: account.tier,
            name: account.name,
            apiKey: trimmedKey,
            isDemoKey: true
        };
        
        next();
    } catch (error) {
        console.error('authenticateDemo: Error in authentication:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = {
    authenticateDemo
};

