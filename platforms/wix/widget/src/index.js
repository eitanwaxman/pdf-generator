import React from 'react';
import ReactDOM from 'react-dom/client';
import PdfButton from './PdfButton.jsx';
import './styles.css';
import { createClient } from '@wix/sdk';
import { site } from '@wix/site';

// Bundle version - update this when deploying a new version
const BUNDLE_VERSION = '1.0.0';
const BUILD_TIMESTAMP = new Date().toISOString();

class PdfGeneratorButton extends HTMLElement {
  static get observedAttributes() {
    return [
      'url-source',
      'custom-url',
      'pdf-format',
      'pdf-margin-top',
      'pdf-margin-right',
      'pdf-margin-bottom',
      'pdf-margin-left',
      'platform',
      'form-factor',
      'output-type',
      'screenshot-type',
      'screenshot-quality',
      'screenshot-full-page',
      'viewport-width',
      'viewport-height',
      'button-text',
      'backend-url',
      'data',
      'button-css'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    this.accessToken = null;
    
    // Log bundle version on initialization
    console.log('[PDF Widget] ========================================');
    console.log('[PDF Widget] PDF Generator Widget Loading');
    console.log('[PDF Widget] Bundle Version:', BUNDLE_VERSION);
    console.log('[PDF Widget] Build Timestamp:', BUILD_TIMESTAMP);
    console.log('[PDF Widget] ========================================');
    
    // Initialize Wix Client
    const APP_ID = 'b715943d-8922-43a5-8728-c77c19d77879';
    
    console.log('[PDF Widget] Initializing Wix client with APP_ID:', APP_ID);
    console.log('[PDF Widget] Window location:', window.location.href);
    console.log('[PDF Widget] Site host available:', typeof site !== 'undefined');
    
    try {
      this.wixClient = createClient({
        host: site.host({ applicationId: APP_ID }),
        auth: site.auth()
      });
      console.log('[PDF Widget] ✅ Wix client initialized successfully');
      console.log('[PDF Widget] Client object:', this.wixClient);
    } catch (err) {
      console.error('[PDF Widget] ❌ Failed to initialize Wix client:', err);
      console.error('[PDF Widget] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
    }
    
    // Provide function for Wix to inject access token
    // Wix will call this automatically to inject the token
    // Reference: https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/self-hosting/supported-extensions/site-extensions/site-widgets-and-plugins/authenticate-using-the-wix-client-in-custom-elements-for-self-hosted-site-extensions
    this.setAccessToken = (token) => {
      console.log('[PDF Widget] setAccessToken() called by Wix');
      console.log('[PDF Widget] Token received:', token ? `Present (${token.length} chars)` : 'Missing');
      
      if (token) {
        this.accessToken = token;
        console.log('[PDF Widget] ✅ Access token stored');
        console.log('[PDF Widget] Token preview:', token.substring(0, 20) + '...');
        
        // Update client with the new token
        try {
          this.wixClient = createClient({
            host: site.host({ applicationId: APP_ID }),
            auth: site.auth({ accessToken: token })
          });
          console.log('[PDF Widget] ✅ Wix client updated with access token');
        } catch (err) {
          console.error('[PDF Widget] ❌ Failed to update client with token:', err);
        }
        
        // Update config and re-render if already connected
        if (this.isConnected) {
          this.updateConfig();
          this.render();
          console.log('[PDF Widget] Config and UI updated with new access token');
        }
      } else {
        console.warn('[PDF Widget] ⚠️ setAccessToken called with null/undefined token');
        this.accessToken = null;
      }
    };
  }

  async connectedCallback() {
    console.log('[PDF Widget] connectedCallback() - Widget connected to DOM');
    
    // Note: Wix will call setAccessToken() automatically to inject the access token
    // We wait a bit for Wix to inject it, then try fallback if needed
    console.log('[PDF Widget] Waiting for Wix to inject access token via setAccessToken()...');
    
    // Wait a bit for Wix to call setAccessToken()
    // If it doesn't happen, try fallback method for compatibility
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // If token still not available, try fallback (for compatibility)
    if (!this.accessToken && this.wixClient) {
      console.log('[PDF Widget] Token not injected yet, trying fallback getAccessToken()...');
      try {
        this.accessToken = await this.wixClient.auth.getAccessToken();
        if (this.accessToken) {
          console.log('[PDF Widget] ✅ Retrieved access token via fallback method');
          console.log('[PDF Widget] Token length:', this.accessToken.length);
          console.log('[PDF Widget] Token preview:', this.accessToken.substring(0, 20) + '...');
        }
      } catch (err) {
        console.warn('[PDF Widget] ⚠️ Fallback getAccessToken() failed:', err.message);
        console.log('[PDF Widget] This is normal if Wix hasn\'t injected the token yet');
      }
    }
    
    // Log final state
    if (this.accessToken) {
      console.log('[PDF Widget] ✅ Access token available');
      console.log('[PDF Widget] Token length:', this.accessToken.length);
    } else {
      console.log('[PDF Widget] ⏳ Access token not yet available');
      console.log('[PDF Widget] Widget will work once Wix calls setAccessToken()');
    }
    
    console.log('[PDF Widget] Final access token state:', this.accessToken ? 'Present' : 'Missing');
    
    this.updateConfig();
    console.log('[PDF Widget] Config updated:', {
      ...this.config,
      accessToken: this.config.accessToken ? 'Present' : 'Missing'
    });
    
    this.render();
    console.log('[PDF Widget] Widget rendered');
    
    // Listen for messages from settings panel
    window.addEventListener('message', this.handleMessage.bind(this));
    console.log('[PDF Widget] Message listener attached');
  }

  disconnectedCallback() {
    window.removeEventListener('message', this.handleMessage.bind(this));
    if (this.root) {
      this.root.unmount();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateConfig();
      this.render();
    }
  }

  handleMessage(event) {
    // Handle settings updates from settings panel
    // Accept messages from any origin for Wix compatibility
    if (event.data && event.data.type === 'pdf-settings-update') {
      const settings = event.data.settings;
      
      console.log('Received settings update:', settings);
      
      // Update attributes based on settings
      Object.keys(settings).forEach(key => {
        const value = settings[key];
        
        // Convert camelCase to kebab-case for attributes
        const attrName = key.replace(/([A-Z])/g, '-$1').toLowerCase();
        
        // Handle different value types
        if (value === undefined || value === null) {
          // Skip undefined/null values
          return;
        } else if (typeof value === 'object') {
          // JSON stringify objects
          this.setAttribute(attrName, JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          // Convert boolean to string
          this.setAttribute(attrName, value.toString());
        } else {
          // Set as string
          this.setAttribute(attrName, value.toString());
        }
      });
      
      console.log('Attributes updated, re-rendering...');
    }
  }

  updateConfig() {
    // Parse attributes into config object
    this.config = {
      urlSource: this.getAttribute('url-source') || 'current',
      customUrl: this.getAttribute('custom-url') || '',
      pdfFormat: this.getAttribute('pdf-format') || 'A4',
      pdfMargin: {
        top: this.getAttribute('pdf-margin-top') || '50px',
        right: this.getAttribute('pdf-margin-right') || '50px',
        bottom: this.getAttribute('pdf-margin-bottom') || '50px',
        left: this.getAttribute('pdf-margin-left') || '50px'
      },
      platform: this.getAttribute('platform') || undefined,
      formFactor: this.getAttribute('form-factor') || 'desktop',
      outputType: this.getAttribute('output-type') || 'pdf',
      screenshotType: this.getAttribute('screenshot-type') || 'png',
      screenshotQuality: parseInt(this.getAttribute('screenshot-quality') || '90'),
      screenshotFullPage: this.getAttribute('screenshot-full-page') !== 'false',
      viewport: this.parseViewport(),
      buttonText: this.getAttribute('button-text') || 'Generate PDF',
      backendUrl: this.getAttribute('backend-url') || undefined,
      data: this.parseData(),
      buttonCss: this.getAttribute('button-css') || '',
      accessToken: this.accessToken  // Pass access token for authentication
    };
    
    console.log('[PDF Widget] Config updated with access token:', this.accessToken ? 'Present' : 'Missing');
  }

  parseViewport() {
    const width = this.getAttribute('viewport-width');
    const height = this.getAttribute('viewport-height');
    
    if (width || height) {
      return {
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined
      };
    }
    
    return undefined;
  }

  parseData() {
    const dataAttr = this.getAttribute('data');
    if (dataAttr) {
      try {
        return JSON.parse(dataAttr);
      } catch (e) {
        console.error('Failed to parse data attribute:', e);
        return undefined;
      }
    }
    return undefined;
  }

  render() {
    // Create a container div for React
    const container = document.createElement('div');
    
    // Add styles to shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      ${this.getStyles()}
    `;
    
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(container);
    
    // Render React component
    if (this.root) {
      this.root.unmount();
    }
    this.root = ReactDOM.createRoot(container);
    this.root.render(<PdfButton config={this.config} />);
  }

  getStyles() {
    // Get custom button CSS from attribute (read directly to ensure it's current)
    const customButtonCss = this.getAttribute('button-css') || '';
    
    // Inline the CSS styles for shadow DOM
    return `
      :host {
        display: block;
        width: fit-content;
      }
      
      .pdf-generator-button {
        display: inline-block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }

      .pdf-btn {
        background-color: #116dff;
        color: white;
        border: none;
        padding: 12px 24px;
        font-size: 16px;
        font-weight: 500;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s ease, transform 0.1s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pdf-btn:hover:not(:disabled) {
        background-color: #0f5edb;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }

      .pdf-btn:active:not(:disabled) {
        transform: translateY(0);
      }

      .pdf-btn:disabled {
        background-color: #94a7bd;
        cursor: not-allowed;
        opacity: 0.6;
      }

      .pdf-btn-loading {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .pdf-btn-icon {
        width: 18px;
        height: 18px;
      }

      .pdf-error {
        margin-top: 8px;
        padding: 8px 12px;
        background-color: #fee;
        color: #c00;
        border-radius: 4px;
        font-size: 14px;
      }

      .pdf-success {
        margin-top: 8px;
        padding: 8px 12px;
        background-color: #e6f7e6;
        color: #2a7d2e;
        border-radius: 4px;
        font-size: 14px;
      }

      /* Apply custom button CSS if provided */
      ${customButtonCss ? `.pdf-btn { ${customButtonCss} }` : ''}
    `;
  }
}

// Register the custom element
customElements.define('pdf-generator-button', PdfGeneratorButton);

// Export for testing
export default PdfGeneratorButton;

