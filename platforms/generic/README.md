# Docuskribe Generic Embed Widget

A secure, easy-to-integrate widget that allows users to generate PDFs and screenshots of web pages directly from your website.

## Features

- 🔒 **Secure**: Public API keys restricted to authorized domains
- ⚡ **Fast**: Direct API integration with job polling
- 🎨 **Customizable**: Configure output format, margins, viewport, and button text
- 📱 **Responsive**: Works on desktop and mobile
- 🌐 **Universal**: Compatible with any website platform or framework

## Quick Start

### 1. Create a Public API Key

1. Log in to your Docuskribe account
2. Navigate to the **Widget** tab
3. Click **Create Key**
4. Enter a name for your key
5. Add your domain(s) to the authorized list:
   - `example.com` - Exact domain only
   - `*.example.com` - All subdomains
   - `localhost:*` - Development (any port)

### 2. Add the Widget to Your Site

```html
<!-- Load the widget script -->
<script src="https://api.docuskribe.com/cdn/widget/bundle.js"></script>

<!-- Add the widget element -->
<docuskribe-widget
  public-key="pk_live_your_public_key_here"
  output-type="pdf"
  pdf-format="A4"
  button-text="Generate PDF"
></docuskribe-widget>
```

### 3. Done!

The widget is now live on your site. Users can click the button to generate PDFs or screenshots instantly.

## Configuration Options

All configuration is done via HTML attributes on the `<docuskribe-widget>` element.

### Required Attributes

| Attribute | Description |
|-----------|-------------|
| `public-key` | Your public API key (starts with `pk_live_`) |

### Optional Attributes

#### General Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `url-source` | string | `current` | `"current"` or `"custom"` |
| `custom-url` | string | - | URL to convert (if `url-source="custom"`) |
| `output-type` | string | `pdf` | `"pdf"` or `"screenshot"` |
| `form-factor` | string | `desktop` | `"desktop"` or `"mobile"` |
| `button-text` | string | `Generate PDF` | Custom button label |
| `api-url` | string | auto-detected | Override API endpoint |

#### PDF Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `pdf-format` | string | `A4` | `A4`, `Letter`, `Legal`, `A3`, `A5`, etc. |
| `pdf-margin-top` | string | `50px` | Top margin (CSS length) |
| `pdf-margin-right` | string | `50px` | Right margin (CSS length) |
| `pdf-margin-bottom` | string | `50px` | Bottom margin (CSS length) |
| `pdf-margin-left` | string | `50px` | Left margin (CSS length) |

#### Screenshot Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `screenshot-type` | string | `png` | `"png"`, `"jpeg"`, or `"webp"` |
| `screenshot-quality` | number | `90` | Quality (1-100, for JPEG) |
| `screenshot-full-page` | boolean | `true` | Capture full page vs viewport only |

#### Viewport Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `viewport-width` | number | - | Viewport width in pixels |
| `viewport-height` | number | - | Viewport height in pixels |

## Examples

### Basic PDF Generation

```html
<docuskribe-widget
  public-key="pk_live_abc123..."
  output-type="pdf"
  pdf-format="A4"
  button-text="Download PDF"
></docuskribe-widget>
```

### Screenshot with Custom Settings

```html
<docuskribe-widget
  public-key="pk_live_abc123..."
  output-type="screenshot"
  screenshot-type="png"
  screenshot-full-page="true"
  button-text="Capture Screenshot"
></docuskribe-widget>
```

### PDF of a Specific URL

```html
<docuskribe-widget
  public-key="pk_live_abc123..."
  url-source="custom"
  custom-url="https://example.com/page"
  output-type="pdf"
  pdf-format="Letter"
></docuskribe-widget>
```

### Mobile View PDF

```html
<docuskribe-widget
  public-key="pk_live_abc123..."
  output-type="pdf"
  form-factor="mobile"
  viewport-width="375"
  viewport-height="812"
  button-text="Mobile PDF"
></docuskribe-widget>
```

## Security

### Public Keys vs Private Keys

- **Public keys** (`pk_live_...`) are safe to use client-side
- They can only be used from domains you explicitly authorize
- Backend validates the request origin against your authorized domain list
- Unauthorized requests are automatically rejected

### Domain Authorization

Requests are validated using the `Origin` or `Referer` header:

- **Exact match**: `example.com` only matches `example.com`
- **Wildcard subdomains**: `*.example.com` matches `app.example.com`, `demo.example.com`, etc.
- **Development**: `localhost:*` matches any port on localhost

### Credit Usage

All widget requests count against your account's monthly credit limit. You can monitor usage in your dashboard.

## Development

### Building the Widget

```bash
cd platforms/generic/widget
npm install
npm run build
```

The built files will be in `dist/` and served at `/cdn/widget/bundle.js`.

### Testing Locally

1. Build the widget (see above)
2. Start your API server: `npm start`
3. Open `platforms/generic/widget/test.html` in your browser
4. Create a public key with `localhost:*` in authorized domains
5. Replace `YOUR_PUBLIC_KEY_HERE` with your actual key
6. Test the widgets!

### Development Mode

For active development:

```bash
cd platforms/generic/widget
npm run dev
```

This watches for changes and rebuilds automatically.

## Integration with Frameworks

### React

```jsx
function MyComponent() {
  useEffect(() => {
    // Load script dynamically
    const script = document.createElement('script');
    script.src = 'https://api.docuskribe.com/cdn/widget/bundle.js';
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <docuskribe-widget
      public-key="pk_live_..."
      output-type="pdf"
      button-text="Generate PDF"
    />
  );
}
```

### Vue

```vue
<template>
  <docuskribe-widget
    public-key="pk_live_..."
    output-type="pdf"
    button-text="Generate PDF"
  />
</template>

<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = 'https://api.docuskribe.com/cdn/widget/bundle.js';
    document.body.appendChild(script);
  }
}
</script>
```

### Angular

```typescript
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-pdf-widget',
  template: `
    <docuskribe-widget
      public-key="pk_live_..."
      output-type="pdf"
      button-text="Generate PDF"
    ></docuskribe-widget>
  `
})
export class PdfWidgetComponent implements OnInit {
  ngOnInit() {
    const script = document.createElement('script');
    script.src = 'https://api.docuskribe.com/cdn/widget/bundle.js';
    document.body.appendChild(script);
  }
}
```

## Troubleshooting

### Widget Not Appearing

- Check browser console for errors
- Verify the script is loaded: `view-source:` and look for the script tag
- Ensure the bundle.js file is accessible at the CDN URL

### Authentication Errors

- Verify your public key is correct (starts with `pk_live_`)
- Check that your domain is in the authorized domains list
- Make sure you're testing from an authorized domain
- Use `localhost:*` for local development

### Generation Fails

- Check your credit balance in the dashboard
- Verify the URL is accessible (not behind authentication)
- Check browser console and network tab for error details
- Ensure your subscription is active

### Domain Not Authorized Error

- Add the domain to your public key's authorized domains list
- Use `*.domain.com` to allow all subdomains
- Remember to save changes in the dashboard
- Wait a few seconds for cache to clear

## Support

- **Documentation**: https://api.docuskribe.com/embed
- **Dashboard**: https://api.docuskribe.com/dashboard
- **Issues**: Check browser console for detailed error messages

## License

See main project LICENSE file.



