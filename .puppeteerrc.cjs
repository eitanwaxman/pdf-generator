const {join} = require('path');
const fs = require('fs');

const RENDER_CACHE = '/opt/render/project/.puppeteer';
const LOCAL_CACHE = join(__dirname, '.cache', 'puppeteer');

// Detect Render by the filesystem layout, not the RENDER env var. The env var is
// not guaranteed to be set identically during build and runtime, which can make
// the build install Chrome to one path while runtime looks in another.
const onRender = fs.existsSync('/opt/render/project');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  cacheDirectory:
    process.env.PUPPETEER_CACHE_DIR ||
    (onRender ? RENDER_CACHE : LOCAL_CACHE),
};
