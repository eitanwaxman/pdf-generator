const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Keep Chrome inside node_modules so Render's deploy artifact and build cache include it.
  // A top-level `.cache/` directory is gitignored and may be omitted from the deploy bundle.
  cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
};