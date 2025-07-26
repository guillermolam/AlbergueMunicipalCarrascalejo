
#!/usr/bin/env node

/**
 * TestCafe Runner for DNI Registration Flow Tests
 * Runs comprehensive end-to-end tests for the pilgrim registration system
 */

const createTestCafe = require('testcafe');
const path = require('path');
const fs = require('fs');

async function runDNITests() {
    let testcafe = null;

    try {
        // Create TestCafe instance
        testcafe = await createTestCafe('localhost', 1337, 1338);

        // Create reports directory if it doesn't exist
        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Create screenshots directory
        const screenshotsDir = path.join(__dirname, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        console.log('🚀 Starting DNI Registration Flow Tests...');
        console.log('📍 Test Target: http://localhost:5000');
        console.log('📋 Test Suite: DNI End-to-End Registration Flow');
        
        // Run tests
        const runner = testcafe.createRunner();
        
        const failedCount = await runner
            .src(['tests/dni-registration-flow.js'])
            .browsers(['chrome:headless'])
            .reporter(['spec', {
                name: 'json',
                output: path.join(reportsDir, 'dni-test-results.json')
            }])
            .screenshots({
                path: screenshotsDir,
                takeOnFails: true,
                pathPattern: '${DATE}_${TIME}/test-${TEST_INDEX}/${USERAGENT}/${FILE_INDEX}.png'
            })
            .run({
                skipJsErrors: true,
                assertionTimeout: 30000,
                pageLoadTimeout: 30000,
                speed: 0.8,
                stopOnFirstFail: false,
                concurrency: 1
            });

        console.log('\n📊 Test Results Summary:');
        console.log(`❌ Failed Tests: ${failedCount}`);
        console.log(`✅ Passed Tests: ${failedCount === 0 ? 'All tests passed!' : 'Some tests failed'}`);
        
        if (failedCount === 0) {
            console.log('\n🎉 All DNI registration tests passed successfully!');
            console.log('✅ Complete registration flow working correctly');
            console.log('✅ OCR document processing functional');
            console.log('✅ Payment integration working');
            console.log('✅ Bed assignment system operational');
            console.log('✅ Government submission process working');
        } else {
            console.log(`\n⚠️  ${failedCount} test(s) failed. Check the detailed output above.`);
            console.log('📸 Screenshots saved to: ' + screenshotsDir);
            console.log('📋 Detailed report saved to: ' + path.join(reportsDir, 'dni-test-results.json'));
        }

        process.exit(failedCount === 0 ? 0 : 1);

    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    } finally {
        if (testcafe) {
            await testcafe.close();
        }
    }
}

// Check if server is running before starting tests
async function checkServerHealth() {
    try {
        const response = await fetch('http://localhost:5000/api/health');
        if (response.ok) {
            console.log('✅ Server is running and healthy');
            return true;
        }
    } catch (error) {
        console.log('⚠️  Server health check failed:', error.message);
    }
    
    console.log('❌ Server is not running on http://localhost:5000');
    console.log('💡 Please start the server with: npm run dev');
    return false;
}

// Main execution
async function main() {
    console.log('🔍 Checking server health...');
    
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy) {
        process.exit(1);
    }
    
    console.log('⏳ Starting tests in 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await runDNITests();
}

// Handle process signals
process.on('SIGINT', async () => {
    console.log('\n🛑 Test execution interrupted by user');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the tests
main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
