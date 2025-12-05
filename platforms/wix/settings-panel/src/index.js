import React from 'react';
import ReactDOM from 'react-dom/client';
import SettingsPanel from './SettingsPanel.jsx';
import './styles.css';

// Bundle version - update this when deploying a new version
const BUNDLE_VERSION = '2.0.0'; // v2.0.0 - Added public API key authentication
const BUILD_TIMESTAMP = new Date().toISOString();

console.log('[PDF Settings Panel] ========================================');
console.log('[PDF Settings Panel] Loading');
console.log('[PDF Settings Panel] Bundle Version:', BUNDLE_VERSION);
console.log('[PDF Settings Panel] Build Timestamp:', BUILD_TIMESTAMP);
console.log('[PDF Settings Panel] ========================================');

// Render the settings panel
const root = ReactDOM.createRoot(document.getElementById('settings-root'));
root.render(<SettingsPanel />);

