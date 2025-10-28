require('dotenv').config();

const express = require('express');
const path = require('path');

// Middleware
const { authenticate } = require('./middleware/auth');
const { rateLimiter } = require('./middleware/rateLimiter');

// Routes
const jobsRouter = require('./routes/v1/jobs');

// Worker
const worker = require('./workers/pdfWorker');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend static files
app.use(express.static('public'));

// Static file serving for temporary PDFs
app.use('/temp', express.static('temp'));

// API Routes
app.use('/api/v1/jobs', authenticate, rateLimiter, jobsRouter);

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
