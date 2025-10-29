# PDF Generator API Service

A production-ready API service for converting websites to PDF or screenshots with user authentication, job queuing, rate limiting, and account tiers.

## Features

- **🔐 User Authentication**: Full Supabase authentication with email/password and magic links
- **🔑 API Key Management**: Automatic API key generation and rotation per user
- **📊 User Dashboard**: Modern web UI for account management and PDF generation
- **📚 API Documentation**: Interactive documentation with code examples
- **⚡ Job Queue System**: Redis + BullMQ for asynchronous PDF generation
- **🚦 Rate Limiting**: Redis-backed rate limiting (50/day for free, unlimited for paid)
- **💎 Account Tiers**: Free (with watermark) and Paid (no watermark, priority queuing)
- **🎯 Versioned API**: RESTful API with versioning support
- **🌐 Platform-Specific**: Apply platform-specific optimizations (e.g., Wix)
- **📸 Screenshot Support**: Generate full-page or viewport screenshots
- **📤 Multiple Response Types**: Return PDF/screenshot as buffer or temporary URL

## Prerequisites

- Node.js >= 16.3.0
- Redis server (local or cloud)
- Puppeteer dependencies
- Supabase account (free tier available)

## Installation

### 1. Clone the repository

### 2. Install dependencies:
```bash
npm install
```

### 3. Set up Supabase (Required)

Follow the detailed guide in [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md) to:
- Create a Supabase project
- Set up database tables
- Configure email authentication
- Get your API keys

**Quick Supabase Setup:**
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL script in `supabase-setup.sql` in your Supabase SQL Editor
3. Copy your project URL and keys from Settings → API

### 4. Configure environment variables:
```bash
cp .env.example .env
```

Update `.env` with your configuration:
```env
# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
SERVER_URL=http://localhost:3000
APP_URL=http://localhost:3000

# PDF Settings
MAX_PDF_SIZE_MB=50

# Supabase (get from your Supabase project dashboard)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 5. Redis Setup:

**Option A: Local Redis (Windows)**
```bash
# Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
# Or use WSL to run Redis
# Or use Docker:
docker run -d -p 6379:6379 redis:latest
```

**Option B: Cloud Redis (Recommended)**
- Use Redis Cloud (free tier available): https://redis.com/redis-enterprise-cloud/
- Set `REDIS_URL` in your `.env` file:
```env
REDIS_URL=redis://username:password@redis-cloud-host:port
```

### 6. Start the server:
```bash
node app.js
```

### 7. Access the application:

- **Dashboard**: http://localhost:3000 - Register/login and manage your API key
- **API Docs**: http://localhost:3000/docs.html - Interactive API documentation
- **API**: http://localhost:3000/api/v1 - RESTful API endpoints

**Note:** If Redis is not available, the app will start without rate limiting, but the worker will fail to connect to Redis.

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication

All API requests require authentication via API key in the `x-api-key` header:

```bash
curl -H "x-api-key: your_api_key_here" ...
```

**Getting Your API Key:**
1. Register/login at http://localhost:3000
2. Your API key will be automatically generated and displayed in the dashboard
3. Copy the key and use it in your API requests

**Account Tiers:**
- **Free**: 50 requests/day, includes watermark
- **Paid**: Unlimited requests, no watermark, priority processing

### Endpoints

#### Create PDF Generation Job
**POST /api/v1/jobs**

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "format": "A4",
      "margin": {"top": "50px", "bottom": "50px", "left": "50px", "right": "50px"},
      "platform": "wix",
      "responseType": "buffer",
      "data": {"utm_source": "docs", "debug": true, "version": 1}
    }
  }'
```

**Response:**
```json
{
  "jobId": "uuid-here",
  "status": "pending",
  "message": "Job created successfully"
}
```

#### Get Job Status and Result
**GET /api/v1/jobs/:jobId**

