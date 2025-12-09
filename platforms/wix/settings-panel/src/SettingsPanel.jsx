import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  // Store widgetApi in ref so it's available throughout component lifecycle
  const widgetApiRef = useRef(null);
  const debounceTimersRef = useRef({});
  
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
    buttonIcon: 'default',
    buttonIconPosition: 'left',
    buttonBgColor: '#116dff',
    buttonTextColor: '#ffffff',
    buttonFontSize: '16px',
    buttonBorderRadius: '8px',
    buttonPaddingX: '24px',
    buttonPaddingY: '12px',
    buttonCustomCss: '',
    buttonAdvancedCssEnabled: false,
    dataParams: []
  });
  const [activeTab, setActiveTab] = useState('general');

  // Map React state field names to widget property keys (kebab-case)
  const getWidgetPropertyKey = (fieldName) => {
    const mapping = {
      publicApiKey: 'public-api-key',
      urlSource: 'url-source',
      customUrl: 'custom-url',
      pdfFormat: 'pdf-format',
      pdfMarginTop: 'pdf-margin-top',
      pdfMarginRight: 'pdf-margin-right',
      pdfMarginBottom: 'pdf-margin-bottom',
      pdfMarginLeft: 'pdf-margin-left',
      formFactor: 'form-factor',
      outputType: 'output-type',
      screenshotType: 'screenshot-type',
      screenshotQuality: 'screenshot-quality',
      screenshotFullPage: 'screenshot-full-page',
      viewportWidth: 'viewport-width',
      viewportHeight: 'viewport-height',
      buttonText: 'button-text',
      buttonCss: 'button-css',
      buttonIcon: 'button-icon',
      buttonIconPosition: 'button-icon-position',
      buttonBgColor: 'button-bg-color',
      buttonTextColor: 'button-text-color',
      buttonFontSize: 'button-font-size',
      buttonBorderRadius: 'button-border-radius',
      buttonPaddingX: 'button-padding-x',
      buttonPaddingY: 'button-padding-y',
      buttonAdvancedCssEnabled: 'button-advanced-css-enabled',
      buttonCustomCss: 'button-custom-css'
    };
    return mapping[fieldName] || fieldName;
  };

  // Update widget property immediately (with debouncing for text inputs)
  const updateWidgetProperty = useCallback(async (fieldName, value, debounceMs = 0) => {
    if (!widgetApiRef.current) {
      console.warn('[Settings Panel] Widget API not available yet');
      return;
    }

    const widgetKey = getWidgetPropertyKey(fieldName);
    let widgetValue = value;

    // Convert value to string format expected by widget
    if (fieldName === 'screenshotQuality') {
      widgetValue = String(value);
    } else if (fieldName === 'screenshotFullPage') {
      widgetValue = String(value !== false);
    } else if (fieldName === 'dataParams') {
      // Convert dataParams array to JSON string
      const data = {};
      value.forEach(param => {
        if (param.key && param.value) {
          data[param.key] = param.value;
        }
      });
      widgetValue = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
    } else {
      widgetValue = value || '';
    }

    const updateFn = async () => {
      try {
        console.log(`[Settings Panel] Updating widget property: ${widgetKey} = ${widgetValue.length > 50 ? widgetValue.substring(0, 50) + '...' : widgetValue}`);
        await widgetApiRef.current.setProp(widgetKey, widgetValue);
        console.log(`[Settings Panel] ✅ ${widgetKey} updated successfully`);
      } catch (error) {
        console.error(`[Settings Panel] ❌ Failed to update ${widgetKey}:`, error);
      }
    };

    // Debounce text inputs to avoid too many API calls
    if (debounceMs > 0) {
      // Clear existing timer for this field
      if (debounceTimersRef.current[fieldName]) {
        clearTimeout(debounceTimersRef.current[fieldName]);
      }
      // Set new timer
      debounceTimersRef.current[fieldName] = setTimeout(updateFn, debounceMs);
    } else {
      // Update immediately for non-text inputs (selects, radios, checkboxes)
      await updateFn();
    }
  }, []);

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
        
        // Get widget API and store in ref
        const widgetApi = wixClient.use(widget);
        widgetApiRef.current = widgetApi; // Store for immediate updates
        console.log('[Settings Panel] ✅ Widget API obtained and stored in ref');
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
          'button-css',
          'button-icon',
          'button-icon-position',
          'button-bg-color',
          'button-text-color',
          'button-font-size',
          'button-border-radius',
          'button-padding-x',
          'button-padding-y',
          'button-advanced-css-enabled',
          'button-custom-css',
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
            } else if (key === 'button-css') {
              loadedSettings.buttonCustomCss = value || '';
            } else if (key === 'button-icon') {
              loadedSettings.buttonIcon = value || 'default';
            } else if (key === 'button-icon-position') {
              loadedSettings.buttonIconPosition = value || 'left';
            } else if (key === 'button-bg-color') {
              loadedSettings.buttonBgColor = value || '#116dff';
            } else if (key === 'button-text-color') {
              loadedSettings.buttonTextColor = value || '#ffffff';
            } else if (key === 'button-font-size') {
              loadedSettings.buttonFontSize = value || '16px';
            } else if (key === 'button-border-radius') {
              loadedSettings.buttonBorderRadius = value || '8px';
            } else if (key === 'button-padding-x') {
              loadedSettings.buttonPaddingX = value || '24px';
            } else if (key === 'button-padding-y') {
              loadedSettings.buttonPaddingY = value || '12px';
            } else if (key === 'button-advanced-css-enabled') {
              loadedSettings.buttonAdvancedCssEnabled = value === 'true';
            } else if (key === 'button-custom-css') {
              loadedSettings.buttonCustomCss = value || '';
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
    
    // Cleanup: clear all debounce timers on unmount
    return () => {
      Object.values(debounceTimersRef.current).forEach(timer => {
        if (timer) clearTimeout(timer);
      });
      debounceTimersRef.current = {};
    };
  }, []);

  // Handle field changes - update both state and widget immediately
  const handleChange = useCallback((field, value, debounceMs = 300) => {
    // Update React state for UI responsiveness
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update widget immediately (with debouncing for text inputs)
    updateWidgetProperty(field, value, debounceMs);
  }, [updateWidgetProperty]);

  const handleAddDataParam = useCallback(() => {
    setSettings(prev => {
      const newDataParams = [...prev.dataParams, { key: '', value: '' }];
      // Update widget with new dataParams
      updateWidgetProperty('dataParams', newDataParams, 0);
      return {
        ...prev,
        dataParams: newDataParams
      };
    });
  }, [updateWidgetProperty]);

  const handleRemoveDataParam = useCallback((index) => {
    setSettings(prev => {
      const newDataParams = prev.dataParams.filter((_, i) => i !== index);
      // Update widget with updated dataParams
      updateWidgetProperty('dataParams', newDataParams, 0);
      return {
        ...prev,
        dataParams: newDataParams
      };
    });
  }, [updateWidgetProperty]);

  const handleDataParamChange = useCallback((index, field, value) => {
    setSettings(prev => {
      const newDataParams = [...prev.dataParams];
      newDataParams[index][field] = value;
      // Update widget with updated dataParams
      updateWidgetProperty('dataParams', newDataParams, 300); // Debounce text changes
      return {
        ...prev,
        dataParams: newDataParams
      };
    });
  }, [updateWidgetProperty]);

  const handleDesignFieldChange = useCallback((field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const buildButtonCss = useCallback((state) => {
    const parts = [];

    if (state.buttonBgColor) parts.push(`background-color: ${state.buttonBgColor};`);
    if (state.buttonTextColor) parts.push(`color: ${state.buttonTextColor};`);
    if (state.buttonFontSize) parts.push(`font-size: ${state.buttonFontSize};`);
    if (state.buttonBorderRadius) parts.push(`border-radius: ${state.buttonBorderRadius};`);
    const padding = state.buttonPaddingY && state.buttonPaddingX
      ? `${state.buttonPaddingY} ${state.buttonPaddingX}`
      : '';
    if (padding) parts.push(`padding: ${padding};`);
    if (state.buttonAdvancedCssEnabled && state.buttonCustomCss) parts.push(state.buttonCustomCss);

    return parts.join(' ');
  }, []);

  useEffect(() => {
    const css = buildButtonCss(settings);
    updateWidgetProperty('buttonCss', css, 300);
    // Persist design inputs so the panel reloads with user selections
    updateWidgetProperty('buttonBgColor', settings.buttonBgColor || '', 0);
    updateWidgetProperty('buttonTextColor', settings.buttonTextColor || '', 0);
    updateWidgetProperty('buttonFontSize', settings.buttonFontSize || '', 0);
    updateWidgetProperty('buttonBorderRadius', settings.buttonBorderRadius || '', 0);
    updateWidgetProperty('buttonPaddingX', settings.buttonPaddingX || '', 0);
    updateWidgetProperty('buttonPaddingY', settings.buttonPaddingY || '', 0);
    updateWidgetProperty('buttonAdvancedCssEnabled', String(!!settings.buttonAdvancedCssEnabled), 0);
    updateWidgetProperty('buttonCustomCss', settings.buttonCustomCss || '', 0);
  }, [
    buildButtonCss,
    settings.buttonBgColor,
    settings.buttonTextColor,
    settings.buttonFontSize,
    settings.buttonBorderRadius,
    settings.buttonPaddingX,
    settings.buttonPaddingY,
    settings.buttonCustomCss,
    settings.buttonAdvancedCssEnabled,
    updateWidgetProperty
  ]);

  const computedButtonCss = buildButtonCss(settings);


  return (
    <div id="settings-root">
      <div className="tab-list">
        <button
          type="button"
          className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === 'design' ? 'active' : ''}`}
          onClick={() => setActiveTab('design')}
        >
          Design
        </button>
      </div>

      {activeTab === 'general' && (
        <>
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
              onChange={(e) => handleChange('publicApiKey', e.target.value, 300)}
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
                  onChange={(e) => handleChange('urlSource', e.target.value, 0)}
                  style={{ marginRight: '8px' }}
                />
                Current Page URL
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  value="custom"
                  checked={settings.urlSource === 'custom'}
                  onChange={(e) => handleChange('urlSource', e.target.value, 0)}
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
                onChange={(e) => handleChange('customUrl', e.target.value, 300)}
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
              onChange={(e) => handleChange('outputType', e.target.value, 0)}
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
                  onChange={(e) => handleChange('pdfFormat', e.target.value, 0)}
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
                      onChange={(e) => handleChange('pdfMarginTop', e.target.value, 300)}
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
                      onChange={(e) => handleChange('pdfMarginRight', e.target.value, 300)}
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
                      onChange={(e) => handleChange('pdfMarginBottom', e.target.value, 300)}
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
                      onChange={(e) => handleChange('pdfMarginLeft', e.target.value, 300)}
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
                  onChange={(e) => handleChange('screenshotType', e.target.value, 0)}
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
                  onChange={(e) => handleChange('screenshotQuality', parseInt(e.target.value), 300)}
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
                    onChange={(e) => handleChange('screenshotFullPage', e.target.checked, 0)}
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
              onChange={(e) => handleChange('formFactor', e.target.value, 0)}
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
                  onChange={(e) => handleChange('viewportWidth', e.target.value, 300)}
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
                  onChange={(e) => handleChange('viewportHeight', e.target.value, 300)}
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
        </>
      )}

      {activeTab === 'design' && (
        <>
          <div className="settings-section">
            <h3 className="settings-section-title">Button Text</h3>
            <input
              type="text"
              placeholder="Generate PDF"
              value={settings.buttonText}
              onChange={(e) => handleChange('buttonText', e.target.value, 300)}
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
            <h3 className="settings-section-title">Button Icon</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              Use <code>default</code> for the built-in icon, <code>none</code> to hide it, or paste a URL / inline <code>&lt;svg&gt;</code>.
            </p>
            <input
              type="text"
              placeholder="default, none, https://... or <svg>...</svg>"
              value={settings.buttonIcon}
              onChange={(e) => handleChange('buttonIcon', e.target.value, 300)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '10px'
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className="outline-btn"
                onClick={() => handleChange('buttonIcon', 'default', 0)}
              >
                Use Default Icon
              </button>
              <button
                type="button"
                className="outline-btn"
                onClick={() => handleChange('buttonIcon', 'none', 0)}
              >
                Hide Icon
              </button>
            </div>
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}>
                Icon Position
              </label>
              <select
                value={settings.buttonIconPosition}
                onChange={(e) => handleChange('buttonIconPosition', e.target.value, 0)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="left">Left of text</option>
                <option value="right">Right of text</option>
                <option value="top">Above text</option>
                <option value="bottom">Below text</option>
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Button Appearance</h3>
            <div className="field-group">
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}>Background</label>
                <input
                  type="color"
                  value={settings.buttonBgColor}
                  onChange={(e) => handleDesignFieldChange('buttonBgColor', e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}>Text Color</label>
                <input
                  type="color"
                  value={settings.buttonTextColor}
                  onChange={(e) => handleDesignFieldChange('buttonTextColor', e.target.value)}
                  style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
            <div className="field-group" style={{ marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}>Font Size</label>
                <input
                  type="text"
                  placeholder="16px"
                  value={settings.buttonFontSize}
                  onChange={(e) => handleDesignFieldChange('buttonFontSize', e.target.value)}
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
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}>Border Radius</label>
                <input
                  type="text"
                  placeholder="8px"
                  value={settings.buttonBorderRadius}
                  onChange={(e) => handleDesignFieldChange('buttonBorderRadius', e.target.value)}
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
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#666' }}>Padding</label>
              <div className="field-group">
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#666' }}>Vertical</label>
                  <input
                    type="text"
                    placeholder="12px"
                    value={settings.buttonPaddingY}
                    onChange={(e) => handleDesignFieldChange('buttonPaddingY', e.target.value)}
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
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: '#666' }}>Horizontal</label>
                  <input
                    type="text"
                    placeholder="24px"
                    value={settings.buttonPaddingX}
                    onChange={(e) => handleDesignFieldChange('buttonPaddingX', e.target.value)}
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
          </div>

          <div className="settings-section">
            <h3 className="settings-section-title">Advanced CSS (optional)</h3>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              Additional CSS rules are appended to the generated styles. Keep selectors to button-level properties (e.g., <code>box-shadow</code>, <code>letter-spacing</code>).
            </p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '14px', color: '#162d3d' }}>
              <input
                type="checkbox"
                checked={settings.buttonAdvancedCssEnabled}
                onChange={(e) => handleDesignFieldChange('buttonAdvancedCssEnabled', e.target.checked)}
              />
              Enable custom CSS overrides
            </label>
            <textarea
              rows={4}
              placeholder="box-shadow: 0 4px 12px rgba(0,0,0,0.12);"
              value={settings.buttonCustomCss}
              onChange={(e) => handleDesignFieldChange('buttonCustomCss', e.target.value)}
              disabled={!settings.buttonAdvancedCssEnabled}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '13px',
                backgroundColor: settings.buttonAdvancedCssEnabled ? 'white' : '#f5f5f5',
                color: settings.buttonAdvancedCssEnabled ? '#111' : '#888'
              }}
            />
            <div className="css-preview">
              <div style={{ fontWeight: 600, marginBottom: '6px', color: '#162d3d' }}>Generated CSS</div>
              <pre>{computedButtonCss || 'Defaults only (no overrides set).'}</pre>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsPanel;

