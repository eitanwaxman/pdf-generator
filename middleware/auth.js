const apiKeys = require('../config/apiKeys');

/**
 * Middleware to validate API key from request headers
 * Attaches account information to request object
 */
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
    }
    
    const account = apiKeys[apiKey];
    
    if (!account) {
        return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Attach account info to request object for use in controllers
    req.account = account;
    req.account.apiKey = apiKey;
    
    next();
};

module.exports = {
    authenticate
};

