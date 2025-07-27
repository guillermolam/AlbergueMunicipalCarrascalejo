
#!/usr/bin/env node

console.log('🧪 Comprehensive TestCafe Test Suite Runner');
console.log('📋 Testing all document types and complete registration flow\n');

import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const path = require('path');

// Test files to run in sequence
const testFiles = [
  {
    file: 'tests/e2e/testcafe/testcafe-nie-documents.js',
    description: '🆔 NIE Document Processing Tests',
    timeout: 300000 // 5 minutes
  },
  {
    file: 'tests/e2e/testcafe/testcafe-residence-permits.js',
    description: '🏠 Spanish Residence Permit (TIE) Tests',
    timeout: 300000
  },
  {
    file: 'tests/e2e/testcafe/testcafe-international-passports.js',
    description: '🌍 International Passport Processing Tests',
    timeout: 400000 // 6.7 minutes - passports take longer
  },
  {
    file: 'tests/e2e/testcafe/testcafe-document-formats.js',
    description: '📄 Document Format Tests (PDF, DOCX)',
    timeout: 200000 // 3.3 minutes
  },
  {
    file: 'tests/e2e/testcafe/testcafe-full-registration-flow.js',
    description: '🎯 Complete Registration Flow with Notifications',
    timeout: 600000 // 10 minutes - full flow test
  }
];

// Browser configurations to test
const browsers = [
  'chrome:headless',
  // 'firefox:headless', // Can be enabled for cross-browser testing
  // 'safari' // Can be enabled on macOS
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Function to run a single test file
function runTestFile(testFile, browser) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${testFile.description}`);
    console.log(`📁 File: ${testFile.file}`);
    console.log(`🌐 Browser: ${browser}`);
    console.log(`⏱️ Timeout: ${testFile.timeout / 1000}s`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    
    const testProcess = spawn('npx', [
      'testcafe',
      browser,
      testFile.file,
      '--skip-js-errors',
      '--selector-timeout=10000',
      '--assertion-timeout=15000',
      '--page-load-timeout=30000',
      '--speed=0.8',
      '--quarantine-mode',
      '--stop-on-first-fail'
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test',
      }
    });

    // Set timeout for individual test
    const timeoutId = setTimeout(() => {
      console.log(`\n⏰ Test timeout reached (${testFile.timeout / 1000}s) - terminating...`);
      testProcess.kill('SIGTERM');
      reject(new Error(`Test timeout: ${testFile.file}`));
    }, testFile.timeout);

    testProcess.on('close', (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      const result = {
        file: testFile.file,
        description: testFile.description,
        browser: browser,
        duration: duration,
        success: code === 0,
        exitCode: code
      };

      testResults.push(result);
      totalTests++;

      if (code === 0) {
        passedTests++;
        console.log(`\n✅ PASSED: ${testFile.description}`);
        console.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)}s`);
        resolve(result);
      } else {
        failedTests++;
        console.log(`\n❌ FAILED: ${testFile.description}`);
        console.log(`💥 Exit code: ${code}`);
        console.log(`⏱️ Duration: ${(duration / 1000).toFixed(2)}s`);
        resolve(result); // Still resolve to continue with other tests
      }
    });

    testProcess.on('error', (error) => {
      clearTimeout(timeoutId);
      console.error(`\n💥 Process error: ${error.message}`);
      const result = {
        file: testFile.file,
        description: testFile.description,
        browser: browser,
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      };
      testResults.push(result);
      totalTests++;
      failedTests++;
      resolve(result);
    });
  });
}

