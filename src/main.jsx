import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initGA } from './lib/analytics'

// Initialize Google Analytics
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-R0VYHZVYYX'
if (gaMeasurementId) {
  initGA(gaMeasurementId)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

