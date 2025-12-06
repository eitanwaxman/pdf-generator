const puppeteer = require('puppeteer');
const browserPool = require('./browserPool');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { 
    TIME, 
    DEFAULT_MARGIN, 
    DEFAULT_SCREENSHOT_OPTIONS,
    PDF_FORMATS, 
    WATERMARK, 
    PLATFORMS, 
    PAGE_LIMITS,
    PDF_FULL_HEIGHTS,
    VIEWPORT,
    SCROLL
} = require('../config/constants');

const { SERVER_URL } = require('../config/constants');

/**
 * Remove Wix ads from the page
 * @returns {void}
 */
function removeWixAds() {
    const wixAds = document.getElementById('WIX_ADS');
    if (wixAds) wixAds.remove();
}

/**
 * Remove cookie banner from the page
 * @returns {void}
 */
function removeCookieBanner() {
    const cookieBanner = document.querySelector('.consent-banner-root');
    if (cookieBanner) cookieBanner.remove();
}

/**
 * Remove PDF generator button from the page
 * This hides the button element before PDF/screenshot generation
 * @returns {void}
 */
function removePdfGeneratorButton() {
    // Remove both Wix-specific and generic widget elements
    const elements = document.querySelectorAll('pdf-generator-button, docuskribe-widget');
    elements.forEach(element => {
        element.style.display = 'none';
        element.remove();
    });
}

/**
 * Add watermark to the page
 * @param {object} watermarkConfig - Watermark configuration object from constants
 * @returns {void}
 */
function addWatermark(watermarkConfig) {
    const uppermostElement = document.body.children[0];
    const watermark = document.createElement('div');

    const watermarkLink = document.createElement('a');
    watermarkLink.href = watermarkConfig.URL;
    watermarkLink.target = '_blank';
    watermarkLink.textContent = watermarkConfig.TEXT;
    watermarkLink.style.color = 'inherit';
    watermarkLink.style.fontSize = watermarkConfig.FONT_SIZE;
    watermarkLink.style.textDecoration = 'none';
    watermark.appendChild(watermarkLink);

    watermark.style.width = watermarkConfig.WIDTH;
    watermark.style.textAlign = 'center';
    watermark.style.opacity = watermarkConfig.OPACITY;
    watermark.style.marginTop = watermarkConfig.MARGIN_TOP;
    watermark.style.fontFamily = 'Arial';
    watermark.style.zIndex = watermarkConfig.Z_INDEX;
    document.body.insertBefore(watermark, uppermostElement);
}

/**
 * Parse margin value to pixels
 * @param {string} marginValue - Margin value (e.g., "100px", "2cm")
 * @returns {number} - Margin in pixels
 */
function parseMarginToPixels(marginValue) {
    if (!marginValue) return 0;
    
    const match = marginValue.match(/^([\d.]+)(px|cm|mm|in)?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] || 'px';
    
    // Convert to pixels (96 DPI)
    const conversions = {
        'px': 1,
        'in': 96,
        'cm': 96 / 2.54,
        'mm': 96 / 25.4
    };
    
    return value * (conversions[unit] || 1);
}

/**
 * Calculate usable page height based on format and margins
 * @param {string} format - PDF format (e.g., 'A4')
 * @param {object} margin - Margin object
 * @returns {number} - Usable height in pixels
 */
function calculateUsablePageHeight(format, margin) {
    const fullHeight = PDF_FULL_HEIGHTS[format] || PDF_FULL_HEIGHTS[PDF_FORMATS.A4];
    
    // Get top and bottom margins
    const topMargin = margin ? parseMarginToPixels(margin.top) : parseMarginToPixels(DEFAULT_MARGIN.top);
    const bottomMargin = margin ? parseMarginToPixels(margin.bottom) : parseMarginToPixels(DEFAULT_MARGIN.bottom);
    
    return fullHeight - topMargin - bottomMargin;
}

/**
 * Scroll the page progressively to load lazy-loaded content
 * @param {Page} page - Puppeteer page instance
 * @param {number} scrollIncrement - Number of pixels to scroll at a time
 * @param {number} maxHeight - Maximum height to scroll to (for page limiting)
 * @returns {Promise<void>}
 */
