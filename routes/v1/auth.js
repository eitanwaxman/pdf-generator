const express = require('express');
const { supabase } = require('../../config/supabase');
const { createApiKeyForUser } = require('../../services/apiKeyService');

const router = express.Router();

/**
 * POST /api/v1/auth/register
 * Register a new user with email and password
 */
router.post('/register', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    try {
        // Remove trailing slash if present to avoid redirect issues
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        
        console.log('Registration - Using APP_URL:', appUrl); // Debug log
        
        // Create user using signUp - this automatically sends confirmation email
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: appUrl
            }
        });
        
        if (authError) {
            console.error('Error creating user:', authError);
            return res.status(400).json({ 
                error: authError.message || 'Failed to create user'
            });
        }
        
        // Check if user already exists (signUp returns user with empty identities array)
        // This is Supabase's way of preventing user enumeration
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
            console.log('User already exists, attempting to resend confirmation');
            
            // User already exists - try to resend confirmation if not verified
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === email);
            
            if (existingUser) {
                // Ensure user has a profile (may be missing if created via magic link)
                const { data: existingProfile } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('id', existingUser.id)
                    .single();
                
                if (!existingProfile) {
                    // Create missing profile
                    await supabase
                        .from('user_profiles')
                        .insert({
                            id: existingUser.id,
                            tier: 'free',
                            monthly_credits: 50,
                            credits_used: 0,
                            overage_enabled: false,
                            subscription_period_start: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                    console.log(`Created missing profile for existing user ${existingUser.id}`);
                }
                
                if (!existingUser.email_confirmed_at) {
                    // User exists but hasn't confirmed - resend confirmation
                    const { error: resendError } = await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                        options: {
                            emailRedirectTo: appUrl
                        }
                    });
                    
                    if (!resendError) {
                        return res.status(200).json({ 
                            message: 'A confirmation email has been resent. Please check your inbox.',
                            resent: true
                        });
                    }
                }
            }
            
            return res.status(400).json({ 
                error: 'An account with this email already exists. Please login or reset your password.'
            });
        }
        
        const userId = authData.user.id;
        
        // Create user profile with default tier
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: userId,
                tier: 'free',
                monthly_credits: 50,
                credits_used: 0,
                overage_enabled: false,
                subscription_period_start: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (profileError) {
            console.error('Error creating user profile:', profileError);
            // Don't fail registration if profile creation fails
        }
        
        // Create API key for the user
        try {
            await createApiKeyForUser(userId);
        } catch (apiKeyError) {
            console.error('Error creating API key:', apiKeyError);
            // Don't fail registration if API key creation fails
        }
        
        res.status(201).json({ 
            message: 'User registered successfully. Please check your email to verify your account.',
            user: {
                id: userId,
                email: authData.user.email
            }
        });
    } catch (error) {
        console.error('Error in registration:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /api/v1/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        res.json({ 
            message: 'Login successful',
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at
            },
            user: {
                id: data.user.id,
                email: data.user.email,
                email_verified: !!data.user.email_confirmed_at
            }
        });
    } catch (error) {
        console.error('Error in login:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

/**
 * POST /api/v1/auth/magic-link
 * Send a magic link for passwordless login
 */
router.post('/magic-link', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    
    try {
        // Remove trailing slash if present to avoid redirect issues
        const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
        
        console.log('Magic link - Using APP_URL:', appUrl); // Debug log
        
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: appUrl
            }
        });
        
        if (error) {
            console.error('Error sending magic link:', error);
            return res.status(400).json({ error: 'Failed to send magic link' });
        }
        
        res.json({ 
            message: 'Magic link sent! Please check your email.',
            debug: { redirectUrl: appUrl } // Include for debugging
        });
    } catch (error) {
        console.error('Error in magic link:', error);
        res.status(500).json({ error: 'Failed to send magic link' });
    }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(400).json({ error: 'No session to logout' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
        const { error } = await supabase.auth.admin.signOut(token);
        
        if (error) {
            console.error('Error logging out:', error);
        }
        
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Error in logout:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

/**
 * GET /api/v1/auth/me
 * Get current user information (requires authentication)
 */
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing authorization header' });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        
        // Get user profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('tier')
            .eq('id', user.id)
            .single();
        
        res.json({
            user: {
                id: user.id,
                email: user.email,
                email_verified: !!user.email_confirmed_at,
                tier: profile?.tier || 'free',
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Error getting user info:', error);
        res.status(500).json({ error: 'Failed to get user information' });
    }
});

module.exports = router;

