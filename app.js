//TODO - repond with a temp file url as well (option)

const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');


const app = express();
const port = process.env.PORT || 3000;
const SERVER_URL = "https://pdf-generator-dev.onrender.com" //"https://pdf-generator-new.onrender.com" //

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/temp', express.static('temp'));

// Add global process error logging to capture uncaught errors and rejections
process.on('unhandledRejection', (reason, p) => {
    console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
});

app.post('/', async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST / received:`, req.body);
    const { url, options } = req.body;

    if (!isValidUrl(url)) {
        console.warn(`[${new Date().toISOString()}] Invalid URL received:`, url);
        return res.status(400).send('Vaild URL is required');
    }

    try {
        console.log(`[${new Date().toISOString()}] Starting exportWebsiteAsPdf for ${url} with options:`, options);
        const PDF = await exportWebsiteAsPdf(url, options);
        console.log(`[${new Date().toISOString()}] exportWebsiteAsPdf completed. PDF size: ${PDF && PDF.length ? PDF.length : 'unknown'} bytes`);
        res.send(PDF);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during PDF generation:`, error);
        res.status(500).send('Internal Server Error')
    }

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

let browser;

async function exportWebsiteAsPdf(websiteUrl, options) {
    const { margin, format, free, delay, waitForDataLoad } = options || {};
    console.log(`[${new Date().toISOString()}] exportWebsiteAsPdf called with:`, { websiteUrl, options });

    const browser = await getBrowser();
    console.log(`[${new Date().toISOString()}] Obtained browser instance.`);

    const page = await browser.newPage();
    console.log(`[${new Date().toISOString()}] New page created.`);

    console.log(`[${new Date().toISOString()}] Navigating to ${websiteUrl}`);
    await page.goto(websiteUrl, { waitUntil: 'networkidle0', timeout: 0 });
    console.log(`[${new Date().toISOString()}] Navigation complete: ${websiteUrl}`);

    await page.evaluate(() => {
        window.scrollBy(0, document.body.scrollHeight);
    });
    console.log(`[${new Date().toISOString()}] Scrolled to bottom of page.`);

    const waitMs = (delay && delay <= 10000) ? delay : 2000;
    console.log(`[${new Date().toISOString()}] Waiting for ${waitMs}ms`);
    await timeout(waitMs);
    console.log(`[${new Date().toISOString()}] Wait complete.`);

    if (waitForDataLoad) {
        console.log(`[${new Date().toISOString()}] waitForDataLoad is true. Waiting for iframe and #loadedIndicator.`);
        const iframe = await page.waitForSelector('iframe', { timeout: 60000 });
        const frame = await iframe.contentFrame();

        if (frame) {
            await frame.waitForSelector("#loadedIndicator", { timeout: 60000 });
            console.log(`[${new Date().toISOString()}] Found iframe and #loadedIndicator.`);
        } else {
            console.error(`[${new Date().toISOString()}] Could not find iframe content`);
            throw new Error('Could not find iframe content');
        }
    }


    await page.emulateMediaType('screen');
    console.log(`[${new Date().toISOString()}] Emulated screen media type.`);

    console.log(`[${new Date().toISOString()}] Removing Wix ads and cookie banner if present.`);
    await page.evaluate(removeWixAds);
    await page.evaluate(removeCookieBanner);
    console.log(`[${new Date().toISOString()}] Removal of overlays attempted.`);

    if (free) {
        console.log(`[${new Date().toISOString()}] Adding watermark (free mode).`);
        await page.evaluate(addWatermark);
        console.log(`[${new Date().toISOString()}] Watermark added.`);
    }

    console.log(`[${new Date().toISOString()}] Generating PDF with format=${format || 'A4'}`);
    const pdfBuffer = await page.pdf({
        margin: margin ? margin : { top: '100px', right: '50px', bottom: '100px', left: '50px' },
        printBackground: true,
        format: format || 'A4',
    });
    console.log(`[${new Date().toISOString()}] PDF generated. Size: ${pdfBuffer && pdfBuffer.length ? pdfBuffer.length : 'unknown'} bytes`);

    storeTemporaryUrl(pdfBuffer);
    console.log(`[${new Date().toISOString()}] storeTemporaryUrl called.`);

    await page.close(); //browser.close();
    console.log(`[${new Date().toISOString()}] Page closed.`);

    return pdfBuffer;
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

function storeTemporaryUrl(pdfBuffer) {
    const filename = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, 'temp', filename);

    console.log(`[${new Date().toISOString()}] Writing PDF to ${filePath}`);
    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${SERVER_URL}/temp/${filename}`;
    console.log(`[${new Date().toISOString()}] File written. Accessible at: ${fileUrl}`);

    setTimeout(() => {
        try {
            fs.unlinkSync(filePath);
            console.log(`File ${filename} removed.`);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] Error removing file ${filename}:`, err);
        }
    }, 60000);
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
        console.log(`[${new Date().toISOString()}] Launching new puppeteer browser...`);
        browser = await puppeteer.launch({ headless: 'new' });
        console.log(`[${new Date().toISOString()}] Puppeteer browser launched.`);
        process.on('exit', async () => {
            console.log(`[${new Date().toISOString()}] Process exiting. Closing browser if open.`);
            if (browser) {
                await browser.close();
            }
        });
    } else {
        console.log(`[${new Date().toISOString()}] Reusing existing browser instance.`);
    }
    return browser;
}
