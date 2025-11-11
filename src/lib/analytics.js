// src/lib/analytics.js

/**
 * Get measurement ID from environment or window
 */
function getMeasurementId() {
  return import.meta.env.VITE_GA_MEASUREMENT_ID || window.GA_MEASUREMENT_ID || 'G-R0VYHZVYYX'
}

/**
 * Initialize Google Analytics
 * Call this once when the app loads
 */
export function initGA(measurementId = null) {
  if (typeof window === 'undefined') {
    return
  }

  const id = measurementId || getMeasurementId()
  
  if (!id) {
    console.warn('Google Analytics measurement ID not found')
    return
  }

  // Check if GA is already initialized
  if (window.gtag) {
    return
  }

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || []
  function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', id, {
    page_path: window.location.pathname,
  })
}

/**
 * Track a page view
 */
export function trackPageView(path, title) {
  if (typeof window === 'undefined' || !window.gtag) {
    return
  }

  const measurementId = getMeasurementId()
  if (!measurementId) return

  window.gtag('config', measurementId, {
    page_path: path,
    page_title: title,
  })
}

/**
 * Track an event
 */
export function trackEvent(eventName, eventParams = {}) {
  if (typeof window === 'undefined' || !window.gtag) {
    return
  }

  window.gtag('event', eventName, eventParams)
}

/**
 * Track PDF generation
 */
export function trackPdfGenerated(jobId, url) {
  trackEvent('pdf_generated', {
    job_id: jobId,
    url: url,
  })
}

/**
 * Track API call
 */
export function trackApiCall(endpoint, method) {
  trackEvent('api_call', {
    endpoint: endpoint,
    method: method,
  })
}

/**
 * Track user sign up
 */
export function trackSignUp(method = 'email') {
  trackEvent('sign_up', {
    method: method,
  })
}

/**
 * Track user login
 */
export function trackLogin(method = 'email') {
  trackEvent('login', {
    method: method,
  })
}

/**
 * Track subscription/purchase
 */
export function trackPurchase(value, currency = 'USD', tier) {
  trackEvent('purchase', {
    value: value,
    currency: currency,
    tier: tier,
  })
}


