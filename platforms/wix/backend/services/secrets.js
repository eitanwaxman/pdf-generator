const crypto = require('crypto');
const { createClient } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

/**
 * Parse and validate the Wix app instance
 * @param {string} instance - The signed app instance string from frontend
 * @param {string} appSecret - Your app's secret key from Wix Dashboard
 * @returns {Object} - Parsed instance data with instanceId, uid, etc.
 */
function parseInstance(instance, appSecret) {
  try {
    // Split the instance into signature and data
    const parts = instance.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid instance format - expected signature.data');
    }

    const [signature, encodedData] = parts;
    
    if (!signature || !encodedData) {
      throw new Error('Invalid instance format - missing signature or data');
    }

    // Verify the signature using HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(encodedData)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature - instance authentication failed');
    }

    // Decode the data (base64url)
    const decodedData = Buffer.from(encodedData, 'base64url').toString('utf-8');
    const instanceData = JSON.parse(decodedData);

    console.log('Instance validated successfully. Instance ID:', instanceData.instanceId);
    return instanceData;
  } catch (error) {
    console.error('Error parsing instance:', error);
    throw new Error(`Failed to parse instance: ${error.message}`);
  }
}

/**
 * Retrieve the PDF API key from Wix Secrets Manager using app instance
 * @param {string} appInstanceString - The app instance from frontend Authorization header
 * @param {string} secretName - Name of the secret in Wix Secrets Manager (default: PDF_API_KEY)
 * @returns {Promise<string>} - The API key value
 */
async function getApiKey(appInstanceString, secretName = 'PDF_API_KEY') {
  try {
    // Get app secret from environment
    const APP_SECRET = process.env.WIX_APP_SECRET;
    if (!APP_SECRET) {
      throw new Error('WIX_APP_SECRET environment variable not configured');
    }

    // Parse and validate the instance
    const instanceData = parseInstance(appInstanceString, APP_SECRET);
    
    console.log('Accessing Secrets Manager for instance:', instanceData.instanceId);

    // Create Wix client using the app instance for authentication
    const wixClient = createClient({
      auth: {
        getAuthHeaders: () => ({
          Authorization: appInstanceString
        })
      },
      modules: { secrets }
    });

    // Get the secret value from this site's Secrets Manager
    const secret = await wixClient.secrets.getSecretValue(secretName);
    
    if (!secret || !secret.value) {
      throw new Error(
        `Secret '${secretName}' not found in Secrets Manager. ` +
        `Site owner needs to add this secret in Wix Dashboard → Secrets Manager.`
      );
    }

    console.log('Successfully retrieved API key for instance:', instanceData.instanceId);
    return secret.value;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
}

module.exports = {
  getApiKey,
  parseInstance
};

