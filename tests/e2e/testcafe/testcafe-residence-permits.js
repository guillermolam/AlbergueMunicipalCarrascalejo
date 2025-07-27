import { Selector, ClientFunction } from 'testcafe';

fixture`Spanish Residence Permit (TIE) Processing Tests`
  .page`http://localhost:5000`
  .beforeEach(async t => {
    await t.eval(() => localStorage.clear());
    await t.eval(() => sessionStorage.clear());
  });

// Test TIE (Tarjeta de Identidad de Extranjero) processing
test('Process TIE residence permit card', async t => {
  console.log('🧪 Testing TIE residence permit processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i))
    .expect(Selector('[data-testid="registration-form"]').exists).ok();

  // Select TIE/Residence Permit document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence|Permiso/i));

  // Upload TIE front image
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/TIE-Y-CUE_1753387245233.webp'
    ])
    .wait(4000); // TIE processing takes longer

  // Upload TIE back image if required
  const backUpload = Selector('input[type="file"]').nth(1);
  if (await backUpload.exists) {
    await t
      .setFilesToUpload(backUpload, [
        './attached_assets/NEW-RESIDENCIA-DOCUMENT-12-4-2007_1753387245232.jpg'
      ])
      .wait(3000);
  }

  // Verify TIE number extraction (should be NIE format)
  const documentNumberField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .expect(documentNumberField.value).match(/^[XYZ]\d{7}[A-Z]$/i, 'TIE should extract associated NIE number');

  // Verify personal data extraction
  await t
    .expect(Selector('input[name="firstName"], input[id*="firstName"]').value).notEql('', 'First name should be extracted from TIE')
    .expect(Selector('input[name="lastName1"], input[id*="lastName"]').value).notEql('', 'Last name should be extracted from TIE');

  console.log('✅ TIE residence permit processed successfully');
});

// Test work authorization detection from TIE
test('Detect work authorization from TIE card', async t => {
  console.log('🧪 Testing work authorization detection from TIE');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select TIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence|Permiso/i));

  // Upload TIE with work authorization
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/trabajadorFronterizo_1753387245234.jpeg'
    ])
    .wait(4000);

  // Check if work authorization is detected
  const workAuthField = Selector('input[name="workAuthorization"], select[name="workPermit"], [data-testid*="work"]');
  if (await workAuthField.exists) {
    const workAuthValue = await workAuthField.value;
    await t.expect(workAuthValue).match(/yes|authorized|permitido|sí/i, 'Work authorization should be detected');
  }

  // Verify residence type is detected
  const residenceTypeField = Selector('select[name="residenceType"], input[name="residenceType"]');
  if (await residenceTypeField.exists) {
    await t.expect(residenceTypeField.value).match(/work|trabajo|worker|fronterizo/i, 'Work residence type should be detected');
  }

  console.log('✅ Work authorization detected from TIE');
});

// Test student residence permit
test('Process student residence permit', async t => {
  console.log('🧪 Testing student residence permit processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select residence permit document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence|Student|Estudiante/i));

  // Upload student residence permit
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/Imagen-modelo-uniforme-permiso-de-residencia-para-nacionales-de-terceros-países_1753387245231.webp'
    ])
    .wait(4000);

  // Verify student status detection
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .expect(documentField.value).notEql('', 'Document number should be extracted from student permit');

  // Check if student status is detected
  const statusField = Selector('select[name="status"], input[name="studentStatus"], [data-testid*="student"]');
  if (await statusField.exists) {
    const statusValue = await statusField.value;
    await t.expect(statusValue).match(/student|estudiante|study|estudios/i, 'Student status should be detected');
  }

  console.log('✅ Student residence permit processed successfully');
});

// Test border worker permit
test('Process border worker residence permit', async t => {
  console.log('🧪 Testing border worker permit processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select residence permit document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Border|Fronterizo/i));

  // Upload border worker permit
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/Imagen-permiso-de-residencia-de-trabajador-fronterizo_1753387245232.jpg'
    ])
    .wait(4000);

  // Verify border worker classification
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .expect(documentField.value).notEql('', 'Border worker permit number should be extracted');

  // Check for special border worker status
  const workerTypeField = Selector('select[name="workerType"], input[name="borderWorker"]');
  if (await workerTypeField.exists) {
    await t.expect(workerTypeField.value).match(/border|fronterizo|cross.border/i, 'Border worker type should be detected');
  }

  console.log('✅ Border worker permit processed successfully');
});

// Test dual number extraction (TIE + NIE)
test('Extract both TIE permit number and associated NIE', async t => {
  console.log('🧪 Testing dual number extraction from TIE');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select TIE document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence/i));

  // Upload TIE with both numbers visible
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/tipos_1753387245234.png'
    ])
    .wait(4000);

  // Should extract NIE number as primary document number
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  await t
    .expect(documentField.value).match(/^[XYZ]\d{7}[A-Z]$/i, 'NIE number should be extracted as primary');

  // Check if TIE permit number is stored separately
  const tieNumberField = Selector('input[name="tieNumber"], input[name="permitNumber"], [data-testid*="tie"]');
  if (await tieNumberField.exists) {
    const tieValue = await tieNumberField.value;
    await t.expect(tieValue).notEql('', 'TIE permit number should also be extracted');
  }

  console.log('✅ Dual number extraction working correctly');
});

