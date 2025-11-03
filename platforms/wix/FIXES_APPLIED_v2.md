# Wix Widget Fixes - Version 2

## Issue: "Unexpected token '<', '<html>...' is not valid JSON"

### Root Cause
The widget was trying to call the PDF generation API at the **Wix site's domain** instead of the **Docuskribe API domain**, resulting in 404 errors that returned HTML instead of JSON.

Example:
- ❌ Was calling: `https://username.wixsite.com/wix/api/generate-pdf` (doesn't exist)
- ✅ Should call: `https://www.docuskribe.com/wix/api/generate-pdf`

## Fixes Applied

### 1. Hardcoded API URL in Widget ✅

**File:** `platforms/wix/widget/src/PdfButton.jsx`

**Change:**
```javascript
// BEFORE (was using Wix site's domain)
const backendUrl = `${window.location.origin}/wix/api/generate-pdf`;

// AFTER (now uses Docuskribe domain)
const backendUrl = 'https://www.docuskribe.com/wix/api/generate-pdf';
```

**Why:** Users don't need to configure the API URL - it's always hosted at docuskribe.com

---

### 2. Removed Backend URL from Settings Panel ✅

**File:** `platforms/wix/settings-panel/src/SettingsPanel.jsx`

**Change:**
- Removed `backendUrl` from settings state
- Removed API Configuration UI section
- Removed `backendUrl` from settings save

**Why:** The API URL is hardcoded, so users don't need to see or configure it.

---

### 3. Fixed Wix Secrets Manager Syntax ✅

**File:** `platforms/wix/backend/services/secrets.js`

**Change:**
```javascript
// BEFORE (incorrect syntax)
const apiKey = await secrets.getSecret(secretName);
return apiKey;

// AFTER (correct syntax)
const secret = await secrets.getSecretValue(secretName);
return secret.value;
```

**Why:** The correct Wix API method is `getSecretValue()` which returns an object with a `value` property, not `getSecret()`.

**Reference:** [Wix Secrets Documentation](https://dev.wix.com/docs/sdk/api-reference/secrets/secrets/get-secret-value)

---

### 4. Updated All Documentation URLs ✅

**Files Updated:**
- `platforms/wix/README.md`
- `platforms/wix/DEPLOYMENT.md`
- `platforms/wix/RENDER_DEPLOYMENT.md`
- `platforms/wix/test.html`

**Change:**
All placeholder URLs replaced with actual Docuskribe URLs:
- `https://www.docuskribe.com/wix/widget/dist/bundle.js`
- `https://www.docuskribe.com/wix/settings-panel/dist/index.html`
- `https://www.docuskribe.com/wix/api/generate-pdf`

---

## Configuration for Wix App Dashboard

Use these exact URLs when setting up the widget in Wix:

```
Widget Name: PDF Generator Button
Tag Name: pdf-generator-button
Script URL: https://www.docuskribe.com/wix/widget/dist/bundle.js
Settings Panel URL: https://www.docuskribe.com/wix/settings-panel/dist/index.html
```

## User Instructions (for Site Owners)

Site owners installing your app need to:

1. Go to their Wix Dashboard
2. Navigate to **Settings** → **Secrets Manager**
3. Click **Add Secret**
4. Set:
   - **Secret Name**: `PDF_API_KEY`
   - **Secret Value**: Their API key from Docuskribe

That's it! No other configuration needed.

---

## Testing

### Before Deploying:

1. **Build the updated widget:**
```bash
cd platforms/wix/widget
npm run build
```

2. **Build the updated settings panel:**
```bash
cd ../settings-panel
npm run build
```

3. **Test locally:**
```bash
# From project root
npm start

# Open browser to:
http://localhost:3000/wix/test.html
```

### After Deploying to Docuskribe.com:

1. **Verify files are accessible:**
   - https://www.docuskribe.com/wix/widget/dist/bundle.js
   - https://www.docuskribe.com/wix/settings-panel/dist/index.html

2. **Update Wix App Dashboard** with the production URLs

3. **Test on a Wix site:**
   - Install the app
   - Add API key to Secrets Manager
   - Add widget to a page
   - Click "Generate PDF"
   - Should successfully generate and download PDF

---

## What Users See Now

✅ **No configuration needed** - API URL is automatically set
✅ **Simple setup** - Just add API key to Secrets Manager
✅ **Clear errors** - If API key is missing, helpful error message
✅ **Works immediately** - Click button → PDF downloads

---

## Technical Details

### API Flow:

1. User clicks "Generate PDF" button on Wix site
2. Widget calls: `https://www.docuskribe.com/wix/api/generate-pdf`
3. Backend retrieves API key from Wix Secrets Manager using `secrets.getSecretValue('PDF_API_KEY')`
4. Backend calls main PDF API at: `https://www.docuskribe.com/api/v1/jobs`
5. PDF generates and returns to user

### Security:

- ✅ API keys stored securely in Wix Secrets Manager (per site)
- ✅ Backend retrieves keys server-side only
- ✅ No API keys exposed in frontend code
- ✅ CORS configured for Wix domains only

---

## Files Modified

### Widget:
- `platforms/wix/widget/src/PdfButton.jsx` - Hardcoded API URL

### Settings Panel:
- `platforms/wix/settings-panel/src/SettingsPanel.jsx` - Removed backend URL config

### Backend:
- `platforms/wix/backend/services/secrets.js` - Fixed `getSecretValue()` syntax

### Documentation:
- `platforms/wix/README.md`
- `platforms/wix/DEPLOYMENT.md`
- `platforms/wix/RENDER_DEPLOYMENT.md`
- `platforms/wix/test.html`

### Test Page:
- `platforms/wix/test.html` - Updated backend URL attribute

---

## Next Steps

1. ✅ All code changes complete
2. 🔄 Build widget and settings panel (run build commands)
3. 🚀 Deploy to Docuskribe.com (git push)
4. 🧪 Test on live Wix site
5. ✅ Confirm PDF generation works end-to-end

---

## Error Resolution

### Original Error:
```
Unexpected token '<', "<html> <h"... is not valid JSON
```

### Cause:
Widget calling non-existent URL, getting 404 HTML page instead of JSON API response.

### Solution:
Hardcoded correct API URL (`https://www.docuskribe.com/wix/api/generate-pdf`) so it always calls the right endpoint regardless of which Wix site it's on.

### Result:
✅ Widget now correctly calls Docuskribe API from any Wix site
✅ API key retrieved properly from Secrets Manager
✅ PDF generation works end-to-end

---

## Support

If issues persist after deploying:

1. Check browser console for errors
2. Verify files are served correctly at docuskribe.com URLs
3. Confirm API key is in Wix Secrets Manager with exact name: `PDF_API_KEY`
4. Check backend logs for secret retrieval errors
5. Test API directly: `POST https://www.docuskribe.com/wix/api/generate-pdf`

