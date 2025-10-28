const http = require('http');
const path = require('path');

class TestServer {
    constructor(port = 8888) {
        this.port = port;
        this.server = null;
        this.routes = {};
    }

    start() {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.listen(this.port, () => {
                console.log(`Test server started on http://localhost:${this.port}`);
                resolve();
            });

            this.server.on('error', reject);
        });
    }

    stop() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Test server stopped');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    handleRequest(req, res) {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const pathname = url.pathname;
        const queryParams = Object.fromEntries(url.searchParams);

        // Handle different test scenarios
        if (pathname === '/small') {
            this.sendSmallPage(res, queryParams);
        } else if (pathname === '/large') {
            this.sendLargePage(res, queryParams);
        } else if (pathname === '/slow') {
            this.sendSlowPage(res, queryParams);
        } else if (pathname === '/slow-assets') {
            this.sendSlowAssetsPage(res, queryParams);
        } else if (pathname === '/assets/image.png') {
            this.sendImage(res, queryParams);
        } else if (pathname === '/assets/style.css') {
            this.sendCSS(res, queryParams);
        } else if (pathname === '/assets/script.js') {
            this.sendJS(res, queryParams);
        } else {
            // Default route
            this.sendSmallPage(res, queryParams);
        }
    }

    sendSmallPage(res, queryParams) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Small Test Page</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .content { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="content">
        <h1>Small Test Page</h1>
        <p>This is a simple test page with minimal content.</p>
        <p>Generated for load testing purposes.</p>
    </div>
</body>
</html>
        `);
    }

    sendLargePage(res, queryParams) {
        // Generate a large HTML page with lots of content
        const paragraph = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);
        const section = `
            <section style="margin: 20px 0;">
                <h2>Section ${Math.floor(Math.random() * 100)}</h2>
                ${paragraph}
            </section>
        `;
        const sections = section.repeat(100);

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Large Test Page</title>
    <style>
        body { font-family: Arial; padding: 20px; line-height: 1.6; }
        .content { max-width: 800px; margin: 0 auto; }
        section { padding: 10px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="content">
        <h1>Large Test Page</h1>
        <p>This page contains a lot of content to test memory usage and rendering performance.</p>
        ${sections}
    </div>
</body>
</html>
        `);
    }

    sendSlowPage(res, queryParams) {
        // Simulate slow page load
        const delay = parseInt(queryParams.delay) || 3000;

        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Slow Loading Page</title>
    <style>
        body { font-family: Arial; padding: 20px; }
        .content { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="content">
        <h1>Slow Loading Page</h1>
        <p>This page took ${delay}ms to load.</p>
        <p>This simulates a slow-loading website.</p>
    </div>
</body>
</html>
            `);
        }, delay);
    }

    sendSlowAssetsPage(res, queryParams) {
        const delay = parseInt(queryParams.delay) || 2000;
        
        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Page with Slow Assets</title>
    <link rel="stylesheet" href="/assets/style.css?delay=${delay}">
    <script src="/assets/script.js?delay=${delay}"></script>
</head>
<body>
    <div class="content">
        <h1>Page with Slow Assets</h1>
        <p>This page has CSS and JS assets that load slowly.</p>
        <img src="/assets/image.png?delay=${delay}" alt="Slow loading image">
    </div>
</body>
</html>
            `);
        }, 100);
    }

    sendImage(res, queryParams) {
        const delay = parseInt(queryParams.delay) || 2000;
        
        setTimeout(() => {
            // Simple red 1x1 PNG in base64
            const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
            res.writeHead(200, { 
                'Content-Type': 'image/png',
                'Content-Length': png.length
            });
            res.end(png);
        }, delay);
    }

    sendCSS(res, queryParams) {
        const delay = parseInt(queryParams.delay) || 2000;
        
        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(`
/* Slow-loading stylesheet */
body {
    background-color: #f0f0f0;
    font-family: Arial, sans-serif;
}
.content {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}
            `);
        }, delay);
    }

    sendJS(res, queryParams) {
        const delay = parseInt(queryParams.delay) || 2000;
        
        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            res.end(`
// Slow-loading JavaScript
console.log('Slow-loading script executed');
            `);
        }, delay);
    }
}

module.exports = TestServer;

