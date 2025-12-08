require('dotenv').config();

const express = require('express');
const path = require('path');

// Middleware
const { authenticate } = require('./middleware/auth');
const { authenticateFlexible } = require('./middleware/publicAuth');
const { rateLimiter } = require('./middleware/rateLimiter');

// Routes
const jobsRouter = require('./routes/v1/jobs');
const authRouter = require('./routes/v1/auth');
const userRouter = require('./routes/v1/user');
const publicKeysRouter = require('./routes/v1/public-keys');
const billingRouter = require('./routes/internal/billing');
const stripeWebhookRouter = require('./routes/webhooks/stripe');

// Worker
const worker = require('./workers/pdfWorker');

const app = express();
const port = process.env.PORT || 3000;

// CORS configuration
// - Secret key APIs: NO CORS allowed (server-only access)
// - Public key APIs: CORS only for origins in user's allow list
// - Public auth routes: CORS allowed from any origin
app.use(async (req, res, next) => {
    const origin = req.headers.origin;
    
    // Routes that can use public keys (CORS only for allowed origins)
    const publicKeyRoutes = [
        '/api/v1/jobs'  // Jobs API supports both public and secret keys
    ];
    
    // Public auth routes (no authentication, CORS from any origin)
    const publicAuthRoutes = [
        '/api/v1/auth/register',
        '/api/v1/auth/login',
        '/api/v1/auth/magic-link'
    ];
    
    const isPublicKeyRoute = publicKeyRoutes.some(route => req.path.startsWith(route));
    const isPublicAuthRoute = publicAuthRoutes.some(route => req.path.startsWith(route));
    const isStaticFile = req.path.startsWith('/cdn') || 
                         req.path.startsWith('/wix') || 
                         req.path.startsWith('/temp');
    
    // For public key routes, validate origin against user's allow list
    if (isPublicKeyRoute && origin) {
        const publicKey = req.headers['x-public-key'] || req.headers['X-Public-Key'];
        
        if (publicKey) {
            // Validate origin by checking public key's authorized domains
            const { validatePublicKeyOrigin } = require('./services/publicApiKeyService');
            const isOriginAllowed = await validatePublicKeyOrigin(publicKey.trim(), origin);
            
            if (isOriginAllowed) {
                res.header('Access-Control-Allow-Origin', origin);
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, X-Public-Key');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            }
            // If origin not allowed, no CORS headers = browser blocks request
        }
        // If no public key in headers, don't set CORS (will be handled by auth middleware)
    } else if (isPublicAuthRoute || isStaticFile) {
        // Public auth routes and static files: allow CORS from any origin
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, X-Public-Key');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    }
    // For secret key APIs (user, public-keys, internal routes): NO CORS headers
    // This prevents any cross-origin access to secret key endpoints
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// IMPORTANT: Webhook route MUST be registered BEFORE body-parser middleware
// Stripe webhooks require raw body for signature verification
app.use('/webhooks', stripeWebhookRouter);

// Middleware with body size limits to prevent DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Static file serving for temporary PDFs
app.use('/temp', express.static('temp'));

// Serve Wix widget files (specific paths only, not the entire /wix route)
app.use('/wix/widget/dist', express.static('platforms/wix/widget/dist'));
app.use('/wix/settings-panel/dist', express.static('platforms/wix/settings-panel/dist'));

// Serve generic widget CDN files with cache headers
app.use('/cdn/widget', express.static('platforms/generic/widget/dist', {
    maxAge: '1h',
    etag: true,
    setHeaders: (res, filePath) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        // Temporarily disable caching for bundle.js to force fresh load after fix
        if (filePath.endsWith('bundle.js')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// Serve SEO files from public directory (robots.txt, sitemap.xml, manifest.json)
app.use(express.static('public', {
    setHeaders: (res, filePath) => {
        // Set appropriate content types for SEO files
        if (filePath.endsWith('robots.txt')) {
            res.setHeader('Content-Type', 'text/plain');
        } else if (filePath.endsWith('sitemap.xml')) {
            res.setHeader('Content-Type', 'application/xml');
        } else if (filePath.endsWith('manifest.json')) {
            res.setHeader('Content-Type', 'application/manifest+json');
        }
    }
}));

// Serve React app (production build)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    // Serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
        // Skip SEO files and API routes
        // Only exclude specific static file paths under /wix, not all /wix routes
        if (req.path.startsWith('/api') || 
            req.path.startsWith('/temp') || 
            req.path.startsWith('/wix/widget/dist') ||
            req.path.startsWith('/wix/settings-panel/dist') ||
            req.path.startsWith('/cdn') ||
            req.path === '/robots.txt' ||
            req.path === '/sitemap.xml' ||
            req.path === '/manifest.json') {
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
app.use('/api/v1/public-keys', publicKeysRouter);
app.use('/api/v1/jobs', authenticateFlexible, rateLimiter, jobsRouter);

// Internal Routes (server-only, requires service key)
app.use('/internal/billing', billingRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
    console.log(`Docuskribe API Server running on port ${port}`);
    console.log('API Endpoints:');
    console.log(`  POST /api/v1/jobs - Create a PDF generation job`);
    console.log(`  GET /api/v1/jobs/:jobId - Get job status and result`);
    console.log(`  DELETE /api/v1/jobs/:jobId - Cancel a job`);
    console.log('\nWix Widget Files:');
    console.log(`  Widget: /wix/widget/dist/bundle.js`);
    console.log(`  Settings: /wix/settings-panel/dist/index.html`);
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
