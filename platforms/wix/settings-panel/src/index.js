import React from 'react';
import ReactDOM from 'react-dom/client';
import SettingsPanel from './SettingsPanel.jsx';
import './styles.css';

// Render the settings panel
const root = ReactDOM.createRoot(document.getElementById('settings-root'));
root.render(<SettingsPanel />);

