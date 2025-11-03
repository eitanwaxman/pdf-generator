# Wix Access Token Authentication with AppStrategy

## Overview

This document explains the **correct authentication approach** for the Wix PDF Generator Widget using access tokens and AppStrategy with elevated permissions.

**Reference**: Based on Wix's official backend authentication pattern for self-hosted apps.

---

## How It Works

### 1. Frontend Gets Access Token

The widget uses Wix SDK to get an access token:

```javascript
// platforms/wix/widget/src/index.js
import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

const APP_ID = 'b715943d-8922-43a5-8728-c77c19d77879';

this.wixClient = createClient({
  host: site.host({ applicationId: APP_ID }),
  auth: site.auth()
});

// Get access token asynchronously
this.accessToken = await this.wixClient.auth.getAccessToken();
```

### 2. Frontend Sends Access Token

The token is sent in the Authorization header:

```javascript
// platforms/wix/widget/src/PdfButton.jsx
const headers = {
  'Content-Type': 'application/json',
  'Authorization': config.accessToken
};

await fetch(backendUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify({ url, options })
});
```

### 3. Backend Decodes Token

The backend calls Wix's token-info endpoint to get the instance ID:

```javascript
// platforms/wix/backend/services/secrets.js
const response = await axios.post(
  'https://www.wixapis.com/oauth2/token-info',
  { token: accessToken }
);

const instanceId = response.data.instanceId;
```

### 4. Backend Uses AppStrategy

Creates an elevated client using AppStrategy:

```javascript
const { createClient, AppStrategy } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

const elevatedClient = createClient({
  auth: await AppStrategy({
    appId: APP_ID,
    appSecret: APP_SECRET,
    accessToken: accessToken
  }).elevated(),
  modules: { secrets }
});

const secret = await elevatedClient.secrets.getSecretValue('PDF_API_KEY');
```

---

## Complete Implementation

### Frontend: index.js

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import PdfButton from './PdfButton.jsx';
import './styles.css';
import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

class PdfGeneratorButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    this.accessToken = null;
    
    const APP_ID = 'b715943d-8922-43a5-8728-c77c19d77879';
    
    try {
      this.wixClient = createClient({
        host: site.host({ applicationId: APP_ID }),
        auth: site.auth()
      });
      console.log('Wix client initialized');
    } catch (err) {
      console.error('Failed to initialize Wix client:', err);
    }
  }

  async connectedCallback() {
    // Get access token asynchronously
    if (this.wixClient) {
      try {
        this.accessToken = await this.wixClient.auth.getAccessToken();
        console.log('Got Wix access token');
      } catch (err) {
        console.warn('Could not get access token:', err);
      }
    }
    
    this.updateConfig();
    this.render();
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  updateConfig() {
    this.config = {
      // ... other config ...
      accessToken: this.accessToken
    };
  }
}
```

### Frontend: PdfButton.jsx

```javascript
const generatePdf = async () => {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (config.accessToken) {
    headers['Authorization'] = config.accessToken;
    console.log('Sending authenticated request with access token');
  } else {
    console.warn('No access token available');
  }

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, options })
  });
};
```

### Backend: secrets.js

```javascript
const axios = require('axios');
const { createClient, AppStrategy } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

async function getInstanceIdFromToken(accessToken) {
  const response = await axios.post(
    'https://www.wixapis.com/oauth2/token-info',
    { token: accessToken }
  );
  
  return response.data.instanceId;
}

async function getApiKey(accessToken, secretName = 'PDF_API_KEY') {
  const APP_ID = process.env.WIX_APP_ID || 'b715943d-8922-43a5-8728-c77c19d77879';
  const APP_SECRET = process.env.WIX_APP_SECRET;
  
  if (!APP_SECRET) {
    throw new Error('WIX_APP_SECRET not configured');
  }

  // Decode token to get instance ID
  const instanceId = await getInstanceIdFromToken(accessToken);
  console.log('Instance ID:', instanceId);
  
  // Create elevated client
  const elevatedClient = createClient({
    auth: await AppStrategy({
      appId: APP_ID,
      appSecret: APP_SECRET,
      accessToken: accessToken
    }).elevated(),
    modules: { secrets }
  });

  // Get secret
  const secret = await elevatedClient.secrets.getSecretValue(secretName);
  
  if (!secret || !secret.value) {
    throw new Error(`Secret '${secretName}' not found`);
  }

  return secret.value;
}

