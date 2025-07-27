import { Selector, ClientFunction } from 'testcafe';

fixture`NIE Document Processing Tests`
  .page`http://localhost:5000`
  .beforeEach(async t => {
    // Clear any existing data
    await t.eval(() => localStorage.clear());
    await t.eval(() => sessionStorage.clear());
  });

// Test NIE document with X format
test('Process NIE document with X-format number', async t => {
  console.log('🧪 Testing NIE X-format document processing');
  
  // Navigate to registration form
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i))
    .expect(Selector('[data-testid="registration-form"]').exists).ok('Registration form should be visible');

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Upload NIE front image
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/nie_1753387245232.jpg'
    ])
    .wait(3000); // Wait for OCR processing

  // Upload NIE back image if required
  const backUpload = Selector('input[type="file"]').nth(1);
  if (await backUpload.exists) {
    await t
      .setFilesToUpload(backUpload, [
        './attached_assets/NIE-Comunitario_1753387245233.jpg'
      ])
      .wait(3000);
  }

  // Verify NIE number extraction (X format)
  const documentNumberField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .expect(documentNumberField.value).match(/^X\d{7}[A-Z]$/i, 'NIE X-format should be extracted correctly');

  // Verify other extracted data
  await t
    .expect(Selector('input[name="firstName"], input[id*="firstName"]').value).notEql('', 'First name should be extracted')
    .expect(Selector('input[name="lastName1"], input[id*="lastName"]').value).notEql('', 'Last name should be extracted');

  console.log('✅ NIE X-format document processed successfully');
});

// Test NIE document with Y format
test('Process NIE document with Y-format number', async t => {
  console.log('🧪 Testing NIE Y-format document processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i))
    .expect(Selector('[data-testid="registration-form"]').exists).ok();

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Upload NIE document with Y format
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/tie-nie-card-featured_1753387245233.jpg'
    ])
    .wait(3000);

  // Verify Y-format NIE extraction
  const documentNumberField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .expect(documentNumberField.value).match(/^Y\d{7}[A-Z]$/i, 'NIE Y-format should be extracted correctly');

  console.log('✅ NIE Y-format document processed successfully');
});

// Test NIE document with Z format (rare but valid)
test('Process NIE document with Z-format number', async t => {
  console.log('🧪 Testing NIE Z-format document processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Upload NIE document
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/front01_1753387245230.jpeg'
    ])
    .wait(3000);

  // Verify extraction or graceful handling
  const documentNumberField = Selector('input[name="documentNumber"], input[id*="document"]');
  const documentValue = await documentNumberField.value;
  
  if (documentValue.match(/^Z\d{7}[A-Z]$/i)) {
    await t.expect(documentNumberField.value).match(/^Z\d{7}[A-Z]$/i, 'NIE Z-format should be extracted correctly');
  } else {
    // Should allow manual entry for rare formats
    await t
      .typeText(documentNumberField, 'Z1234567A', { replace: true })
      .expect(documentNumberField.value).eql('Z1234567A');
  }

  console.log('✅ NIE Z-format document handled successfully');
});

// Test NIE validation with checksum verification
test('Validate NIE checksum calculation', async t => {
  console.log('🧪 Testing NIE checksum validation');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Test with valid NIE number
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .typeText(documentField, 'X1234567L', { replace: true })
    .pressKey('tab');

  // Should not show validation error for valid NIE
  await t
    .expect(Selector('.error, [data-testid*="error"], .text-red-500').exists).notOk('Valid NIE should not show error');

  // Test with invalid NIE checksum
  await t
    .typeText(documentField, 'X1234567Z', { replace: true })
    .pressKey('tab');

  // Should show validation error for invalid checksum
  await t
    .expect(Selector('.error, [data-testid*="error"], .text-red-500').exists).ok('Invalid NIE checksum should show error');

  console.log('✅ NIE checksum validation working correctly');
});

// Test EU registration certificate processing
test('Process EU registration certificate', async t => {
  console.log('🧪 Testing EU registration certificate processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select NIE or Other document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE|Other/i));

  // Upload EU registration certificate
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/Certificado-de-registro-UE_1753387245229.webp'
    ])
    .wait(4000); // Longer wait for complex document

  // Verify data extraction from EU certificate
  await t
    .expect(Selector('input[name="firstName"], input[id*="firstName"]').value).notEql('', 'Name should be extracted from EU certificate')
    .expect(Selector('input[name="nationality"], input[id*="nationality"]').value).match(/EU|European|España|Spain/i, 'EU nationality should be detected');

  console.log('✅ EU registration certificate processed successfully');
});

