/**
 * Wix PDF Generator Backend
 * 
 * This module exports the Wix PDF generation router
 * that can be integrated into your existing Express application.
 * 
 * Usage in your main app.js:
 * 
 * const wixPdfRouter = require('./platforms/wix/backend');
 * app.use('/wix/api/generate-pdf', wixPdfRouter);
 */

const generatePdfRouter = require('./api/generate-pdf');

module.exports = generatePdfRouter;

