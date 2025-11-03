const { createClient } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

/**
 * Retrieve the PDF API key from Wix Secrets Manager
 * @param {string} accessToken - Wix access token from the frontend
 * @param {string} secretName - Name of the secret in Wix Secrets Manager
 * @returns {Promise<string>} - The API key
 */
async function getApiKey(accessToken, secretName = 'PDF_API_KEY') {
  try {
    // Create a Wix client using the access token from the frontend
    // This allows us to access the correct site instance's Secrets Manager
    const wixClient = createClient({
      auth: {
        getAuthHeaders: () => ({ Authorization: accessToken })
      },
      modules: { secrets }
    });
    
    // Get the secret value from the site's Secrets Manager
    const secret = await wixClient.secrets.getSecretValue(secretName);
    
    if (!secret || !secret.value) {
      throw new Error(`Secret '${secretName}' not found in Secrets Manager`);
    }
    
    console.log('Successfully retrieved API key from Wix Secrets Manager');
    return secret.value;
  } catch (error) {
    console.error('Error retrieving secret from Wix Secrets Manager:', error);
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
}

module.exports = {
  getApiKey
};

