const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/', async (req, res) => {
    console.log(req.body);
    const { url, options } = req.body;
    try {
        const PDF = await exportWebsiteAsPdf(url, options);
        console.log("PDF", PDF)
        res.send(PDF);
    } catch (error) {
        console.log("error", error);
        res.send('Error');
    }

});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});




async function exportWebsiteAsPdf(websiteUrl, options) {

    const { margin, free } = options;

    const browser = await puppeteer.launch({
        headless: 'new'
    });

    const page = await browser.newPage();

    await page.goto(websiteUrl, { waitUntil: 'networkidle0', timeout: 0 });

    await timeout(2000);

    await page.emulateMediaType('screen');

    if (free) {
        await page.evaluate(() => {
            const wixAds = document.getElementById('WIX_ADS');
            wixAds.remove();
            const uppermostElement = document.body.children[0];
            const watermark = document.createElement('div');

            const watermarkLink = document.createElement('a');
            watermarkLink.href = 'https://thewixwiz.com/wix-apps'; 
            watermarkLink.textContent = "Generated using PDF Generator App by The Wix Wiz. Visit thewixwiz.com/wix-apps to learn more";
            watermarkLink.style.color = 'inherit'; 
            watermarkLink.style.textDecoration = 'none';
            watermark.appendChild(watermarkLink);
            
            watermark.style.width = '100%';
            watermark.style.textAlign = 'center';
            watermark.style.opacity = '0.7';
            watermark.style.marginTop = '20px';
            watermark.style.fontSize = '14px';
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
