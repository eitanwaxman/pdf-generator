/**
 * Constants for PDF generation service
 */

// PDF Format Options
const PDF_FORMATS = {
    LETTER: 'Letter',
    LEGAL: 'Legal',
    TABLOID: 'Tabloid',
    LEDGER: 'Ledger',
    A0: 'A0',
    A1: 'A1',
    A2: 'A2',
    A3: 'A3',
    A4: 'A4',
    A5: 'A5',
    A6: 'A6'
};

const PDF_FORMATS_LIST = [
    'Letter',
    'Legal',
    'Tabloid',
    'Ledger',
    'A0',
    'A1',
    'A2',
    'A3',
    'A4',
    'A5',
    'A6'
];

// Platform Options
const PLATFORMS = {
    WIX: 'wix'
};

const PLATFORM_LIST = ['wix'];

// Response Types
const RESPONSE_TYPES = {
    BUFFER: 'buffer',
    URL: 'url'
};

const RESPONSE_TYPE_LIST = ['buffer', 'url'];

// Result Types
const RESULT_TYPES = {
    URL: 'url',
    BUFFER: 'buffer'
};

// Output Types
const OUTPUT_TYPES = {
    PDF: 'pdf',
    SCREENSHOT: 'screenshot'
};

const OUTPUT_TYPE_LIST = ['pdf', 'screenshot'];

// Screenshot Types
const SCREENSHOT_TYPES = {
    PNG: 'png',
    JPEG: 'jpeg',
    WEBP: 'webp'
};

const SCREENSHOT_TYPE_LIST = ['png', 'jpeg', 'webp'];

// Default Screenshot Options
const DEFAULT_SCREENSHOT_OPTIONS = {
    type: 'png',
    quality: 90,
    fullPage: true,
    viewport: {
        width: 1920,
        height: 1080
    }
};

// Time Constants (in milliseconds)
const TIME = {
    IFRAME_TIMEOUT: 60000,
    TEMP_FILE_TTL: 60000,
    PAGE_NAVIGATION_TIMEOUT: 0,
    NETWORK_IDLE_TIME: 500,
    NETWORK_IDLE_TIMEOUT: 3000
};

// Priority Constants
const PRIORITY = {
    FREE_TIER: 1,
    PAID_TIER: 10
};

// Page Limit Constants
const PAGE_LIMITS = {
    FREE_TIER: 1,
    PAID_TIER: 5
};

// Queue Constants
const QUEUE = {
    MAX_ATTEMPTS: 3,
    BACKOFF_DELAY: 2000,
    JOB_KEEP_COMPLETED_SECONDS: 3600,
    JOB_KEEP_COMPLETED_COUNT: 100,
    JOB_KEEP_FAILED_SECONDS: 24 * 3600
};

// Rate Limiting Constants
const RATE_LIMIT = {
    WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
    MAX_REQUESTS_FREE: 50
};

// Watermark Style Constants
const WATERMARK = {
    FONT_SIZE: '16px',
    WIDTH: '100%',
    OPACITY: '0.7',
    MARGIN_TOP: '20px',
    Z_INDEX: '1000',
    URL: 'https://thewixwiz.com/wix-apps',
    TEXT: 'Generated using PDF Generator App by The Wix Wiz. Visit thewixwiz.com/wix-apps to learn more'
};

// Default PDF Margin
const DEFAULT_MARGIN = {
    top: '100px',
    right: '50px',
    bottom: '100px',
    left: '50px'
};

// PDF Page Full Heights at 96 DPI (total height in pixels)
const PDF_FULL_HEIGHTS = {
    [PDF_FORMATS.LETTER]: 1056,   // 8.5" × 11" at 96 DPI
    [PDF_FORMATS.LEGAL]: 1270,     // 8.5" × 14" at 96 DPI
    [PDF_FORMATS.TABLOID]: 1414,   // 11" × 17" at 96 DPI (rotated, so height is longer)
    [PDF_FORMATS.LEDGER]: 1016,    // 17" × 11" at 96 DPI
    [PDF_FORMATS.A0]: 3654,         // A0 at 96 DPI
    [PDF_FORMATS.A1]: 2638,         // A1 at 96 DPI
    [PDF_FORMATS.A2]: 1928,         // A2 at 96 DPI
    [PDF_FORMATS.A3]: 1418,         // A3 at 96 DPI
    [PDF_FORMATS.A4]: 1123,         // A4 at 96 DPI
    [PDF_FORMATS.A5]: 852,          // A5 at 96 DPI
    [PDF_FORMATS.A6]: 663           // A6 at 96 DPI
};

// Concurrency
const WORKER_CONCURRENCY = 3;

module.exports = {
    PDF_FORMATS,
    PDF_FORMATS_LIST,
    PLATFORMS,
    PLATFORM_LIST,
    RESPONSE_TYPES,
    RESPONSE_TYPE_LIST,
    RESULT_TYPES,
    OUTPUT_TYPES,
    OUTPUT_TYPE_LIST,
    SCREENSHOT_TYPES,
    SCREENSHOT_TYPE_LIST,
    DEFAULT_SCREENSHOT_OPTIONS,
    TIME,
    PRIORITY,
    QUEUE,
    RATE_LIMIT,
    WATERMARK,
    DEFAULT_MARGIN,
    PDF_FULL_HEIGHTS,
    PAGE_LIMITS,
    WORKER_CONCURRENCY
};

