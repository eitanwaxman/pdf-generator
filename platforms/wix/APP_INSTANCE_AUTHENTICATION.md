# Wix App Instance Authentication

## Overview

This document explains the **app instance authentication** approach for the Wix PDF Generator Widget, which is the official method for self-hosted Wix apps.

**Reference**: [Authenticate Incoming Requests to Your Self-Hosted Backend](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/wix-cli/app-development/authenticate-incoming-requests-to-your-self-hosted-backend)

---

## Why App Instance Authentication?

According to Wix's documentation, self-hosted apps should use the **app instance object** for authentication, not OAuth tokens. This approach:

✅ **Simpler** - No OAuth flow required  
✅ **Automatic** - Wix injects the instance parameter automatically  
✅ **Secure** - Signed with your app's secret key  
✅ **Per-Site** - Each site has a unique instance ID  

---

## How It Works

### 1. Wix Adds Instance to URL

When your widget loads on a Wix site, Wix automatically adds an `instance` query parameter:

```
https://site.com/page?instance={signature}.{encoded_data}
```

The instance is a signed string with two parts:
- **Signature**: HMAC-SHA256 hash signed with your app secret
- **Encoded Data**: Base64-encoded JSON with site info

### 2. Widget Retrieves Instance

The widget extracts the instance from URL parameters:

```javascript
// platforms/wix/widget/src/index.js
getAppInstance() {
  const params = new URLSearchParams(window.location.search);
  return params.get('instance') || null;
}
```

### 3. Widget Sends Instance to Backend

The instance is sent in the `Authorization` header:

```javascript
// platforms/wix/widget/src/PdfButton.jsx
const headers = {
  'Content-Type': 'application/json',
  'Authorization': config.appInstance  // The signed instance
};

await fetch(backendUrl, {
  method: 'POST',
  headers,
  body: JSON.stringify({ url, options })
});
```

### 4. Backend Validates Instance

The backend validates the signature and extracts data:

```javascript
// platforms/wix/backend/services/secrets.js
function parseInstance(instance, appSecret) {
  const [signature, encodedData] = instance.split('.');
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(encodedData)
    .digest('base64url');
    
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  // Decode and parse data
  const decodedData = Buffer.from(encodedData, 'base64url').toString('utf-8');
  return JSON.parse(decodedData);
}
```

### 5. Backend Accesses Secrets Manager

Using the validated instance, the backend accesses the site's Secrets Manager:

```javascript
const wixClient = createClient({
  auth: {
    getAuthHeaders: () => ({ Authorization: appInstanceString })
  },
  modules: { secrets }
});

const secret = await wixClient.secrets.getSecretValue('PDF_API_KEY');
```

---

## Instance Data Structure

The decoded instance contains:

```json
{
  "instanceId": "unique-instance-id",
  "uid": "user-id-if-logged-in",
  "permissions": "OWNER",
  "demoMode": false,
  "siteOwnerId": "site-owner-id",
  "vendorProductId": "app-product-id",
  "aid": "app-id"
}
```

Key fields:
- **`instanceId`**: Unique identifier for this site installation
- **`uid`**: Current user ID (if logged in)
- **`siteOwnerId`**: The site owner's ID

---

## Implementation

### Frontend: index.js

```javascript
class PdfGeneratorButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    
    // Get app instance from URL
    this.appInstance = this.getAppInstance();
    
    if (this.appInstance) {
      console.log('Wix app instance found');
    } else {
      console.warn('No app instance - not on Wix site');
    }
  }

  getAppInstance() {
    const params = new URLSearchParams(window.location.search);
    return params.get('instance') || null;
  }

  updateConfig() {
    this.config = {
      // ... other config ...
      appInstance: this.appInstance  // Pass to component
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
  
  if (config.appInstance) {
    headers['Authorization'] = config.appInstance;
    console.log('Sending authenticated request');
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
const crypto = require('crypto');

function parseInstance(instance, appSecret) {
  const [signature, encodedData] = instance.split('.');
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(encodedData)
    .digest('base64url');
    
  if (signature !== expectedSignature) {
    throw new Error('Invalid signature');
  }
  
  // Decode data
  const decodedData = Buffer.from(encodedData, 'base64url').toString('utf-8');
  return JSON.parse(decodedData);
}

async function getApiKey(appInstanceString, secretName = 'PDF_API_KEY') {
  const APP_SECRET = process.env.WIX_APP_SECRET;
  
  // Validate instance
  const instanceData = parseInstance(appInstanceString, APP_SECRET);
  console.log('Instance validated:', instanceData.instanceId);
  
  // Access Secrets Manager
  const wixClient = createClient({
    auth: {
      getAuthHeaders: () => ({ Authorization: appInstanceString })
    },
    modules: { secrets }
  });
  
  const secret = await wixClient.secrets.getSecretValue(secretName);
  return secret.value;
}
```

