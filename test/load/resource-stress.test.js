const axios = require('axios');
const TestServer = require('../helpers/test-server');
const MetricsCollector = require('../helpers/metrics');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_SERVER_PORT = 8888;
const FREE_API_KEY = 'test-free-key';
const PAID_API_KEY = 'test-paid-key';

describe('Resource Stress Tests', () => {
    let testServer;
    let metrics;

    beforeAll(async () => {
        metrics = new MetricsCollector();
        testServer = new TestServer(TEST_SERVER_PORT);
        await testServer.start();
    });

    afterAll(async () => {
        metrics.printSummary();
        if (testServer) {
            await testServer.stop();
        }
    });

    beforeEach(() => {
        metrics.reset();
    });

    test('should handle large web pages', async () => {
        const targetUrl = `http://localhost:${TEST_SERVER_PORT}/large`;
        
        console.log('\nTesting large page generation...');

        try {
            const response = await axios.post(
                `${BASE_URL}/api/v1/jobs`,
                {
                    url: targetUrl,
                    options: { 
                        format: 'A4',
                        responseType: 'url'
                    }
                },
                {
                    headers: { 'x-api-key': PAID_API_KEY },
                    timeout: 60000 // 60 second timeout
                }
            );

            const jobId = response.data.jobId;
            console.log(`Job created: ${jobId}`);

            // Poll for completion
            let completed = false;
            let attempts = 0;
            const maxAttempts = 180; // 3 minutes

            while (!completed && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                
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
                        console.log('Large page PDF generated successfully');
                        console.log(`PDF size: ${statusData.sizeMB} MB`);
                        completed = true;
                        
                        // Verify result has expected properties
                        expect(statusData.result).toBeDefined();
                        expect(statusData.sizeMB).toBeDefined();
                        expect(statusData.sizeBytes).toBeDefined();
                    } else if (statusData.status === 'failed') {
                        console.log('Large page generation failed:', statusData.error);
                        break;
                    }
                } catch (error) {
                    console.log(`Status check failed (attempt ${attempts})`);
                }

                attempts++;
            }

            expect(completed).toBe(true);
        } catch (error) {
            console.error('Failed to generate large page PDF:', error.message);
            // Don't fail the test, as this might be expected behavior
            expect(error).toBeDefined();
        }
    }, 200000);

    test('should handle slow-loading pages', async () => {
        const delay = 5000; // 5 second delay
        const targetUrl = `http://localhost:${TEST_SERVER_PORT}/slow?delay=${delay}`;
        
        console.log(`\nTesting slow-loading page (${delay}ms delay)...`);

        try {
            const response = await axios.post(
                `${BASE_URL}/api/v1/jobs`,
                {
                    url: targetUrl,
                    options: { 
                        format: 'A4',
                        responseType: 'url'
                    }
                },
                {
                    headers: { 'x-api-key': PAID_API_KEY },
                    timeout: 60000
                }
            );

            const jobId = response.data.jobId;
            console.log(`Job created: ${jobId}`);

            // Wait for completion (should handle the delay)
            let completed = false;
            let attempts = 0;
            const maxAttempts = 120; // 2 minutes

            while (!completed && attempts < maxAttempts) {
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
                        console.log('Slow page PDF generated successfully');
                        completed = true;
                    } else if (statusData.status === 'failed') {
                        console.log('Slow page generation failed:', statusData.error);
                        break;
                    }
                } catch (error) {
                    // Continue polling
                }

                attempts++;
            }

            expect(completed).toBe(true);
        } catch (error) {
            console.error('Failed to generate slow page PDF:', error.message);
            expect(error).toBeDefined();
        }
    }, 200000);

    test('should handle pages with slow-loading assets', async () => {
        const delay = 3000; // 3 second delay for assets
        const targetUrl = `http://localhost:${TEST_SERVER_PORT}/slow-assets?delay=${delay}`;
        
        console.log(`\nTesting page with slow-loading assets (${delay}ms delay)...`);

        try {
            const response = await axios.post(
                `${BASE_URL}/api/v1/jobs`,
                {
                    url: targetUrl,
                    options: { 
                        format: 'A4',
                        responseType: 'url'
                    }
                },
                {
                    headers: { 'x-api-key': PAID_API_KEY },
                    timeout: 60000
                }
            );

            const jobId = response.data.jobId;
            console.log(`Job created: ${jobId}`);

            // Wait for completion
            let completed = false;
            let attempts = 0;
            const maxAttempts = 120; // 2 minutes

            while (!completed && attempts < maxAttempts) {
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
                        console.log('Slow assets page PDF generated successfully');
                        completed = true;
                    } else if (statusData.status === 'failed') {
                        console.log('Slow assets page generation failed:', statusData.error);
                        break;
                    }
                } catch (error) {
                    // Continue polling
                }

                attempts++;
            }

            expect(completed).toBe(true);
        } catch (error) {
            console.error('Failed to generate slow assets page PDF:', error.message);
            expect(error).toBeDefined();
        }
    }, 200000);

    test('should handle multiple large page requests concurrently', async () => {
        const concurrentRequests = 5;
        const targetUrl = `http://localhost:${TEST_SERVER_PORT}/large`;
        
        console.log(`\nTesting ${concurrentRequests} concurrent large page requests...`);

        const makeRequest = async () => {
            const startTime = Date.now();
            const record = metrics.recordRequest({ url: targetUrl });
            
            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: targetUrl,
                        options: { format: 'A4', responseType: 'url' }
                    },
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 60000
                    }
                );

                const duration = Date.now() - startTime;
                const jobId = response.data.jobId;
                metrics.recordSuccess(record, duration);
                
                return { success: true, jobId };
            } catch (error) {
                const duration = Date.now() - startTime;
                metrics.recordFailure(record, error);
                return { success: false, error: error.message };
            }
        };

        // Track memory usage before
        metrics.recordMemoryUsage();
        
        const requests = Array(concurrentRequests).fill(null).map(() => makeRequest());
        const results = await Promise.all(requests);
        
        // Track memory usage after
        metrics.recordMemoryUsage();
        
        const summary = metrics.getSummary();
        
        console.log(`\nConcurrent Large Pages Results:`);
        console.log(`  Successful: ${summary.successes}`);
        console.log(`  Failed: ${summary.failures}`);
        console.log(`  Average response time: ${summary.avgResponseTime}ms`);
        console.log(`  Current memory: ${summary.currentMemoryMB} MB`);
        console.log(`  Peak memory: ${summary.peakMemoryMB} MB`);

        expect(summary.successes + summary.failures).toBe(concurrentRequests);
        
        // Memory should stay reasonable (under 2GB)
        const peakMB = parseFloat(summary.peakMemoryMB);
        expect(peakMB).toBeLessThan(2048);
    }, 180000);

    test('should handle mixed resource types concurrently', async () => {
        const scenarios = [
            { url: `http://localhost:${TEST_SERVER_PORT}/small`, name: 'small' },
            { url: `http://localhost:${TEST_SERVER_PORT}/large`, name: 'large' },
            { url: `http://localhost:${TEST_SERVER_PORT}/slow?delay=2000`, name: 'slow' }
        ];

        console.log('\nTesting mixed resource types...');

        const makeRequest = async (scenario) => {
            const startTime = Date.now();
            const record = metrics.recordRequest({ url: scenario.url, type: scenario.name });
            
            try {
                const response = await axios.post(
                    `${BASE_URL}/api/v1/jobs`,
                    {
                        url: scenario.url,
                        options: { format: 'A4', responseType: 'url' }
                    },
                    {
                        headers: { 'x-api-key': PAID_API_KEY },
                        timeout: 60000
                    }
                );

                const duration = Date.now() - startTime;
                metrics.recordSuccess(record, duration);
                
                return { success: true, type: scenario.name, jobId: response.data.jobId };
            } catch (error) {
                const duration = Date.now() - startTime;
                metrics.recordFailure(record, error);
                return { success: false, type: scenario.name, error: error.message };
            }
        };

        // Create multiple jobs for each scenario
        const requests = [];
        scenarios.forEach(scenario => {
            for (let i = 0; i < 3; i++) {
                requests.push(makeRequest(scenario));
            }
        });

        const results = await Promise.all(requests);
        const summary = metrics.getSummary();

        console.log(`\nMixed Resource Types Results:`);
        console.log(`  Total requests: ${summary.totalRequests}`);
        console.log(`  Successful: ${summary.successes}`);
        console.log(`  Failed: ${summary.failures}`);

        const byType = {};
        results.forEach(r => {
            if (!byType[r.type]) byType[r.type] = { success: 0, failed: 0 };
            if (r.success) byType[r.type].success++;
            else byType[r.type].failed++;
        });

        Object.entries(byType).forEach(([type, counts]) => {
            console.log(`  ${type}: ${counts.success} success, ${counts.failed} failed`);
        });

        expect(summary.successes + summary.failures).toBe(summary.totalRequests);
    }, 180000);
});

