/**
 * Standardized error response utility
 * Ensures consistent error format across all API routes
 */

/**
 * Create a standardized error response
 * @param {string} error - Error title/message
 * @param {string} [details] - Optional detailed error message
 * @returns {Object} Standardized error response object
 */
function createErrorResponse(error, details) {
    const response = { error };
    if (details) {
        response.details = details;
    }
    return response;
}

module.exports = {
    createErrorResponse
};

