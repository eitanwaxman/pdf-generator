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

      // Prepare headers with app instance for authentication
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add app instance for backend authentication
      if (config.appInstance) {
        headers['Authorization'] = config.appInstance;
        console.log('Sending authenticated request with app instance');
      } else {
        console.warn('No app instance available - request may fail');
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
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // If job-based, poll for completion
      if (result.jobId) {
        const pdf = await pollForJobCompletion(backendUrl, result.jobId, config.appInstance);
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

  const pollForJobCompletion = async (backendUrl, jobId, appInstance, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      // Prepare headers with app instance
      const headers = {};
      if (appInstance) {
        headers['Authorization'] = appInstance;
      }

      const statusResponse = await fetch(`${backendUrl}/${jobId}`, { headers });
      if (!statusResponse.ok) {
        throw new Error('Failed to check job status');
      }

      const status = await statusResponse.json();

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

