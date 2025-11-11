const { validatePublicKey } = require('../services/publicApiKeyService');

/**
 * Middleware to validate public API key from request headers
 * Also validates that the request origin is authorized for the public key
 * Attaches account information to request object
 */
const authenticatePublic = async (req, res, next) => {
    console.log('\n=== authenticatePublic: Request received ===');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Headers:', {
        'x-public-key': req.headers['x-public-key'] ? `${req.headers['x-public-key'].substring(0, 20)}...` : 'not present',
        'X-Public-Key': req.headers['X-Public-Key'] ? `${req.headers['X-Public-Key'].substring(0, 20)}...` : 'not present',
        'origin': req.headers['origin'] || 'not present',
        'referer': req.headers['referer'] || 'not present',
        'referrer': req.headers['referrer'] || 'not present'
    });
    
    // Try different header formats
    const publicKey = req.headers['x-public-key'] || 
                     req.headers['X-Public-Key'] || 
                     req.headers['x-public-api-key'];
    
    if (!publicKey) {
        console.log('❌ authenticatePublic: No public key in headers');
        return res.status(401).json({ 
            error: 'Public API key required',
            details: 'Include X-Public-Key header with your public API key'
        });
    }
    
    // Get origin from request
    // Try Origin header first (most reliable for CORS requests)
    // Fall back to Referer if Origin is not present
    const origin = req.headers['origin'] || 
                   req.headers['referer'] || 
                   req.headers['referrer'];
    
    if (!origin) {
        console.log('❌ authenticatePublic: No origin/referer header');
        return res.status(401).json({ 
            error: 'Origin validation failed',
            details: 'Request must include Origin or Referer header'
        });
    }
    
    console.log('📥 authenticatePublic: Raw origin/referer:', origin);
    
    // Extract hostname from origin/referer
    let originHostname;
    try {
        const url = new URL(origin);
        originHostname = url.origin; // Use full origin (protocol + hostname + port)
        console.log('✅ authenticatePublic: Parsed origin:', {
            full: originHostname,
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || '(default)',
            pathname: url.pathname
        });
    } catch (e) {
        console.log('❌ authenticatePublic: Invalid origin/referer format:', origin, 'Error:', e.message);
        return res.status(401).json({ 
            error: 'Invalid origin format',
            details: 'Could not parse origin header'
        });
    }
    
    const trimmedKey = publicKey.trim();
    const keyPreview = trimmedKey.length > 20 ? `${trimmedKey.substring(0, 20)}...` : trimmedKey;
    console.log('🔑 authenticatePublic: Validating public key:', keyPreview, 'from origin:', originHostname);
    
    try {
        const account = await validatePublicKey(trimmedKey, originHostname);
        
        if (!account) {
            console.log('❌ authenticatePublic: Public key validation failed or origin not authorized');
            console.log('=== authenticatePublic: Request rejected ===\n');
            return res.status(401).json({ 
                error: 'Invalid public key or unauthorized domain',
                details: 'The public key is invalid or your domain is not authorized. Check your public key settings in the dashboard.'
            });
        }
        
        console.log('✅ authenticatePublic: Public key validated successfully for user:', account.userId);
        console.log('=== authenticatePublic: Request authorized ===\n');
        
        // Attach account info to request object for use in controllers
        // Use same structure as standard auth for compatibility
        req.account = {
            userId: account.userId,
            tier: account.tier,
            name: account.name,
            publicKeyId: account.keyId,
            isPublicKey: true // Flag to identify public key requests
        };
        
        next();
    } catch (error) {
        console.error('❌ authenticatePublic: Error in authentication:', error);
        console.error('Stack:', error.stack);
        return res.status(500).json({ 
            error: 'Authentication failed',
            details: 'Internal server error during authentication'
        });
    }
};

/**
 * Middleware to support both standard API key and public API key authentication
 * Checks for X-Public-Key first, then falls back to X-Api-Key
 */
const authenticateFlexible = async (req, res, next) => {
    const publicKey = req.headers['x-public-key'] || req.headers['X-Public-Key'];
    
    if (publicKey) {
        // Use public key authentication
        return authenticatePublic(req, res, next);
    } else {
        // Fall back to standard authentication
        const { authenticate } = require('./auth');
        return authenticate(req, res, next);
    }
};

module.exports = {
    authenticatePublic,
    authenticateFlexible
};



