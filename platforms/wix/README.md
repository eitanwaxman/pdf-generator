# Wix PDF Generator Widget

A self-hosted Wix site widget that generates PDFs from web pages using a custom element button and settings panel.

## Project Structure

```
platforms/wix/
├── widget/              # Custom element (PDF button)
├── settings-panel/      # Settings UI for Wix Editor
└── backend/             # Backend service for API key management
```

## Deployment

### Quick Deployment to Render.com

✨ **Your project is now configured for automatic deployment!**

When you push to Render.com, the Wix widget and settings panel will automatically build and deploy.

See **[RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md)** for complete Render.com deployment instructions.

### Manual Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed deployment to other platforms.

## Setup Instructions

### 1. Install Dependencies

```bash
# Install widget dependencies
cd widget
npm install

# Install settings panel dependencies
cd ../settings-panel
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Build the Widget and Settings Panel

```bash
# Build widget
cd widget
npm run build

# Build settings panel
cd ../settings-panel
npm run build
```

### 3. Deploy

- Host `widget/dist/bundle.js` at a publicly accessible URL
- Host `settings-panel/dist/` at a publicly accessible URL
- Deploy backend service to your server

### 4. Configure in Wix App Dashboard

1. Go to [Wix Custom Apps](https://manage.wix.com/account/custom-apps)
2. Create new app or select existing app
3. Go to Extensions → Create Extension → Site Widget (Custom Element)
4. Configure:
   - **Widget Name**: PDF Generator Button
   - **Tag Name**: `pdf-generator-button`
   - **Script URL**: `https://your-server.com/wix/widget/dist/bundle.js`
   - **Settings Panel URL**: `https://your-server.com/wix/settings-panel/dist/index.html`

### 5. Configure Secrets (Site Owners)

Site owners need to add their PDF API key to Wix Secrets Manager:
1. Go to Wix Dashboard → Secrets Manager
2. Add new secret with name `PDF_API_KEY`
3. Paste their API key value

## Development

```bash
# Watch mode for widget
cd widget
npm run dev

# Watch mode for settings panel
cd settings-panel
npm run dev
```

## Architecture

- **Widget**: React-based custom element that displays a "Generate PDF" button
- **Settings Panel**: React + Wix Design System UI for configuring PDF options
- **Backend**: Express service that retrieves API keys from Wix Secrets Manager and calls PDF API

## Features

- ✅ Generate PDFs from current page or custom URL
- ✅ Configurable PDF format, margins, viewport
- ✅ Platform-specific optimizations (Wix)
- ✅ Screenshot generation support
- ✅ Upload PDFs to Wix Media Manager
- ✅ Automatic download to user's device
- ✅ Loading states and error handling

