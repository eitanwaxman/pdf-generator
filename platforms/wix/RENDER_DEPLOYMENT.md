# Wix Widget Deployment on Render.com

## ✅ Setup Complete!

Your project is now configured to automatically build and deploy the Wix widget when you push to Render.com.

## What Was Changed

### 1. Updated `package.json`
Added build scripts that automatically build the Wix components:
```json
"build": "vite build && npm run build:wix",
"build:wix": "npm run build:wix-widget && npm run build:wix-settings",
"build:wix-widget": "cd platforms/wix/widget && npm install && npm run build",
"build:wix-settings": "cd platforms/wix/settings-panel && npm install && npm run build"
```

### 2. Updated `app.js`
- ✅ Added Wix backend router import
- ✅ Added static file serving for widget and settings panel
- ✅ Mounted `/wix/api/generate-pdf` endpoint
- ✅ Updated route exclusions to prevent React SPA from catching Wix routes
- ✅ Added Wix endpoints to server startup logs

## Render.com Configuration

### Environment Variables Required

In your Render.com dashboard, add these environment variables:

```
NODE_ENV=production
PORT=3000
PDF_API_URL=http://localhost:3000/api/v1

# Your existing environment variables:
REDIS_URL=<your-redis-url>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
# ... etc
```

### Build & Start Commands

In Render.com service settings:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: 16.3.0 or higher

That's it! Render will automatically:
1. Install all dependencies (including Wix widget dependencies)
2. Build your React dashboard
3. Build the Wix widget
4. Build the Wix settings panel
5. Start the server with all routes configured

## After Deployment

Once deployed to docuskribe.com, your Wix widget files are accessible at:

```
https://www.docuskribe.com/wix/widget/dist/bundle.js
https://www.docuskribe.com/wix/settings-panel/dist/index.html
https://www.docuskribe.com/wix/api/generate-pdf
```

## Configure in Wix App Dashboard

1. Go to [Wix Custom Apps](https://manage.wix.com/account/custom-apps)
2. Create or select your app
3. Go to **Extensions** → **Create Extension** → **Site Widget (Custom Element)**
4. Configure:
   - **Widget Name**: PDF Generator Button
   - **Tag Name**: `pdf-generator-button`
   - **Script URL**: `https://www.docuskribe.com/wix/widget/dist/bundle.js`
   - **Settings Panel URL**: `https://www.docuskribe.com/wix/settings-panel/dist/index.html`

## Wix Secrets Manager Setup

For each site that installs your widget:

1. Site owner goes to Wix Dashboard → **Secrets Manager**
2. Click **Add Secret**
3. Set:
   - **Secret Name**: `PDF_API_KEY`
   - **Secret Value**: Their API key from your service (get from your dashboard)
4. Save

## Testing After Deployment

1. In Wix App Dashboard, click **Test App** → **Test on dev site**
2. Add the widget to a page
3. Configure settings
4. Preview and test PDF generation

## Troubleshooting

### Widget doesn't load
- Check: `https://www.docuskribe.com/wix/widget/dist/bundle.js` in browser
- Should return JavaScript code
- Check Render logs for build errors

### Settings panel blank
- Check: `https://www.docuskribe.com/wix/settings-panel/dist/index.html` in browser
- Should show the settings interface
- Check browser console for errors

### PDF generation fails
- Check Render logs for backend errors
- Verify API key in Wix Secrets Manager
- Test your main PDF API at `/api/v1/jobs`

### Build fails on Render
- Check Node version is 16.3.0+
- Verify all dependencies in platform/wix/*/package.json are accessible
- Check build logs for specific errors

## Local Testing

To test the integration locally before deploying:

```bash
# Build everything
npm run build

# Start server
npm start

# Visit in browser:
http://localhost:3000/wix/widget/dist/bundle.js
http://localhost:3000/wix/settings-panel/dist/index.html
```

## Deployment Checklist

Before deploying to Render.com:

- [ ] All changes committed to git
- [ ] Environment variables configured in Render dashboard
- [ ] Build and start commands set correctly
- [ ] Node version 16.3.0 or higher selected

After deployment:

- [ ] Widget script URL loads in browser
- [ ] Settings panel URL loads in browser
- [ ] API endpoint `/wix/api/generate-pdf` is accessible
- [ ] Widget configured in Wix App Dashboard
- [ ] Tested on Wix development site
- [ ] Site owners know to add API key to Secrets Manager

## URLs Summary

The widget is deployed at docuskribe.com with these URLs:

| Component | URL |
|-----------|-----|
| Widget Script | `https://www.docuskribe.com/wix/widget/dist/bundle.js` |
| Settings Panel | `https://www.docuskribe.com/wix/settings-panel/dist/index.html` |
| PDF Generation API | `https://www.docuskribe.com/wix/api/generate-pdf` |
| Job Status API | `https://www.docuskribe.com/wix/api/generate-pdf/:jobId` |

Use these URLs when configuring your widget in the Wix App Dashboard.

## Support

If you encounter issues:
1. Check Render deployment logs
2. Test each URL directly in browser
3. Review browser console for frontend errors
4. Check Wix App Dashboard configuration
5. Verify Secrets Manager setup on each site

