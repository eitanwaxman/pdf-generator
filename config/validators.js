/**
 * Validation functions for PDF generation parameters
 */

const { 
    PDF_FORMATS_LIST, 
    PLATFORM_LIST,
    FORM_FACTOR_LIST,
    RESPONSE_TYPE_LIST, 
    OUTPUT_TYPE_LIST,
    SCREENSHOT_TYPE_LIST 
} = require('./constants');

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
 * Validate form factor
 * @param {string} formFactor - Form factor to validate
 * @returns {boolean}
 */
function isValidFormFactor(formFactor) {
    return !formFactor || FORM_FACTOR_LIST.includes(formFactor);
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
 * Validate viewport object
 * @param {object} viewport - Viewport object
 * @returns {boolean}
 */
function isValidViewport(viewport) {
    if (!viewport || typeof viewport !== 'object') {
        return true; // Optional parameter
    }
    
    if (viewport.width && (typeof viewport.width !== 'number' || viewport.width <= 0)) {
        return false;
    }
    
    if (viewport.height && (typeof viewport.height !== 'number' || viewport.height <= 0)) {
        return false;
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
    
    const { format, margin, platform, responseType, viewport } = options;
    
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
    
    // Validate viewport
    if (!isValidViewport(viewport)) {
        errors.push('Invalid viewport format. Expected object with optional positive number keys: width, height');
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate data object for query params
 * @param {object} data - Key-value pairs to append as query params
 * @returns {boolean}
 */
function isValidDataObject(data) {
    if (!data) {
        return true; // Optional
    }
    if (typeof data !== 'object' || Array.isArray(data)) {
        return false;
    }
    for (const key of Object.keys(data)) {
        const value = data[key];
        const valueType = typeof value;
        if (value === undefined || valueType === 'function' || valueType === 'object') {
            return false;
        }
    }
    return true;
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

/**
 * Validate output type
 * @param {string} outputType - Output type to validate
 * @returns {boolean}
 */
function isValidOutputType(outputType) {
    return !outputType || OUTPUT_TYPE_LIST.includes(outputType);
}

/**
 * Validate screenshot options
 * @param {object} screenshotOptions - Screenshot options to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateScreenshotOptions(screenshotOptions) {
    const errors = [];
    
    if (!screenshotOptions || typeof screenshotOptions !== 'object') {
        return { valid: true, errors: [] }; // Optional
    }
    
    const { type, quality, fullPage, viewport } = screenshotOptions;
    
    // Validate type
    if (type && !SCREENSHOT_TYPE_LIST.includes(type)) {
        errors.push(`Invalid screenshot type: ${type}. Must be one of: ${SCREENSHOT_TYPE_LIST.join(', ')}`);
    }
    
    // Validate quality (only for JPEG)
    if (quality !== undefined) {
        if (typeof quality !== 'number' || quality < 0 || quality > 100) {
            errors.push('Quality must be a number between 0 and 100');
        }
    }
    
    // Validate fullPage
    if (fullPage !== undefined && typeof fullPage !== 'boolean') {
        errors.push('fullPage must be a boolean');
    }
    
    // Validate viewport
    if (viewport) {
        if (typeof viewport !== 'object') {
            errors.push('viewport must be an object');
        } else {
            if (viewport.width && (typeof viewport.width !== 'number' || viewport.width <= 0)) {
                errors.push('viewport.width must be a positive number');
            }
            if (viewport.height && (typeof viewport.height !== 'number' || viewport.height <= 0)) {
                errors.push('viewport.height must be a positive number');
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate complete job options (shared + output-specific)
 * @param {object} options - Job options to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
function validateJobOptions(options) {
    const errors = [];
    
    if (!options || typeof options !== 'object') {
        return { valid: true, errors: [] };
    }
    
    const { outputType, responseType, platform, formFactor, pdfOptions, screenshotOptions, data } = options;
    
    // Validate shared options
    if (!isValidOutputType(outputType)) {
        errors.push(`Invalid outputType: ${outputType}. Must be one of: ${OUTPUT_TYPE_LIST.join(', ')}`);
    }
    
    if (!isValidResponseType(responseType)) {
        errors.push(`Invalid responseType: ${responseType}. Must be one of: ${RESPONSE_TYPE_LIST.join(', ')}`);
    }
    
    if (!isValidPlatform(platform)) {
        errors.push(`Invalid platform: ${platform}. Must be one of: ${PLATFORM_LIST.join(', ')}`);
    }
    
    if (!isValidFormFactor(formFactor)) {
        errors.push(`Invalid formFactor: ${formFactor}. Must be one of: ${FORM_FACTOR_LIST.join(', ')}`);
    }
    
    // Validate data
    if (!isValidDataObject(data)) {
        errors.push('Invalid data: must be an object of primitive values (string, number, boolean, null)');
    }
    
    // Validate output-specific options
    const actualOutputType = outputType || 'pdf'; // Default to PDF
    
    if (actualOutputType === 'pdf') {
        // For PDF, validate pdfOptions
        if (!pdfOptions) {
            errors.push('pdfOptions is required when outputType is "pdf"');
        } else {
            const pdfValidation = validatePdfOptions(pdfOptions);
            if (!pdfValidation.valid) {
                errors.push(...pdfValidation.errors);
            }
        }
    } else if (actualOutputType === 'screenshot') {
        const screenshotValidation = validateScreenshotOptions(screenshotOptions);
        if (!screenshotValidation.valid) {
            errors.push(...screenshotValidation.errors);
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    isValidFormat,
    isValidPlatform,
    isValidFormFactor,
    isValidResponseType,
    isValidMargin,
    isValidViewport,
    validatePdfOptions,
    isValidUrl,
    isValidOutputType,
    validateScreenshotOptions,
    validateJobOptions,
    isValidDataObject
};