async function scrollPageProgressively(page, scrollIncrement = SCROLL.DEFAULT_INCREMENT, maxHeight = null) {
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentScrollPosition = 0;
    
    // Apply max height limit if specified
    const effectiveScrollHeight = maxHeight ? Math.min(scrollHeight, maxHeight) : scrollHeight;
    
    while (currentScrollPosition < effectiveScrollHeight) {
        currentScrollPosition = Math.min(currentScrollPosition + scrollIncrement, effectiveScrollHeight);
        
        await page.evaluate((scrollTo) => {
            window.scrollTo(0, scrollTo);
        }, currentScrollPosition);
        
        // Wait for network to be idle after scrolling
        try {
            await page.waitForNetworkIdle({
                idleTime: TIME.NETWORK_IDLE_TIME,
                timeout: TIME.NETWORK_IDLE_TIMEOUT
            });
        } catch (error) {
            // Continue if network idle times out
        }
    }
    
    // Final scroll to bottom (or max height) to catch any remaining content
    await page.evaluate((finalHeight) => {
        window.scrollTo(0, finalHeight);
    }, effectiveScrollHeight);
    
    try {
        await page.waitForNetworkIdle({
            idleTime: TIME.NETWORK_IDLE_TIME,
            timeout: TIME.NETWORK_IDLE_TIMEOUT
        });
    } catch (error) {
        // Continue if network idle times out
    }
}

/**
 * Store output buffer as a temporary file and return URL
 * @param {Buffer} buffer - Output buffer to store
 * @param {string} extension - File extension (pdf, png, jpeg, webp)
 * @returns {string} URL to access the temporary file
 */
function storeTemporaryFile(buffer, extension) {
    const filename = `${uuidv4()}.${extension}`;
    const filePath = path.join(__dirname, '..', 'temp', filename);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `${SERVER_URL}/temp/${filename}`;

    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error(`[Output Service] Error removing temp file: ${err.message}`);
        }
    }, TIME.TEMP_FILE_TTL);

    return fileUrl;
}

/**
 * Core function that handles common page setup and processing
 * @param {object} params
 * @returns {Promise<Page>} Configured Puppeteer page ready for output generation
 */
async function preparePageForOutput({ url, account, platform, viewport = null, formFactor = 'desktop', maxScrollHeight = null, abortSignal = null }) {
    console.log('[Puppeteer] Acquiring page from browser pool...');
    const pageStartTime = Date.now();
    const page = await browserPool.acquirePage();
    const pageTime = Date.now() - pageStartTime;
    console.log(`[Puppeteer] Page acquired in ${pageTime}ms`);

    try {
        // Immediate cancellation support: close and release the page if aborted
        let abortHandler = null;
        if (abortSignal) {
            if (abortSignal.aborted) {
                try { await page.close(); } catch (e) {}
                try { await browserPool.releasePage(page); } catch (e) {}
                throw new Error('Operation aborted');
            }
            abortHandler = async () => {
                try { await page.close(); } catch (e) {}
                try { await browserPool.releasePage(page); } catch (e) {}
            };
            // Ensure the handler runs only once
            abortSignal.addEventListener('abort', abortHandler, { once: true });
        }

        // Handle viewport and formFactor
        let finalViewport;
        
        if (viewport) {
            // If viewport is explicitly provided, merge formFactor settings with it
            finalViewport = { ...viewport };
            
            if (formFactor === 'mobile') {
                // Merge mobile-specific properties, but allow explicit viewport to override dimensions
                finalViewport = {
                    width: viewport.width || VIEWPORT.MOBILE.width,
                    height: viewport.height || VIEWPORT.MOBILE.height,
                    deviceScaleFactor: viewport.deviceScaleFactor ?? VIEWPORT.MOBILE.deviceScaleFactor,
                    isMobile: viewport.isMobile ?? true,
                    hasTouch: viewport.hasTouch ?? true,
                    isLandscape: viewport.isLandscape ?? false
                };
            }
        } else if (formFactor === 'mobile') {
            // Default mobile viewport settings
            finalViewport = {
                width: VIEWPORT.MOBILE.width,
                height: VIEWPORT.MOBILE.height,
                deviceScaleFactor: VIEWPORT.MOBILE.deviceScaleFactor,
                isMobile: true,
                hasTouch: true,
                isLandscape: false
            };
        } else {
            // Default desktop viewport
            finalViewport = {
                width: VIEWPORT.DESKTOP.width,
                height: VIEWPORT.DESKTOP.height
            };
        }
        
        await page.setViewport(finalViewport);
        
        // Set mobile user agent if formFactor is mobile (unless viewport explicitly overrides isMobile)
        if (formFactor === 'mobile' && finalViewport.isMobile !== false) {
            await page.setUserAgent(
                'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
            );
        }

        // Navigate to URL
        console.log(`[Puppeteer] Navigating to ${url}...`);
        const gotoStartTime = Date.now();
        try {
            await page.goto(url, { 
                waitUntil: 'networkidle0', 
                timeout: TIME.PAGE_NAVIGATION_TIMEOUT 
            });
            const gotoTime = Date.now() - gotoStartTime;
            console.log(`[Puppeteer] Navigation completed in ${gotoTime}ms`);
        } catch (error) {
            const gotoTime = Date.now() - gotoStartTime;
            console.error(`[Puppeteer] Navigation failed after ${gotoTime}ms:`, error.message);
            throw error;
        }

        // Scroll to load lazy content
        console.log('[Puppeteer] Starting progressive scroll...');
        const scrollStartTime = Date.now();
        await scrollPageProgressively(page, SCROLL.DEFAULT_INCREMENT, maxScrollHeight);
        const scrollTime = Date.now() - scrollStartTime;
        console.log(`[Puppeteer] Progressive scroll completed in ${scrollTime}ms`);

        // Emulate media type
        await page.emulateMediaType('screen');

        // Remove PDF generator button from page (applies to all platforms)
        await page.evaluate(removePdfGeneratorButton);

        // Apply platform-specific modifications
        if (platform === PLATFORMS.WIX) {
            await page.evaluate(removeWixAds);
            await page.evaluate(removeCookieBanner);
        }

        // Add watermark for free tier
        const shouldAddWatermark = account && account.tier === 'free';
        if (shouldAddWatermark) {
            await page.evaluate(addWatermark, WATERMARK);
        }

        return page;
    } catch (error) {
        // Clean up on error
        try {
            await page.close();
        } catch (e) {}
        try {
            await browserPool.releasePage(page);
        } catch (e) {}
        throw error;
    }
}

