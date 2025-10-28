/**
 * Validation functions for PDF generation parameters
 */

const { PDF_FORMATS_LIST, PLATFORM_LIST, RESPONSE_TYPE_LIST, TIME, SIZE } = require('./constants');

/**
 * Validate PDF format
 * @param {string} format - PDF format to validate
 * @returns {boolean}
 */
function isValidFormat(format) {
    return !format || PDF_FORMATS_LIST.includes(format);
}

/**
 * Validate platform
 * @param {string} platform - Platform to validate
 * @returns {boolean}
 */
function isValidPlatform(platform) {
    return !platform || PLATFORM_LIST.includes(platform);
}

/**
 * Validate response type
 * @param {string} responseType - Response type to validate
 * @returns {boolean}
 */
function isValidResponseType(responseType) {
    return !responseType || RESPONSE_TYPE_LIST.includes(responseType);
}

/**
 * Validate margin object
 * @param {object} margin - Margin object
 * @returns {boolean}
 */
function isValidMargin(margin) {
    if (!margin || typeof margin !== 'object') {
        return true; // Optional parameter
    }
    
    const marginKeys = ['top', 'right', 'bottom', 'left'];
    for (const key of marginKeys) {
        if (margin[key] !== undefined) {
            const value = margin[key];
            // Check if value is a valid CSS length
            if (typeof value !== 'string' || !/^\d+(\.\d+)?(px|cm|mm|in)$/.test(value)) {
                return false;
            }
        }
    }
    
    return true;
}

/**
 * Validate all PDF options
 * @param {object} options - PDF options to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validatePdfOptions(options) {
    const errors = [];
    
    if (!options || typeof options !== 'object') {
        return { valid: true, errors: [] }; // Options is optional
    }
    
    const { format, margin, platform, responseType } = options;
    
    // Validate format
    if (!isValidFormat(format)) {
        errors.push(`Invalid format: ${format}. Must be one of: ${PDF_FORMATS_LIST.join(', ')}`);
    }
    
    // Validate margin
    if (!isValidMargin(margin)) {
        errors.push('Invalid margin format. Expected object with optional keys: top, right, bottom, left');
    }
    
    // Validate platform
    if (!isValidPlatform(platform)) {
        errors.push(`Invalid platform: ${platform}. Must be one of: ${PLATFORM_LIST.join(', ')}`);
    }
    
    // Validate responseType
    if (!isValidResponseType(responseType)) {
        errors.push(`Invalid responseType: ${responseType}. Must be one of: ${RESPONSE_TYPE_LIST.join(', ')}`);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function isValidUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    const urlPattern = /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
    return urlPattern.test(url);
}

module.exports = {
    isValidFormat,
    isValidPlatform,
    isValidResponseType,
    isValidMargin,
    validatePdfOptions,
    isValidUrl
};

