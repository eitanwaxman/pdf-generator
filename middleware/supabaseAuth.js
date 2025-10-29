const { supabase } = require('../config/supabase');

/**
 * Middleware to verify Supabase JWT tokens (for dashboard API calls)
 * Attaches user information to req.user
 */
const verifySupabaseToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        
        const token = authHeader.replace('Bearer ', '');
        
        // Verify the JWT token
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Check if email is verified
        if (!user.email_confirmed_at) {
            return res.status(403).json({ 
                error: 'Email not verified',
                message: 'Please verify your email address before accessing this resource'
            });
        }
        
        // Attach user info to request
        req.user = {
            id: user.id,
            email: user.email,
            emailVerified: !!user.email_confirmed_at
        };
        
        next();
    } catch (error) {
        console.error('Error verifying Supabase token:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

module.exports = {
    verifySupabaseToken
};