/**
 * @typedef {Object} Account
 * @property {string} userId - User's unique identifier
 * @property {string} tier - User's subscription tier ('free' | 'starter' | 'pro')
 * @property {string} name - User's display name
 * @property {string} apiKey - The API key used for authentication
 */

/**
 * @typedef {Object} PdfOptions
 * @property {string} [format] - PDF format (e.g., 'A4', 'Letter')
 * @property {Object} [margin] - PDF margins {top, right, bottom, left}
 * @property {string} [platform] - Platform identifier (e.g., 'wix')
 * @property {Object} [viewport] - Viewport configuration
 * @property {string} [formFactor] - Form factor ('desktop' | 'mobile')
 */

/**
 * @typedef {Object} OutputResult
 * @property {Buffer} buffer - Generated output buffer
 * @property {string} fileUrl - Temporary file URL (if responseType is 'url')
 * @property {string} outputType - Type of output ('pdf' | 'screenshot')
 */

/**
 * Generate PDF from website URL
 * @param {Object} params - PDF generation parameters
 * @param {string} params.url - The URL to convert to PDF
 * @param {PdfOptions} [params.pdfOptions] - PDF generation options
 * @param {Account} params.account - Account information
 * @param {AbortSignal} [params.abortSignal] - Abort signal for cancellation
 * @returns {Promise<OutputResult>} Generated PDF result
 */
