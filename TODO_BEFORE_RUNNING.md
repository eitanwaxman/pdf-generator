# ✅ Before You Run the Application

Complete these steps to get Docuskribe running with Supabase authentication:

## 1. Create Supabase Project (5 minutes)

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Name: `docuskribe`
   - Database Password: (generate and save it!)
   - Region: (choose closest to you)
4. Wait ~2 minutes for project to be ready

## 2. Set Up Database (2 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy **ALL** contents from `supabase-setup.sql` file
4. Paste into the editor
5. Click "Run"
6. ✅ Verify: Go to **Table Editor** - you should see `user_profiles` and `api_keys` tables

## 3. Configure Backend Environment (1 minute)

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these 3 values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon** **public** key
   - **service_role** **secret** key

3. Create `.env` file in project root:
```bash
cp .env.example .env
```

4. Edit `.env` and fill in:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
REDIS_URL=redis://localhost:6379
```

## 4. Configure Frontend (30 seconds)

Edit `public/config.js`:
```javascript
window.SUPABASE_URL = 'https://xxxxx.supabase.co';  // Your project URL
window.SUPABASE_ANON_KEY = 'your_anon_key_here';    // Your anon key
```

## 5. Start Redis (1 minute)

### Option A - Docker (Easiest)
```bash
docker run -d -p 6379:6379 redis:latest
```

### Option B - Redis Cloud (Free)
1. Sign up at https://redis.com/try-free/
2. Create a free database
3. Update `REDIS_URL` in `.env` with your connection string

## 6. Enable Email Authentication in Supabase (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Go to **Authentication** → **Email Templates**
4. Customize confirmation email if desired

## 7. Start the Server

```bash
npm install  # If not already done
node app.js
```

You should see:
```
Docuskribe API Server running on port 3000
API Endpoints:
  POST /api/v1/jobs - Create a PDF generation job
  GET /api/v1/jobs/:jobId - Get job status and result
  DELETE /api/v1/jobs/:jobId - Cancel a job

Worker started and ready to process jobs
```

## 8. Test It Out!

1. Open http://localhost:3000
2. Click "Register" tab
3. Enter your email and password (min 8 chars)
4. Click "Create Account"
5. Check your email for verification link
6. Click the link to verify
7. Return to http://localhost:3000 and login
8. See your API key in the dashboard!
9. Try generating a PDF

## 🎉 You're Done!

## Quick Verification Checklist

- [ ] Supabase project created
- [ ] SQL script executed successfully
- [ ] `.env` file configured with all 3 Supabase keys
- [ ] `public/config.js` configured with Supabase URL and anon key
- [ ] Redis is running
- [ ] Server starts without errors
- [ ] Dashboard loads at http://localhost:3000
- [ ] Can register a new account
- [ ] Receive verification email
- [ ] Can login after verification
- [ ] API key is displayed in dashboard
- [ ] Can create a PDF job from dashboard

## Common Issues

### "Missing Supabase environment variables"
→ Check that `.env` file exists and has all 3 variables set

### "Configuration Required" message on dashboard
→ Update `public/config.js` with your Supabase credentials

### "Redis connection failed"
→ Make sure Redis is running: `docker ps` or check Redis Cloud

### "Email not verified"
→ Check spam folder, or manually verify in Supabase → Authentication → Users

### Can't login after registration
→ Make sure you clicked the email verification link first

## Need Help?

- **Quick Start**: See `QUICKSTART.md`
- **Detailed Guide**: See `SUPABASE_SETUP_GUIDE.md`
- **Implementation Details**: See `IMPLEMENTATION_COMPLETE.md`

---

**Time to complete**: ~10 minutes  
**Difficulty**: Easy  
**Prerequisites**: Docker (for Redis) or Redis Cloud account

