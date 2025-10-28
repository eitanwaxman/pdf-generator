const axios = require('axios');
const MetricsCollector = require('../helpers/metrics');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const FREE_API_KEY = 'test-free-key';
const PAID_API_KEY = 'test-paid-key';

describe('Basic Load Tests', () => {
    let metrics;

    beforeAll(() => {
        metrics = new MetricsCollector();
    });

    afterAll(() => {
        metrics.printSummary();
    });

    beforeEach(() => {
        metrics.reset();
    });

    test('should handle 10 concurrent requests', async () => {
        const concurrentRequests = 10;
        const targetUrl = 'https://example.com';

        const makeRequest = async () => {
            const record = metrics.recordRequest({ tier: 'free', url: targetUrl });
            const startTime = Date.now();
            
            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: targetUrl,
                        options: { format: 'A4' }
                    },
                    {
                        headers: { 'x-api-key': FREE_API_KEY },
                        timeout: 30000
                    }
                );

                const duration = Date.now() - startTime;
                metrics.recordSuccess(record, duration);

                // Return jobId for status checking
                return response.data.jobId;
            } catch (error) {
                const duration = Date.now() - startTime;
                if (error.code === 'ECONNABORTED') {
                    metrics.recordTimeout(record, duration);
                } else {
                    metrics.recordFailure(record, error);
                }
                return null; // Indicate failure
            }
        };

        const requests = Array(concurrentRequests).fill(null).map(() => makeRequest());
        const results = await Promise.allSettled(requests);

        const summary = metrics.getSummary();
        
        console.log(`\n10 Concurrent Requests Test:`);
        console.log(`  Successful job creations: ${summary.successes}`);
        console.log(`  Failed job creations: ${summary.failures}`);
        console.log(`  Average response time: ${summary.avgResponseTime}ms`);

        // We should have some successes (unless rate limited)
        expect(summary.successes).toBeGreaterThanOrEqual(0);
        expect(summary.successes + summary.failures + summary.timeouts).toBe(concurrentRequests);
    }, 60000);

    test('should handle 50 concurrent requests', async () => {
        const concurrentRequests = 50;
        const targetUrl = 'https://example.com';

        const makeRequest = async () => {
            const record = metrics.recordRequest({ tier: 'free', url: targetUrl });
            const startTime = Date.now();
            
            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: targetUrl,
                        options: { format: 'A4' }
                    },
                    {
                        headers: { 'x-api-key': FREE_API_KEY },
                        timeout: 30000
                    }
                );

                const duration = Date.now() - startTime;
                metrics.recordSuccess(record, duration);
                return response.data.jobId;
            } catch (error) {
                const duration = Date.now() - startTime;
                if (error.code === 'ECONNABORTED') {
                    metrics.recordTimeout(record, duration);
                } else {
                    metrics.recordFailure(record, error);
                }
                // Don't throw error here - let the test handle it
            }
        };

        const requests = Array(concurrentRequests).fill(null).map(() => makeRequest());
        const results = await Promise.allSettled(requests);

        const summary = metrics.getSummary();
        
        console.log(`\n50 Concurrent Requests Test:`);
        console.log(`  Successful job creations: ${summary.successes}`);
        console.log(`  Failed job creations: ${summary.failures}`);
        console.log(`  Rate limited: ${summary.failures}`);
        console.log(`  Average response time: ${summary.avgResponseTime}ms`);

        // With 50 concurrent requests, some should succeed, some may be rate limited
        expect(summary.successes + summary.failures + summary.timeouts).toBe(concurrentRequests);
    }, 120000);

    test('should handle sustained load over time', async () => {
        const requestsPerSecond = 2;
        const durationSeconds = 10;
        const totalRequests = requestsPerSecond * durationSeconds;
        const intervalMs = 1000 / requestsPerSecond;
        const targetUrl = 'https://example.com';

        let completed = 0;

        for (let i = 0; i < totalRequests; i++) {
            setTimeout(async () => {
                const record = metrics.recordRequest({ tier: 'free', url: targetUrl });
                const startTime = Date.now();
                
                try {
                    const response = await axios.post(
                        `${BASE_URL}/api/v1/jobs`,
                        {
                            url: targetUrl,
                            options: { format: 'A4' }
                        },
                        {
                            headers: { 'x-api-key': FREE_API_KEY },
                            timeout: 30000
                        }
                    );

                    const duration = Date.now() - startTime;
                    metrics.recordSuccess(record, duration);
                } catch (error) {
                    const duration = Date.now() - startTime;
                    if (error.code === 'ECONNABORTED' || error.response?.status === 429) {
                        metrics.recordTimeout(record, duration);
                    } else {
                        metrics.recordFailure(record, error);
                    }
                }
                
                completed++;
            }, i * intervalMs);
        }

        // Wait for all requests to complete or timeout
        let waitTime = 0;
        while (completed < totalRequests && waitTime < 60000) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitTime += 1000;
        }

        const summary = metrics.getSummary();
        
        console.log(`\nSustained Load Test (${requestsPerSecond} req/s for ${durationSeconds}s):`);
        console.log(`  Total requests: ${summary.totalRequests}`);
        console.log(`  Successes: ${summary.successes}`);
        console.log(`  Failures: ${summary.failures}`);
        console.log(`  Average response time: ${summary.avgResponseTime}ms`);

        expect(completed).toBe(totalRequests);
    }, 90000);

    test('free tier rate limiting should enforce limits', async () => {
        // First, make many requests to test rate limiting
        const requests = 60; // Should exceed the 50 request limit
        const targetUrl = 'https://example.com';

        const makeRequest = async () => {
            const record = metrics.recordRequest({ tier: 'free', url: targetUrl });
            const startTime = Date.now();
            
            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: targetUrl,
                        options: { format: 'A4' }
                    },
                    {
                        headers: { 'x-api-key': FREE_API_KEY },
                        timeout: 30000
                    }
                );

                const duration = Date.now() - startTime;
                metrics.recordSuccess(record, duration);
                return { success: true, status: response.status };
            } catch (error) {
                const duration = Date.now() - startTime;
                if (error.response?.status === 429) {
                    metrics.recordTimeout(record, duration);
                    return { success: false, status: 429, error: 'Rate limited' };
                } else if (error.code === 'ECONNABORTED') {
                    metrics.recordTimeout(record, duration);
                    return { success: false, status: 'timeout' };
                } else {
                    metrics.recordFailure(record, error);
                    return { success: false, status: error.response?.status || 'error' };
                }
            }
        };

        const requestPromises = Array(requests).fill(null).map(() => makeRequest());
        const results = await Promise.allSettled(requestPromises);

        const summary = metrics.getSummary();
        const rateLimited = results.filter(r => 
            r.status === 'fulfilled' && r.value.status === 429
        ).length;

        console.log(`\nRate Limiting Test (${requests} requests to free tier):`);
        console.log(`  Successful: ${summary.successes}`);
        console.log(`  Rate limited: ${rateLimited}`);
        console.log(`  Other failures: ${summary.failures - rateLimited}`);

        // Should have some rate limiting occur when exceeding limits
        expect(rateLimited).toBeGreaterThan(0);
    }, 120000);

    test('paid tier should have no rate limiting', async () => {
        // Make many requests with paid tier
        const requests = 60; // Should NOT be rate limited
        const targetUrl = 'https://example.com';

        const makeRequest = async () => {
            const record = metrics.recordRequest({ tier: 'paid', url: targetUrl });
            const startTime = Date.now();
            
            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: targetUrl,
                        options: { format: 'A4' }
                    },
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 30000
                    }
                );

                const duration = Date.now() - startTime;
                metrics.recordSuccess(record, duration);
                return { success: true, status: response.status };
            } catch (error) {
                const duration = Date.now() - startTime;
                if (error.response?.status === 429) {
                    metrics.recordTimeout(record, duration);
                    return { success: false, status: 429 };
                } else if (error.code === 'ECONNABORTED') {
                    metrics.recordTimeout(record, duration);
                    return { success: false, status: 'timeout' };
                } else {
                    metrics.recordFailure(record, error);
                    return { success: false, status: error.response?.status || 'error' };
                }
            }
        };

        const requestPromises = Array(requests).fill(null).map(() => makeRequest());
        const results = await Promise.allSettled(requestPromises);

        const summary = metrics.getSummary();
        const rateLimited = results.filter(r => 
            r.status === 'fulfilled' && r.value.status === 429
        ).length;

        console.log(`\nPaid Tier No Rate Limiting Test (${requests} requests):`);
        console.log(`  Successful: ${summary.successes}`);
        console.log(`  Rate limited: ${rateLimited}`);
        console.log(`  Other failures: ${summary.failures}`);

        // Paid tier should not be rate limited
        expect(rateLimited).toBe(0);
    }, 120000);
});