// Main test runner
async function runAllTests() {
  const overallStartTime = Date.now();
  
  console.log('🔍 Checking server availability...');
  
  // Simple server check
  try {
    const response = await fetch('http://localhost:5000/api/health');
    if (!response.ok) {
      throw new Error(`Server check failed: ${response.status}`);
    }
    console.log('✅ Server is available and responding\n');
  } catch (error) {
    console.log('❌ Server check failed - please ensure the development server is running');
    console.log('💡 Run: npm run dev\n');
    process.exit(1);
  }

  // Run tests for each browser
  for (const browser of browsers) {
    console.log(`\n🌐 Testing with browser: ${browser}`);
    console.log('═'.repeat(80));

    // Run each test file sequentially
    for (const testFile of testFiles) {
      try {
        await runTestFile(testFile, browser);
      } catch (error) {
        console.error(`💥 Critical error in ${testFile.file}: ${error.message}`);
      }
      
      // Short pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate final report
  const overallDuration = Date.now() - overallStartTime;
  
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('📊 COMPREHENSIVE TEST EXECUTION SUMMARY');
  console.log('═'.repeat(80));
  
  console.log(`📈 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
  console.log(`⏱️ Total Duration: ${(overallDuration / 1000 / 60).toFixed(2)} minutes`);
  
  console.log('\n📋 DETAILED TEST RESULTS:');
  console.log('─'.repeat(80));
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = `${(result.duration / 1000).toFixed(2)}s`;
    
    console.log(`${index + 1}. ${status} - ${result.description}`);
    console.log(`   📁 ${result.file}`);
    console.log(`   🌐 ${result.browser} | ⏱️ ${duration}`);
    
    if (!result.success && result.exitCode) {
      console.log(`   💥 Exit Code: ${result.exitCode}`);
    }
    if (result.error) {
      console.log(`   ⚠️ Error: ${result.error}`);
    }
    console.log('');
  });

  // Test categories summary
  console.log('📊 TEST CATEGORIES SUMMARY:');
  console.log('─'.repeat(50));
  
  const categories = [
    { name: 'NIE Documents', pattern: 'nie-documents', icon: '🆔' },
    { name: 'Residence Permits', pattern: 'residence-permits', icon: '🏠' },
    { name: 'International Passports', pattern: 'international-passports', icon: '🌍' },
    { name: 'Document Formats', pattern: 'document-formats', icon: '📄' },
    { name: 'Full Registration Flow', pattern: 'full-registration-flow', icon: '🎯' }
  ];

  categories.forEach(category => {
    const categoryResults = testResults.filter(r => r.file.includes(category.pattern));
    const categoryPassed = categoryResults.filter(r => r.success).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = categoryTotal > 0 ? (categoryPassed / categoryTotal * 100).toFixed(1) : 0;
    
    console.log(`${category.icon} ${category.name}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });

  console.log('\n🔍 KEY TEST VALIDATIONS:');
  console.log('─'.repeat(50));
  console.log('✓ NIE X/Y/Z format processing and validation');
  console.log('✓ TIE residence permit data extraction');
  console.log('✓ International passport MRZ parsing');
  console.log('✓ PDF and DOCX document handling');
  console.log('✓ Complete registration workflow');
  console.log('✓ Bed availability and assignment');
  console.log('✓ Notification system integration');
  console.log('✓ Success screen validation');
  console.log('✓ Error handling and recovery');

  console.log('\n🎯 NEXT STEPS:');
  console.log('─'.repeat(30));
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed! System is ready for deployment.');
    console.log('💡 Consider running tests in different browsers for full coverage.');
  } else {
    console.log('🔧 Review failed tests and address any issues.');
    console.log('💡 Run individual test files to debug specific failures.');
    console.log('📝 Update test expectations if application behavior changed.');
  }

  console.log('\n📚 TEST COMMANDS:');
  console.log('─'.repeat(30));
  console.log('Run specific test: npx testcafe chrome tests/[test-file].js');
  console.log('Debug mode: npx testcafe chrome tests/[test-file].js --debug-mode');
  console.log('Live mode: npx testcafe chrome tests/[test-file].js --live');
  
  console.log('\n' + '═'.repeat(80));
  console.log('🏁 COMPREHENSIVE TEST SUITE EXECUTION COMPLETE');
  console.log('═'.repeat(80));

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Test execution interrupted by user');
  console.log('📊 Partial results available above');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️ Test execution terminated');
  process.exit(143);
});

// Start test execution
runAllTests().catch(error => {
  console.error('\n💥 Fatal error in test execution:', error);
  process.exit(1);
});
const createTestCafe = require('testcafe');
const path = require('path');

async function runTests() {
    const testcafe = await createTestCafe();
    const runner = testcafe.createRunner();
    
    const testFiles = [
        path.join(__dirname, '../e2e/testcafe/test-dni-simple.js'),
        path.join(__dirname, '../e2e/testcafe/testcafe-document-formats.js'),
        path.join(__dirname, '../e2e/testcafe/testcafe-full-registration-flow.js')
    ];
    
    try {
        const failedCount = await runner
            .src(testFiles)
            .browsers(['chrome:headless'])
            .screenshots({
                path: 'tests/e2e/outputs/',
                takeOnFails: true
            })
            .run();
            
        console.log(`Tests failed: ${failedCount}`);
        return failedCount;
    } finally {
        await testcafe.close();
    }
}

runTests().catch(console.error);
