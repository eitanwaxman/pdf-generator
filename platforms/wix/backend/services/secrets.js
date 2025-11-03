const axios = require('axios');
const { createClient, AppStrategy } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

/**
 * Get instance ID from access token by calling Wix token-info endpoint
 * @param {string} accessToken - The access token from frontend
 * @returns {Promise<string>} - The instance ID
 */
async function getInstanceIdFromToken(accessToken) {
  try {
    const response = await axios.post(
      'https://www.wixapis.com/oauth2/token-info',
      { token: accessToken }
    );
    
    const instanceId = response.data.instanceId;
    console.log('Instance ID from token:', instanceId);
    return instanceId;
  } catch (error) {
    console.error('Error decoding token:', error);
    throw new Error(`Failed to decode access token: ${error.message}`);
  }
}

/**
 * Retrieve the PDF API key from Wix Secrets Manager using access token
 * Uses AppStrategy with elevated permissions to access Secrets Manager
 * @param {string} accessToken - The access token from frontend Authorization header
 * @param {string} secretName - Name of the secret in Wix Secrets Manager (default: PDF_API_KEY)
 * @returns {Promise<string>} - The API key value
 */
async function getApiKey(accessToken, secretName = 'PDF_API_KEY') {
  try {
    // Get app credentials from environment
    const APP_ID = process.env.WIX_APP_ID || 'b715943d-8922-43a5-8728-c77c19d77879';
    const APP_SECRET = process.env.WIX_APP_SECRET;
    
    if (!APP_SECRET) {
      throw new Error('WIX_APP_SECRET environment variable not configured');
    }

    // Decode token to get instance ID (for logging purposes)
    const instanceId = await getInstanceIdFromToken(accessToken);
    console.log('Accessing Secrets Manager for instance:', instanceId);
    
    // Create elevated client using AppStrategy
    // This gives backend elevated permissions to access Secrets Manager
    const elevatedClient = createClient({
      auth: await AppStrategy({
        appId: APP_ID,
        appSecret: APP_SECRET,
        accessToken: accessToken
      }).elevated(),
      modules: { secrets }
    });

    // Get secret from this site's Secrets Manager
    const secret = await elevatedClient.secrets.getSecretValue(secretName);
    
    if (!secret || !secret.value) {
      throw new Error(
        `Secret '${secretName}' not found in Secrets Manager. ` +
        `Site owner needs to add this secret in Wix Dashboard → Secrets Manager.`
      );
    }

    console.log('Successfully retrieved API key for instance:', instanceId);
    return secret.value;
  } catch (error) {
    console.error('Error retrieving API key:', error);
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
}

module.exports = {
  getApiKey,
  getInstanceIdFromToken
};

