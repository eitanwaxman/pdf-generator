const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

let browser;

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidUrl(url) {
    var urlPattern = /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
    return urlPattern.test(url);
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
    watermarkLink.style.fontSize = '16px';
    watermarkLink.style.textDecoration = 'none';
    watermark.appendChild(watermarkLink);

    watermark.style.width = '100%';
    watermark.style.textAlign = 'center';
    watermark.style.opacity = '0.7';
    watermark.style.marginTop = '20px';
    watermark.style.fontFamily = 'Arial';
    watermark.style.zIndex = '1000';
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
    }, 60000);

    return fileUrl;
}

/**
 * Generate PDF from website URL
 * @param {object} params - PDF generation parameters
 * @param {string} params.url - The URL to convert to PDF
 * @param {object} params.pdfOptions - PDF generation options (format, margin, delay, waitForDataLoad)
 * @param {object} params.account - Account information (tier: 'free' | 'paid')
 * @param {string} params.env - Rendering environment enum (e.g., 'generic' | 'wix')
 * @returns {object} - { pdfBuffer, fileUrl? }
 */
async function generatePdf({ url, pdfOptions, account, env }) {
    const { margin, format, delay, waitForDataLoad } = pdfOptions || {};

    // Normalize environment to a simple enum
    const renderEnv = (env || 'generic').toLowerCase();

    // Determine if watermark should be added based on account tier
    const addWatermarkForAccount = account && account.tier === 'free';

    const browser = await getBrowser();

    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 0 });
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

    await page.evaluate(() => {
        window.scrollBy(0, document.body.scrollHeight);
    });

    const waitMs = (delay && delay <= 10000) ? delay : 2000;
    await timeout(waitMs);

    if (waitForDataLoad) {
        const iframe = await page.waitForSelector('iframe', { timeout: 60000 });
        const frame = await iframe.contentFrame();

        if (frame) {
            await frame.waitForSelector("#loadedIndicator", { timeout: 60000 });
        } else {
            throw new Error('Could not find iframe content');
        }
    }

    await page.emulateMediaType('screen');

    // Apply environment-specific logic
    if (renderEnv === 'wix') {
        await page.evaluate(removeWixAds);
        await page.evaluate(removeCookieBanner);
    }

    // Add watermark for free accounts
    if (addWatermarkForAccount) {
        await page.evaluate(addWatermark);
    }

    const pdfBuffer = await page.pdf({
        margin: margin ? margin : { top: '100px', right: '50px', bottom: '100px', left: '50px' },
        printBackground: true,
        format: format || 'A4',
    });

    const fileUrl = storeTemporaryUrl(pdfBuffer);

    await page.close();

    return { pdfBuffer, fileUrl };
}

module.exports = {
    generatePdf,
    isValidUrl,
    timeout
};

