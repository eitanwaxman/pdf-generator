const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function log(level, message, meta) {
    if (LOG_LEVELS[level] < MIN_LOG_LEVEL) return;
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
    const payload = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
    const line = `${prefix} ${message}${payload}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

function logError(context, error, meta = {}) {
    log('error', context, {
        ...meta,
        errorMessage: error?.message,
        errorName: error?.name,
        stack: error?.stack,
    });
}

const app = express();
const port = process.env.PORT || 3000;
const SERVER_URL = "https://pdf-generator-new.onrender.com" //"https://pdf-generator-dev.onrender.com"

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/temp', express.static('temp'));

app.post('/', async (req, res) => {
    const requestId = uuidv4().slice(0, 8);
    const { url, options } = req.body;

    log('info', 'PDF generation request received', {
        requestId,
        url,
        options: options ?? null,
    });

    if (!isValidUrl(url)) {
        log('warn', 'Request rejected: invalid URL', { requestId, url });
        return res.status(400).send('Vaild URL is required');
    }

    try {
        const PDF = await exportWebsiteAsPdf(url, options, requestId);
        log('info', 'PDF generation succeeded', { requestId, tempUrl: PDF?.tempUrl });
        res.send(PDF);
    } catch (error) {
        logError('PDF generation failed', error, { requestId, url });
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
    log('info', 'Server started', { port });
});

let browser;

async function exportWebsiteAsPdf(websiteUrl, options, requestId) {
    const { margin, format, free, delay, waitForDataLoad } = options || {};
    const ctx = { requestId, websiteUrl };

    log('debug', 'Starting PDF export', {
        ...ctx,
        format: format ?? 'A4',
        free: Boolean(free),
        delay,
        waitForDataLoad: Boolean(waitForDataLoad),
    });

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        log('debug', 'Navigating to URL', ctx);
        await page.goto(websiteUrl, { waitUntil: 'networkidle0', timeout: 0 });

        log('debug', 'Scrolling page', ctx);
        await page.evaluate(() => {
            window.scrollBy(0, document.body.scrollHeight);
        });

        const delayMs = (delay && delay <= 10000) ? delay : 2000;
        log('debug', 'Waiting after scroll', { ...ctx, delayMs });
        await timeout(delayMs);

        if (waitForDataLoad) {
            log('debug', 'Waiting for iframe data load', ctx);
            const iframe = await page.waitForSelector('iframe');
            const frame = await iframe.contentFrame();

            if (frame) {
                await frame.waitForSelector("#loadedIndicator", { timeout: 60000 });
                log('debug', 'Iframe loaded indicator found', ctx);
            } else {
                throw new Error('Could not find iframe content');
            }
        }

        await page.emulateMediaType('screen');

        log('debug', 'Removing cookie banner', ctx);
        await page.evaluate(removeCookieBanner);

        if (free) {
            log('debug', 'Adding watermark', ctx);
            await page.evaluate(addWatermark);
        }

        log('debug', 'Generating PDF buffer', ctx);
        const pdfBuffer = await page.pdf({
            margin: margin ? margin : { top: '100px', right: '50px', bottom: '100px', left: '50px' },
            printBackground: true,
            format: format ? format : 'A4',
        });

        log('debug', 'PDF buffer created', { ...ctx, sizeBytes: pdfBuffer?.length });

        const tempUrl = storeTemporaryUrl(pdfBuffer, requestId);

        await page.close();
        log('debug', 'Browser page closed', ctx);

        return { tempUrl };
    } catch (error) {
        logError('PDF export step failed', error, ctx);
        throw error;
    }
}

function removeCookieBanner() {
    const cookieBanner = document.querySelector('.consent-banner-root');
    if (cookieBanner) cookieBanner.remove();
}

function addWatermark() {
    const wixAds = document.getElementById('WIX_ADS');
    if (wixAds) wixAds.remove();
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

function storeTemporaryUrl(pdfBuffer, requestId) {
    const filename = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, 'temp', filename);
    const ctx = { requestId, filename, filePath };

    try {
        fs.writeFileSync(filePath, pdfBuffer);
        log('debug', 'PDF written to temp storage', { ...ctx, sizeBytes: pdfBuffer?.length });
    } catch (error) {
        logError('Failed to write PDF to temp storage', error, ctx);
        throw error;
    }

    const fileUrl = `${SERVER_URL}/temp/${filename}`;
    log('info', 'Temporary PDF URL created', { ...ctx, fileUrl });

    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
            log('debug', 'Temporary PDF file removed', ctx);
        } catch (error) {
            logError('Failed to remove temporary PDF file', error, ctx);
        }
    }, 10*60*1000);

    return fileUrl;
}

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidUrl(url) {
    var urlPattern = /^(http(s):\/\/.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;
    return urlPattern.test(url);
}

async function getBrowser() {
    if (!browser) {
        let resolvedPath;
        try {
            resolvedPath = puppeteer.executablePath();
        } catch (error) {
            resolvedPath = undefined;
        }
        log('info', 'Launching Puppeteer browser', {
            executablePath: resolvedPath,
            executableExists: resolvedPath ? fs.existsSync(resolvedPath) : false,
            cacheDir: process.env.PUPPETEER_CACHE_DIR,
        });
        try {
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                ],
            });
            log('info', 'Puppeteer browser launched');
        } catch (error) {
            logError('Failed to launch Puppeteer browser', error);
            throw error;
        }
        process.on('exit', async () => {
            if (browser) {
                try {
                    await browser.close();
                    log('debug', 'Puppeteer browser closed on process exit');
                } catch (error) {
                    logError('Failed to close browser on process exit', error);
                }
            }
        });
    }
    return browser;
}
