const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { getApiKey } = require('../services/secrets');

const router = express.Router();

// Enable CORS for Wix domains
router.use(cors({
  origin: [
    /\.wix\.com$/,
    /\.editorx\.com$/,
    /\.wixsite\.com$/,
    'http://localhost:3000', // For local testing
  ],
  credentials: true
}));

/**
 * POST /wix/api/generate-pdf
 * Generate a PDF by calling the main PDF API with the API key from Secrets Manager
 */
router.post('/', async (req, res) => {
  try {
    const { url, options } = req.body;

    // Validate input
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required' 
      });
    }

    // Get Wix access token from Authorization header
    const accessToken = req.headers.authorization;
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Wix authorization token required' 
      });
    }

    // Get API key from Wix Secrets Manager using the access token
    let apiKey;
    try {
      apiKey = await getApiKey(accessToken);
    } catch (error) {
      console.error('Failed to retrieve API key:', error);
      return res.status(500).json({ 
        error: 'Failed to retrieve API key',
        details: error.message
      });
    }

    // Determine the PDF API base URL
    // In production, this should be your deployed PDF API
    // For now, assume it's running on the same server
    const pdfApiUrl = process.env.PDF_API_URL || 'http://localhost:3000/api/v1';

    // Call the PDF generation API
    const response = await axios.post(`${pdfApiUrl}/jobs`, {
      url,
      options
    }, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Return the job information
    res.json(response.data);

  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Handle axios errors
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.error || 'Failed to generate PDF',
        details: error.response.data.details || error.message
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

/**
 * GET /wix/api/generate-pdf/:jobId
 * Check the status of a PDF generation job
 */
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get Wix access token from Authorization header
    const accessToken = req.headers.authorization;
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Wix authorization token required' 
      });
    }

    // Get API key from Secrets Manager using the access token
    const apiKey = await getApiKey(accessToken);

    // Determine the PDF API base URL
    const pdfApiUrl = process.env.PDF_API_URL || 'http://localhost:3000/api/v1';

    // Check job status
    const response = await axios.get(`${pdfApiUrl}/jobs/${jobId}`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    res.json(response.data);

  } catch (error) {
    console.error('Error checking job status:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data.error || 'Failed to check job status',
        details: error.response.data.details || error.message
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = router;

