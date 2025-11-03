# Wix Widget Authentication Implementation

## Overview

This document explains how the Wix PDF Generator Widget implements proper authentication with Wix's Site context and Secrets Manager.

## Architecture

### Frontend (Custom Element)

The widget uses **Wix Client** with **Site host context** and **Site authentication** to:
1. Authenticate with the Wix platform
2. Get an access token that identifies the specific site instance
3. Pass this token to the backend for Secrets Manager access

### Backend (API)

The backend receives the access token and uses it to:
1. Identify which Wix site is making the request
2. Access that specific site's Secrets Manager
3. Retrieve the PDF API key for that site

## Why This Is Necessary

According to [Wix's documentation](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/self-hosting/supported-extensions/site-extensions/site-widgets-and-plugins/identify-the-app-instance-in-a-self-hosted-site-widget):

> For security reasons, app instance ID (`instanceId`) isn't directly accessible in site widgets or settings panels. Instead, you can securely extract it by sending a Wix access token to a backend API.

This ensures:
- ✅ Each site has its own API key in its Secrets Manager
- ✅ The widget can only access its own site's secrets
- ✅ Security is maintained across multiple site installations

---

## Implementation Details

### 1. Frontend: Custom Element Initialization

**File**: `platforms/wix/widget/src/index.js`

```javascript
import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

class PdfGeneratorButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    
    // Initialize Wix Client with Site host context and Site authentication
    this.wixClient = createClient({
      host: site.host(),
      auth: site.auth()
    });
    
    // Provide function for Wix to inject access token
    this.setAccessToken = (token) => {
      this.wixClient = createClient({
        host: site.host(),
        auth: site.auth({ accessToken: token })
      });
    };
  }
}
```

**Key Points**:
- Creates a Wix Client using `site.host()` and `site.auth()`
- Provides `setAccessToken` method that Wix calls to inject the access token
- Client is authenticated for the specific site instance

---

### 2. Frontend: Getting Access Token

**File**: `platforms/wix/widget/src/PdfButton.jsx`

```javascript
const generatePdf = async () => {
  // Get Wix access token for backend authentication
  let accessToken = null;
  if (config.wixClient) {
    try {
      accessToken = await config.wixClient.auth.getAccessToken();
      console.log('Got Wix access token');
    } catch (err) {
      console.warn('Could not get Wix access token:', err);
    }
  }
  
  // Prepare headers with access token
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (accessToken) {
    headers['Authorization'] = accessToken;
  }
  
  // Call backend API with authorization header
  const response = await fetch(backendUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url, options })
  });
}
```

**Key Points**:
- Gets access token from `wixClient.auth.getAccessToken()`
- Passes token in `Authorization` header
- Token identifies the specific Wix site making the request

---

### 3. Backend: Receiving Access Token

**File**: `platforms/wix/backend/api/generate-pdf.js`

```javascript
router.post('/', async (req, res) => {
  try {
    const { url, options } = req.body;
    
    // Get Wix access token from Authorization header
    const accessToken = req.headers.authorization;
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Wix authorization token required' 
      });
    }
    
    // Get API key from Wix Secrets Manager using the access token
    const apiKey = await getApiKey(accessToken);
    
    // Use apiKey to call PDF API...
  } catch (error) {
    // Handle errors...
  }
});
```

**Key Points**:
- Extracts access token from `Authorization` header
- Returns 401 if token is missing
- Passes token to `getApiKey` function

---

### 4. Backend: Accessing Secrets Manager

**File**: `platforms/wix/backend/services/secrets.js`

```javascript
const { createClient } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

async function getApiKey(accessToken, secretName = 'PDF_API_KEY') {
  try {
    // Create a Wix client using the access token from the frontend
    // This allows us to access the correct site instance's Secrets Manager
    const wixClient = createClient({
      auth: {
        getAuthHeaders: () => ({ Authorization: accessToken })
      },
      modules: { secrets }
    });
    
    // Get the secret value from the site's Secrets Manager
    const secret = await wixClient.secrets.getSecretValue(secretName);
    
    if (!secret || !secret.value) {
      throw new Error(`Secret '${secretName}' not found in Secrets Manager`);
    }
    
    return secret.value;
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
}
```

**Key Points**:
- Creates Wix client with the access token for authentication
- Uses `secrets.getSecretValue()` to retrieve the secret
- Token ensures we access the correct site's Secrets Manager
- Returns the `secret.value` property

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Wix Site                                                 │
│    Widget loads on site                                     │
│    Wix injects access token via setAccessToken()           │
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend (Custom Element)                                │
│    - wixClient.auth.getAccessToken()                        │
│    - Returns token specific to this site instance          │
└───────────────┬─────────────────────────────────────────────┘
                │
                │ POST /wix/api/generate-pdf
                │ Authorization: {accessToken}
                v
┌─────────────────────────────────────────────────────────────┐
│ 3. Backend (Express API)                                    │
│    - Receives Authorization header                          │
│    - Passes token to getApiKey(accessToken)                 │
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ 4. Wix Secrets Manager                                      │
│    - Backend creates Wix client with access token          │
│    - Token identifies site instance                         │
│    - secrets.getSecretValue('PDF_API_KEY')                  │
│    - Returns API key for THIS site                          │
└───────────────┬─────────────────────────────────────────────┘
                │
                v
┌─────────────────────────────────────────────────────────────┐
│ 5. PDF Generation API                                       │
│    - Backend calls with retrieved API key                   │
│    - PDF generates and returns to user                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Benefits

### 1. **Per-Site API Keys**
- Each Wix site stores its own API key in its own Secrets Manager
- Sites cannot access each other's API keys
- Multi-tenant security built-in

### 2. **Token-Based Authentication**
- Access tokens identify the specific site instance
- Tokens are issued by Wix and validated by Wix SDK
- No need to manually manage instance IDs

### 3. **Server-Side Secret Access**
- API keys never exposed to frontend code
- Secrets only accessible via authenticated backend requests
- Follows security best practices

### 4. **Automatic Instance Resolution**
- Access token contains instance information
- Wix SDK automatically resolves to correct site
- No manual instance management required

---

## Required Dependencies

### Frontend (widget/package.json)

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

### Backend (backend/package.json)

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

## Testing Authentication

### 1. Verify Token Generation

In browser console (on Wix site):
```javascript
// This should log the access token
console.log('Access token received:', accessToken);
```

### 2. Verify Backend Receives Token

In backend logs:
```javascript
// Should see this when API is called
console.log('Authorization header:', req.headers.authorization);
```

### 3. Verify Secrets Manager Access

In backend logs:
```javascript
// Should see this when secret is retrieved
console.log('Successfully retrieved API key from Wix Secrets Manager');
```

### 4. Test Error Cases

- **No token**: Should return 401 error
- **Invalid token**: Should fail with auth error
- **Missing secret**: Should return helpful error message

---

## Common Issues & Solutions

### Issue: "Wix authorization token required"

**Cause**: Frontend not passing access token to backend

**Solution**:
1. Verify Wix Client is initialized in constructor
2. Check that `config.wixClient` is passed to PdfButton
3. Ensure `Authorization` header is set in fetch request

### Issue: "Failed to retrieve API key"

**Cause**: Token invalid or Secrets Manager not configured

**Solution**:
1. Verify site owner added `PDF_API_KEY` to Secrets Manager
2. Check token is valid (not expired)
3. Verify backend has `@wix/secrets` package installed

### Issue: "Secret 'PDF_API_KEY' not found"

**Cause**: Site owner hasn't added API key to Secrets Manager

**Solution**:
1. Site owner goes to Wix Dashboard → Settings → Secrets Manager
2. Add secret named exactly `PDF_API_KEY`
3. Paste their Docuskribe API key as the value

---

## References

- [Wix SDK Documentation](https://dev.wix.com/docs/sdk)
- [Authenticate using Wix Client in Custom Elements](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/self-hosting/supported-extensions/site-extensions/site-widgets-and-plugins/authenticate-using-the-wix-client-in-custom-elements-for-self-hosted-site-extensions)
- [Identify App Instance in Self-Hosted Widget](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/self-hosting/supported-extensions/site-extensions/site-widgets-and-plugins/identify-the-app-instance-in-a-self-hosted-site-widget)
- [Wix Secrets Manager](https://dev.wix.com/docs/sdk/api-reference/secrets/secrets/get-secret-value)

---

## Next Steps

1. **Build** the updated widget and settings panel
2. **Deploy** to docuskribe.com
3. **Test** on a Wix site with API key in Secrets Manager
4. **Verify** token flow and secret retrieval in logs
5. **Confirm** PDF generation works end-to-end

---

## Summary

The authentication implementation ensures:
- ✅ Proper Wix Client initialization with Site context
- ✅ Access token generation and transmission
- ✅ Backend uses token to access correct site's Secrets Manager
- ✅ Secure, per-site API key management
- ✅ Follows Wix best practices for self-hosted apps

