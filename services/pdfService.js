const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { isValidUrl: validateUrl, validatePdfOptions } = require('../config/validators');
const { TIME, DEFAULT_MARGIN, PDF_FORMATS, WATERMARK, SIZE, PLATFORMS } = require('../config/constants');

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

let browser;

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidUrl(url) {
    return validateUrl(url);
}

function removeWixAds() {
    const wixAds = document.getElementById('WIX_ADS');
    if (wixAds) wixAds.remove();
}

function removeCookieBanner() {
    const cookieBanner = document.querySelector('.consent-banner-root');
    if (cookieBanner) cookieBanner.remove();
}

function addWatermark() {
    const uppermostElement = document.body.children[0];
    const watermark = document.createElement('div');

    const watermarkLink = document.createElement('a');
    watermarkLink.href = 'https://thewixwiz.com/wix-apps';
    watermarkLink.target = '_blank';
    watermarkLink.textContent = "Generated using PDF Generator App by The Wix Wiz. Visit thewixwiz.com/wix-apps to learn more";
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

function storeTemporaryUrl(pdfBuffer) {
    const filename = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, '..', 'temp', filename);

    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${SERVER_URL}/temp/${filename}`;

    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
        } catch (err) {
            // Error removing file
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
    const totalStartTime = Date.now();
    console.log(`[PDF Service] ========== Starting PDF generation for ${url} ==========`);
    
    // Validate PDF options
    const validation = validatePdfOptions(pdfOptions);
    if (!validation.valid) {
        throw new Error(`Invalid PDF options: ${validation.errors.join(', ')}`);
    }

    const { margin, format, platform } = pdfOptions || {};

    // Determine if watermark should be added based on account tier
    const addWatermarkForAccount = account && account.tier === 'free';

    const browser = await getBrowser();

    const page = await browser.newPage();
    
    // Listen to console messages from the page
    page.on('console', msg => {
        console.log(`[Browser] ${msg.text()}`);
    });

    try {
        // Measure time between page.goto and network idle
        const gotoStartTime = Date.now();
        console.log(`[PDF Service] Starting navigation to ${url}`);

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });

        const gotoEndTime = Date.now();
        const navigationDuration = gotoEndTime - gotoStartTime;
        console.log(`[PDF Service] Page navigation completed - time to network idle: ${navigationDuration}ms`);

    } catch (error) {
        await page.close();
        // Enhance error message with URL context for better debugging
        if (error.message.includes('ERR_NAME_NOT_RESOLVED')) {
            throw new Error(`Cannot resolve DNS for: ${url}. The domain may not exist or the DNS cannot be reached.`);
        } else if (error.message.includes('ERR_TIMED_OUT')) {
            throw new Error(`Request to ${url} timed out. The website may be slow or unreachable.`);
        } else if (error.message.includes('ERR_CONNECTION_REFUSED')) {
            throw new Error(`Connection to ${url} was refused. The server may be down or blocking requests.`);
        }
        throw new Error(`Failed to load ${url}: ${error.message}`);
    }

    // Wait for images to load - progressively scroll and wait for network idle
    console.log(`[PDF Service] Waiting for images and lazy-loaded content`);
    const networkIdleStartTime = Date.now();
    
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentScrollPosition = 0;
    const scrollIncrement = 200;
    
    console.log(`[PDF Service] Page scroll height: ${scrollHeight}px`);
    
    while (currentScrollPosition < scrollHeight) {
        const previousPosition = currentScrollPosition;
        currentScrollPosition = Math.min(currentScrollPosition + scrollIncrement, scrollHeight);
        
        console.log(`[PDF Service] Scrolling from ${previousPosition}px to ${currentScrollPosition}px`);
        
        await page.evaluate((scrollTo) => {
            window.scrollTo(0, scrollTo);
        }, currentScrollPosition);
        
        // Wait for network to be idle after scrolling
        try {
            await page.waitForNetworkIdle({
                idleTime: 500,      // Wait 500ms with no requests
                timeout: 3000       // Max 3 seconds per scroll
            });
            console.log(`[PDF Service] Network idle at ${currentScrollPosition}px`);
        } catch (error) {
            console.log(`[PDF Service] Network idle timeout at ${currentScrollPosition}px, continuing`);
        }
    }
    
    // Final scroll to bottom to catch any remaining content
    console.log(`[PDF Service] Final scroll to bottom`);
    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });
    
    try {
        await page.waitForNetworkIdle({
            idleTime: 500,
            timeout: 3000
        });
        console.log(`[PDF Service] Network idle at bottom`);
    } catch (error) {
        console.log(`[PDF Service] Network idle timeout at bottom`);
    }
    
    const networkIdleEndTime = Date.now();
    console.log(`[PDF Service] Progressive scroll completed - duration: ${networkIdleEndTime - networkIdleStartTime}ms`);

    console.log(`[PDF Service] Emulating media type screen`);
    await page.emulateMediaType('screen');

    // Apply platform-specific logic
    if (platform === PLATFORMS.WIX) {
        console.log(`[PDF Service] Applying WIX platform-specific modifications`);
        const platformStartTime = Date.now();
        
        await page.evaluate(removeWixAds);
        await page.evaluate(removeCookieBanner);
        
        const platformEndTime = Date.now();
        console.log(`[PDF Service] Platform modifications completed - duration: ${platformEndTime - platformStartTime}ms`);
    }

    // Add watermark for free accounts
    if (addWatermarkForAccount) {
        console.log(`[PDF Service] Adding watermark`);
        const watermarkStartTime = Date.now();
        
        await page.evaluate(addWatermark);
        
        const watermarkEndTime = Date.now();
        console.log(`[PDF Service] Watermark added - duration: ${watermarkEndTime - watermarkStartTime}ms`);
    }

    console.log(`[PDF Service] Starting PDF generation`);
    const pdfStartTime = Date.now();
    
    const pdfBuffer = await page.pdf({
        margin: margin || DEFAULT_MARGIN,
        printBackground: true,
        format: format || PDF_FORMATS.A4,
    });
    
    const pdfEndTime = Date.now();
    console.log(`[PDF Service] PDF generation completed - duration: ${pdfEndTime - pdfStartTime}ms`);

    console.log(`[PDF Service] Storing temporary file`);
    const fileStorageStartTime = Date.now();
    
    const fileUrl = storeTemporaryUrl(pdfBuffer);
    
    const fileStorageEndTime = Date.now();
    console.log(`[PDF Service] File storage completed - duration: ${fileStorageEndTime - fileStorageStartTime}ms`);

    await page.close();

    const totalEndTime = Date.now();
    const totalDuration = totalEndTime - totalStartTime;
    console.log(`[PDF Service] ========== PDF generation completed - total duration: ${totalDuration}ms ==========`);

    return { pdfBuffer, fileUrl };
}

module.exports = {
    generatePdf,
    isValidUrl,
    timeout
};