```bash
curl http://localhost:3000/api/v1/jobs/:jobId \
  -H "x-api-key: YOUR_API_KEY"
```

**Responses:**

Pending:
```json
{
  "status": "pending"
}
```

Processing:
```json
{
  "status": "processing"
}
```

Completed (buffer):
```json
{
  "status": "completed",
  "result": {
    "type": "buffer",
    "pdf": "base64-encoded-pdf-content"
  }
}
```

Completed (URL):
```json
{
  "status": "completed",
  "result": {
    "type": "url",
    "url": "http://localhost:3000/temp/uuid.pdf"
  }
}
```

Failed:
```json
{
  "status": "failed",
  "error": "Error message"
}
```

#### Cancel Job
**DELETE /api/v1/jobs/:jobId**

```bash
curl -X DELETE http://localhost:3000/api/v1/jobs/:jobId \
  -H "x-api-key: YOUR_API_KEY"
```

## Configuration Options

### Request Options

- `url` (required): Website URL to convert
- `options.format`: PDF format - one of: Letter, Legal, Tabloid, Ledger, A0, A1, A2, A3, A4, A5, A6 - default: A4
- `options.margin`: PDF margins - default: {top: "100px", right: "50px", bottom: "100px", left: "50px"}
- `options.platform`: Platform-specific optimizations (e.g., "wix" for Wix ad/banner removal) - default: undefined
- `options.responseType`: "buffer" or "url" - default: "buffer"
- `options.data`: Object of key-value pairs to append as query params to the main `url` before generating the output. Values must be primitives (string, number, boolean, null).

### Account Tiers

**Free Tier:**
- 50 requests per day
- Watermark added to PDFs
- Lower priority in queue

**Paid Tier:**
- Unlimited requests
- No watermark
- Higher priority processing

## Project Structure

```
pdf-generator/
├── config/
│   ├── apiKeys.js       # API key configuration
│   └── redis.js         # Redis connection
├── middleware/
│   ├── auth.js          # API key authentication
│   └── rateLimiter.js   # Rate limiting
├── routes/
│   └── v1/
│       └── jobs.js      # API routes
├── services/
│   └── pdfService.js    # PDF generation logic
├── queue/
│   └── pdfQueue.js      # BullMQ queue setup
├── workers/
│   └── pdfWorker.js     # Job processor
├── app.js               # Main application
└── package.json
```

## Development

### Managing Users
Users and API keys are managed through Supabase:
- View users: Supabase Dashboard → Authentication → Users
- View API keys: Supabase Dashboard → Table Editor → api_keys
- Update user tiers: Supabase Dashboard → Table Editor → user_profiles

### Upgrading User Tiers
To upgrade a user to paid tier:
```sql
UPDATE user_profiles 
SET tier = 'paid' 
WHERE id = 'user-id-here';
```

### Monitoring
- Check worker logs for job processing
- Monitor Redis for queue status
- Use BullMQ dashboard (optional) for queue visualization

## Production Deployment

1. **Set up Supabase**:
   - Upgrade to Supabase Pro if needed for higher limits
   - Configure custom email SMTP provider
   - Set up proper redirect URLs for your domain
   - Enable database backups

2. **Set up Redis**: Use a managed Redis service (Redis Cloud, AWS ElastiCache, etc.)

3. **Configure environment variables**:
   - Update `APP_URL` to your production domain
   - Update `SERVER_URL` to your production API URL
   - Set Supabase production keys
   - Use HTTPS URLs for all endpoints

4. **Configure server infrastructure**:
   - Use process manager (PM2, systemd)
   - Set up SSL/TLS certificates
   - Configure reverse proxy (nginx, Caddy)
   - Set appropriate concurrency limits

5. **Security**:
   - Never expose service_role key
   - Use environment variables, never commit secrets
   - Enable HTTPS only
   - Set up proper CORS policies
   - Monitor authentication logs

6. **Configure file cleanup policies** for temporary PDFs

## License

ISC

