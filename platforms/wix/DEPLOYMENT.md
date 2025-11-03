# Wix PDF Generator Widget - Deployment Guide

## Overview

This guide covers deploying the Wix PDF Generator widget to your server and configuring it in the Wix App Dashboard.

## Architecture

The widget consists of three components:
1. **Widget** - Custom element (button) displayed on Wix sites
2. **Settings Panel** - Configuration UI in Wix Editor
3. **Backend** - API endpoint for PDF generation with Secrets Manager integration

## Prerequisites

- Node.js 16+ installed
- Your PDF API service running (from root directory)
- A Wix app created in the [Wix App Dashboard](https://manage.wix.com/account/custom-apps)
- A web server to host the widget and settings panel files

## Step 1: Build the Widget and Settings Panel

```bash
# Build widget
cd platforms/wix/widget
npm install
npm run build

# Build settings panel  
cd ../settings-panel
npm install
npm run build
```

This generates:
- `platforms/wix/widget/dist/bundle.js` - Widget JavaScript
- `platforms/wix/settings-panel/dist/` - Settings panel HTML and assets

## Step 2: Deploy Static Files

Upload the built files to a publicly accessible web server:

### Option A: Same Server as PDF API

If hosting on the same server as your PDF API, serve the files:

```bash
# Add to your Express app (app.js)
app.use('/wix/widget/dist', express.static('platforms/wix/widget/dist'));
app.use('/wix/settings-panel/dist', express.static('platforms/wix/settings-panel/dist'));
```

Your URLs will be:
- Widget: `https://your-domain.com/wix/widget/dist/bundle.js`
- Settings: `https://your-domain.com/wix/settings-panel/dist/index.html`

### Option B: Separate CDN/Static Host

Upload files to:
- AWS S3
- Netlify
- Vercel
- GitHub Pages
- Any CDN

Ensure CORS is enabled for `*.wix.com`, `*.editorx.com`, and `*.wixsite.com`.

## Step 3: Deploy Backend

### Option A: Integrate with Existing PDF API (Recommended)

Add to your existing `app.js`:

```javascript
// Import the Wix backend router
const wixPdfRouter = require('./platforms/wix/backend');

// Mount the router
app.use('/wix/api/generate-pdf', wixPdfRouter);
```

This adds two endpoints:
- `POST /wix/api/generate-pdf` - Generate PDF
- `GET /wix/api/generate-pdf/:jobId` - Check job status

### Option B: Standalone Backend Server

Run the backend separately:

```bash
cd platforms/wix/backend
npm install
node server.js
```

Set environment variable:
```bash
# If running standalone, set PDF API URL
export PDF_API_URL=http://localhost:3000/api/v1
export WIX_BACKEND_PORT=3001
```

## Step 4: Configure in Wix App Dashboard

1. Go to [Wix Custom Apps](https://manage.wix.com/account/custom-apps)

2. Create new app or select existing app

3. Navigate to **Extensions** → **Create Extension** → **Site Widget (Custom Element)**

4. Configure the widget:
   - **Widget Name**: `PDF Generator Button`
   - **Tag Name**: `pdf-generator-button`
   - **Script URL**: `https://your-domain.com/wix/widget/dist/bundle.js`
   
5. Set widget sizing:
   - **Widget Width**: Adjustable, default 200px
   - **Widget Height**: Fixed, default 40px

6. Configure placement:
   - **Placement**: Can be added via Add Elements panel
   - ✅ Display in Add Elements panel

7. Configure action bar:
   - **Settings Panel URL**: `https://your-domain.com/wix/settings-panel/dist/index.html`

8. Click **Save**

## Step 5: Configure Secrets Manager

For each Wix site that installs your app:

1. Site owner goes to their Wix Dashboard
2. Navigate to **Settings** → **Secrets Manager**
3. Click **Add Secret**
4. Set:
   - **Secret Name**: `PDF_API_KEY`
   - **Secret Value**: Their PDF API key (from your PDF service)
5. Save

## Step 6: Test the Widget

1. In Wix App Dashboard, click **Test App** → **Test on dev site**
2. Select or create a development site
3. Open the site in the Editor
4. Add the PDF Generator widget from the Add Elements panel
5. Click the widget's Settings button to configure options
6. Preview the site and test PDF generation

## Environment Variables

### Backend

Create `.env` file in `platforms/wix/backend/`:

```bash
# PDF API base URL (default: http://localhost:3000/api/v1)
PDF_API_URL=https://your-pdf-api.com/api/v1

# Backend port (if running standalone, default: 3001)
WIX_BACKEND_PORT=3001

# Secret name in Wix Secrets Manager (default: PDF_API_KEY)
SECRET_NAME=PDF_API_KEY
```

## Integration with Main App

To integrate the Wix backend with your existing Express app:

```javascript
// app.js
const express = require('express');
const wixPdfRouter = require('./platforms/wix/backend');

const app = express();

// ... your existing middleware ...

// Serve widget static files
app.use('/wix/widget/dist', express.static('platforms/wix/widget/dist'));
app.use('/wix/settings-panel/dist', express.static('platforms/wix/settings-panel/dist'));

// Mount Wix PDF generation endpoint
app.use('/wix/api/generate-pdf', wixPdfRouter);

// ... your existing routes ...

app.listen(3000, () => {
  console.log('Server running on port 3000');
  console.log('Wix widget available at /wix/widget/dist/bundle.js');
  console.log('Wix settings available at /wix/settings-panel/dist/index.html');
});
```

## Troubleshooting

### Widget not loading

- Check browser console for errors
- Verify Script URL is publicly accessible
- Check CORS headers allow Wix domains
- Ensure bundle.js is being served correctly

### Settings panel not appearing

- Verify Settings Panel URL is correct
- Check that index.html is being served
- Open URL directly in browser to test

### PDF generation fails

- Check backend logs
- Verify API key is in Wix Secrets Manager with correct name
- Test PDF API directly with curl
- Check network tab for failed requests

### Secrets Manager errors

- Ensure `@wix/secrets` package is installed
- Verify secret name matches exactly (case-sensitive)
- Check that site owner has added the secret
- Review Wix SDK authentication setup

## Production Checklist

- [ ] Widget and settings panel built and deployed
- [ ] Backend integrated with PDF API
- [ ] Static files served with proper CORS headers
- [ ] HTTPS enabled for all endpoints
- [ ] Environment variables configured
- [ ] Widget configured in Wix App Dashboard
- [ ] Tested on development site
- [ ] Documentation provided to site owners about Secrets Manager
- [ ] Error handling tested
- [ ] Performance tested with real PDFs

## Support

For issues:
1. Check backend logs
2. Check browser console
3. Test PDF API independently
4. Verify Wix Secrets Manager configuration
5. Review Wix App Dashboard configuration

## URLs Summary

After deployment, you'll have:

- **Widget Script**: `https://your-domain.com/wix/widget/dist/bundle.js`
- **Settings Panel**: `https://your-domain.com/wix/settings-panel/dist/index.html`
- **PDF Generation API**: `https://your-domain.com/wix/api/generate-pdf`
- **Job Status API**: `https://your-domain.com/wix/api/generate-pdf/:jobId`

These URLs are what you'll configure in the Wix App Dashboard.

