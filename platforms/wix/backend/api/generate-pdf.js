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
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`[Wix API] [${requestId}] POST /wix/api/generate-pdf - Request received`);
  console.log(`[Wix API] [${requestId}] Request headers:`, {
    'content-type': req.headers['content-type'],
    'authorization': req.headers.authorization ? `Present (${req.headers.authorization.length} chars)` : 'Missing',
    'origin': req.headers.origin,
    'user-agent': req.headers['user-agent']?.substring(0, 50) + '...',
    'referer': req.headers.referer
  });
  console.log(`[Wix API] [${requestId}] Request body:`, {
    url: req.body?.url,
    hasOptions: !!req.body?.options,
    optionsKeys: req.body?.options ? Object.keys(req.body.options) : []
  });
  
  try {
    const { url, options } = req.body;

    // Validate input
    if (!url) {
      console.error(`[Wix API] [${requestId}] ❌ Validation failed: URL is required`);
      return res.status(400).json({ 
        error: 'URL is required' 
      });
    }

    // Get access token from Authorization header
    const accessToken = req.headers.authorization;
    console.log(`[Wix API] [${requestId}] Access token check:`, accessToken ? 'Present' : 'Missing');
    
    if (!accessToken) {
      console.error(`[Wix API] [${requestId}] ❌ Unauthorized: Access token missing from Authorization header`);
      console.error(`[Wix API] [${requestId}] Available headers:`, Object.keys(req.headers));
      return res.status(401).json({ 
        error: 'Access token required',
        details: 'This endpoint requires Wix access token. Make sure the widget is properly installed on a Wix site.'
      });
    }
    
    console.log(`[Wix API] [${requestId}] Access token preview:`, accessToken.substring(0, 30) + '...');

    // Get API key from Wix Secrets Manager using the access token
    let apiKey;
    try {
      console.log(`[Wix API] [${requestId}] Retrieving API key from Secrets Manager...`);
      apiKey = await getApiKey(accessToken);
      console.log(`[Wix API] [${requestId}] ✅ API key retrieved successfully`);
      console.log(`[Wix API] [${requestId}] API key preview:`, apiKey ? `${apiKey.substring(0, 10)}...` : 'null');
    } catch (error) {
      console.error(`[Wix API] [${requestId}] ❌ Failed to retrieve API key:`, error);
      console.error(`[Wix API] [${requestId}] Error details:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        error: 'Failed to retrieve API key',
        details: error.message
      });
    }

    // Determine the PDF API base URL
    // In production, this should be your deployed PDF API
    // For now, assume it's running on the same server
    const pdfApiUrl = process.env.PDF_API_URL || 'http://localhost:3000/api/v1';
    console.log(`[Wix API] [${requestId}] PDF API URL:`, pdfApiUrl);

    // Call the PDF generation API
    console.log(`[Wix API] [${requestId}] Calling PDF generation API...`);
    const pdfApiRequest = {
      url,
      options
    };
    console.log(`[Wix API] [${requestId}] PDF API request:`, {
      url: pdfApiRequest.url,
      optionsKeys: Object.keys(pdfApiRequest.options || {})
    });
    
    const response = await axios.post(`${pdfApiUrl}/jobs`, pdfApiRequest, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[Wix API] [${requestId}] ✅ PDF API response:`, {
      status: response.status,
      hasJobId: !!response.data?.jobId,
      hasPdf: !!response.data?.pdf
    });

    // Return the job information
    res.json(response.data);

  } catch (error) {
    console.error(`[Wix API] [${requestId}] ❌ Error generating PDF:`, error);
    console.error(`[Wix API] [${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null
    });
    
    // Handle axios errors
    if (error.response) {
      console.error(`[Wix API] [${requestId}] Axios error response:`, {
        status: error.response.status,
        data: error.response.data
      });
      return res.status(error.response.status).json({
        error: error.response.data.error || 'Failed to generate PDF',
        details: error.response.data.details || error.message
      });
    }

    console.error(`[Wix API] [${requestId}] Non-axios error, returning 500`);
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
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { jobId } = req.params;
  
  console.log(`[Wix API] [${requestId}] GET /wix/api/generate-pdf/${jobId} - Request received`);
  console.log(`[Wix API] [${requestId}] Request headers:`, {
    'authorization': req.headers.authorization ? `Present (${req.headers.authorization.length} chars)` : 'Missing',
    'origin': req.headers.origin
  });
  
  try {
    // Get access token from Authorization header
    const accessToken = req.headers.authorization;
    console.log(`[Wix API] [${requestId}] Access token check:`, accessToken ? 'Present' : 'Missing');
    
    if (!accessToken) {
      console.error(`[Wix API] [${requestId}] ❌ Unauthorized: Access token missing`);
      return res.status(401).json({ 
        error: 'Access token required',
        details: 'This endpoint requires Wix access token.'
      });
    }

    // Get API key from Secrets Manager using the access token
    console.log(`[Wix API] [${requestId}] Retrieving API key for job status check...`);
    const apiKey = await getApiKey(accessToken);
    console.log(`[Wix API] [${requestId}] ✅ API key retrieved`);

    // Determine the PDF API base URL
    const pdfApiUrl = process.env.PDF_API_URL || 'http://localhost:3000/api/v1';
    console.log(`[Wix API] [${requestId}] Checking job status at: ${pdfApiUrl}/jobs/${jobId}`);

    // Check job status
    const response = await axios.get(`${pdfApiUrl}/jobs/${jobId}`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    console.log(`[Wix API] [${requestId}] ✅ Job status retrieved:`, {
      status: response.data?.status,
      hasResult: !!response.data?.result
    });

    res.json(response.data);

  } catch (error) {
    console.error(`[Wix API] [${requestId}] ❌ Error checking job status:`, error);
    console.error(`[Wix API] [${requestId}] Error details:`, {
      message: error.message,
      stack: error.stack,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : null
    });
    
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

