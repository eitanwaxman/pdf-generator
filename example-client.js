/**
 * Example client for testing the Docuskribe API
 * Usage: node example-client.js
 */

const apiKey = process.argv[2] || 'test-free-key';
const baseUrl = process.env.API_URL || 'http://localhost:3000';

async function testPdfGeneration() {
    console.log('📄 Docuskribe API Client\n');
    console.log(`Using API Key: ${apiKey}`);
    console.log(`Server: ${baseUrl}\n`);

    try {
        // 1. Create a PDF generation job
        console.log('🔄 Creating PDF job...');
        const createResponse = await fetch(`${baseUrl}/api/v1/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
            },
            body: JSON.stringify({
                url: 'https://example.com',
                options: {
                    format: 'A4',
                    margin: {
                        top: '50px',
                        right: '50px',
                        bottom: '50px',
                        left: '50px'
                    },
                    responseType: 'url',
                    // New: key-value pairs appended as query params to the URL
                    data: {
                        utm_source: 'example-client',
                        debug: true,
                        version: 1
                    }
                }
            })
        });

        if (!createResponse.ok) {
            const error = await createResponse.text();
            console.error('❌ Failed to create job:', error);
            return;
        }

        const job = await createResponse.json();
        console.log('✅ Job created:', job);
        const jobId = job.jobId;
        console.log(`Job ID: ${jobId}\n`);

        // 2. Poll for job completion
        console.log('⏳ Polling for job completion...');
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 60; // 60 seconds timeout

        while (status === 'pending' || status === 'processing') {
            attempts++;
            if (attempts > maxAttempts) {
                console.error('❌ Timeout waiting for job completion');
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

            const statusResponse = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, {
                headers: {
                    'x-api-key': apiKey
                }
            });

            if (!statusResponse.ok) {
                console.error('❌ Failed to get job status');
                return;
            }

            const jobStatus = await statusResponse.json();
            status = jobStatus.status;
            
            if (status === 'completed') {
                console.log('✅ Job completed!');
                console.log('Result:', JSON.stringify(jobStatus.result, null, 2));
                
                if (jobStatus.result.type === 'url') {
                    console.log(`\n📎 PDF URL: ${jobStatus.result.url}`);
                } else {
                    console.log(`\n📦 PDF content length: ${jobStatus.result.pdf.length} bytes (base64)`);
                }
                break;
            } else if (status === 'failed') {
                console.error('❌ Job failed:', jobStatus.error);
                return;
            }

            process.stdout.write('.');
        }

        console.log('\n\n✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the test
testPdfGeneration();

