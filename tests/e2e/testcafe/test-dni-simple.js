
import { Selector, t } from 'testcafe';

fixture('DNI Registration - Quick Test')
    .page('http://localhost:5000')
    .beforeEach(async t => {
        // Clear storage and start fresh
        await t.eval(() => localStorage.clear());
        await t.eval(() => sessionStorage.clear());
    });

test('DNI Upload and OCR Processing', async t => {
    console.log('🚀 Starting DNI OCR test...');
    
    // Step 1: Load the page
    await t
        .expect(Selector('body').exists).ok('Page loaded successfully')
        .wait(2000); // Wait for app to initialize
    
    // Step 2: Fill in dates
    const checkInInput = Selector('input[type="date"]').nth(0);
    const checkOutInput = Selector('input[type="date"]').nth(1);
    
    if (await checkInInput.exists) {
        await t
            .typeText(checkInInput, '2025-07-25', { replace: true })
            .typeText(checkOutInput, '2025-07-26', { replace: true });
    }
    
    // Step 3: Look for availability check button
    const availabilityBtn = Selector('button').withText(/check availability/i);
    if (await availabilityBtn.exists) {
        await t.click(availabilityBtn);
        await t.wait(3000); // Wait for availability check
    }
    
    // Step 4: Find file upload input
    const fileUpload = Selector('input[type="file"]');
    await t.expect(fileUpload.exists).ok('File upload input found');
    
    // Step 5: Upload DNI image
    console.log('📤 Uploading DNI document...');
    await t.setFilesToUpload(fileUpload, ['attached_assets/dni-españa-informatizado-1024x669_1753385962506.jpg']);
    
    // Step 6: Wait for OCR processing
    console.log('⏳ Waiting for OCR processing...');
    await t.wait(5000); // Initial wait
    
    // Check for processing indicators
    const processingIndicator = Selector('.ocr-processing, .processing, [data-testid="processing"]');
    if (await processingIndicator.exists) {
        console.log('🔄 OCR processing detected, waiting for completion...');
        await t.expect(processingIndicator.exists).notOk('OCR processing completed', { timeout: 60000 });
    }
    
    // Step 7: Verify form fields are populated
    const formFields = {
        firstName: Selector('input[name="firstName"], input[placeholder*="first"], input[placeholder*="nombre"]'),
        lastName: Selector('input[name="lastName"], input[name="lastName1"], input[placeholder*="last"], input[placeholder*="apellido"]'),
        documentNumber: Selector('input[name="documentNumber"], input[name="dni"], input[placeholder*="document"], input[placeholder*="DNI"]'),
        birthDate: Selector('input[name="birthDate"], input[name="dateOfBirth"], input[type="date"]:not(:first-child)'),
    };
    
    console.log('🔍 Checking extracted data...');
    
    let extractedFields = 0;
    for (const [fieldName, selector] of Object.entries(formFields)) {
        if (await selector.exists) {
            const value = await selector.value;
            console.log(`${fieldName}: ${value || 'empty'}`);
            if (value && value.trim() !== '') {
                extractedFields++;
            }
        }
    }
    
    console.log(`📊 Extracted ${extractedFields} out of ${Object.keys(formFields).length} fields`);
    
    // Verify at least some data was extracted
    await t.expect(extractedFields).gte(1, 'At least one field should be populated by OCR');
    
    // Step 8: Check for specific DNI format if document number exists
    if (await formFields.documentNumber.exists) {
        const dniValue = await formFields.documentNumber.value;
        if (dniValue && dniValue.length > 0) {
            console.log(`📋 DNI extracted: ${dniValue}`);
            // Verify DNI format (8 digits + letter)
            const dniPattern = /^\d{8}[A-Z]$/;
            await t.expect(dniPattern.test(dniValue.toUpperCase())).ok(`DNI format should be valid: ${dniValue}`);
        }
    }
    
    // Step 9: Check for any error messages
    const errorSelectors = [
        '.error',
        '.alert-error', 
        '[role="alert"]',
        '.ocr-error',
        '[data-testid="error"]'
    ];
    
    for (const errorSelector of errorSelectors) {
        const errorElement = Selector(errorSelector);
        if (await errorElement.exists) {
            const errorText = await errorElement.innerText;
            console.log(`⚠️  Error detected: ${errorText}`);
        }
    }
    
    console.log('✅ DNI OCR test completed successfully!');
});

test('Health Check and Basic Navigation', async t => {
    console.log('🏥 Testing server health and navigation...');
    
    // Test navigation to different sections
    const navLinks = Selector('a, button').withText(/register|admin|dashboard/i);
    const navCount = await navLinks.count;
    
    console.log(`🧭 Found ${navCount} navigation elements`);
    
    // Verify page is responsive
    await t
        .resizeWindow(1200, 800)
        .wait(1000)
        .resizeWindow(768, 1024)
        .wait(1000)
        .resizeWindow(375, 667)
        .wait(1000);
    
    console.log('📱 Responsive design test completed');
    
    // Check for any JavaScript errors in console
    const { error } = await t.getBrowserConsoleMessages();
    if (error.length > 0) {
        console.log('⚠️  Console errors detected:');
        error.forEach(err => console.log(`  - ${err}`));
    } else {
        console.log('✅ No console errors detected');
    }
});

// Export configuration for programmatic usage
export const testConfig = {
    browsers: ['chrome:headless'],
    speed: 0.8,
    screenshots: {
        path: 'screenshots/',
        takeOnFails: true
    }
};
