# Generic Widget Testing Guide

This guide walks you through testing the Docuskribe generic embed widget end-to-end.

## Prerequisites

Before testing, ensure:

1. ✅ Backend server is running (`npm start` from project root)
2. ✅ Database migration has been applied (`docs/migration-add-public-keys.sql`)
3. ✅ You have a registered account with verified email
4. ✅ Widget has been built (`cd platforms/generic/widget && npm install && npm run build`)

## Test Flow

### Phase 1: Database Setup

1. **Apply the migration**:
   - Open Supabase SQL Editor
   - Run the contents of `docs/migration-add-public-keys.sql`
   - Verify the `public_api_keys` table exists
   - Check that RLS policies are enabled

2. **Verify migration**:
   ```sql
   -- Check table exists
   SELECT * FROM public_api_keys LIMIT 1;
   
   -- Check indexes
   SELECT indexname FROM pg_indexes WHERE tablename = 'public_api_keys';
   ```

### Phase 2: Public Key Management

1. **Log in to Dashboard**:
   - Navigate to `http://localhost:3000` (or your deployment URL)
   - Log in with your account credentials
   - Verify email if not already done

2. **Navigate to Widget Tab**:
   - Click on the "Widget" tab in the dashboard
   - You should see the public key management interface

3. **Create a Public Key**:
   - Click "Create Key" button
   - Enter name: "Test Widget Key"
   - Add authorized domains:
     - `localhost:5173` (if using Vite dev server)
     - `localhost:8000` (if using simple HTTP server)
     - `localhost:*` (for any local port)
   - Click "Create Key"
   - Verify the key appears in the list with format `pk_live_...`

4. **Test Key Management**:
   - ✅ Copy the public key (click copy icon)
   - ✅ Show/hide the key (click eye icon)
   - ✅ Edit authorized domains (click Edit button)
   - ✅ Add another domain: `127.0.0.1:*`
   - ✅ Save changes
   - ✅ Verify domains are updated

### Phase 3: Widget Configuration

1. **Configure Widget Settings**:
   - Select your newly created public key
   - Configure widget:
     - URL Source: "Current Page"
     - Output Type: "PDF"
     - PDF Format: "A4"
     - Form Factor: "Desktop"
     - Button Text: "Download PDF"
   
2. **Generate Embed Code**:
   - Scroll to "Embed Code" section
   - Copy the generated code
   - Verify it includes your public key
   - Check that all configuration attributes are present

3. **Test Configuration Changes**:
   - Change Output Type to "Screenshot"
   - Verify embed code updates
   - Change back to "PDF"
   - Modify margins: `20px` on all sides
   - Verify embed code reflects changes

### Phase 4: Widget Integration Testing

1. **Prepare Test Page**:
   - Open `platforms/generic/widget/test.html`
   - Replace all instances of `YOUR_PUBLIC_KEY_HERE` with your actual public key
   - Save the file

2. **Serve Test Page**:
   
   **Option A: Using Python**:
   ```bash
   cd platforms/generic/widget
   python -m http.server 8000
   ```
   
   **Option B: Using Node.js**:
   ```bash
   cd platforms/generic/widget
   npx serve -p 8000
   ```

3. **Open in Browser**:
   - Navigate to `http://localhost:8000/test.html`
   - Open browser DevTools (F12)
   - Check Console for errors

### Phase 5: Functional Testing

Test each widget example on the test page:

#### Test 1: Basic PDF Generation

1. Click "Generate PDF" button (first widget)
2. ✅ Button shows loading spinner
3. ✅ Text changes to "Generating..."
4. ✅ Button is disabled during generation
5. ✅ Success message appears after ~5-10 seconds
6. ✅ PDF file downloads automatically
7. ✅ Open the PDF and verify it contains the test page content
8. ✅ Check browser console - should be no errors

#### Test 2: Screenshot Capture

1. Click "Take Screenshot" button (second widget)
2. ✅ Loading state appears
3. ✅ Screenshot downloads as PNG file
4. ✅ Open the image and verify it shows the test page
5. ✅ Image is full-page (scrollable content included)

#### Test 3: Custom URL PDF

1. Click "PDF of Example.com" button (third widget)
2. ✅ PDF generates successfully
3. ✅ Open the PDF and verify it contains example.com content
4. ✅ Format should be Letter (not A4)

#### Test 4: Mobile View PDF

1. Click "Mobile PDF" button (fourth widget)
2. ✅ PDF generates successfully
3. ✅ Open PDF and verify it has mobile viewport width (narrower)

### Phase 6: Error Handling Testing

#### Test 1: Invalid Public Key

1. Edit `test.html`
2. Change public key to `pk_live_invalid_key_12345`
3. Reload page and click a widget button
4. ✅ Error message appears: "Invalid public key or unauthorized domain"
5. ✅ Button returns to normal state
6. ✅ No PDF/screenshot is downloaded

#### Test 2: Unauthorized Domain

1. Create a new public key in dashboard
2. Add ONLY `example.com` to authorized domains (not localhost)
3. Use this key in test.html
4. Reload page and click widget button
5. ✅ Error message appears about unauthorized domain
6. ✅ Check browser console: 401 Unauthorized error
7. ✅ Network tab shows request with Origin: `http://localhost:8000`

#### Test 3: Missing Public Key

1. Edit `test.html`
2. Remove the `public-key` attribute entirely
3. Reload page and click widget button
4. ✅ Error message: "Public API key is required"
5. ✅ No API request is made (check Network tab)

### Phase 7: Security Testing

#### Test 1: Domain Wildcard Matching

