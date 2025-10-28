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
 * Validate delay value
 * @param {number} delay - Delay in milliseconds
 * @returns {boolean}
 */
function isValidDelay(delay) {
    return delay === undefined || delay === null || 
           (typeof delay === 'number' && delay >= 0 && delay <= TIME.MAX_DELAY);
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
 * Validate waitForDataLoad
 * @param {boolean} waitForDataLoad - Wait for data load flag
 * @returns {boolean}
 */
function isValidWaitForDataLoad(waitForDataLoad) {
    return waitForDataLoad === undefined || waitForDataLoad === null || typeof waitForDataLoad === 'boolean';
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
    
    const { format, margin, delay, waitForDataLoad, platform, responseType } = options;
    
    // Validate format
    if (!isValidFormat(format)) {
        errors.push(`Invalid format: ${format}. Must be one of: ${PDF_FORMATS_LIST.join(', ')}`);
    }
    
    // Validate delay
    if (!isValidDelay(delay)) {
        errors.push(`Invalid delay: ${delay}. Must be a number between 0 and ${TIME.MAX_DELAY} milliseconds`);
    }
    
    // Validate margin
    if (!isValidMargin(margin)) {
        errors.push('Invalid margin format. Expected object with optional keys: top, right, bottom, left');
    }
    
    // Validate waitForDataLoad
    if (!isValidWaitForDataLoad(waitForDataLoad)) {
        errors.push('Invalid waitForDataLoad: must be a boolean');
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
    isValidDelay,
    isValidPlatform,
    isValidResponseType,
    isValidMargin,
    isValidWaitForDataLoad,
    validatePdfOptions,
    isValidUrl
};

