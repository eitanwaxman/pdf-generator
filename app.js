require('dotenv').config();

const express = require('express');
const path = require('path');

// Middleware
const { authenticate } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');

// Routes
const jobsRouter = require('./routes/v1/jobs');
const authRouter = require('./routes/v1/auth');
const userRouter = require('./routes/v1/user');
const billingRouter = require('./routes/internal/billing');
const stripeWebhookRouter = require('./routes/webhooks/stripe');

// Worker
const worker = require('./workers/pdfWorker');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration for dashboard
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// IMPORTANT: Webhook route MUST be registered BEFORE body-parser middleware
// Stripe webhooks require raw body for signature verification
app.use('/webhooks', stripeWebhookRouter);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for temporary PDFs
app.use('/temp', express.static('temp'));

// Serve React app (production build)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    // Serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/temp')) {
            return next();
        }
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
} else {
    // In development, serve old public files for docs.html etc.
    // React app runs on Vite dev server (port 5173)
    app.use(express.static('public'));
}

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/jobs', authenticate, rateLimiter, jobsRouter);

// Internal Routes (server-only, requires service key)
app.use('/internal/billing', billingRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
    console.log(`PDF Generator API Server running on port ${port}`);
    console.log('API Endpoints:');
    console.log(`  POST /api/v1/jobs - Create a PDF generation job`);
    console.log(`  GET /api/v1/jobs/:jobId - Get job status and result`);
    console.log(`  DELETE /api/v1/jobs/:jobId - Cancel a job`);
    console.log('\nWorker started and ready to process jobs');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received, closing server');
    await worker.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received, closing server');
    await worker.close();
    process.exit(0);
});