async function generatePdf({ url, pdfOptions = {}, account, abortSignal = null }) {
    const { margin, format, platform, viewport, formFactor = 'desktop' } = pdfOptions;
    const pdfFormat = format || PDF_FORMATS.A4;
    const actualMargin = margin || DEFAULT_MARGIN;
    
    // Calculate page limit per tier
    const tier = account?.tier || 'free';
    const pageLimit = PAGE_LIMITS[tier] ?? PAGE_LIMITS.free;
    const pageHeight = calculateUsablePageHeight(pdfFormat, actualMargin);
    const maxHeight = pageLimit * pageHeight;

    let page;
    try {
        // Use shared preparation function
        page = await preparePageForOutput({
            url,
            account,
            platform,
            viewport: viewport || null, // Pass viewport if provided, defaults to configured viewport
            formFactor,
            maxScrollHeight: maxHeight,
            abortSignal
        });

        // Generate PDF (the only PDF-specific code!)
        console.log('[PDF Service] Generating PDF...');
        const pdfStartTime = Date.now();
        const pdfBuffer = await page.pdf({
            margin: actualMargin,
            printBackground: true,
            format: pdfFormat,
        });
        const pdfTime = Date.now() - pdfStartTime;
        console.log(`[PDF Service] PDF generated in ${pdfTime}ms, size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        const fileUrl = storeTemporaryFile(pdfBuffer, 'pdf');

        return { buffer: pdfBuffer, fileUrl, outputType: 'pdf' };
    } catch (error) {
        console.error(`[PDF Service] Error: ${error.message}`);
        
        // Enhanced error messages
        if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
            throw new Error(`Cannot resolve DNS for: ${url}. The domain may not exist or the DNS cannot be reached.`);
        } else if (error.message.includes('ERR_TIMED_OUT')) {
            throw new Error(`Request to ${url} timed out. The website may be slow or unreachable.`);
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            throw new Error(`Connection to ${url} was refused. The server may be down or blocking requests.`);
        }
        
        throw new Error(`Failed to generate PDF for ${url}: ${error.message}`);
    } finally {
        if (page) {
            try { await page.close(); } catch (e) {}
            try { await browserPool.releasePage(page); } catch (e) {}
        }
    }
}

/**
 * @typedef {Object} ScreenshotOptions
 * @property {string} [type] - Screenshot type ('png' | 'jpeg' | 'webp')
 * @property {number} [quality] - JPEG quality (0-100)
 * @property {boolean} [fullPage] - Whether to capture full page
 * @property {Object} [viewport] - Viewport configuration
 * @property {string} [platform] - Platform identifier
 * @property {string} [formFactor] - Form factor ('desktop' | 'mobile')
 */

/**
 * Generate screenshot from website URL
 * @param {Object} params - Screenshot generation parameters
 * @param {string} params.url - The URL to screenshot
 * @param {ScreenshotOptions} [params.screenshotOptions] - Screenshot options
 * @param {Account} params.account - Account information
 * @param {AbortSignal} [params.abortSignal] - Abort signal for cancellation
 * @returns {Promise<OutputResult>} Generated screenshot result
 */
async function generateScreenshot({ url, screenshotOptions = {}, account, abortSignal = null }) {
    const {
        type = DEFAULT_SCREENSHOT_OPTIONS.type,
        quality = DEFAULT_SCREENSHOT_OPTIONS.quality,
        fullPage = DEFAULT_SCREENSHOT_OPTIONS.fullPage,
        viewport = DEFAULT_SCREENSHOT_OPTIONS.viewport,
        platform,
        formFactor = 'desktop'
    } = screenshotOptions;

    let page;
    try {
        // Use shared preparation function
        page = await preparePageForOutput({
            url,
            account,
            platform,
            viewport,
            formFactor,
            maxScrollHeight: null, // Screenshots capture full page if fullPage is true
            abortSignal
        });

        // Generate screenshot (the only screenshot-specific code!)
        console.log('[Screenshot Service] Generating screenshot...');
        const screenshotOpts = {
            type,
            fullPage
        };

        // Quality only applies to JPEG
        if (type === 'jpeg' && quality !== undefined) {
            screenshotOpts.quality = quality;
        }

        const screenshotStartTime = Date.now();
        const screenshotBuffer = await page.screenshot(screenshotOpts);
        const screenshotTime = Date.now() - screenshotStartTime;
        console.log(`[Screenshot Service] Screenshot generated in ${screenshotTime}ms, size: ${(screenshotBuffer.length / 1024 / 1024).toFixed(2)}MB`);

        const fileUrl = storeTemporaryFile(screenshotBuffer, type);

        return { buffer: screenshotBuffer, fileUrl, outputType: 'screenshot' };
    } catch (error) {
        console.error(`[Screenshot Service] Error: ${error.message}`);
        
        // Enhanced error messages
        if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
            throw new Error(`Cannot resolve DNS for: ${url}. The domain may not exist or the DNS cannot be reached.`);
        } else if (error.message.includes('ERR_TIMED_OUT')) {
            throw new Error(`Request to ${url} timed out. The website may be slow or unreachable.`);
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            throw new Error(`Connection to ${url} was refused. The server may be down or blocking requests.`);
        }
        
        throw new Error(`Failed to generate screenshot for ${url}: ${error.message}`);
    } finally {
        if (page) {
            try { await page.close(); } catch (e) {}
            try { await browserPool.releasePage(page); } catch (e) {}
        }
    }
}

/**
 * Unified generation function - routes to appropriate generator
 * @param {object} params - Generation parameters
 * @param {string} params.url - The URL to process
 * @param {object} params.options - Generation options
 * @param {object} params.account - Account information
 * @returns {object} - { buffer, fileUrl, outputType }
 */
async function generateOutput({ url, options = {}, account, signal = null }) {
    const outputType = options.outputType || 'pdf';
    const platform = options.platform;
    const formFactor = options.formFactor || 'desktop';

    // Append options.data as query params to the URL if provided
    let finalUrl = url;
    if (options.data && typeof options.data === 'object') {
        try {
            const urlObj = new URL(url);
            for (const key of Object.keys(options.data)) {
                const value = options.data[key];
                if (value === undefined || typeof value === 'function' || typeof value === 'object') continue;
                urlObj.searchParams.append(key, String(value));
            }
            finalUrl = urlObj.toString();
        } catch (e) {
            // If URL constructor fails, fallback to original url
            finalUrl = url;
        }
    }
    
    if (outputType === 'screenshot') {
        return await generateScreenshot({ 
            url: finalUrl, 
            screenshotOptions: { 
                ...options.screenshotOptions,
                platform,
                formFactor
            }, 
            account,
            abortSignal: signal
        });
    } else {
        return await generatePdf({ 
            url: finalUrl, 
            pdfOptions: { 
                ...options.pdfOptions,
                platform,
                formFactor
            },
            account,
            abortSignal: signal
        });
    }
}

module.exports = {
    generatePdf,
    generateScreenshot,
    generateOutput
};

