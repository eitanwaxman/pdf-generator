const { createClient } = require('@wix/sdk');

/**
 * Initialize Wix SDK client with elevated permissions
 * This is used for backend operations that require higher privileges
 * @param {Object} config - Configuration options
 * @returns {Object} - Wix SDK client instance
 */
function initWixClient(config = {}) {
  try {
    const client = createClient({
      modules: config.modules || {},
      auth: config.auth || {}
    });
    
    return client;
  } catch (error) {
    console.error('Error initializing Wix client:', error);
    throw new Error(`Failed to initialize Wix client: ${error.message}`);
  }
}

module.exports = {
  initWixClient
};

