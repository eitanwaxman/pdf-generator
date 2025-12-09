import React, { useState } from 'react';

const PdfButton = ({ config }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const generatePdf = async () => {
    console.log('[PDF Button] generatePdf() called');
    console.log('[PDF Button] Config received:', {
      ...config,
      publicApiKey: config.publicApiKey ? `Present (${config.publicApiKey.substring(0, 15)}...)` : 'Missing'
    });
    
    // Check if API key is configured
    if (!config.publicApiKey) {
      setError('Please configure your Public API Key in the widget settings');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Determine the URL to convert
      const urlToConvert = config.urlSource === 'custom' && config.customUrl
        ? config.customUrl
        : window.location.href;
      
      console.log('[PDF Button] URL to convert:', urlToConvert);
      console.log('[PDF Button] URL source:', config.urlSource);

      // Prepare options for PDF generation
      const options = {
        outputType: config.outputType || 'pdf',
        responseType: 'buffer',
        platform: 'wix', // Always use wix platform
        formFactor: config.formFactor
      };
      
      console.log('[PDF Button] PDF options:', options);

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

      // Use Docuskribe main API endpoint
      const backendUrl = 'https://www.docuskribe.com/api/v1/jobs';
      
      console.log('[PDF Button] Calling PDF API at:', backendUrl);

      // Prepare headers with public API key for authentication
      const headers = {
        'Content-Type': 'application/json',
        'X-Public-Key': config.publicApiKey
      };
      
      console.log('[PDF Button] Request headers:', {
        'Content-Type': 'application/json',
        'X-Public-Key': config.publicApiKey ? `${config.publicApiKey.substring(0, 15)}...` : 'Missing'
      });

      // Call backend API
      const requestBody = {
        url: urlToConvert,
        options
      };
      
      console.log('[PDF Button] Sending POST request to:', backendUrl);
      console.log('[PDF Button] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      console.log('[PDF Button] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        // Check if response is JSON or HTML
        const contentType = response.headers.get('content-type') || '';
        console.error('[PDF Button] ❌ Request failed with status:', response.status);
        console.error('[PDF Button] Response content-type:', contentType);
        
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          console.error('[PDF Button] Error response data:', errorData);
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        } else {
          // Likely got HTML error page (wrong domain)
          const text = await response.text();
          console.error('[PDF Button] Non-JSON error response (first 200 chars):', text.substring(0, 200));
          throw new Error(`HTTP error! status: ${response.status}. The request may have been sent to the wrong domain. Check that the API URL is correct.`);
        }
      }
      
      console.log('[PDF Button] ✅ Request successful');

      // Parse JSON response
      let result;
      try {
        result = await response.json();
        console.log('[PDF Button] Response parsed successfully:', {
          hasJobId: !!result.jobId,
          hasPdf: !!result.pdf,
          keys: Object.keys(result)
        });
      } catch (e) {
        const text = await response.text();
        console.error('[PDF Button] ❌ Failed to parse JSON response:', e);
        console.error('[PDF Button] Response text (first 200 chars):', text.substring(0, 200));
        throw new Error(`Invalid JSON response from API. The request may have been sent to the wrong domain. Response: ${text.substring(0, 100)}...`);
      }

      // If job-based, poll for completion
      if (result.jobId) {
        console.log('[PDF Button] Job-based response, starting polling for jobId:', result.jobId);
        const outputData = await pollForJobCompletion(backendUrl, result.jobId, config.publicApiKey);
        await handlePdfResult(outputData, config.outputType);
      } else if (result.result) {
        // Direct result (synchronous generation)
        console.log('[PDF Button] Direct result received');
        const outputData = result.result.pdf || result.result.screenshot;
        await handlePdfResult(outputData, config.outputType);
      } else {
        console.error('[PDF Button] ❌ Invalid response structure:', result);
        throw new Error('Invalid response from backend');
      }

      console.log('[PDF Button] ✅ PDF generation completed successfully');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('[PDF Button] ❌ Error generating PDF:', err);
      console.error('[PDF Button] Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || 'Failed to generate PDF');
    } finally {
      setLoading(false);
      console.log('[PDF Button] generatePdf() completed');
    }
  };

  const pollForJobCompletion = async (backendUrl, jobId, publicApiKey, maxAttempts = 60) => {
    console.log('[PDF Button] Starting job polling:', { jobId, maxAttempts, publicApiKey: publicApiKey ? 'Present' : 'Missing' });
    const POLL_INTERVAL_MS = 5000; // Poll at most once every 5 seconds (rate limit)
    
    for (let i = 0; i < maxAttempts; i++) {
      // Wait 5 seconds between polls (or before first poll if i > 0)
      if (i > 0) {
        console.log(`[PDF Button] Polling attempt ${i + 1}/${maxAttempts}, waiting ${POLL_INTERVAL_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      } else {
        console.log(`[PDF Button] Initial poll attempt ${i + 1}/${maxAttempts}`);
      }

      // Prepare headers with public API key
      const headers = {
        'X-Public-Key': publicApiKey
      };
      console.log('[PDF Button] Poll request includes X-Public-Key header');

      const pollUrl = `${backendUrl}/${jobId}`;
      console.log('[PDF Button] Polling job status at:', pollUrl);
      
      const statusResponse = await fetch(pollUrl, { headers });
      
      console.log('[PDF Button] Poll response:', {
        status: statusResponse.status,
        statusText: statusResponse.statusText,
        ok: statusResponse.ok
      });
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
        console.log('[PDF Button] ✅ Job completed successfully');
        // Main API returns result.pdf or result.screenshot depending on output type
        const outputData = status.result?.pdf || status.result?.screenshot;
        if (!outputData) {
          throw new Error('No output data in completed job result');
        }
        return outputData;
      } else if (status.status === 'failed') {
        console.error('[PDF Button] ❌ Job failed:', status.error);
        throw new Error(status.error || 'PDF generation failed');
      } else {
        console.log('[PDF Button] Job still processing, status:', status.status);
      }
      // Continue polling if still processing
    }

    console.error('[PDF Button] ❌ Job polling timed out after', maxAttempts, 'attempts');
    throw new Error('PDF generation timed out');
  };

  const handlePdfResult = async (outputBase64, outputType = 'pdf') => {
    try {
      // Determine content type and file extension based on output type
      let contentType, fileExtension;
      
      if (outputType === 'screenshot') {
        const screenshotType = config.screenshotType || 'png';
        contentType = `image/${screenshotType}`;
        fileExtension = screenshotType;
      } else {
        contentType = 'application/pdf';
        fileExtension = 'pdf';
      }
      
      // Convert base64 to blob
      const blob = base64ToBlob(outputBase64, contentType);

      // Download to user's device
      const filename = `document-${Date.now()}.${fileExtension}`;
      downloadBlob(blob, filename);
      
      console.log('[PDF Button] ✅ File downloaded:', filename);
    } catch (err) {
      console.error('[PDF Button] ❌ Error handling output:', err);
      throw new Error('Failed to process output file');
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

  const iconPosition = config.buttonIconPosition || 'left';
  const iconSource = config.buttonIcon || 'default';
  const shouldShowIcon = iconSource && iconSource !== 'none';
  const iconFirst = iconPosition === 'left' || iconPosition === 'top';
  const buttonClasses = ['pdf-btn', `icon-pos-${iconPosition}`].join(' ');

  const renderIcon = () => {
    if (!shouldShowIcon) return null;

    const trimmed = iconSource.trim();

    if (trimmed === 'default') {
      return (
        <svg className="pdf-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }

    // Inline SVG provided as string
    if (trimmed.startsWith('<svg')) {
      return (
        <span
          className="pdf-btn-icon"
          aria-hidden="true"
          focusable="false"
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      );
    }

    // Otherwise treat as URL
    return <img className="pdf-btn-icon pdf-btn-icon-img" src={iconSource} alt="" aria-hidden="true" />;
  };

  return (
    <div className="pdf-generator-button">
      <button
        className={buttonClasses}
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
            {iconFirst && renderIcon()}
            <span>{config.buttonText || 'Generate PDF'}</span>
            {!iconFirst && renderIcon()}
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

