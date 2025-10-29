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
        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: false // Require email confirmation
        });
        
        if (authError) {
            console.error('Error creating user:', authError);
            return res.status(400).json({ 
                error: authError.message || 'Failed to create user'
            });
        }
        
        const userId = authData.user.id;
        
        // Create user profile with default tier
        const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: userId,
                tier: 'free',
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
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: process.env.APP_URL || 'http://localhost:3000'
            }
        });
        
        if (error) {
            console.error('Error sending magic link:', error);
            return res.status(400).json({ error: 'Failed to send magic link' });
        }
        
        res.json({ 
            message: 'Magic link sent! Please check your email.'
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

