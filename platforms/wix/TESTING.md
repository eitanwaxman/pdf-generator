# Wix PDF Generator Widget - Testing Guide

## Testing Checklist

Follow these steps to test the complete PDF generation flow.

## Prerequisites

- Widget deployed and configured in Wix App Dashboard
- Development Wix site created
- Widget added to the site
- PDF API running
- API key added to Wix Secrets Manager

## 1. Test Widget Installation

### 1.1 Add Widget to Site

1. Open your development site in Wix Editor
2. Click **Add Elements** (+ icon on left sidebar)
3. Search for "PDF Generator" or navigate to your app section
4. Drag the PDF Generator Button onto the page
5. **Expected**: Button appears with default text "Generate PDF"

### 1.2 Verify Widget Rendering

1. Check that the button is styled correctly (blue, rounded)
2. Hover over button - should show hover effect
3. **Expected**: Professional-looking button that matches Wix design standards

## 2. Test Settings Panel

### 2.1 Open Settings

1. Click the widget to select it
2. Click the **Settings** button in the widget action bar
3. **Expected**: Settings panel opens showing all configuration options

### 2.2 Configure Basic Settings

Test each setting:

**PDF Source:**
- [ ] Select "Current Page URL" radio button
- [ ] Select "Custom URL" radio button
- [ ] Enter a test URL (e.g., `https://example.com`)
- **Expected**: Custom URL input appears/hides based on selection

**Output Type:**
- [ ] Select "PDF" from dropdown
- [ ] Select "Screenshot" from dropdown
- **Expected**: PDF/Screenshot specific options appear

**PDF Options (when PDF selected):**
- [ ] Change PDF format to "Letter"
- [ ] Modify margins (e.g., "100px" for top)
- [ ] Select platform "Wix"
- [ ] Select form factor "Mobile"
- **Expected**: All inputs accept values and update

**Screenshot Options (when Screenshot selected):**
- [ ] Select screenshot type "JPEG"
- [ ] Set quality to 85
- [ ] Toggle "Full Page Screenshot" checkbox
- **Expected**: Options update correctly

**Viewport:**
- [ ] Enter width: 1920
- [ ] Enter height: 1080
- **Expected**: Numeric values accepted

**Query Parameters:**
- [ ] Click "+ Add Parameter"
- [ ] Enter key: "utm_source"
- [ ] Enter value: "test"
- [ ] Add another parameter
- [ ] Click "Remove" on a parameter
- **Expected**: Parameters can be added and removed

**Button Text:**
- [ ] Change to "Download PDF"
- **Expected**: Text input updates

### 2.3 Save Settings

1. Click "Save Settings" button
2. **Expected**: Alert shows "Settings saved successfully!"
3. Close settings panel
4. **Expected**: Widget reflects new button text

## 3. Test PDF Generation - Current Page

### 3.1 Generate from Current Page

1. Preview the site (click Preview in editor)
2. Click the "Generate PDF" button
3. **Expected**: 
   - Button shows loading state (spinner + "Generating...")
   - Button is disabled during generation
   - No errors in browser console

### 3.2 Verify PDF Download

1. Wait for PDF generation to complete
2. **Expected**:
   - PDF downloads automatically
   - Success message appears: "PDF generated successfully!"
   - File named like "document-1699012345678.pdf"
   - PDF opens and displays the current page correctly

### 3.3 Check Media Manager Upload

1. Go to Wix Dashboard → Media
2. **Expected**: PDF file uploaded to Media Manager
3. Click the PDF to preview
4. **Expected**: PDF displays correctly

## 4. Test PDF Generation - Custom URL

### 4.1 Configure Custom URL

1. Go back to Edit mode
2. Open widget settings
3. Select "Custom URL"
4. Enter: `https://example.com`
5. Save settings

### 4.2 Generate from Custom URL

1. Preview site
2. Click generate button
3. **Expected**:
   - PDF generates from example.com
   - PDF downloads automatically
   - Success message shows

## 5. Test Different PDF Formats

Test each format:

- [ ] A4 (default)
- [ ] Letter
- [ ] Legal
- [ ] Ledger
- [ ] A3

For each:
1. Set format in settings
2. Generate PDF
3. Verify PDF dimensions match format

## 6. Test Screenshot Mode

### 6.1 PNG Screenshot

1. Settings → Output Type: "Screenshot"
2. Screenshot type: "PNG"
3. Generate
4. **Expected**: PNG file downloads

### 6.2 JPEG Screenshot

1. Settings → Screenshot type: "JPEG"
2. Set quality: 80
3. Generate
4. **Expected**: JPEG file downloads with appropriate quality

