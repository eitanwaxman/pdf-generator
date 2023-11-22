const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define a simple route
app.post('/', async (req, res) => {
    console.log(req.body);
    const { url } = req.body;
    console.log("url", url)
    try {
        const PDF = await exportWebsiteAsPdf(url);
        console.log("PDF", PDF)
        res.send(PDF);
    } catch (error) {
        console.log("error", error);
        res.send('Error');
    }

});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});




async function exportWebsiteAsPdf(websiteUrl, outputPath) {
    // Create a browser instance
    const browser = await puppeteer.launch({
        headless: 'new'
    });

    // Create a new page
    const page = await browser.newPage();

    // Open URL in current page
    await page.goto(websiteUrl, { waitUntil: 'networkidle0' });

    await page.waitForNavigation({
        waitUntil: 'networkidle0',
    });
    // To reflect CSS used for screens instead of print
    await page.emulateMediaType('screen');

    // Download the PDF
    const PDF = await page.pdf({
        // path: outputPath,
        margin: { top: '100px', right: '50px', bottom: '100px', left: '50px' },
        printBackground: true,
        format: 'A4',
    });

    // Close the browser instance
    await browser.close();

    return PDF;
}
