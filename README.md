# PDF Generator API Service

A production-ready API service for converting websites to PDF with job queuing, rate limiting, and account tiers.

## Features

- **API Key Authentication**: Secure API access with multiple account tiers
- **Job Queue System**: Redis + BullMQ for asynchronous PDF generation
- **Rate Limiting**: Redis-backed rate limiting (50/day for free, unlimited for paid)
- **Account Tiers**: Free (with watermark) and Paid (no watermark, priority queuing)
- **Versioned API**: RESTful API with versioning support
- **Generic & Wix-Specific**: Apply Wix-specific logic only when needed
- **Multiple Response Types**: Return PDF as buffer or temporary URL

## Prerequisites

- Node.js >= 16.3.0
- Redis server (local or cloud)
- Puppeteer dependencies

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Copy environment template:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
REDIS_URL=redis://localhost:6379
PORT=3000
SERVER_URL=http://localhost:3000
MAX_PDF_SIZE_MB=50
```

5. Start Redis server (if running locally):
```bash
redis-server
```

6. Start the API server:
```bash
node app.js
```

## API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
Include your API key in the `x-api-key` header:
```bash
curl -H "x-api-key: test-free-key" ...
```

### Test API Keys

**Free Account** (50 requests/day, watermark):
- Key: `test-free-key`
- Limits: 50 requests per day, includes watermark

**Paid Account** (unlimited, no watermark, priority):
- Key: `test-paid-key`
- Limits: Unlimited, no watermark, priority processing

### Endpoints

#### Create PDF Generation Job
**POST /api/v1/jobs**

```bash
curl -X POST http://localhost:3000/api/v1/jobs \
  -H "x-api-key: test-free-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "format": "A4",
      "margin": {"top": "50px", "bottom": "50px", "left": "50px", "right": "50px"},
      "delay": 2000,
      "waitForDataLoad": false,
      "wix": false,
      "responseType": "buffer"
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
  -H "x-api-key: test-free-key"
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
  -H "x-api-key: test-free-key"
```

## Configuration Options

### Request Options

- `url` (required): Website URL to convert
- `options.format`: PDF format (A4, Letter, etc.) - default: A4
- `options.margin`: PDF margins - default: {top: "100px", right: "50px", bottom: "100px", left: "50px"}
- `options.delay`: Additional wait time in ms (max 10000) - default: 2000
- `options.waitForDataLoad`: Wait for iframe and #loadedIndicator - default: false
- `options.wix`: Apply Wix-specific ad/banner removal - default: false
- `options.responseType`: "buffer" or "url" - default: "buffer"

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

### Adding API Keys
Edit `config/apiKeys.js`:
```javascript
module.exports = {
    'your-api-key': { 
        tier: 'paid', 
        name: 'Your Account Name' 
    }
};
```

### Monitoring
- Check worker logs for job processing
- Monitor Redis for queue status
- Use BullMQ dashboard (optional) for queue visualization

## Production Deployment

1. Set up Redis server (local or cloud)
2. Configure environment variables
3. Set up proper API key management (database)
4. Configure server infrastructure
5. Set appropriate concurrency limits
6. Configure file cleanup policies

## License

ISC

