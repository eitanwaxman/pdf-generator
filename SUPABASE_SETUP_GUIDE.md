# Supabase Setup Guide for PDF Generator

This guide walks you through setting up Supabase for user authentication and API key management.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: pdf-generator (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient to start
5. Click "Create new project" and wait for setup to complete (~2 minutes)

## Step 2: Configure Environment Variables

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠️ Keep this secret!)

3. Create/update your `.env` file in the project root:

```env
# Existing variables
REDIS_URL=redis://localhost:6379
PORT=3000
SERVER_URL=http://localhost:3000
MAX_PDF_SIZE_MB=50

# Add these Supabase variables
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: For production deployments
APP_URL=http://localhost:3000
```

4. Update `public/dashboard.js` to use your Supabase credentials:
   - Option A: Set them as global variables in a config file
   - Option B: Replace the placeholder values in `public/dashboard.js` lines 4-5
   - Option C: Use environment variables served by your backend

## Step 3: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-setup.sql` and paste it
4. Click "Run" to execute the SQL script

This will create:
- ✅ `user_profiles` table - stores user tier and subscription info
- ✅ `api_keys` table - stores user API keys
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for auto-updating timestamps

## Step 4: Configure Email Authentication

### Enable Email/Password Authentication
1. Go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Configure email settings:
   - **Enable email confirmations**: ✅ ON (required for email verification)
   - **Enable email change confirmations**: ✅ ON (recommended)
   - **Secure email change**: ✅ ON (recommended)

### Configure Email Templates
1. Go to **Authentication** → **Email Templates**
2. Customize the following templates (optional but recommended):

**Confirm signup:**
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

**Magic Link:**
```html
<h2>Magic Link</h2>
<p>Follow this link to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

### Set Redirect URLs
1. Go to **Authentication** → **URL Configuration**
2. Add your redirect URLs:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

3. Add to **Redirect URLs** list:
   - `http://localhost:3000/**`
   - `https://yourdomain.com/**` (for production)

### Configure Site URL
Set the **Site URL** to your application's URL:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

## Step 5: Install Dependencies

Run the following command in your project directory:

```bash
npm install
```

This will install the new dependencies:
- `@supabase/supabase-js` - Supabase client library
- `crypto` - For generating secure API keys

## Step 6: Test the Integration

### Test User Registration

1. Start your server:
```bash
node app.js
```

2. Open your browser to `http://localhost:3000`

3. Click on the **Register** tab

4. Enter an email and password (min 8 characters)

5. Click "Create Account"

6. You should see: "Account created! Please check your email to verify your account."

7. Check your email inbox for the verification email from Supabase

8. Click the verification link

9. Return to `http://localhost:3000` and login with your credentials

### Test API Key Generation

1. After logging in, you should see your dashboard

2. Your API key should be automatically displayed

3. Test copying the API key with the "Copy API Key" button

4. Test rotating the key with the "Rotate Key" button

### Test PDF Generation

1. In the dashboard, enter a URL (e.g., `https://example.com`)

2. Click "Create Job"

3. Wait for the job to complete

4. You should see the generated PDF

### Test API Documentation Page

1. Click "API Docs" in the dashboard header

2. Try the interactive "Try It Out" section with your API key

## Step 7: Configure Email Provider (Production)

For production, you'll want to use a custom email provider instead of Supabase's default:

1. Go to **Settings** → **Auth** → **SMTP Settings**

2. Configure your SMTP provider (SendGrid, Mailgun, AWS SES, etc.):
   - **Host**: Your SMTP host
   - **Port**: Usually 587 (TLS) or 465 (SSL)
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password
   - **Sender email**: The "from" address
   - **Sender name**: Your app name

3. Test by sending a verification email

## Troubleshooting

### "Missing Supabase environment variables" Error
- Make sure `.env` file exists in project root
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Restart your Node.js server after adding environment variables

### "Email not verified" Error
- Check your email inbox (and spam folder) for the verification email
- Try requesting a new verification email
- Ensure email confirmation is enabled in Supabase Auth settings

### API Key Not Loading
- Check browser console for errors
- Verify the Supabase client is initialized correctly in `dashboard.js`
- Make sure `SUPABASE_ANON_KEY` is set correctly

### CORS Errors
- Ensure the CORS configuration in `app.js` includes your domain
- Add your domain to Supabase's allowed origins if needed

### Database Connection Errors
- Verify your SQL script ran successfully without errors
- Check that tables were created: go to **Table Editor** in Supabase
- Verify RLS policies are enabled

## Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Never expose service_role key** - Only use it server-side
3. **Use anon key for client-side** - It respects RLS policies
4. **Enable Row Level Security** - Already done by the setup script
5. **Use HTTPS in production** - Required for secure authentication
6. **Rotate keys periodically** - Especially if compromised
7. **Monitor authentication logs** - Check for suspicious activity

## Next Steps

1. **Test with multiple users** - Create several test accounts
2. **Set up Stripe integration** - For paid tier upgrades (future)
3. **Add admin dashboard** - To manage users and tiers
4. **Configure rate limiting** - Based on tier (already implemented)
5. **Set up monitoring** - Track API usage and errors
6. **Deploy to production** - Update environment variables accordingly

## Useful Supabase Features

- **Authentication Logs**: Monitor login attempts and errors
- **Database Backups**: Automatic daily backups (enable in settings)
- **API Documentation**: Auto-generated docs for your database
- **Table Editor**: Visual interface for viewing/editing data
- **SQL Editor**: Run custom queries and scripts
- **Realtime**: Add real-time subscriptions if needed

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- GitHub Issues: https://github.com/supabase/supabase/issues

---

**Setup Complete!** 🎉

Your PDF Generator now has:
- ✅ User authentication (email/password + magic link)
- ✅ Email verification
- ✅ Automatic API key generation
- ✅ API key rotation
- ✅ Tier-based access control
- ✅ Beautiful dashboard UI
- ✅ Interactive API documentation

