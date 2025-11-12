# Generic Widget Quick Start

Get your Docuskribe widget running in 5 minutes.

## Step 1: Database Setup (30 seconds)

Run the migration in your Supabase SQL editor:

```bash
# Copy contents of this file:
docs/migration-add-public-keys.sql
```

## Step 2: Build the Widget (2 minutes)

```bash
cd platforms/generic/widget
npm install
npm run build
```

The widget bundle will be created at `dist/bundle.js`.

## Step 3: Start Your Server (10 seconds)

```bash
cd ../../..  # Back to project root
npm start
```

Server runs on `http://localhost:3000`

## Step 4: Create a Public Key (1 minute)

1. Open `http://localhost:3000` in your browser
2. Log in (or sign up if you haven't)
3. Click the **Widget** tab
4. Click **Create Key**
5. Enter name: "My Website"
6. Add domain: `localhost:*` (for testing)
7. Click **Create Key**
8. **Copy the public key** (starts with `pk_live_`)

## Step 5: Test the Widget (1 minute)

1. Open `platforms/generic/widget/test.html` in a text editor
2. Find all instances of `YOUR_PUBLIC_KEY_HERE`
3. Replace with your actual public key from Step 4
4. Save the file

Serve the test page:

```bash
cd platforms/generic/widget
python -m http.server 8000
# Or: npx serve -p 8000
```

Open `http://localhost:8000/test.html` in your browser.

## Step 6: Click and Test! (30 seconds)

Click any widget button on the test page:
- ✅ "Generate PDF" should create a PDF of the test page
- ✅ "Take Screenshot" should capture a screenshot
- ✅ Files download automatically

## Usage on Your Website

Add these two lines to any HTML page:

```html
<!-- Load the widget script -->
<script src="http://localhost:3000/cdn/widget/bundle.js"></script>

<!-- Add the widget -->
<docuskribe-widget
  public-key="pk_live_your_key_here"
  output-type="pdf"
  button-text="Download PDF"
></docuskribe-widget>
```

Replace `public-key` with your actual key!

## Customization

### PDF Format

```html
<docuskribe-widget
  public-key="pk_live_..."
  output-type="pdf"
  pdf-format="Letter"
  pdf-margin-top="20px"
  pdf-margin-bottom="20px"
></docuskribe-widget>
```

### Screenshot

```html
<docuskribe-widget
  public-key="pk_live_..."
  output-type="screenshot"
  screenshot-type="png"
  screenshot-full-page="true"
></docuskribe-widget>
```

### Custom URL

```html
<docuskribe-widget
  public-key="pk_live_..."
  url-source="custom"
  custom-url="https://example.com"
></docuskribe-widget>
```

## Troubleshooting

### Widget doesn't appear

- Check browser console for errors
- Verify bundle.js is accessible: `http://localhost:3000/cdn/widget/bundle.js`
- Did you run `npm run build` in the widget directory?

### "Unauthorized domain" error

- Go to dashboard → Widget tab
- Edit your public key
- Add your domain to authorized domains list
- For local testing, use `localhost:*`
- Save changes and try again

### "Public API key required" error

- Check that you replaced `YOUR_PUBLIC_KEY_HERE` with your actual key
- Verify the `public-key` attribute is present
- Key should start with `pk_live_`

### Generation fails

- Check that you have remaining credits (dashboard)
- Verify your account is active
- Check browser console for detailed errors

## Production Deployment

When deploying to production:

1. **Update your public key domains**:
   - Remove `localhost:*`
   - Add your production domain(s)
   - Example: `example.com` or `*.example.com`

2. **Update widget script URL**:
   ```html
   <script src="https://api.docuskribe.com/cdn/widget/bundle.js"></script>
   ```

3. **Test from production domain** before going live

## Next Steps

- 📖 Read the [complete documentation](README.md)
- 🧪 Follow the [testing guide](TESTING.md)
- 📋 Review the [implementation summary](IMPLEMENTATION_SUMMARY.md)
- ⚙️ Explore more configuration options in the dashboard

## Getting Help

- Check browser console for error messages
- Review the FAQ in `README.md`
- Test with the test.html page first
- Verify your public key is enabled in the dashboard

## Summary

You now have a working widget! It took less than 5 minutes to:
- ✅ Set up the database
- ✅ Build the widget
- ✅ Create a public key
- ✅ Test the functionality
- ✅ See how to embed on any website

The widget is production-ready and can be deployed to your live site immediately.




