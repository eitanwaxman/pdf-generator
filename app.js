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

app.post('/', async (req, res) => {
    console.log(req.body);
    const { url, options } = req.body;

    if (!isValidUrl(url)) return res.status(400).send('Vaild URL is required');

    try {
        const PDF = await exportWebsiteAsPdf(url, options);
        res.send(PDF);
    } catch (error) {
        console.log("error", error);
        res.status(500).send('Internal Server Error')
    }

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

let browser;

async function exportWebsiteAsPdf(websiteUrl, options) {
    const { margin, free, delay, waitForDataLoad } = options || {};

    // const browser = await puppeteer.launch({
    //     headless: 'new'
    // });

    const browser = await getBrowser();
    console.log("browser", browser);

    const page = await browser.newPage();
    console.log("page", page);

    await page.goto(websiteUrl, { waitUntil: 'networkidle0', timeout: 0 });

    await page.evaluate(() => {
        window.scrollBy(0, document.body.scrollHeight);
    });

    await timeout((delay && delay <= 10000) ? delay : 2000);

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

    if (free) {
        await page.evaluate(addWatermark);
    }

    const pdfBuffer = await page.pdf({
        margin: margin ? margin : { top: '100px', right: '50px', bottom: '100px', left: '50px' },
        printBackground: true,
        format: 'A4',
    });

    storeTemporaryUrl(pdfBuffer);

    await page.close(); //browser.close();

    return pdfBuffer;
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

function storeTemporaryUrl(pdfBuffer) {
    const filename = `${uuidv4()}.pdf`;
    const filePath = path.join(__dirname, 'temp', filename);

    fs.writeFileSync(filePath, pdfBuffer);

    const fileUrl = `${SERVER_URL}/temp/${filename}`;
    console.log("fileUrl", fileUrl);

    setTimeout(() => {
        fs.unlinkSync(filePath);
        console.log(`File ${filename} removed.`);
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
        browser = await puppeteer.launch({ headless: 'new' });
        process.on('exit', async () => {
            if (browser) {
                await browser.close();
            }
        });
    }
    return browser;
}
