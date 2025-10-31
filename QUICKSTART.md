# Quick Start Guide

Get Docuskribe up and running in 5 minutes!

## ⚡ Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase (5 minutes)

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com), sign up, and create a new project

2. **Run SQL Setup**: In your Supabase dashboard:
   - Go to **SQL Editor**
   - Click "New Query"
   - Copy all contents from `supabase-setup.sql`
   - Paste and click "Run"

3. **Get Your Keys**: In Supabase dashboard:
   - Go to **Settings** → **API**
   - Copy:
     - Project URL
     - `anon` `public` key
     - `service_role` `secret` key

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
REDIS_URL=redis://localhost:6379
```

### 4. Start Redis

**Option A - Docker (easiest)**:
```bash
docker run -d -p 6379:6379 redis:latest
```

**Option B - Use Redis Cloud** (free):
- Sign up at [redis.com](https://redis.com/try-free/)
- Update `REDIS_URL` in `.env`

### 5. Start the Server

```bash
node app.js
```

### 6. Register Your Account

1. Open http://localhost:3000
2. Click "Register" tab
3. Enter email and password (min 8 chars)
4. Click "Create Account"
5. Check your email and verify
6. Login to access your dashboard

## 🎉 You're Ready!

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs.html

## 📝 Next Steps

1. **Copy your API key** from the dashboard
2. **Test the API** using the interactive docs
3. **Generate your first PDF** right from the dashboard

## 🆘 Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env` file exists
- Check all three Supabase variables are set
- Restart the server with `node app.js`

### Email verification not received
- Check spam folder
- Verify email in Supabase → Authentication → Users
- Manually verify: Click user → Confirm Email

### Redis connection error
- Make sure Redis is running: `docker ps` or check Redis Cloud
- Test connection: `redis-cli ping` (should return PONG)
- Rate limiting will be disabled if Redis is unavailable

### Can't access dashboard
- Make sure server is running on port 3000
- Check for port conflicts
- Try http://127.0.0.1:3000 instead

## 💡 Tips

- **Free tier is enough** for testing (50 PDFs/day)
- **API key rotates** if you think it's compromised
- **Check the logs** if jobs fail - they show helpful errors
- **Use the docs page** for code examples in multiple languages

---

For detailed documentation, see [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)

