
#!/usr/bin/env node

/**
 * DNI API Integration Test
 * Tests the core API endpoints that power the DNI registration flow
 */

import fs from 'fs';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testDNIFlow() {
    console.log('🚀 Starting DNI Registration API Tests...');
    console.log('🎯 Target: ' + BASE_URL);
    
    let testResults = {
        passed: 0,
        failed: 0,
        errors: []
    };

    // Test 1: Health Check
    try {
        console.log('\n📋 Test 1: Health Check');
        const healthResponse = await fetch(`${BASE_URL}/api/health`);
        const healthData = await healthResponse.json();
        
        if (healthResponse.ok && healthData.status === 'ok') {
            console.log('✅ Server health check passed');
            console.log(`   Timestamp: ${healthData.timestamp}`);
            testResults.passed++;
        } else {
            throw new Error('Health check failed');
        }
    } catch (error) {
        console.log('❌ Health check failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Health check: ' + error.message);
    }

    // Test 2: Availability Check
    try {
        console.log('\n📋 Test 2: Bed Availability Check');
        const availabilityResponse = await fetch(`${BASE_URL}/api/availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                checkInDate: '2025-07-25',
                checkOutDate: '2025-07-26',
                numberOfPersons: 1
            })
        });
        
        const availabilityData = await availabilityResponse.json();
        
        if (availabilityResponse.ok && availabilityData.available !== undefined) {
            console.log('✅ Availability check passed');
            console.log(`   Available: ${availabilityData.available}`);
            console.log(`   Total Beds: ${availabilityData.totalBeds}`);
            testResults.passed++;
        } else {
            throw new Error('Availability check failed');
        }
    } catch (error) {
        console.log('❌ Availability check failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Availability: ' + error.message);
    }

    // Test 3: DNI OCR Processing
    try {
        console.log('\n📋 Test 3: DNI OCR Processing');
        
        // Read test DNI image
        const imageBuffer = fs.readFileSync('attached_assets/dni-españa-informatizado-1024x669_1753385962506.jpg');
        const base64Image = imageBuffer.toString('base64');
        const dataURL = `data:image/jpeg;base64,${base64Image}`;
        
        console.log('   📤 Uploading DNI document (size: ' + imageBuffer.length + ' bytes)');
        
        const ocrResponse = await fetch(`${BASE_URL}/api/ocr/dni`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentType: 'DNI',
                fileData: dataURL,
                documentSide: 'front'
            })
        });
        
        const ocrData = await ocrResponse.json();
        
        if (ocrResponse.ok && ocrData.success) {
            console.log('✅ DNI OCR processing passed');
            console.log(`   Confidence: ${ocrData.confidence}`);
            console.log(`   Processing Time: ${ocrData.processingTimeMs}ms`);
            
            // Validate extracted data
            if (ocrData.extractedData) {
                const data = ocrData.extractedData;
                console.log('   📊 Extracted Data:');
                console.log(`     - Document Number: ${data.documentNumber || 'N/A'}`);
                console.log(`     - First Name: ${data.firstName || 'N/A'}`);
                console.log(`     - Last Name: ${data.lastName1 || 'N/A'}`);
                console.log(`     - Birth Date: ${data.birthDate || 'N/A'}`);
                console.log(`     - Nationality: ${data.nationality || 'N/A'}`);
                
                // Check if at least some data was extracted
                const extractedFields = Object.values(data).filter(v => v && v.toString().trim() !== '').length;
                if (extractedFields > 0) {
                    console.log(`   ✅ ${extractedFields} fields extracted successfully`);
                } else {
                    throw new Error('No data extracted from DNI');
                }
            }
            
            testResults.passed++;
        } else {
            throw new Error(`OCR failed: ${ocrData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.log('❌ DNI OCR processing failed:', error.message);
        testResults.failed++;
        testResults.errors.push('DNI OCR: ' + error.message);
    }

    // Test 4: Document Validation
    try {
        console.log('\n📋 Test 4: Document Validation');
        
        const validationResponse = await fetch(`${BASE_URL}/api/validate/document`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                documentType: 'DNI',
                documentNumber: '12345678Z' // Valid test DNI with correct checksum
            })
        });
        
        const validationData = await validationResponse.json();
        
        if (validationResponse.ok && validationData.success) {
            console.log('✅ Document validation passed');
            console.log(`   Valid: ${validationData.data?.valid}`);
            console.log(`   Message: ${validationData.data?.message}`);
            testResults.passed++;
        } else {
            throw new Error('Document validation failed');
        }
    } catch (error) {
        console.log('❌ Document validation failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Validation: ' + error.message);
    }

    // Test 5: Pricing Information
    try {
        console.log('\n📋 Test 5: Pricing Information');
        
        const pricingResponse = await fetch(`${BASE_URL}/api/pricing`);
        const pricingData = await pricingResponse.json();
        
        if (pricingResponse.ok && pricingData.dormitory) {
            console.log('✅ Pricing information retrieved');
            console.log(`   Dormitory: €${pricingData.dormitory}/night`);
            console.log(`   Private: €${pricingData.private || 'N/A'}/night`);
            console.log(`   Currency: ${pricingData.currency}`);
            testResults.passed++;
        } else {
            throw new Error('Pricing information unavailable');
        }
    } catch (error) {
        console.log('❌ Pricing test failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Pricing: ' + error.message);
    }

    // Test 6: Dashboard Stats (Admin)
    try {
        console.log('\n📋 Test 6: Dashboard Statistics');
        
        const statsResponse = await fetch(`${BASE_URL}/api/dashboard/stats`);
        const statsData = await statsResponse.json();
        
        if (statsResponse.ok && statsData.occupancy) {
            console.log('✅ Dashboard statistics retrieved');
            console.log(`   Occupied: ${statsData.occupancy.occupied}`);
            console.log(`   Available: ${statsData.occupancy.available}`);
            console.log(`   Total: ${statsData.occupancy.total}`);
            testResults.passed++;
        } else {
            throw new Error('Dashboard stats unavailable');
        }
    } catch (error) {
        console.log('❌ Dashboard stats test failed:', error.message);
        testResults.failed++;
        testResults.errors.push('Dashboard: ' + error.message);
    }

    // Test Summary
    console.log('\n' + '='.repeat(50));
    console.log('🏁 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${Math.round((testResults.passed / (testResults.passed + testResults.failed)) * 100)}%`);
    
    if (testResults.errors.length > 0) {
        console.log('\n🔍 Error Details:');
        testResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }
    
    if (testResults.failed === 0) {
        console.log('\n🎉 All API tests passed! DNI registration flow is functional.');
        console.log('✅ Ready for end-to-end testing with TestCafe');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
    return testResults.failed === 0;
}

// Export for programmatic usage
export { testDNIFlow };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testDNIFlow()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error('❌ Test execution failed:', error);
            process.exit(1);
        });
}
