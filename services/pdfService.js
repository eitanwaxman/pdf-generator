const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { validatePdfOptions } = require('../config/validators');
const { TIME, DEFAULT_MARGIN, PDF_FORMATS, WATERMARK, PLATFORMS, PDF_FULL_HEIGHTS, PAGE_LIMITS } = require('../config/constants');

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
 * Store PDF buffer as a temporary file and return URL
 * @param {Buffer} pdfBuffer - PDF buffer to store
 * @returns {string} URL to access the temporary file
 */
function storeTemporaryUrl(pdfBuffer) {
    const filename = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, '..', 'temp', filename);

    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${SERVER_URL}/temp/${filename}`;

    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            console.error(`[PDF Service] Error removing temp file: ${err.message}`);
        }
    }, TIME.TEMP_FILE_TTL);

    return fileUrl;
}

/**
 * Generate PDF from website URL
 * @param {object} params - PDF generation parameters
 * @param {string} params.url - The URL to convert to PDF
 * @param {object} params.pdfOptions - PDF generation options (format, margin, platform)
 * @param {object} params.account - Account information (tier: 'free' | 'paid')
 * @returns {object} - { pdfBuffer, fileUrl? }
 */
async function generatePdf({ url, pdfOptions, account }) {
    // Validate PDF options
    const validation = validatePdfOptions(pdfOptions);
    if (!validation.valid) {
        throw new Error(`Invalid PDF options: ${validation.errors.join(', ')}`);
    }

    const { margin, format, platform } = pdfOptions || {};
    const pdfFormat = format || PDF_FORMATS.A4;

    // Determine if watermark should be added based on account tier
    const addWatermarkForAccount = account && account.tier === 'free';

    // Get actual margins to use
    const actualMargin = margin || DEFAULT_MARGIN;
    
    // Calculate page limit based on account tier
    const pageLimit = account && account.tier === 'paid' ? PAGE_LIMITS.PAID_TIER : PAGE_LIMITS.FREE_TIER;
    
    // Calculate usable page height based on format and margins
    const pageHeight = calculateUsablePageHeight(pdfFormat, actualMargin);
    const maxHeight = pageLimit * pageHeight;

    const browser = await getBrowser();

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: TIME.PAGE_NAVIGATION_TIMEOUT });

        await scrollPageProgressively(page, 200, maxHeight);

        await page.emulateMediaType('screen');

        if (platform === PLATFORMS.WIX) {
            await page.evaluate(removeWixAds);
            await page.evaluate(removeCookieBanner);
        }

        if (addWatermarkForAccount) {
            await page.evaluate(addWatermark, WATERMARK.URL, WATERMARK.TEXT);
        }

        const pdfBuffer = await page.pdf({
            margin: margin || DEFAULT_MARGIN,
            printBackground: true,
            format: format || PDF_FORMATS.A4,
        });

        const fileUrl = storeTemporaryUrl(pdfBuffer);

        await page.close();

        return { pdfBuffer, fileUrl };
    } catch (error) {
        console.error(`[PDF Service] Error generating PDF: ${error.message}`);
        // Enhance error message with URL context for better debugging
        if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
            throw new Error(`Cannot resolve DNS for: ${url}. The domain may not exist or the DNS cannot be reached.`);
        } else if (error.message.includes('ERR_TIMED_OUT')) {
            throw new Error(`Request to ${url} timed out. The website may be slow or unreachable.`);
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            throw new Error(`Connection to ${url} was refused. The server may be down or blocking requests.`);
        }
        throw new Error(`Failed to generate PDF for ${url}: ${error.message}`);
    } finally {
        try {
            await page.close();
        } catch (closeError) {
            console.error(`[PDF Service] Error closing page: ${closeError.message}`);
        }
    }
}

module.exports = {
    generatePdf
};