module.exports = {
  getApiKey,
  getInstanceIdFromToken
};
```

### Backend: generate-pdf.js

```javascript
router.post('/', async (req, res) => {
  const { url, options } = req.body;
  
  // Get access token
  const accessToken = req.headers.authorization;
  if (!accessToken) {
    return res.status(401).json({ 
      error: 'Access token required'
    });
  }
  
  // Get API key using access token
  const apiKey = await getApiKey(accessToken);
  
  // Use API key to call PDF service
  // ...
});
```

---

## Environment Variables

```bash
# .env or Render.com Environment Variables
WIX_APP_ID=b715943d-8922-43a5-8728-c77c19d77879
WIX_APP_SECRET=your-app-secret-from-wix-dashboard
```

**Where to get these:**
1. Go to [Wix App Dashboard](https://manage.wix.com/account/custom-apps)
2. Select your app
3. **App ID**: Visible in app details
4. **App Secret**: Go to OAuth page

---

## Dependencies

### Widget (package.json)

```json
{
  "dependencies": {
    "@wix/sdk": "^1.12.0",
    "@wix/site": "^1.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

### Backend (package.json)

```json
{
  "dependencies": {
    "@wix/sdk": "^1.12.0",
    "@wix/secrets": "^1.0.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0"
  }
}
```

---

## Why AppStrategy with Elevated Permissions?

### Without AppStrategy (Doesn't Work):
```javascript
// ❌ Regular client - no permissions to access Secrets Manager
const client = createClient({
  auth: { getAuthHeaders: () => ({ Authorization: accessToken }) },
  modules: { secrets }
});
// Will fail with permission errors
```

### With AppStrategy (Correct):
```javascript
// ✅ Elevated client - has permissions
const elevatedClient = createClient({
  auth: await AppStrategy({
    appId: APP_ID,
    appSecret: APP_SECRET,
    accessToken: accessToken
  }).elevated(),
  modules: { secrets }
});
// Works! Has elevated permissions
```

**Key Point**: AppStrategy with `.elevated()` gives your backend the necessary permissions to access Secrets Manager.

---

## Authentication Flow

```
┌────────────────────────────────────────────────────────┐
│ 1. Wix Site                                            │
│    - Widget loads with Wix SDK                         │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ 2. Frontend (Custom Element)                           │
│    - wixClient.auth.getAccessToken()                   │
│    - Returns access token for this site               │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ POST with Authorization: {accessToken}
                 v
┌────────────────────────────────────────────────────────┐
│ 3. Backend API                                         │
│    - Receives access token                             │
│    - Calls Wix token-info API                          │
│    - Gets instanceId from token                        │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ 4. Backend with AppStrategy                            │
│    - Creates elevated client                           │
│    - Uses app ID + secret + access token              │
│    - Gets elevated permissions                         │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ 5. Wix Secrets Manager                                 │
│    - Elevated client accesses secrets                  │
│    - Returns PDF_API_KEY for this site                │
└────────────────┬───────────────────────────────────────┘
                 │
                 v
┌────────────────────────────────────────────────────────┐
│ 6. PDF Generation                                      │
│    - Backend uses API key                              │
│    - Calls PDF service                                 │
│    - Returns PDF to user                               │
└────────────────────────────────────────────────────────┘
```

---

## Security

✅ **Access Token from Wix** - Issued by Wix, validated by Wix  
✅ **AppStrategy Elevated** - Backend has proper permissions  
✅ **Per-Site Secrets** - Each site's Secrets Manager is isolated  
✅ **App Secret Secure** - Only backend knows the app secret  
✅ **No Frontend Secrets** - API keys never exposed to frontend  

---

## Testing

### Check Frontend Console:
```
Wix client initialized
Got Wix access token
Sending authenticated request with access token
```

### Check Backend Logs:
```
Instance ID from token: {instanceId}
Accessing Secrets Manager for instance: {instanceId}
Successfully retrieved API key for instance: {instanceId}
```

---

## Common Errors

### "Could not get access token"
**Cause**: Widget not properly embedded in Wix  
**Fix**: Make sure widget is accessed through Wix editor/site

### "Failed to decode access token"
**Cause**: Invalid token or network error  
**Fix**: Check token is valid, network can reach Wix APIs

### "WIX_APP_SECRET not configured"
**Cause**: Environment variable not set  
**Fix**: Add to `.env` or hosting platform

### "Secret 'PDF_API_KEY' not found"
**Cause**: Site owner hasn't added secret  
**Fix**: Site owner adds in Wix Dashboard → Secrets Manager

---

## Summary

This approach:
- ✅ Uses official Wix SDK methods
- ✅ Leverages AppStrategy for elevated permissions
- ✅ Properly accesses Secrets Manager
- ✅ Maintains security and per-site isolation
- ✅ Works reliably on Wix sites

This is the **correct and recommended** way to authenticate self-hosted Wix apps! 🎉

