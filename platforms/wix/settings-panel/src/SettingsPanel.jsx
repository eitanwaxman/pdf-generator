import React, { useState, useEffect } from 'react';
import { createClient } from '@wix/sdk';
import { editor, widget } from '@wix/editor';

// Log SDK imports after module load
console.log('[Settings Panel] ========================================');
console.log('[Settings Panel] Initializing Settings Panel Module');
console.log('[Settings Panel] ========================================');
console.log('[Settings Panel] 📦 Wix SDK modules imported');
console.log('[Settings Panel]   - createClient type:', typeof createClient);
console.log('[Settings Panel]   - editor type:', typeof editor);
console.log('[Settings Panel]   - editor.host type:', typeof editor?.host);
console.log('[Settings Panel]   - widget type:', typeof widget);
console.log('[Settings Panel]   - widget object:', widget);
console.log('[Settings Panel]   - widget.setProp type:', typeof widget?.setProp);

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
    console.log('[Settings Panel] ========================================');
    console.log('[Settings Panel] Component mounted (useEffect)');
    console.log('[Settings Panel] ========================================');
    
    // Load current widget properties
    const loadWidgetProperties = async () => {
      try {
        console.log('[Settings Panel] Loading current widget properties...');
        
        // Get editor host
        const editorHost = editor.host();
        console.log('[Settings Panel] ✅ editor.host() call successful');
        
        // Create client
        const wixClient = createClient({
          host: editorHost
        });
        console.log('[Settings Panel] ✅ Client created');
        
        // Get widget API
        const widgetApi = wixClient.use(widget);
        console.log('[Settings Panel] ✅ Widget API obtained');
        console.log('[Settings Panel]   - widgetApi.getProp type:', typeof widgetApi?.getProp);
        
        // Read all current properties from the widget
        const propertyKeys = [
          'public-api-key',
          'url-source',
          'custom-url',
          'pdf-format',
          'pdf-margin-top',
          'pdf-margin-right',
          'pdf-margin-bottom',
          'pdf-margin-left',
          'form-factor',
          'output-type',
          'screenshot-type',
          'screenshot-quality',
          'screenshot-full-page',
          'viewport-width',
          'viewport-height',
          'button-text',
          'data'
        ];
        
        console.log('[Settings Panel] Reading widget properties...');
        const loadedSettings = {};
        
        for (const key of propertyKeys) {
          try {
            const value = await widgetApi.getProp(key);
            console.log(`[Settings Panel]   - ${key} = ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : '(empty)'}`);
            
            // Map kebab-case property names to camelCase state keys
            const stateKey = key.split('-').map((part, index) => 
              index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
            ).join('');
            
            // Handle special cases
            if (key === 'public-api-key') {
              loadedSettings.publicApiKey = value || '';
            } else if (key === 'url-source') {
              loadedSettings.urlSource = value || 'current';
            } else if (key === 'custom-url') {
              loadedSettings.customUrl = value || '';
            } else if (key === 'pdf-format') {
              loadedSettings.pdfFormat = value || 'A4';
            } else if (key === 'pdf-margin-top') {
              loadedSettings.pdfMarginTop = value || '50px';
            } else if (key === 'pdf-margin-right') {
              loadedSettings.pdfMarginRight = value || '50px';
            } else if (key === 'pdf-margin-bottom') {
              loadedSettings.pdfMarginBottom = value || '50px';
            } else if (key === 'pdf-margin-left') {
              loadedSettings.pdfMarginLeft = value || '50px';
            } else if (key === 'form-factor') {
              loadedSettings.formFactor = value || 'desktop';
            } else if (key === 'output-type') {
              loadedSettings.outputType = value || 'pdf';
            } else if (key === 'screenshot-type') {
              loadedSettings.screenshotType = value || 'png';
            } else if (key === 'screenshot-quality') {
              loadedSettings.screenshotQuality = value ? parseInt(value) : 90;
            } else if (key === 'screenshot-full-page') {
              loadedSettings.screenshotFullPage = value !== 'false' && value !== '';
            } else if (key === 'viewport-width') {
              loadedSettings.viewportWidth = value || '';
            } else if (key === 'viewport-height') {
              loadedSettings.viewportHeight = value || '';
            } else if (key === 'button-text') {
              loadedSettings.buttonText = value || 'Generate PDF';
            } else if (key === 'data') {
              // Parse data JSON string into dataParams array
              if (value) {
                try {
                  const dataObj = JSON.parse(value);
                  loadedSettings.dataParams = Object.entries(dataObj).map(([key, val]) => ({
                    key,
                    value: val
                  }));
                } catch (e) {
                  console.warn('[Settings Panel] Failed to parse data:', e);
                  loadedSettings.dataParams = [];
                }
              } else {
                loadedSettings.dataParams = [];
              }
            }
          } catch (propError) {
            console.warn(`[Settings Panel] Failed to read ${key}:`, propError);
          }
        }
        
        // Update state with loaded values
        console.log('[Settings Panel] ✅ Properties loaded, updating state...');
        console.log('[Settings Panel] Loaded settings:', {
          ...loadedSettings,
          publicApiKey: loadedSettings.publicApiKey ? `${loadedSettings.publicApiKey.substring(0, 15)}...` : '(empty)'
        });
        
        setSettings(prev => ({
          ...prev,
          ...loadedSettings
        }));
        
        console.log('[Settings Panel] ✅ State updated with loaded properties');
      } catch (error) {
        console.error('[Settings Panel] ❌ Failed to load widget properties:', error);
        console.error('[Settings Panel]   - Error message:', error.message);
        console.error('[Settings Panel]   - Error stack:', error.stack);
      }
    };
    
    // Load properties when component mounts
    loadWidgetProperties();
    
    console.log('[Settings Panel] Component initialization complete');
    console.log('[Settings Panel] ========================================');
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
    console.log('[Settings Panel] ========================================');
    console.log('[Settings Panel] 🚀 handleSave() called');
    console.log('[Settings Panel] ========================================');
    console.log('[Settings Panel] Settings to save:', {
      ...settings,
      publicApiKey: settings.publicApiKey ? `${settings.publicApiKey.substring(0, 15)}...` : '(empty)'
    });
    
    try {
      // Step 1: Get editor host
      console.log('[Settings Panel] Step 1: Getting editor.host()...');
      let editorHost;
      try {
        editorHost = editor.host();
        console.log('[Settings Panel] ✅ editor.host() successful');
        console.log('[Settings Panel]   - host type:', typeof editorHost);
        console.log('[Settings Panel]   - host:', editorHost);
      } catch (hostError) {
        console.error('[Settings Panel] ❌ editor.host() failed:', hostError);
        console.error('[Settings Panel]   - Error message:', hostError.message);
        console.error('[Settings Panel]   - Error stack:', hostError.stack);
        throw new Error(`Failed to get editor host: ${hostError.message}`);
      }
      
      // Step 2: Create Wix client
      console.log('[Settings Panel] Step 2: Creating Wix client...');
      console.log('[Settings Panel]   - createClient type:', typeof createClient);
      
      let wixClient;
      try {
        wixClient = createClient({
          host: editorHost
        });
        console.log('[Settings Panel] ✅ Wix client created successfully');
        console.log('[Settings Panel]   - wixClient type:', typeof wixClient);
        console.log('[Settings Panel]   - wixClient:', wixClient);
        console.log('[Settings Panel]   - wixClient.use type:', typeof wixClient?.use);
      } catch (clientError) {
        console.error('[Settings Panel] ❌ createClient() failed:', clientError);
        console.error('[Settings Panel]   - Error message:', clientError.message);
        console.error('[Settings Panel]   - Error name:', clientError.name);
        console.error('[Settings Panel]   - Error stack:', clientError.stack);
        throw new Error(`Failed to create Wix client: ${clientError.message}`);
      }
      
      // Step 3: Get widget API (using named export 'widget', NOT 'editor.widget')
      console.log('[Settings Panel] Step 3: Getting widget API...');
      console.log('[Settings Panel]   - widget type:', typeof widget);
      console.log('[Settings Panel]   - widget:', widget);
      
      let widgetApi;
      try {
        // Use the named export 'widget' with client.use() to provide context
        widgetApi = wixClient.use(widget);
        console.log('[Settings Panel] ✅ Widget API obtained successfully');
        console.log('[Settings Panel]   - widgetApi type:', typeof widgetApi);
        console.log('[Settings Panel]   - widgetApi:', widgetApi);
        console.log('[Settings Panel]   - widgetApi.setProp type:', typeof widgetApi?.setProp);
        
        if (!widgetApi || typeof widgetApi.setProp !== 'function') {
          throw new Error('widgetApi.setProp is not a function');
        }
      } catch (apiError) {
        console.error('[Settings Panel] ❌ wixClient.use(widget) failed:', apiError);
        console.error('[Settings Panel]   - Error message:', apiError.message);
        console.error('[Settings Panel]   - Error stack:', apiError.stack);
        throw new Error(`Failed to get widget API: ${apiError.message}`);
      }
      
      // Step 4: Prepare data
      console.log('[Settings Panel] Step 4: Preparing data...');
      const data = {};
      settings.dataParams.forEach(param => {
        if (param.key && param.value) {
          data[param.key] = param.value;
        }
      });
      const dataJson = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
      console.log('[Settings Panel] ✅ Data prepared');
      console.log('[Settings Panel]   - dataParams count:', settings.dataParams.length);
      console.log('[Settings Panel]   - data object keys:', Object.keys(data));
      console.log('[Settings Panel]   - dataJson length:', dataJson.length);

      // Step 5: Set properties
      console.log('[Settings Panel] Step 5: Setting widget properties...');
      const propertiesToSet = [
        { key: 'public-api-key', value: settings.publicApiKey || '' },
        { key: 'url-source', value: settings.urlSource || 'current' },
        { key: 'custom-url', value: settings.customUrl || '' },
        { key: 'pdf-format', value: settings.pdfFormat || 'A4' },
        { key: 'pdf-margin-top', value: settings.pdfMarginTop || '50px' },
        { key: 'pdf-margin-right', value: settings.pdfMarginRight || '50px' },
        { key: 'pdf-margin-bottom', value: settings.pdfMarginBottom || '50px' },
        { key: 'pdf-margin-left', value: settings.pdfMarginLeft || '50px' },
        { key: 'form-factor', value: settings.formFactor || 'desktop' },
        { key: 'output-type', value: settings.outputType || 'pdf' },
        { key: 'screenshot-type', value: settings.screenshotType || 'png' },
        { key: 'screenshot-quality', value: String(settings.screenshotQuality || 90) },
        { key: 'screenshot-full-page', value: String(settings.screenshotFullPage !== false) },
        { key: 'viewport-width', value: settings.viewportWidth || '' },
        { key: 'viewport-height', value: settings.viewportHeight || '' },
        { key: 'button-text', value: settings.buttonText || 'Generate PDF' },
        { key: 'data', value: dataJson }
      ];
      
      console.log('[Settings Panel]   - Total properties to set:', propertiesToSet.length);
      
      for (let i = 0; i < propertiesToSet.length; i++) {
        const { key, value } = propertiesToSet[i];
        try {
          console.log(`[Settings Panel]   [${i + 1}/${propertiesToSet.length}] Setting ${key} = ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
          // Use widgetApi.setProp (bound to context), NOT widget.setProp (no context)
          await widgetApi.setProp(key, value);
          console.log(`[Settings Panel]   ✅ ${key} set successfully`);
        } catch (propError) {
          console.error(`[Settings Panel]   ❌ Failed to set ${key}:`, propError);
          console.error(`[Settings Panel]     - Error message:`, propError.message);
          throw new Error(`Failed to set property ${key}: ${propError.message}`);
        }
      }

      console.log('[Settings Panel] ========================================');
      console.log('[Settings Panel] ✅ All settings saved successfully!');
      console.log('[Settings Panel] ========================================');
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('[Settings Panel] ========================================');
      console.error('[Settings Panel] ❌ Error saving settings');
      console.error('[Settings Panel] ========================================');
      console.error('[Settings Panel] Error details:');
      console.error('[Settings Panel]   - Error name:', error.name);
      console.error('[Settings Panel]   - Error message:', error.message);
      console.error('[Settings Panel]   - Error stack:', error.stack);
      console.error('[Settings Panel]   - Full error object:', error);
      console.error('[Settings Panel] ========================================');
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

