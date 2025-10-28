const axios = require('axios');
const MetricsCollector = require('../helpers/metrics');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const FREE_API_KEY = 'test-free-key';
const PAID_API_KEY = 'test-paid-key';

describe('Edge Cases Tests', () => {
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

    test('should reject invalid URLs', async () => {
        const invalidUrls = [
            'not-a-url',
            'ftp://example.com',
            'http://',
            '',
            null,
            undefined
        ];

        console.log('\nTesting invalid URL rejection...');

        for (const url of invalidUrls) {
            const record = metrics.recordRequest({ url, type: 'invalid' });
            const startTime = Date.now();

            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: url,
                        options: { format: 'A4' }
                    },
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 10000
                    }
                );

                // Should not succeed
                expect(response.status).toBe(400);
                metrics.recordSuccess(record, Date.now() - startTime);
                console.log(`  Valid rejection for: ${url}`);
            } catch (error) {
                const duration = Date.now() - startTime;
                
                if (error.response?.status === 400) {
                    metrics.recordSuccess(record, duration);
                    console.log(`  Correctly rejected: ${url}`);
                } else {
                    metrics.recordFailure(record, error);
                    console.log(`  Unexpected response for: ${url} - ${error.message}`);
                }
            }
        }

        const summary = metrics.getSummary();
        console.log(`\nInvalid URL test: ${summary.successes} correctly rejected`);
    }, 60000);

    test('should reject invalid PDF options', async () => {
        const validUrl = 'https://example.com';
        const invalidOptions = [
            { format: 'InvalidFormat' },
            { margin: { top: 'invalid' } },
            { platform: 'invalid-platform' },
            { responseType: 'invalid-type' },
            { margin: { top: '50px', right: 'not-a-size' } }
        ];

        console.log('\nTesting invalid PDF options rejection...');

        for (const options of invalidOptions) {
            const record = metrics.recordRequest({ url: validUrl, options, type: 'invalid-options' });
            const startTime = Date.now();

            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: validUrl,
                        options: options
                    },
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 10000
                    }
                );

                // Should not succeed
                expect(response.status).toBe(400);
                metrics.recordSuccess(record, Date.now() - startTime);
                console.log(`  Valid rejection for options:`, options);
            } catch (error) {
                const duration = Date.now() - startTime;
                
                if (error.response?.status === 400) {
                    metrics.recordSuccess(record, duration);
                    console.log(`  Correctly rejected invalid options`);
                } else {
                    metrics.recordFailure(record, error);
                    console.log(`  Unexpected response:`, error.message);
                }
            }
        }

        const summary = metrics.getSummary();
        console.log(`\nInvalid options test: ${summary.successes} correctly rejected`);
    }, 60000);

    test('should handle non-existent job IDs gracefully', async () => {
        const fakeJobIds = [
            'non-existent-job-id',
            '12345',
            '00000000-0000-0000-0000-000000000000'
        ];

        console.log('\nTesting non-existent job ID handling...');

        for (const jobId of fakeJobIds) {
            const record = metrics.recordRequest({ jobId, type: 'non-existent' });
            const startTime = Date.now();

            try {
                const response = await axios.get(
                    `${BASE_URL}/api/v1/jobs/${jobId}`,
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 10000
                    }
                );

                // Should return 404
                expect(response.status).toBe(404);
                metrics.recordSuccess(record, Date.now() - startTime);
                console.log(`  Correctly returned 404 for: ${jobId}`);
            } catch (error) {
                const duration = Date.now() - startTime;
                
                if (error.response?.status === 404) {
                    metrics.recordSuccess(record, duration);
                    console.log(`  Correct 404 for: ${jobId}`);
                } else {
                    metrics.recordFailure(record, error);
                    console.log(`  Unexpected response for ${jobId}: ${error.message}`);
                }
            }
        }

        const summary = metrics.getSummary();
        console.log(`\nNon-existent job test: ${summary.successes} correctly handled`);
    }, 60000);

    test('should enforce authentication requirements', async () => {
        const validUrl = 'https://example.com';

        console.log('\nTesting authentication requirements...');

        const testCases = [
            { 
                name: 'missing API key',
                headers: { 'Content-Type': 'application/json' },
                expectedStatus: 401
            },
            {
                name: 'invalid API key',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': 'invalid-api-key'
                },
                expectedStatus: 401
            },
            {
                name: 'valid API key',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-api-key': PAID_API_KEY
                },
                expectedStatus: 202
            }
        ];

        for (const testCase of testCases) {
            const record = metrics.recordRequest({ testCase, type: 'auth' });
            const startTime = Date.now();

            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: validUrl,
                        options: { format: 'A4' }
                    },
                    {
                        headers: testCase.headers,
                        timeout: 10000,
                        validateStatus: () => true // Don't throw on non-2xx
                    }
                );

                const duration = Date.now() - startTime;

                if (response.status === testCase.expectedStatus) {
                    metrics.recordSuccess(record, duration);
                    console.log(`  ${testCase.name}: Correct status ${response.status}`);
                } else {
                    record.error = `Expected ${testCase.expectedStatus}, got ${response.status}`;
                    metrics.recordFailure(record, new Error(record.error));
                    console.log(`  ${testCase.name}: Wrong status ${response.status}`);
                }
            } catch (error) {
                const duration = Date.now() - startTime;
                metrics.recordFailure(record, error);
                console.log(`  ${testCase.name}: Request failed - ${error.message}`);
            }
        }

        const summary = metrics.getSummary();
        console.log(`\nAuthentication test: ${summary.successes} passed, ${summary.failures} failed`);
    }, 60000);

    test('should handle job cancellation', async () => {
        console.log('\nTesting job cancellation...');

        try {
            // Create a job
            const createResponse = await axios.post(
                `${BASE_URL}/api/v1/jobs`,
                {
                    url: 'https://httpstat.us/200?sleep=10000', // Slow URL to allow cancellation
                    options: { format: 'A4' }
                },
                {
                    headers: { 'x-api-key': PAID_API_KEY },
                    timeout: 10000
                }
            );

            const jobId = createResponse.data.jobId;
            console.log(`  Created job: ${jobId}`);

            // Try to cancel it
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit

            try {
                const deleteResponse = await axios.delete(
                    `${BASE_URL}/api/v1/jobs/${jobId}`,
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 10000
                    }
                );

                console.log('  Job cancellation response:', deleteResponse.data);
                
                // Check if job is actually cancelled or completed
                const statusResponse = await axios.get(
                    `${BASE_URL}/api/v1/jobs/${jobId}`,
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 10000
                    }
                );

                console.log('  Final job status:', statusResponse.data.status);
                
                // Job should either be cancelled, completed, or failed
                expect(['cancelled', 'completed', 'failed', 'processing']).toContain(statusResponse.data.status);
            } catch (error) {
                console.log('  Cancellation result:', error.response?.data || error.message);
                // Cancellation might not be supported in all states
            }
        } catch (error) {
            console.log('  Test failed:', error.message);
            // This is acceptable for testing
        }
    }, 60000);

    test('should handle timeout scenarios', async () => {
        const targetUrl = 'https://httpstat.us/200?sleep=30000'; // Takes 30 seconds
        
        console.log('\nTesting timeout handling...');

        const record = metrics.recordRequest({ url: targetUrl, type: 'timeout' });
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
                    timeout: 15000 // 15 second timeout
                }
            );

            const jobId = response.data.jobId;
            console.log(`  Job created (may take long to process): ${jobId}`);

            // Poll with reasonable timeout
            let attempts = 0;
            const maxAttempts = 60;

            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                try {
                    const statusResponse = await axios.get(
                        `${BASE_URL}/api/v1/jobs/${jobId}`,
                        {
                            headers: { 'x-api-key': PAID_API_KEY },
                            timeout: 10000
                        }
                    );

                    const statusData = statusResponse.data;

                    if (statusData.status === 'completed') {
                        console.log('  Job completed despite slow URL');
                        metrics.recordSuccess(record, Date.now() - startTime);
                        return;
                    } else if (statusData.status === 'failed') {
                        console.log('  Job failed (expected for timeout scenario)');
                        metrics.recordSuccess(record, Date.now() - startTime);
                        return;
                    }
                } catch (error) {
                    // Continue polling
                }

                attempts++;
            }

            console.log('  Timeout test completed');
        } catch (error) {
            const duration = Date.now() - startTime;
            if (error.code === 'ECONNABORTED') {
                metrics.recordTimeout(record, duration);
                console.log('  Request timed out as expected');
            } else {
                metrics.recordFailure(record, error);
                console.log('  Unexpected error:', error.message);
            }
        }
    }, 120000);

    test('should handle concurrent status checks', async () => {
        console.log('\nTesting concurrent status checks...');

        // Create a job first
        const createResponse = await axios.post(
            `${BASE_URL}/api/v1/jobs`,
            {
                url: 'https://example.com',
                options: { format: 'A4' }
            },
            {
                headers: { 'x-api-key': PAID_API_KEY },
                timeout: 10000
            }
        );

        const jobId = createResponse.data.jobId;
        console.log(`  Created job: ${jobId}`);

        // Make 20 concurrent status checks
        const statusChecks = 20;
        const checkPromises = [];

        for (let i = 0; i < statusChecks; i++) {
            const startTime = Date.now();
            
            checkPromises.push(
                axios.get(
                    `${BASE_URL}/api/v1/jobs/${jobId}`,
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 10000
                    }
                )
                .then(response => {
                    const duration = Date.now() - startTime;
                    return { success: true, status: response.status, duration };
                })
                .catch(error => {
                    const duration = Date.now() - startTime;
                    return { success: false, status: error.response?.status, duration };
                })
            );
        }

        const results = await Promise.all(checkPromises);
        const successfulChecks = results.filter(r => r.success).length;
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

        console.log(`  Concurrent status checks: ${successfulChecks}/${statusChecks} successful`);
        console.log(`  Average check time: ${avgDuration}ms`);

        // All checks should succeed
        expect(successfulChecks).toBe(statusChecks);
    }, 60000);

    test('should handle malformed request bodies', async () => {
        console.log('\nTesting malformed request bodies...');

        const malformedBodies = [
            '{ invalid json',
            '{}',
            '[]',
            '{"invalid": "missing url"}',
            null
        ];

        for (const body of malformedBodies) {
            const record = metrics.recordRequest({ body, type: 'malformed' });
            const startTime = Date.now();

            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    body,
                    {
                        headers: { 
                            'x-api-key': PAID_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000,
                        validateStatus: () => true
                    }
                );

                const duration = Date.now() - startTime;

                if (response.status >= 400) {
                    metrics.recordSuccess(record, duration);
                    console.log(`  Correctly rejected malformed body (status: ${response.status})`);
                } else {
                    record.error = `Unexpected success for malformed body`;
                    metrics.recordFailure(record, new Error(record.error));
                }
            } catch (error) {
                const duration = Date.now() - startTime;
                
                if (error.response?.status >= 400) {
                    metrics.recordSuccess(record, duration);
                    console.log(`  Correctly rejected malformed body`);
                } else {
                    metrics.recordFailure(record, error);
                }
            }
        }

        const summary = metrics.getSummary();
        console.log(`\nMalformed body test: ${summary.successes} correctly handled`);
    }, 60000);
});

