/**
 * Standalone Wix PDF Generator Backend Server
 * 
 * This is a standalone server for the Wix PDF generation backend.
 * Use this if you want to run the Wix backend separately from your main API.
 * 
 * For integration with existing app, use index.js instead.
 */

const express = require('express');
const generatePdfRouter = require('./api/generate-pdf');

const app = express();
const PORT = process.env.WIX_BACKEND_PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wix-pdf-backend' });
});

// Mount the PDF generation router
app.use('/wix/api/generate-pdf', generatePdfRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Wix PDF Generator Backend listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`PDF generation: http://localhost:${PORT}/wix/api/generate-pdf`);
});

module.exports = app;

