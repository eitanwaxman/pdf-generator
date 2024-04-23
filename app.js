//TODO - repond with a temp file url as well (option)

const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', async (req, res) => {
    console.log(req.body);
    const { url, options } = req.body;

    if (!url) return res.status(400).send('URL is required');

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




async function exportWebsiteAsPdf(websiteUrl, options) {

    const { margin, free, delay } = options || {};

    const browser = await puppeteer.launch({
        headless: 'new'
    });

    const page = await browser.newPage();

    await page.goto(websiteUrl, { waitUntil: 'networkidle0', timeout: 0 });

    await timeout((delay && delay <= 10000) ? delay : 2000);

    await page.emulateMediaType('screen');

    if (free) {
        await page.evaluate(() => {
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
        })
    }

    const PDF = await page.pdf({
        margin: margin ? margin : { top: '100px', right: '50px', bottom: '100px', left: '50px' },
        printBackground: true,
        format: 'A4',
    });

    await browser.close();

    return PDF;
}

async function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
