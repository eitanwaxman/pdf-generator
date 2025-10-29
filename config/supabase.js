const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    throw new Error('Supabase configuration incomplete');
}

// Create Supabase client with service role key (bypasses RLS for admin operations)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Create Supabase client with anon key for client-side operations (respects RLS)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseClient = supabaseAnonKey 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

module.exports = {
    supabase,
    supabaseClient
};