1. Create public key with domain: `*.localhost`
2. Test from `http://localhost:8000` - ✅ Should work
3. Test from `http://subdomain.localhost:8000` - ✅ Should work
4. Test from `http://example.com` - ❌ Should fail

#### Test 2: Port Wildcard

1. Create public key with domain: `localhost:*`
2. Test from `localhost:8000` - ✅ Should work
3. Test from `localhost:3000` - ✅ Should work
4. Test from `localhost:9999` - ✅ Should work
5. Test from `127.0.0.1:8000` - ❌ Should fail (different hostname)

#### Test 3: Exact Domain Match

1. Create public key with domain: `localhost:8000`
2. Test from `localhost:8000` - ✅ Should work
3. Test from `localhost:8001` - ❌ Should fail
4. Test from `127.0.0.1:8000` - ❌ Should fail

### Phase 8: Credit Tracking

1. **Check Initial Credits**:
   - Note your current credit count in dashboard
   - Let's say you have 100 credits

2. **Generate Several PDFs**:
   - Generate 3 PDFs using the widget
   - Return to dashboard
   - Refresh the page

3. **Verify Credit Deduction**:
   - ✅ Credit count should be reduced by 3
   - ✅ Usage card should show updated count
   - ✅ Should now have 97 credits

4. **Check Public Key Last Used**:
   - Go to Widget tab
   - ✅ "Last used" timestamp should be updated
   - ✅ Should show recent time (within last minute)

### Phase 9: Browser Console Verification

Open browser console while testing and verify:

1. **Successful Request Flow**:
   ```
   Calling Docuskribe API at: http://localhost:3000/api/v1/jobs
   (No errors)
   ```

2. **Network Requests**:
   - ✅ POST to `/api/v1/jobs` with status 200
   - ✅ Request includes `X-Public-Key` header
   - ✅ Request includes `Origin` header
   - ✅ Multiple GET requests to `/api/v1/jobs/:jobId` (polling)
   - ✅ Final polling request returns status "completed"

3. **No Console Errors**:
   - ✅ No React errors
   - ✅ No authentication errors
   - ✅ No CORS errors
   - ✅ No 404s for widget bundle

### Phase 10: Integration with Frameworks

#### React Test

1. Create a test React component:
   ```jsx
   // TestWidget.jsx
   import { useEffect } from 'react';
   
   export default function TestWidget() {
     useEffect(() => {
       const script = document.createElement('script');
       script.src = 'http://localhost:3000/cdn/widget/bundle.js';
       document.body.appendChild(script);
       
       return () => {
         document.body.removeChild(script);
       };
     }, []);
   
     return (
       <div>
         <h1>React Widget Test</h1>
         <docuskribe-widget
           public-key="YOUR_PUBLIC_KEY"
           output-type="pdf"
           button-text="Generate PDF"
         />
       </div>
     );
   }
   ```

2. ✅ Widget loads and displays correctly
3. ✅ Widget functionality works as expected
4. ✅ No React warnings in console

### Phase 11: Performance Testing

1. **Rapid Clicks**:
   - Click widget button multiple times quickly
   - ✅ Should not create multiple jobs
   - ✅ Button should stay disabled during generation
   - ✅ Only one file should download

2. **Concurrent Widgets**:
   - Click multiple different widgets at the same time
   - ✅ All should generate successfully
   - ✅ Each should download its own file
   - ✅ No interference between widgets

3. **Large Pages**:
   - Test on a very long page (add lots of content to test.html)
   - ✅ Full page screenshot should capture all content
   - ✅ PDF should include all pages
   - ✅ Generation might take longer but should complete

## Troubleshooting

### Widget Doesn't Load

- Check: Is `bundle.js` accessible at `/cdn/widget/bundle.js`?
- Check: Did you run `npm run build` in the widget directory?
- Check: Is the backend server running?
- Check: Any CORS errors in browser console?

### Authentication Fails

- Check: Is your public key correct (starts with `pk_live_`)?
- Check: Is your domain in the authorized domains list?
- Check: Are you testing from the authorized domain?
- Check: Backend logs for authentication errors

### Generation Fails

- Check: Do you have remaining credits?
- Check: Is the target URL accessible?
- Check: Backend logs for worker errors
- Check: Network tab for failed requests

### Domain Validation Issues

- Check: Exact domain vs wildcard configuration
- Check: Port matching (use `:*` for any port)
- Check: Protocol (http vs https) doesn't matter, only hostname
- Check: Clear browser cache and reload

## Success Criteria

All tests should pass:

- ✅ Public key can be created via dashboard
- ✅ Domains can be added and edited
- ✅ Widget loads on test page
- ✅ PDF generation works
- ✅ Screenshot generation works
- ✅ Custom URL works
- ✅ Error handling is proper
- ✅ Domain restrictions are enforced
- ✅ Credits are deducted correctly
- ✅ Last used timestamp updates
- ✅ No console errors during normal operation
- ✅ Works with React/Vue/Angular
- ✅ Multiple widgets can coexist on same page

## Reporting Issues

If any test fails:

1. Note which test failed
2. Capture browser console output
3. Capture network tab (especially failed requests)
4. Note browser version and OS
5. Check backend logs for relevant errors
6. Document steps to reproduce

## Next Steps After Testing

Once all tests pass:

1. Build production bundle: `npm run build` (already done)
2. Test on deployed environment (not just localhost)
3. Test with real production domains
4. Monitor credit usage in production
5. Set up monitoring/alerts for failed requests
6. Document any edge cases discovered during testing