### Backend: generate-pdf.js

```javascript
router.post('/', async (req, res) => {
  const { url, options } = req.body;
  
  // Get app instance from header
  const appInstance = req.headers.authorization;
  if (!appInstance) {
    return res.status(401).json({ 
      error: 'App instance required'
    });
  }
  
  // Get API key using instance
  const apiKey = await getApiKey(appInstance);
  
  // Use API key to call PDF service
  // ...
});
```

---

## Configuration Required

### 1. Get Your App Secret

1. Go to [Wix App Dashboard](https://manage.wix.com/account/custom-apps)
2. Select your app
3. Go to **OAuth** page
4. Copy your **App Secret Key**

⚠️ **Important**: Keep this secret secure! Never commit it to version control.

### 2. Add to Environment Variables

```bash
# .env (local development)
WIX_APP_SECRET=your-app-secret-here

# Render.com (production)
# Add as environment variable in dashboard:
WIX_APP_SECRET=your-app-secret-here
```

### 3. Site Owners Add API Key

Each site owner needs to add their PDF API key:

1. Wix Dashboard → **Settings** → **Secrets Manager**
2. Click **Add Secret**
3. Name: `PDF_API_KEY`
4. Value: Their Docuskribe API key

---

## Security Benefits

### ✅ Cryptographic Verification
- Instance is signed with HMAC-SHA256
- Backend verifies signature before processing
- Prevents tampering or forgery

### ✅ Per-Site Isolation
- Each site has unique `instanceId`
- Secrets Manager isolated per site
- Sites cannot access each other's secrets

### ✅ No Frontend Secrets
- App secret never exposed to frontend
- Only backend can validate instances
- API keys retrieved server-side only

### ✅ Automatic by Wix
- No OAuth flow to implement
- Wix handles instance injection
- Works seamlessly in editor and live sites

---

## Testing

### Local Testing

For local testing without Wix, you can:

1. **Mock the instance** (for development only):
```javascript
// For testing only - don't use in production!
if (!this.appInstance && process.env.NODE_ENV === 'development') {
  this.appInstance = 'test-instance';
}
```

2. **Use ngrok** to test with real Wix:
```bash
ngrok http 3000
# Use ngrok URL in Wix App Dashboard
```

### Production Testing

1. Deploy to Docuskribe
2. Configure widget in Wix App Dashboard
3. Install on test Wix site
4. Add API key to Secrets Manager
5. Test PDF generation

---

## Error Handling

### Common Errors

**Error**: "App instance required"
- **Cause**: Widget not sending instance
- **Fix**: Check URL has `?instance=...` parameter

**Error**: "Invalid signature"
- **Cause**: Wrong app secret or corrupted instance
- **Fix**: Verify `WIX_APP_SECRET` matches Wix dashboard

**Error**: "Secret 'PDF_API_KEY' not found"
- **Cause**: Site owner hasn't added secret
- **Fix**: Guide site owner to add in Secrets Manager

**Error**: "WIX_APP_SECRET not configured"
- **Cause**: Environment variable not set
- **Fix**: Add to `.env` or hosting platform

---

## Migration from OAuth Approach

If you previously implemented OAuth authentication:

### Remove These:
- ❌ `@wix/sdk` from widget dependencies
- ❌ `@wix/site` from widget dependencies
- ❌ `createClient` with `site.host()` and `site.auth()`
- ❌ `getAccessToken()` calls
- ❌ `setAccessToken()` method

### Add These:
- ✅ `getAppInstance()` from URL parameters
- ✅ Send instance in `Authorization` header
- ✅ Backend `parseInstance()` function
- ✅ `WIX_APP_SECRET` environment variable

---

## References

- [Authenticate Incoming Requests (Official Wix Docs)](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/wix-cli/app-development/authenticate-incoming-requests-to-your-self-hosted-backend)
- [About App Instances](https://dev.wix.com/docs/build-apps/developer-tools/cli/wix-cli-for-apps/app-structure#app-instances)
- [Parse the Encoded App Instance](https://dev.wix.com/docs/build-apps/developer-tools/cli/wix-cli-for-apps/app-structure#parse-the-encoded-app-instance-parameter)
- [Wix Secrets Manager](https://dev.wix.com/docs/sdk/api-reference/secrets/secrets/get-secret-value)

---

## Summary

The app instance authentication approach is:

✅ **Recommended by Wix** for self-hosted apps  
✅ **Simpler than OAuth** - no token management  
✅ **Automatic** - Wix handles instance injection  
✅ **Secure** - cryptographically signed  
✅ **Production-ready** - used by all Wix self-hosted apps  

This is the official, supported way to authenticate self-hosted Wix apps! 🎉

