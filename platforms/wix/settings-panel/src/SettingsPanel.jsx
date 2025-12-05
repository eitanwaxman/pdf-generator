import React, { useState, useEffect } from 'react';
import { createClient } from '@wix/sdk';
import { editor } from '@wix/editor';

const PDF_FORMATS = ['A4', 'Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A5', 'A6'];
const FORM_FACTORS = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' }
];
const OUTPUT_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'screenshot', label: 'Screenshot' }
];
const SCREENSHOT_TYPES = ['png', 'jpeg', 'webp'];

const SettingsPanel = () => {
  const [settings, setSettings] = useState({
    publicApiKey: '',
    urlSource: 'current',
    customUrl: '',
    pdfFormat: 'A4',
    pdfMarginTop: '50px',
    pdfMarginRight: '50px',
    pdfMarginBottom: '50px',
    pdfMarginLeft: '50px',
    formFactor: 'desktop',
    outputType: 'pdf',
    screenshotType: 'png',
    screenshotQuality: 90,
    screenshotFullPage: true,
    viewportWidth: '',
    viewportHeight: '',
    buttonText: 'Generate PDF',
    dataParams: []
  });

  useEffect(() => {
    // Load existing settings if available (from widget attributes)
    // In a real implementation, this could be fetched from the widget
  }, []);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddDataParam = () => {
    setSettings(prev => ({
      ...prev,
      dataParams: [...prev.dataParams, { key: '', value: '' }]
    }));
  };

  const handleRemoveDataParam = (index) => {
    setSettings(prev => ({
      ...prev,
      dataParams: prev.dataParams.filter((_, i) => i !== index)
    }));
  };

  const handleDataParamChange = (index, field, value) => {
    setSettings(prev => {
      const newDataParams = [...prev.dataParams];
      newDataParams[index][field] = value;
      return {
        ...prev,
        dataParams: newDataParams
      };
    });
  };

  const handleSave = async () => {
    console.log('[Settings Panel] Saving settings...');
    
    try {
      // Initialize Wix SDK client
      const wixClient = createClient({
        host: editor.host()
      });
      
      const widgetApi = wixClient.use(editor.widget);
      
      // Convert dataParams array to JSON string for storage
      const data = {};
      settings.dataParams.forEach(param => {
        if (param.key && param.value) {
          data[param.key] = param.value;
        }
      });
      const dataJson = Object.keys(data).length > 0 ? JSON.stringify(data) : '';

      // Set each property individually using setProp
      // Properties are bound to custom element attributes (kebab-case)
      await widgetApi.setProp('public-api-key', settings.publicApiKey || '');
      await widgetApi.setProp('url-source', settings.urlSource || 'current');
      await widgetApi.setProp('custom-url', settings.customUrl || '');
      await widgetApi.setProp('pdf-format', settings.pdfFormat || 'A4');
      await widgetApi.setProp('pdf-margin-top', settings.pdfMarginTop || '50px');
      await widgetApi.setProp('pdf-margin-right', settings.pdfMarginRight || '50px');
      await widgetApi.setProp('pdf-margin-bottom', settings.pdfMarginBottom || '50px');
      await widgetApi.setProp('pdf-margin-left', settings.pdfMarginLeft || '50px');
      await widgetApi.setProp('form-factor', settings.formFactor || 'desktop');
      await widgetApi.setProp('output-type', settings.outputType || 'pdf');
      await widgetApi.setProp('screenshot-type', settings.screenshotType || 'png');
      await widgetApi.setProp('screenshot-quality', String(settings.screenshotQuality || 90));
      await widgetApi.setProp('screenshot-full-page', String(settings.screenshotFullPage !== false));
      await widgetApi.setProp('viewport-width', settings.viewportWidth || '');
      await widgetApi.setProp('viewport-height', settings.viewportHeight || '');
      await widgetApi.setProp('button-text', settings.buttonText || 'Generate PDF');
      await widgetApi.setProp('data', dataJson);

      console.log('[Settings Panel] ✅ Settings saved successfully');
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('[Settings Panel] ❌ Error saving settings:', error);
      alert('Error saving settings: ' + error.message);
    }
  };

  return (
    <div id="settings-root">
      <div className="settings-section">
        <h3 className="settings-section-title">API Configuration</h3>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
          Get your public API key from <a href="https://www.docuskribe.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: '#116dff' }}>your dashboard</a>.
          Make sure to add your Wix domain to the authorized domains list.
        </p>
        <input
          type="text"
          placeholder="pk_live_..."
          value={settings.publicApiKey}
          onChange={(e) => handleChange('publicApiKey', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'monospace'
          }}
        />
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">PDF Source</h3>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <input
              type="radio"
              value="current"
              checked={settings.urlSource === 'current'}
              onChange={(e) => handleChange('urlSource', e.target.value)}
              style={{ marginRight: '8px' }}
            />
            Current Page URL
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              value="custom"
              checked={settings.urlSource === 'custom'}
              onChange={(e) => handleChange('urlSource', e.target.value)}
              style={{ marginRight: '8px' }}
            />
            Custom URL
          </label>
        </div>

        {settings.urlSource === 'custom' && (
          <input
            type="text"
            placeholder="https://example.com"
            value={settings.customUrl}
            onChange={(e) => handleChange('customUrl', e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        )}
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Output Type</h3>
        <select
          value={settings.outputType}
          onChange={(e) => handleChange('outputType', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {OUTPUT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {settings.outputType === 'pdf' && (
        <>
          <div className="settings-section">
            <h3 className="settings-section-title">PDF Format</h3>
            <select
              value={settings.pdfFormat}
              onChange={(e) => handleChange('pdfFormat', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {PDF_FORMATS.map(format => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">PDF Margins</h3>
            <div className="field-group">
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
                  Top
                </label>
                <input
                  type="text"
                  placeholder="50px"
                  value={settings.pdfMarginTop}
                  onChange={(e) => handleChange('pdfMarginTop', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
                  Right
                </label>
                <input
                  type="text"
                  placeholder="50px"
                  value={settings.pdfMarginRight}
                  onChange={(e) => handleChange('pdfMarginRight', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
                  Bottom
                </label>
                <input
                  type="text"
                  placeholder="50px"
                  value={settings.pdfMarginBottom}
                  onChange={(e) => handleChange('pdfMarginBottom', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
                  Left
                </label>
                <input
                  type="text"
                  placeholder="50px"
                  value={settings.pdfMarginLeft}
                  onChange={(e) => handleChange('pdfMarginLeft', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {settings.outputType === 'screenshot' && (
        <>
          <div className="settings-section">
            <h3 className="settings-section-title">Screenshot Type</h3>
            <select
              value={settings.screenshotType}
              onChange={(e) => handleChange('screenshotType', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {SCREENSHOT_TYPES.map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Quality (JPEG only)</h3>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.screenshotQuality}
              onChange={(e) => handleChange('screenshotQuality', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div className="settings-section">
            <label style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={settings.screenshotFullPage}
                onChange={(e) => handleChange('screenshotFullPage', e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Full Page Screenshot
            </label>
          </div>
        </>
      )}

      <div className="settings-section">
        <h3 className="settings-section-title">Form Factor</h3>
        <select
          value={settings.formFactor}
          onChange={(e) => handleChange('formFactor', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        >
          {FORM_FACTORS.map(factor => (
            <option key={factor.value} value={factor.value}>{factor.label}</option>
          ))}
        </select>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Viewport (Optional)</h3>
        <div className="field-group">
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              Width (px)
            </label>
            <input
              type="number"
              placeholder="1920"
              value={settings.viewportWidth}
              onChange={(e) => handleChange('viewportWidth', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              Height (px)
            </label>
            <input
              type="number"
              placeholder="1080"
              value={settings.viewportHeight}
              onChange={(e) => handleChange('viewportHeight', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Query Parameters</h3>
        {settings.dataParams.map((param, index) => (
          <div key={index} className="key-value-pair">
            <input
              type="text"
              placeholder="Key"
              value={param.key}
              onChange={(e) => handleDataParamChange(index, 'key', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="text"
              placeholder="Value"
              value={param.value}
              onChange={(e) => handleDataParamChange(index, 'value', e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <button
              type="button"
              onClick={() => handleRemoveDataParam(index)}
              className="remove-btn"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddDataParam}
          className="add-btn"
        >
          + Add Parameter
        </button>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Button Text</h3>
        <input
          type="text"
          placeholder="Generate PDF"
          value={settings.buttonText}
          onChange={(e) => handleChange('buttonText', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      <div className="save-footer">
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: '#116dff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0f5edb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#116dff'}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;

