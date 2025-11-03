const puppeteer = require('puppeteer');

// Simple browser pool to reuse a limited number of browser instances concurrently
// and distribute new pages across them. This avoids launching a browser per job
// while still supporting concurrency.

const DEFAULT_MAX_BROWSERS = Number(process.env.BROWSER_POOL_MAX || 2);
const DEFAULT_MAX_PAGES_PER_BROWSER = Number(process.env.PAGES_PER_BROWSER || 5);

let isInitialized = false;
const browsers = []; // { browser, pagesInUse }
const pageToBrowser = new WeakMap();
const waitQueue = []; // Array of { resolve, reject }

async function launchBrowser() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const wrapper = { browser, pagesInUse: 0 };
  browsers.push(wrapper);
  return wrapper;
}

async function initializePool() {
  if (isInitialized) return;
  isInitialized = true;

  const initial = Math.max(1, DEFAULT_MAX_BROWSERS);
  for (let i = 0; i < initial; i++) {
    // Launch sequentially to avoid spikes
    await launchBrowser();
  }

  // Graceful shutdown
  const shutdown = async () => {
    try {
      await closeAll();
    } catch (_) {}
  };
  process.on('exit', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function pickLeastLoadedBrowser() {
  if (browsers.length === 0) return null;
  return browsers.reduce((min, b) => (b.pagesInUse < min.pagesInUse ? b : min), browsers[0]);
}

async function acquirePage() {
  await initializePool();

  const tryAllocate = async () => {
    // Prefer existing least-loaded browser with available capacity
    let target = pickLeastLoadedBrowser();
    const maxPages = DEFAULT_MAX_PAGES_PER_BROWSER;

    if (!target || target.pagesInUse >= maxPages) {
      // If we can grow the pool, do so
      if (browsers.length < DEFAULT_MAX_BROWSERS) {
        target = await launchBrowser();
      }
    }

    // If still no capacity, return null to indicate caller should enqueue
    if (!target || target.pagesInUse >= maxPages) {
      return null;
    }

    target.pagesInUse += 1;
    const page = await target.browser.newPage();
    pageToBrowser.set(page, target);
    return page;
  };

  const page = await tryAllocate();
  if (page) return page;

  // No capacity now; wait until a slot frees up
  return new Promise((resolve, reject) => {
    waitQueue.push({ resolve, reject });
  });
}

async function releasePage(page) {
  const wrapper = pageToBrowser.get(page);
  if (!wrapper) return;
  // Caller is responsible for page.close(). We only decrement counters and serve waiters.
  if (wrapper.pagesInUse > 0) wrapper.pagesInUse -= 1;

  // Serve next waiter if any
  while (waitQueue.length > 0) {
    const waiter = waitQueue.shift();
    // Attempt to allocate a page now
    acquirePage()
      .then(waiter.resolve)
      .catch(waiter.reject);
    break;
  }
}

async function closeAll() {
  const closePromises = browsers.map(async (w) => {
    try {
      await w.browser.close();
    } catch (_) {}
  });
  await Promise.all(closePromises);
  browsers.splice(0, browsers.length);
  waitQueue.splice(0, waitQueue.length);
  isInitialized = false;
}

module.exports = {
  acquirePage,
  releasePage,
  closeAll,
};