## 7. Test Platform-Specific Features

### 7.1 Wix Platform Optimization

1. Settings → Platform: "Wix"
2. Generate PDF of a Wix page
3. **Expected**: Wix-specific elements handled correctly

## 8. Test Form Factors

### 8.1 Mobile Form Factor

1. Settings → Form Factor: "Mobile"
2. Generate PDF
3. **Expected**: PDF generated with mobile viewport

### 8.2 Desktop Form Factor

1. Settings → Form Factor: "Desktop"
2. Generate PDF
3. **Expected**: PDF generated with desktop viewport

## 9. Test Query Parameters

### 9.1 Add Query Params

1. Settings → Query Parameters
2. Add parameter: `debug = true`
3. Add parameter: `version = 2`
4. Save and generate
5. **Expected**: URL includes `?debug=true&version=2`

## 10. Test Error Handling

### 10.1 Invalid URL

1. Settings → Custom URL: "not-a-valid-url"
2. Generate PDF
3. **Expected**: Error message appears

### 10.2 Network Error

1. Stop PDF API server
2. Try to generate PDF
3. **Expected**: Clear error message displayed
4. Button returns to normal state

### 10.3 Missing API Key

1. Remove API key from Secrets Manager
2. Try to generate PDF
3. **Expected**: Error about missing API key

## 11. Test Backend Integration

### 11.1 Verify API Calls

1. Open browser DevTools → Network tab
2. Generate PDF
3. Check requests:
   - [ ] POST to `/wix/api/generate-pdf`
   - [ ] GET to `/wix/api/generate-pdf/:jobId` (polling)
   - [ ] Response includes PDF data
   - **Expected**: All requests return 200 status

### 11.2 Check Backend Logs

1. View backend server logs
2. Generate PDF
3. **Expected**: Logs show:
   - API key retrieved from Secrets Manager
   - PDF API called successfully
   - Job status checked
   - No errors

## 12. Test Multiple Sites

### 12.1 Install on Another Site

1. Install app on a second Wix site
2. Add API key to that site's Secrets Manager
3. Add widget to page
4. Generate PDF
5. **Expected**: Works independently on each site

## 13. Performance Testing

### 13.1 Multiple Generations

1. Generate 5 PDFs in quick succession
2. **Expected**: 
   - All complete successfully
   - No crashes or freezes
   - Rate limiting works if applicable

### 13.2 Large Pages

1. Generate PDF of a very long page
2. **Expected**: 
   - Completes successfully (may take longer)
   - Full page captured in PDF

## 14. Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox  
- [ ] Safari (if available)

For each browser:
1. Preview site
2. Generate PDF
3. **Expected**: Works consistently

## 15. Mobile Testing

### 15.1 Mobile Editor

1. Use Wix mobile editor
2. Configure widget settings
3. **Expected**: Settings panel responsive and usable

### 15.2 Mobile Site Preview

1. Preview site on mobile
2. Click generate button
3. **Expected**: PDF generates and downloads on mobile

## Common Issues & Solutions

### Issue: Widget doesn't appear
**Solution**: Check Script URL in App Dashboard, verify file is served correctly

### Issue: Settings don't save
**Solution**: Check browser console for postMessage errors

### Issue: PDF generation fails
**Solution**: 
- Verify API key in Secrets Manager
- Check backend logs
- Test PDF API directly

### Issue: Upload to Media Manager fails
**Solution**: 
- Check Wix SDK authentication
- Verify @wix/site module is available
- Check browser console for upload errors

### Issue: Button stuck in loading state
**Solution**: 
- Check for JavaScript errors
- Verify backend is responding
- Check job polling logic

## Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: ___________

✅ Widget Installation
✅ Settings Panel
✅ PDF Generation - Current Page
✅ PDF Generation - Custom URL
✅ Different PDF Formats
✅ Screenshot Mode
✅ Platform-Specific Features
✅ Form Factors
✅ Query Parameters
✅ Error Handling
✅ Backend Integration
✅ Multiple Sites
✅ Performance
✅ Browser Compatibility
✅ Mobile Testing

Issues Found:
1. ___________
2. ___________

Notes:
___________
```

## Success Criteria

All tests pass when:
- ✅ Widget installs and renders correctly
- ✅ Settings panel opens and saves configuration
- ✅ PDFs generate successfully from both current page and custom URLs
- ✅ All format options work (PDF formats, screenshot types)
- ✅ Files download automatically
- ✅ Files upload to Wix Media Manager
- ✅ Error handling works gracefully
- ✅ Works across different browsers
- ✅ Backend successfully retrieves API key from Secrets Manager
- ✅ No console errors during normal operation