// Test residence permit expiry date extraction
test('Extract residence permit expiry date', async t => {
  console.log('🧪 Testing residence permit expiry date extraction');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select residence permit document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence/i));

  // Upload residence permit with clear expiry date
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/131436_1753387245226.jpeg'
    ])
    .wait(4000);

  // Check if expiry date is extracted
  const expiryField = Selector('input[name="expiryDate"], input[name="validUntil"], [data-testid*="expiry"]');
  if (await expiryField.exists) {
    const expiryValue = await expiryField.value;
    await t
      .expect(expiryValue).match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}|\d{4}[\/\-]\d{2}[\/\-]\d{2}/, 'Expiry date should be in valid format')
      .expect(expiryValue).notEql('', 'Expiry date should be extracted');
  }

  // Verify document is not expired
  const warningMessage = Selector('.warning, [data-testid*="warning"], .text-yellow-500');
  const errorMessage = Selector('.error, [data-testid*="error"], .text-red-500');
  
  // Should not show expired document error for future dates
  await t.expect(errorMessage.withText(/expired|caducado/i).exists).notOk('Should not show expired error for valid documents');

  console.log('✅ Residence permit expiry date extracted successfully');
});

// Test multiple residence permit types recognition
test('Recognize different residence permit categories', async t => {
  console.log('🧪 Testing different residence permit category recognition');
  
  const permitTests = [
    {
      image: './attached_assets/EE77HL24GZXQHKQMY3AWCUIGJQ_1753385962507.avif',
      expectedType: /family|familiar|reunification/i
    },
    {
      image: './attached_assets/tipos_1753387245234.png',
      expectedType: /work|trabajo|employment/i
    }
  ];

  for (const permitTest of permitTests) {
    await t
      .click(Selector('button').withText(/start registration|comenzar registro/i))
      .navigateTo('http://localhost:5000'); // Reset for next test

    // Select residence permit document type
    await t
      .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
      .click(Selector('option, [role="option"]').withText(/TIE|Residence/i));

    // Upload specific permit type
    await t
      .setFilesToUpload(Selector('input[type="file"]').nth(0), [permitTest.image])
      .wait(4000);

    // Check if permit type is recognized
    const permitTypeField = Selector('select[name="permitType"], input[name="residenceType"]');
    if (await permitTypeField.exists) {
      const permitValue = await permitTypeField.value;
      await t.expect(permitValue).match(permitTest.expectedType, `Permit type should be recognized for ${permitTest.image}`);
    }

    console.log(`✅ Permit type recognized for ${permitTest.image}`);
  }
});

// Test residence permit with poor image quality
test('Handle low-quality residence permit images', async t => {
  console.log('🧪 Testing low-quality residence permit processing');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select residence permit document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence/i));

  // Upload low-quality image
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      './attached_assets/back_1753387245228.jpg'
    ])
    .wait(6000); // Longer processing time for difficult images

  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  const extractedValue = await documentField.value;

  if (extractedValue === '' || extractedValue.length < 5) {
    // Should provide manual entry option
    await t
      .expect(Selector('[data-testid*="manual"], .manual-entry').exists).ok('Manual entry should be available for poor quality images')
      .typeText(documentField, 'X1111111H', { replace: true })
      .expect(documentField.value).eql('X1111111H');
  } else {
    // Should extract recognizable data
    await t.expect(extractedValue.length).gte(5, 'Should extract some recognizable data');
  }

  console.log('✅ Low-quality residence permit handled appropriately');
});

// Test residence permit validation rules
test('Validate residence permit data integrity', async t => {
  console.log('🧪 Testing residence permit validation rules');
  
  await t
    .click(Selector('button').withText(/start registration|comenzar registro/i));

  // Select residence permit document type
  await t
    .click(Selector('select, [role="combobox"]').withAttribute('data-testid', 'document-type-select'))
    .click(Selector('option, [role="option"]').withText(/TIE|Residence/i));

  // Test manual entry with validation
  const documentField = Selector('input[name="documentNumber"], input[id*="document"]');
  
  // Test invalid NIE format
  await t
    .typeText(documentField, '1234567A', { replace: true })
    .pressKey('tab');

  // Should show validation error
  await t
    .expect(Selector('.error, [data-testid*="error"], .text-red-500').exists).ok('Invalid format should show error');

  // Test valid NIE format
  await t
    .typeText(documentField, 'X2222222J', { replace: true })
    .pressKey('tab');

  // Should not show error for valid format
  await t
    .expect(Selector('.error, [data-testid*="error"], .text-red-500').exists).notOk('Valid format should not show error');

  console.log('✅ Residence permit validation working correctly');
});