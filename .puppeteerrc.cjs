const {join} = require('path');

const RENDER_CACHE = '/opt/render/project/.puppeteer';
const LOCAL_CACHE = join(__dirname, '.cache', 'puppeteer');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // On Render, keep Chrome outside node_modules so dependency cache cannot restore a broken install.
  // See https://github.com/puppeteer/puppeteer/issues/9694#issuecomment-1448664518
  cacheDirectory:
    process.env.PUPPETEER_CACHE_DIR ||
    (process.env.RENDER ? RENDER_CACHE : LOCAL_CACHE),
};
