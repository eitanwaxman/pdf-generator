# Wix Widget Test Page Instructions

## 🚀 Quick Start

### 1. Start Your Server

```bash
# Make sure you're in the project root
npm start
```

Your server should now be running on `http://localhost:3000`

### 2. Open the Test Page

Open your browser and go to:
```
http://localhost:3000/wix/test.html
```

## 📋 What You'll See

The test page shows:

### 1. **Widget Preview** (Left Panel)
- The actual PDF generator button
- Current widget configuration
- Test buttons for interactions

### 2. **Settings Panel** (Right Panel)
- Full settings interface in an iframe
- All configuration options
- Save button to test settings updates

### 3. **Console Output** (Bottom)
- Real-time logging of all events
- Settings updates
- Widget interactions
- Error messages

## 🧪 Testing Workflow

### Test 1: Widget Display
1. ✅ Button should be visible in the "Widget Preview" section
2. ✅ Button should say "Generate PDF" by default
3. ✅ Button should be blue with white text

**If not visible:**
- Check console for errors
- Click "Inspect Widget" button
- Look for red error messages

### Test 2: Settings Panel
1. Change some settings:
   - Change button text to "Download PDF"
   - Change PDF format to "Letter"
   - Add margins: 100px all around
   
2. Click "Save Settings"

3. Watch the console output:
   - ✅ Should see "Settings update received!"
   - ✅ Should see JSON with your settings
   - ✅ Widget config should update automatically

4. Check Widget Preview:
   - ✅ Button text should now say "Download PDF"
   - ✅ Current configuration should show updated values

### Test 3: PDF Generation
1. Click the "Generate PDF" button (in Widget Preview)

2. Watch console:
   - Should see "Generating..." state
   - Should see API calls to `/wix/api/generate-pdf`

3. Expected behavior:
   - ✅ Button shows loading spinner
   - ✅ After generation, PDF downloads automatically
   - ✅ Success message appears

**Note:** PDF generation requires:
- Backend server running (`npm start`)
- API key in Wix Secrets Manager (for production) OR
- Working PDF API endpoint at `/api/v1/jobs`

### Test 4: Programmatic Testing
Use the test buttons:

**"Test PDF Generation"**
- Programmatically clicks the widget button
- Good for automated testing

**"Inspect Widget"**
- Shows widget details in console
- Displays all attributes
- Checks shadow DOM

**"Reload Widget"**
- Recreates the widget
- Tests initialization
- Clears any errors

## 🔍 Debugging Tips

### Button Not Showing
1. Open browser DevTools (F12)
2. Go to Elements tab
3. Find `<pdf-generator-button>` element
4. Check if shadow DOM is present
5. Look for CSS issues

### Settings Not Updating
1. Open browser console
2. Save settings
3. Look for:
   ```
   [INFO] Settings update received!
   [INFO] {urlSource: 'current', ...}
   ```
4. If missing, check iframe console separately

### PDF Generation Fails
1. Check console for error messages
2. Verify server is running: `http://localhost:3000/health`
3. Test backend endpoint:
   ```bash
   curl -X POST http://localhost:3000/wix/api/generate-pdf \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com","options":{}}'
   ```

## 📊 Console Messages

### Success Messages (Green)
- ✅ `Settings update received!`
- ✅ `Widget button clicked programmatically`
- ✅ `Custom element "pdf-generator-button" registered successfully`

### Info Messages (Blue)
- ℹ️ `[INFO] Test page loaded successfully`
- ℹ️ `Listening for widget events...`
- ℹ️ Settings JSON data

### Error Messages (Red)
- ❌ `Widget not found`
- ❌ `Button not found in shadow DOM`
- ❌ `Custom element not registered`

## 🎨 Customization

### Change Widget Attributes
Edit `test.html` and modify the custom element:

```html
<pdf-generator-button
  url-source="custom"
  custom-url="https://example.com"
  pdf-format="Letter"
  pdf-margin-top="100px"
  button-text="My Custom Text"
></pdf-generator-button>
```

### Test Different Scenarios
1. **Custom URL:**
   ```html
   url-source="custom"
   custom-url="https://google.com"
   ```

2. **Screenshot Mode:**
   ```html
   output-type="screenshot"
   screenshot-type="png"
   ```

3. **Mobile Format:**
   ```html
   form-factor="mobile"
   viewport-width="390"
   viewport-height="844"
   ```

## 📝 Common Issues

### Issue: "Cannot GET /wix/test.html"
**Solution:** Make sure your server is serving the test page:
```javascript
// In app.js, add:
app.use('/wix', express.static('platforms/wix'));
```

### Issue: Settings panel iframe shows 404
**Solution:** Check that settings panel is built:
```bash
cd platforms/wix/settings-panel
npm run build
```

### Issue: Widget bundle not loading
**Solution:** Rebuild the widget:
```bash
cd platforms/wix/widget
npm run build
```

### Issue: CORS errors
**Solution:** Settings panel and widget must be served from same origin
- Both should be at `localhost:3000`
- Check server static file configuration

## 🚀 Production Testing

Once local testing passes:

1. **Deploy to Render**
   ```bash
   git add .
   git commit -m "Test widget locally"
   git push
   ```

2. **Test on Render URL**
   ```
   https://your-app.onrender.com/wix/test.html
   ```

3. **Configure in Wix**
   - Widget: `https://your-app.onrender.com/wix/widget/dist/bundle.js`
   - Settings: `https://your-app.onrender.com/wix/settings-panel/dist/index.html`

## 💡 Tips

1. **Use Clear Console** button frequently to reduce clutter
2. **Check both browser console AND page console** for complete logs
3. **Test in different browsers** (Chrome, Firefox, Safari)
4. **Use ngrok** for testing with actual Wix (see main docs)
5. **Watch Network tab** in DevTools to see API calls

## ✅ Test Checklist

Before deploying to Wix:

- [ ] Widget displays correctly
- [ ] Settings panel loads
- [ ] Settings save and update widget
- [ ] Button text changes work
- [ ] PDF generation initiates (even if fails without real API)
- [ ] No console errors
- [ ] Shadow DOM renders properly
- [ ] All attributes work
- [ ] Reload/refresh maintains state

## 🎯 Success Criteria

Your widget is ready when:
- ✅ All visual elements display
- ✅ Settings save successfully
- ✅ Widget responds to attribute changes
- ✅ PDF generation flow works end-to-end
- ✅ No errors in console
- ✅ Responsive on different screen sizes

Happy testing! 🎉