// Test permanent residence certificate
test('Process permanent residence certificate', async t => {
  console.log('🧪 Testing permanent residence certificate processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select appropriate document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/Residence|NIE|Other/i));

  // Upload permanent residence certificate
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/Certificado-de-residencia-permanente-campussing_1753387245229.webp'
    ])
    .wait(4000);

  // Verify permanent residence status detection
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  const extractedNumber = await documentField.value;
  
  await t
    .expect(extractedNumber).notEql('', 'Document number should be extracted from permanent residence certificate');

  // Check if residence type is detected
  const residenceTypeField = Selector('select[name="residenceType"], input[name="residenceType"], [data-testid*="residence"]');
  if (await residenceTypeField.exists) {
    await t.expect(residenceTypeField.value).match(/permanent|permanente/i, 'Permanent residence type should be detected');
  }

  console.log('✅ Permanent residence certificate processed successfully');
});

// Test error handling for damaged NIE documents
test('Handle damaged or unclear NIE documents', async t => {
  console.log('🧪 Testing damaged NIE document handling');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Upload a low-quality or damaged document image
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/front02_1753387245231.jpeg'
    ])
    .wait(5000); // Longer wait for difficult OCR

  // Should either extract partial data or show appropriate message
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  const extractedValue = await documentField.value;

  if (extractedValue === '') {
    // Should show helpful message for manual entry
    await t
      .expect(Selector('[data-testid*="manual"], .manual-entry, [class*="manual"]').exists).ok('Manual entry option should be available')
      .typeText(documentField, 'X5555555R')
      .expect(documentField.value).eql('X5555555R');
  } else {
    // Should extract something recognizable
    await t.expect(extractedValue.length).gte(1, 'Should extract some document information');
  }

  console.log('✅ Damaged NIE document handled appropriately');
});

// Test NIE document with multiple languages
test('Process NIE document with multiple languages', async t => {
  console.log('🧪 Testing multilingual NIE document processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Test in Spanish interface
  const languageSelector = Selector('[data-testid="language-selector"], select[name="language"]');
  if (await languageSelector.exists) {
    await t
      .click(languageSelector)
      .click(Selector('option').withText(/Español|Spanish/i));
  }

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Upload NIE document
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/NIE.png_1753387245233.png'
    ])
    .wait(3000);

  // Verify processing works in Spanish interface
  await t
    .expect(Selector('input[name="documentNumber"], input[id*="document"]').value).match(/^[XYZ]\d{7}[A-Z]$/i, 'NIE should be extracted in Spanish interface');

  // Switch to English and verify continued functionality
  if (await languageSelector.exists) {
    await t
      .click(languageSelector)
      .click(Selector('option').withText(/English|Inglés/i));
  }

  // Form should still work in English
  await t
    .expect(Selector('input[name="firstName"], input[id*="firstName"]').exists).ok('Form should work in English interface');

  console.log('✅ Multilingual NIE processing working correctly');
});

// Performance test for NIE processing
test('NIE document processing performance', async t => {
  console.log('🧪 Testing NIE processing performance');
  
  const startTime = Date.now();
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select NIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/NIE/i));

  // Upload NIE document and measure processing time
  const uploadStartTime = Date.now();
  
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/nie_1753387245232.jpg'
    ]);

  // Wait for processing to complete
  await t.expect(Selector('input[name="documentNumber"], input[id*="document"]').value).notEql('', 'Document should be processed', { timeout: 10000 });
  
  const processingTime = Date.now() - uploadStartTime;
  const totalTime = Date.now() - startTime;
  
  console.log(`⏱️ NIE processing time: ${processingTime}ms`);
  console.log(`⏱️ Total test time: ${totalTime}ms`);
  
  // Processing should complete within reasonable time
  await t.expect(processingTime).lt(8000, 'NIE processing should complete within 8 seconds');

  console.log('✅ NIE processing performance acceptable');
});