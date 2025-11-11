import React, { useState } from 'react';

const PdfButton = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const generatePdf = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Determine the URL to convert
      const urlToConvert = config.urlSource === 'custom' && config.customUrl
        ? config.customUrl
        : window.location.href;

      // Prepare options for PDF generation
      const options = {
        outputType: config.outputType || 'pdf',
        responseType: 'buffer',
        platform: 'wix', // Always use wix platform
        formFactor: config.formFactor
      };

      // Add PDF-specific options
      if (config.outputType === 'pdf' || !config.outputType) {
        options.pdfOptions = {
          format: config.pdfFormat || 'A4',
          margin: config.pdfMargin || {
            top: '50px',
            right: '50px',
            bottom: '50px',
            left: '50px'
          }
        };

        if (config.viewport) {
          options.pdfOptions.viewport = config.viewport;
        }
      }

      // Add screenshot-specific options
      if (config.outputType === 'screenshot') {
        options.screenshotOptions = {
          type: config.screenshotType || 'png',
          quality: config.screenshotQuality || 90,
          fullPage: config.screenshotFullPage !== false
        };

        if (config.viewport) {
          options.screenshotOptions.viewport = config.viewport;
        }
      }

      // Add query parameters if provided
      if (config.data) {
        options.data = config.data;
      }

      // Use Docuskribe API endpoint
      const backendUrl = 'https://www.docuskribe.com/wix/api/generate-pdf';
      
      console.log('Calling PDF API at:', backendUrl);

      // Prepare headers with access token for authentication
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add access token for backend authentication
      if (config.accessToken) {
        headers['Authorization'] = config.accessToken;
        console.log('Sending authenticated request with access token');
      } else {
        console.warn('No access token available - request may fail');
      }

      // Call backend API
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: urlToConvert,
          options
        })
      });

      if (!response.ok) {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
          // Likely got HTML error page (wrong domain)
          const text = await response.text();
          throw new Error(`HTTP error! status: ${response.status}. The request may have been sent to the wrong domain. Check that the API URL is correct.`);
        }
      }

      // Parse JSON response
      let result;
      try {
        result = await response.json();
      } catch (e) {
        const text = await response.text();
        throw new Error(`Invalid JSON response from API. The request may have been sent to the wrong domain. Response: ${text.substring(0, 100)}...`);
      }

      // If job-based, poll for completion
      if (result.jobId) {
        const pdf = await pollForJobCompletion(backendUrl, result.jobId, config.accessToken);
        await handlePdfResult(pdf);
      } else if (result.pdf) {
        // Direct PDF result
        await handlePdfResult(result.pdf);
      } else {
        throw new Error('Invalid response from backend');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const pollForJobCompletion = async (backendUrl, jobId, accessToken, maxAttempts = 60) => {
    const POLL_INTERVAL_MS = 5000; // Poll at most once every 5 seconds (rate limit)
    
    for (let i = 0; i < maxAttempts; i++) {
      // Wait 5 seconds between polls (or before first poll if i > 0)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      // Prepare headers with access token
      const headers = {};
      if (accessToken) {
        headers['Authorization'] = accessToken;
      }

      const statusResponse = await fetch(`${backendUrl}/${jobId}`, { headers });
      if (!statusResponse.ok) {
        const contentType = statusResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const errorData = await statusResponse.json();
          
          // Handle rate limit (429) - wait and retry
          if (statusResponse.status === 429) {
            console.log('⏳ Rate limited, waiting 5 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            continue; // Retry this iteration
          }
          
          throw new Error(errorData.error || `Failed to check job status: ${statusResponse.status}`);
        } else {
          const text = await statusResponse.text();
          throw new Error(`Failed to check job status. The request may have been sent to the wrong domain. Status: ${statusResponse.status}`);
        }
      }

      // Parse JSON response
      let status;
      try {
        status = await statusResponse.json();
      } catch (e) {
        const text = await statusResponse.text();
        throw new Error(`Invalid JSON response when checking job status. Response: ${text.substring(0, 100)}...`);
      }

      if (status.status === 'completed') {
        return status.result.pdf;
      } else if (status.status === 'failed') {
        throw new Error(status.error || 'PDF generation failed');
      }
      // Continue polling if still processing
    }

    throw new Error('PDF generation timed out');
  };

  const handlePdfResult = async (pdfBase64) => {
    try {
      // Convert base64 to blob
      const pdfBlob = base64ToBlob(pdfBase64, 'application/pdf');

      // Download PDF to user's device
      downloadBlob(pdfBlob, `document-${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error handling PDF:', err);
      throw new Error('Failed to process PDF');
    }
  };

  const base64ToBlob = (base64, contentType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pdf-generator-button">
      <button
        className="pdf-btn"
        onClick={generatePdf}
        disabled={loading}
      >
        {loading ? (
          <>
            <span className="pdf-btn-loading"></span>
            Generating...
          </>
        ) : (
          <>
            <svg className="pdf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {config.buttonText || 'Generate PDF'}
          </>
        )}
      </button>
      
      {error && (
        <div className="pdf-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="pdf-success">
          PDF generated successfully!
        </div>
      )}
    </div>
  );
};

export default PdfButton;

