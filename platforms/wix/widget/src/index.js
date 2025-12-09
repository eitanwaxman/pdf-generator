import React from 'react';
import ReactDOM from 'react-dom/client';
import PdfButton from './PdfButton.jsx';
import './styles.css';

// Bundle version - update this when deploying a new version
const BUNDLE_VERSION = '2.0.0'; // v2.0.0 - Removed Wix backend, now uses public API key authentication
const BUILD_TIMESTAMP = new Date().toISOString();

class PdfGeneratorButton extends HTMLElement {
  static get observedAttributes() {
    return [
      'public-api-key',
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
      'button-css',
      'button-icon',
      'button-icon-position'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.config = {};
    
    // Log bundle version on initialization
    console.log('[PDF Widget] ========================================');
    console.log('[PDF Widget] PDF Generator Widget Loading');
    console.log('[PDF Widget] Bundle Version:', BUNDLE_VERSION);
    console.log('[PDF Widget] Build Timestamp:', BUILD_TIMESTAMP);
    console.log('[PDF Widget] ========================================');
  }

  connectedCallback() {
    console.log('[PDF Widget] connectedCallback() - Widget connected to DOM');
    
    this.updateConfig();
    console.log('[PDF Widget] Config updated');
    
    this.render();
    console.log('[PDF Widget] Widget rendered');
  }

  disconnectedCallback() {
    if (this.root) {
      this.root.unmount();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    console.log(`[PDF Widget] Attribute changed: ${name} = ${newValue}`);
    if (oldValue !== newValue) {
      this.updateConfig();
      this.render();
    }
  }

  updateConfig() {
    // Parse attributes into config object
    this.config = {
      publicApiKey: this.getAttribute('public-api-key') || '',
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
      buttonIcon: this.getAttribute('button-icon') || 'default',
      buttonIconPosition: this.getAttribute('button-icon-position') || 'left'
    };
    
    console.log('[PDF Widget] Config updated with public API key:', this.config.publicApiKey ? 'Present' : 'Missing');
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
    const iconPosition = this.getAttribute('button-icon-position') || 'left';
    
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
        flex-direction: ${['top', 'bottom'].includes(iconPosition) ? 'column' : iconPosition === 'right' ? 'row-reverse' : 'row'};
        text-align: center;
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
        flex-shrink: 0;
      }

      .pdf-btn-icon-img {
        width: 18px;
        height: 18px;
        object-fit: contain;
      }

      .icon-pos-top {
        flex-direction: column;
      }

      .icon-pos-bottom {
        flex-direction: column-reverse;
      }

      .icon-pos-right {
        flex-direction: row-reverse;
      }

      .icon-pos-left {
        flex-direction: row;
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

