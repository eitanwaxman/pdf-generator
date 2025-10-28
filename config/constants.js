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

// Time Constants (in milliseconds)
const TIME = {
    DEFAULT_DELAY: 2000,
    MAX_DELAY: 10000,
    IFRAME_TIMEOUT: 60000,
    TEMP_FILE_TTL: 60000
};

// Size Constants
const SIZE = {
    KB: 1024,
    MB: 1024 * 1024,
    DEFAULT_MAX_PDF_SIZE_MB: 50,
    DEFAULT_MAX_PDF_SIZE: 50 * 1024 * 1024
};

// Priority Constants
const PRIORITY = {
    FREE_TIER: 1,
    PAID_TIER: 10
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
    Z_INDEX: '1000'
};

// Default PDF Margin
const DEFAULT_MARGIN = {
    top: '100px',
    right: '50px',
    bottom: '100px',
    left: '50px'
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
    TIME,
    SIZE,
    PRIORITY,
    QUEUE,
    RATE_LIMIT,
    WATERMARK,
    DEFAULT_MARGIN,
    WORKER_CONCURRENCY
};

