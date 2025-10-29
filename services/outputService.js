const puppeteer = require('puppeteer');
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
    PDF_FULL_HEIGHTS
} = require('../config/constants');

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

let browser;

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
 * Add watermark to the page
 * @param {string} watermarkUrl - URL for the watermark link
 * @param {string} watermarkText - Text to display in the watermark
 * @returns {void}
 */
function addWatermark(watermarkUrl, watermarkText) {
    const uppermostElement = document.body.children[0];
    const watermark = document.createElement('div');

    const watermarkLink = document.createElement('a');
    watermarkLink.href = watermarkUrl;
    watermarkLink.target = '_blank';
    watermarkLink.textContent = watermarkText;
    watermarkLink.style.color = 'inherit';
    watermarkLink.style.fontSize = WATERMARK.FONT_SIZE;
    watermarkLink.style.textDecoration = 'none';
    watermark.appendChild(watermarkLink);

    watermark.style.width = WATERMARK.WIDTH;
    watermark.style.textAlign = 'center';
    watermark.style.opacity = WATERMARK.OPACITY;
    watermark.style.marginTop = WATERMARK.MARGIN_TOP;
    watermark.style.fontFamily = 'Arial';
    watermark.style.zIndex = WATERMARK.Z_INDEX;
    document.body.insertBefore(watermark, uppermostElement);
}

/**
 * Get or create a browser instance
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({ headless: 'new' });
        process.on('exit', async () => {
            if (browser) {
                await browser.close();
            }
        });
    }
    return browser;
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
async function scrollPageProgressively(page, scrollIncrement = 200, maxHeight = null) {
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
async function preparePageForOutput({ url, account, platform, viewport = null, maxScrollHeight = null }) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Set viewport if specified (for both PDFs and screenshots)
        // Default is 800x600 if not specified
        if (viewport) {
            await page.setViewport(viewport);
        }

        // Navigate to URL
        await page.goto(url, { 
            waitUntil: 'networkidle0', 
            timeout: TIME.PAGE_NAVIGATION_TIMEOUT 
        });

        // Scroll to load lazy content
        await scrollPageProgressively(page, 200, maxScrollHeight);

        // Emulate media type
        await page.emulateMediaType('screen');

        // Apply platform-specific modifications
        if (platform === PLATFORMS.WIX) {
            await page.evaluate(removeWixAds);
            await page.evaluate(removeCookieBanner);
        }

        // Add watermark for free tier
        const shouldAddWatermark = account && account.tier === 'free';
        if (shouldAddWatermark) {
            await page.evaluate(addWatermark, WATERMARK.URL, WATERMARK.TEXT);
        }

        return page;
    } catch (error) {
        // Clean up on error
        try {
            await page.close();
        } catch (e) {}
        throw error;
    }
}

/**
 * Generate PDF from website URL
 * @param {object} params - PDF generation parameters
 * @param {string} params.url - The URL to convert to PDF
 * @param {object} params.pdfOptions - PDF generation options (format, margin, platform, viewport)
 * @param {object} params.account - Account information (tier: 'free' | 'paid')
 * @returns {object} - { buffer, fileUrl, outputType }
 */
async function generatePdf({ url, pdfOptions = {}, account }) {
    const { margin, format, platform, viewport } = pdfOptions;
    const pdfFormat = format || PDF_FORMATS.A4;
    const actualMargin = margin || DEFAULT_MARGIN;
    
    // Calculate page limit for free tier
    const pageLimit = account && account.tier === 'paid' 
        ? PAGE_LIMITS.PAID_TIER 
        : PAGE_LIMITS.FREE_TIER;
    const pageHeight = calculateUsablePageHeight(pdfFormat, actualMargin);
    const maxHeight = pageLimit * pageHeight;

    let page;
    try {
        // Use shared preparation function
        page = await preparePageForOutput({
            url,
            account,
            platform,
            viewport: viewport || null, // Pass viewport if provided, default is 800x600
            maxScrollHeight: maxHeight
        });

        // Generate PDF (the only PDF-specific code!)
        const pdfBuffer = await page.pdf({
            margin: actualMargin,
            printBackground: true,
            format: pdfFormat,
        });

        const fileUrl = storeTemporaryFile(pdfBuffer, 'pdf');

        await page.close();

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
            try {
                await page.close();
            } catch (e) {}
        }
    }
}

/**
 * Generate screenshot from website URL
 * @param {object} params - Screenshot generation parameters
 * @param {string} params.url - The URL to screenshot
 * @param {object} params.screenshotOptions - Screenshot options (type, quality, fullPage, viewport)
 * @param {object} params.account - Account information (tier: 'free' | 'paid')
 * @returns {object} - { buffer, fileUrl, outputType }
 */
async function generateScreenshot({ url, screenshotOptions = {}, account }) {
    const {
        type = DEFAULT_SCREENSHOT_OPTIONS.type,
        quality = DEFAULT_SCREENSHOT_OPTIONS.quality,
        fullPage = DEFAULT_SCREENSHOT_OPTIONS.fullPage,
        viewport = DEFAULT_SCREENSHOT_OPTIONS.viewport,
        platform
    } = screenshotOptions;

    let page;
    try {
        // Use shared preparation function
        page = await preparePageForOutput({
            url,
            account,
            platform,
            viewport,
            maxScrollHeight: null // Screenshots capture full page if fullPage is true
        });

        // Generate screenshot (the only screenshot-specific code!)
        const screenshotOpts = {
            type,
            fullPage
        };

        // Quality only applies to JPEG
        if (type === 'jpeg' && quality !== undefined) {
            screenshotOpts.quality = quality;
        }

        const screenshotBuffer = await page.screenshot(screenshotOpts);

        const fileUrl = storeTemporaryFile(screenshotBuffer, type);

        await page.close();

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
            try {
                await page.close();
            } catch (e) {}
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
async function generateOutput({ url, options = {}, account }) {
    const outputType = options.outputType || 'pdf'; // Default to PDF for backward compatibility
    const platform = options.platform; // Extract shared platform option

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
                platform  // Pass platform explicitly to nested options
            }, 
            account 
        });
    } else {
        return await generatePdf({ 
            url: finalUrl, 
            pdfOptions: { 
                ...(options.pdfOptions || options),  // Support both structures for backward compatibility
                platform  // Pass platform explicitly to nested options
            },
            account 
        });
    }
}

module.exports = {
    generatePdf,
    generateScreenshot,
    generateOutput
};

