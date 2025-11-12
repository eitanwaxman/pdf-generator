const axios = require('axios');
const { createClient, AppStrategy } = require('@wix/sdk');
const { secrets } = require('@wix/secrets');

/**
 * Get instance ID from access token by calling Wix token-info endpoint
 * @param {string} accessToken - The access token from frontend
 * @returns {Promise<string>} - The instance ID
 */
async function getInstanceIdFromToken(accessToken) {
  const logPrefix = '[Secrets Service]';
  console.log(`${logPrefix} getInstanceIdFromToken() called`);
  console.log(`${logPrefix} Access token preview:`, accessToken ? accessToken.substring(0, 30) + '...' : 'null');
  console.log(`${logPrefix} Access token length:`, accessToken?.length);
  
  try {
    console.log(`${logPrefix} Calling Wix token-info endpoint...`);
    const response = await axios.post(
      'https://www.wixapis.com/oauth2/token-info',
      { token: accessToken }
    );
    
    console.log(`${logPrefix} Token-info response status:`, response.status);
    console.log(`${logPrefix} Token-info response data:`, {
      instanceId: response.data?.instanceId,
      hasInstanceId: !!response.data?.instanceId,
      keys: Object.keys(response.data || {})
    });
    
    const instanceId = response.data.instanceId;
    if (!instanceId) {
      console.error(`${logPrefix} ❌ No instanceId in token-info response`);
      throw new Error('Instance ID not found in token-info response');
    }
    
    console.log(`${logPrefix} ✅ Instance ID retrieved:`, instanceId);
    return instanceId;
  } catch (error) {
    console.error(`${logPrefix} ❌ Error decoding token:`, error);
    console.error(`${logPrefix} Error details:`, {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      code: error.code
    });
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
  const logPrefix = '[Secrets Service]';
  console.log(`${logPrefix} getApiKey() called`);
  console.log(`${logPrefix} Secret name:`, secretName);
  console.log(`${logPrefix} Access token provided:`, accessToken ? 'Yes' : 'No');
  
  try {
    // Get app credentials from environment
    const APP_ID = process.env.WIX_APP_ID || 'b715943d-8922-43a5-8728-c77c19d77879';
    const APP_SECRET = process.env.WIX_APP_SECRET;
    
    console.log(`${logPrefix} APP_ID:`, APP_ID);
    console.log(`${logPrefix} APP_SECRET configured:`, APP_SECRET ? 'Yes' : 'No');
    
    if (!APP_SECRET) {
      console.error(`${logPrefix} ❌ WIX_APP_SECRET environment variable not configured`);
      throw new Error('WIX_APP_SECRET environment variable not configured');
    }

    // Decode token to get instance ID (for logging purposes)
    console.log(`${logPrefix} Getting instance ID from token...`);
    const instanceId = await getInstanceIdFromToken(accessToken);
    console.log(`${logPrefix} ✅ Instance ID retrieved:`, instanceId);
    console.log(`${logPrefix} Accessing Secrets Manager for instance:`, instanceId);
    
    // Create elevated client using AppStrategy
    // This gives backend elevated permissions to access Secrets Manager
    console.log(`${logPrefix} Creating elevated Wix client with AppStrategy...`);
    let elevatedClient;
    try {
      const appStrategy = AppStrategy({
        appId: APP_ID,
        appSecret: APP_SECRET,
        accessToken: accessToken
      });
      console.log(`${logPrefix} AppStrategy created, elevating permissions...`);
      const elevatedAuth = await appStrategy.elevated();
      console.log(`${logPrefix} ✅ Permissions elevated`);
      
      elevatedClient = createClient({
        auth: elevatedAuth,
        modules: { secrets }
      });
      console.log(`${logPrefix} ✅ Elevated client created`);
    } catch (clientError) {
      console.error(`${logPrefix} ❌ Failed to create elevated client:`, clientError);
      console.error(`${logPrefix} Client error details:`, {
        message: clientError.message,
        stack: clientError.stack,
        name: clientError.name
      });
      throw clientError;
    }

    // Get secret from this site's Secrets Manager
    console.log(`${logPrefix} Retrieving secret '${secretName}' from Secrets Manager...`);
    let secret;
    try {
      secret = await elevatedClient.secrets.getSecretValue(secretName);
      console.log(`${logPrefix} Secret retrieval response:`, {
        hasSecret: !!secret,
        hasValue: !!secret?.value,
        valueLength: secret?.value?.length
      });
    } catch (secretError) {
      console.error(`${logPrefix} ❌ Failed to retrieve secret:`, secretError);
      console.error(`${logPrefix} Secret error details:`, {
        message: secretError.message,
        stack: secretError.stack,
        name: secretError.name,
        code: secretError.code,
        response: secretError.response ? {
          status: secretError.response.status,
          data: secretError.response.data
        } : null
      });
      throw secretError;
    }
    
    if (!secret || !secret.value) {
      console.error(`${logPrefix} ❌ Secret '${secretName}' not found or has no value`);
      console.error(`${logPrefix} Secret object:`, secret);
      throw new Error(
        `Secret '${secretName}' not found in Secrets Manager. ` +
        `Site owner needs to add this secret in Wix Dashboard → Secrets Manager.`
      );
    }

    console.log(`${logPrefix} ✅ Successfully retrieved API key for instance:`, instanceId);
    console.log(`${logPrefix} API key preview:`, secret.value.substring(0, 10) + '...');
    return secret.value;
  } catch (error) {
    console.error(`${logPrefix} ❌ Error retrieving API key:`, error);
    console.error(`${logPrefix} Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    throw new Error(`Failed to retrieve API key: ${error.message}`);
  }
}

module.exports = {
  getApiKey,
  getInstanceIdFromToken
};

