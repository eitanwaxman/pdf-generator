const { secrets } = require('@wix/secrets');

/**
 * Retrieve the PDF API key from Wix Secrets Manager
 * @param {string} secretName - Name of the secret in Wix Secrets Manager
 * @returns {Promise<string>} - The API key
 */
async function getApiKey(secretName = 'PDF_API_KEY') {
  try {
    const secret = await secrets.getSecretValue(secretName);
    
    if (!secret || !secret.value) {
      throw new Error(`Secret '${secretName}' not found in Secrets Manager`);
    }
    
    return secret.value;
  } catch (error) {
    console.error('Error retrieving secret from Wix Secrets Manager:', error);
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
}

module.exports = {
  getApiKey
};

