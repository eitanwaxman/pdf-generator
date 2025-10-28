# Load Testing Suite

This directory contains comprehensive load and stress tests for the PDF Generator service.

## Test Files

### `basic-load.test.js`
Tests basic concurrent request scenarios:
- 10 concurrent requests
- 50 concurrent requests
- Sustained load over time
- Free tier rate limiting verification
- Paid tier unlimited access verification

### `tier-mixing.test.js`
Tests mixed free/paid tier scenarios:
- Queue priority validation (paid jobs processed first)
- Watermark verification (free tier has watermark, paid doesn't)
- Mixed tier concurrent load testing

### `resource-stress.test.js`
Tests resource-intensive scenarios:
- Large web pages with high content volume
- Slow loading pages
- Slow loading assets (CSS, JS, images)
- Multiple concurrent large page requests
- Mixed resource types (small, large, slow)

### `edge-cases.test.js`
Tests error handling and edge cases:
- Invalid URL rejection
- Invalid PDF options rejection
- Non-existent job ID handling
- Authentication requirements enforcement
- Job cancellation
- Timeout handling
- Concurrent status checks
- Malformed request bodies

## Running the Tests

### Prerequisites

1. Start Redis server (required for queue system):
   ```bash
   # On Windows with Redis installed
   redis-server

   # Or use Docker
   docker run -p 6379:6379 redis
   ```

2. Start the PDF Generator server:
   ```bash
   npm start
   # or
   node app.js
   ```

3. Install test dependencies:
   ```bash
   npm install
   ```

### Running Tests

Run all load tests:
```bash
npm test:load
```

Run specific test suite:
```bash
npm test:load:basic    # Basic load tests
npm test:load:tier     # Tier mixing tests
npm test:load:stress   # Resource stress tests
npm test:load:edge     # Edge case tests
```

Run a single test file:
```bash
npx jest test/load/basic-load.test.js
```

Run with verbose output:
```bash
npx jest test/load/basic-load.test.js --verbose
```

## Test Helper Server

The test suite includes a helper server (`test/helpers/test-server.js`) that provides controlled testing scenarios:

- `/small` - Small test page with minimal content
- `/large` - Large page with substantial content
- `/slow?delay=N` - Page that takes N milliseconds to load
- `/slow-assets?delay=N` - Page with slow-loading CSS, JS, and images
- `/assets/*` - Mock static assets (images, CSS, JS)

The server starts automatically on port 8888 when needed.

## Metrics

Each test collects and reports metrics including:
- Total requests
- Successes/failures/timeouts
- Average response times
- Min/max response times
- Requests per second
- Memory usage (current and peak)

## Expected Results

### Success Criteria

The tests validate that:
- Server handles 50+ concurrent requests without crashing
- Free tier rate limiting enforces ~50 requests per 24 hours
- Paid tier has no rate limiting
- Paid jobs process before free jobs (priority queue)
- Large pages (>25MB content) are handled successfully
- Slow assets (>3s delay) don't cause timeouts
- Memory usage stays within reasonable bounds (<2GB)
- Authentication and validation work correctly
- Error cases are handled gracefully

### Performance Expectations

- Job creation: < 100ms average
- Small page PDF generation: 5-15 seconds
- Large page PDF generation: 10-30 seconds
- Concurrent request handling: 50+ req/s
- Memory usage: < 512MB per worker under normal load

## Troubleshooting

### Tests Failing

1. Ensure Redis is running:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. Ensure the main server is running on port 3000

3. Check server logs for errors

4. Verify API keys in `config/apiKeys.js`:
   - `test-free-key` for free tier testing
   - `test-paid-key` for paid tier testing

### Timeouts

Some tests have extended timeouts (up to 3 minutes) for large or slow pages. If tests still timeout:
- Check server logs for Puppeteer errors
- Verify internet connectivity (some tests use real URLs)
- Increase timeout values in test files if needed

### Rate Limiting Issues

Free tier rate limiting uses Redis. If Redis is not available:
- Rate limiting is disabled (fail-open behavior)
- Tests may not accurately reflect rate limiting behavior
- Consider using a real Redis instance for accurate testing

## Test Configuration

Test configuration is in `jest.config.js`:
- Default timeout: 5 minutes
- Test environment: Node.js
- Coverage collection enabled for main app files

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use the MetricsCollector for tracking metrics
3. Include meaningful console output
4. Set appropriate timeouts
5. Document any new dependencies or requirements

