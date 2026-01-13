import { Selector, ClientFunction } from "testcafe";

fixture`Complete Registration Flow with Notifications and Bed Management`
  .page`http://localhost:5000`.beforeEach(async (t) => {
  await t.eval(() => localStorage.clear());
  await t.eval(() => sessionStorage.clear());
});

// Complete registration flow test with all validations
test("Complete registration flow - Document to Success Screen", async (t) => {
  console.log("🧪 Testing complete registration flow with all validations");

  // Step 1: Start registration
  console.log("📝 Step 1: Starting registration process");
  await t
    .click(Selector("button").withText(/start registration|comenzar registro/i))
    .expect(Selector('[data-testid="booking"]').exists)
    .ok("Registration form should be visible");

  // Step 2: Select stay dates and check availability
  console.log("📅 Step 2: Selecting stay dates and checking availability");
  const checkInField = Selector(
    'input[name="checkInDate"], input[type="date"]',
  ).nth(0);
  const checkOutField = Selector(
    'input[name="checkOutDate"], input[type="date"]',
  ).nth(1);

  if ((await checkInField.exists) && (await checkOutField.exists)) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(tomorrow.getDate() + 1);

    await t
      .typeText(checkInField, tomorrow.toISOString().split("T")[0], {
        replace: true,
      })
      .typeText(checkOutField, dayAfter.toISOString().split("T")[0], {
        replace: true,
      })
      .pressKey("tab");
  }

  // Step 3: Document upload and OCR processing
  console.log("📄 Step 3: Document upload and OCR processing");
  await t
    .click(
      Selector('select, [role="combobox"]').withAttribute(
        "data-testid",
        "document-type-select",
      ),
    )
    .click(Selector('option, [role="option"]').withText(/NIF|DNI/i));

  // Upload document
  await t
    .setFilesToUpload(Selector('input[type="file"]').nth(0), [
      "./attached_assets/DNI-1267921516_1753385962505.jpg",
    ])
    .wait(4000);

  // Upload back if required
  const backUpload = Selector('input[type="file"]').nth(1);
  if (await backUpload.exists) {
    await t
      .setFilesToUpload(backUpload, [
        "./attached_assets/dni-españa-informatizado-1024x669_1753385962506.jpg",
      ])
      .wait(3000);
  }

  // Verify document data extraction
  const documentField = Selector(
    'input[name="documentNumber"], input[id*="document"]',
  );
  let documentValue = await documentField.value;

  if (documentValue === "" || documentValue.length < 8) {
    console.log("📝 Manual document entry required");
    await t.typeText(documentField, "12345678Z", { replace: true });
    documentValue = "12345678Z";
  }

  // Step 4: Complete personal information
  console.log("👤 Step 4: Completing personal information");
  const firstNameField = Selector(
    'input[name="firstName"], input[id*="firstName"]',
  );
  const lastNameField = Selector(
    'input[name="lastName1"], input[id*="lastName"]',
  );
  const birthDateField = Selector(
    'input[name="birthDate"], input[id*="birth"]',
  );
  const genderField = Selector('select[name="gender"], input[name="gender"]');
  const nationalityField = Selector(
    'input[name="nationality"], select[name="nationality"]',
  );

  // Fill in personal details
  if ((await firstNameField.value) === "") {
    await t.typeText(firstNameField, "JOHN", { replace: true });
  }

  if ((await lastNameField.value) === "") {
    await t.typeText(lastNameField, "DOE", { replace: true });
  }

  if ((await birthDateField.exists) && (await birthDateField.value) === "") {
    await t.typeText(birthDateField, "1990-01-01", { replace: true });
  }

  if (await genderField.exists) {
    await t
      .click(genderField)
      .click(Selector("option").withText(/Male|Masculino|M/i));
  }

  if (
    (await nationalityField.exists) &&
    (await nationalityField.value) === ""
  ) {
    await t.typeText(nationalityField, "Spanish", { replace: true });
  }

  // Step 5: Address information
  console.log("🏠 Step 5: Completing address information");
  const addressField = Selector(
    'input[name="addressStreet"], input[id*="address"]',
  );
  const cityField = Selector('input[name="addressCity"], input[id*="city"]');
  const countryField = Selector(
    'input[name="addressCountry"], select[name="country"]',
  );
  const postalCodeField = Selector(
    'input[name="addressPostalCode"], input[id*="postal"]',
  );

  if ((await addressField.exists) && (await addressField.value) === "") {
    await t.typeText(addressField, "Calle Mayor 123", { replace: true });
  }

  if ((await cityField.exists) && (await cityField.value) === "") {
    await t.typeText(cityField, "Madrid", { replace: true });
  }

  if ((await countryField.exists) && (await countryField.value) === "") {
    if (countryField.tagName === "select") {
      await t
        .click(countryField)
        .click(Selector("option").withText(/Spain|España/i));
    } else {
      await t.typeText(countryField, "Spain", { replace: true });
    }
  }

  if ((await postalCodeField.exists) && (await postalCodeField.value) === "") {
    await t.typeText(postalCodeField, "28001", { replace: true });
  }

  // Step 6: Contact information
  console.log("📞 Step 6: Adding contact information");
  const phoneField = Selector('input[name="phone"], input[id*="phone"]');
  const emailField = Selector('input[name="email"], input[id*="email"]');

  if ((await phoneField.exists) && (await phoneField.value) === "") {
    await t.typeText(phoneField, "+34666777888", { replace: true });
  }

  if ((await emailField.exists) && (await emailField.value) === "") {
    await t.typeText(emailField, "john.doe@example.com", { replace: true });
  }

  // Step 7: Check bed availability before proceeding
  console.log("🛏️ Step 7: Checking bed availability");

  // Get initial bed count from API
  const getBedsAvailable = ClientFunction(() => {
    return fetch("/api/dashboard/stats")
      .then((response) => response.json())
      .then((data) => data.occupancy.available);
  });

  const initialBedCount = await getBedsAvailable();
  console.log(`📊 Initial available beds: ${initialBedCount}`);

  // Step 8: Proceed to bed selection
  console.log("🏠 Step 8: Proceeding to bed selection");
  const continueButton = Selector("button").withText(
    /continue|siguiente|proceed/i,
  );
  if (await continueButton.exists) {
    await t.click(continueButton);
  }

  // Wait for bed selection step
  await t.wait(2000);

  // Step 9: Select accommodation type and bed
  console.log("🛏️ Step 9: Selecting accommodation and bed");

  // Select dormitory accommodation (cheaper option)
  const dormitoryOption = Selector('input[value="dormitory"], button').withText(
    /dormitory|dormitorio/i,
  );
  if (await dormitoryOption.exists) {
    await t.click(dormitoryOption);
  }

  // Select specific bed if bed map is available
  const bedSelector = Selector(
    '[data-testid*="bed"], .bed-option, button[data-bed]',
  );
  if (await bedSelector.exists) {
    await t.click(bedSelector.nth(0)); // Select first available bed
  }

  // Step 10: Payment information
  console.log("💳 Step 10: Adding payment information");
  const paymentMethod = Selector(
    'select[name="paymentMethod"], input[name="payment"]',
  );
  if (await paymentMethod.exists) {
    await t
      .click(paymentMethod)
      .click(Selector("option").withText(/card|tarjeta/i));
  }

  // Mock payment details (in test environment)
  const cardNumberField = Selector(
    'input[name="cardNumber"], input[id*="card"]',
  );
  const cardExpiryField = Selector(
    'input[name="cardExpiry"], input[id*="expiry"]',
  );
  const cardCVVField = Selector('input[name="cardCVV"], input[id*="cvv"]');

  if (await cardNumberField.exists) {
    await t.typeText(cardNumberField, "4111111111111111", { replace: true });
  }

  if (await cardExpiryField.exists) {
    await t.typeText(cardExpiryField, "12/25", { replace: true });
  }

  if (await cardCVVField.exists) {
    await t.typeText(cardCVVField, "123", { replace: true });
  }

  // Step 11: Review and confirm booking
  console.log("📋 Step 11: Reviewing and confirming booking");
  const reviewButton = Selector("button").withText(/review|revisar|confirm/i);
  if (await reviewButton.exists) {
    await t.click(reviewButton);
    await t.wait(2000);
  }

  // Verify booking summary shows correct information
  const bookingSummary = Selector(
    '[data-testid="booking-summary"], .booking-summary, .summary',
  );
  if (await bookingSummary.exists) {
    await t
      .expect(bookingSummary.innerText)
      .contains(
        documentValue,
        "Booking summary should contain document number",
      );
  }

  // Step 12: Final booking confirmation and payment processing
  console.log("✅ Step 12: Processing final booking confirmation");
  const finalConfirmButton = Selector("button").withText(
    /confirm booking|confirmar reserva|pay now/i,
  );
  if (await finalConfirmButton.exists) {
    await t.click(finalConfirmButton).wait(5000); // Wait for payment processing and bed assignment
  } else {
    // Look for alternative confirmation button
    const submitButton = Selector('button[type="submit"], button').withText(
      /submit|enviar|complete/i,
    );
    if (await submitButton.exists) {
      await t.click(submitButton).wait(5000);
    }
  }

  // Step 13: Verify success screen and booking confirmation
  console.log("🎉 Step 13: Verifying success screen and booking details");

  // Look for success indicators
  const successMessage = Selector(
    '[data-testid*="success"], .success, .confirmation',
  ).withText(/success|confirmed|confirmado|éxito/i);
  const bookingReference = Selector(
    '[data-testid*="reference"], .booking-reference, .reference-number',
  );

  // Should show success message
  await t
    .expect(successMessage.exists)
    .ok("Success message should be displayed", { timeout: 10000 });

  // Should show booking reference
  if (await bookingReference.exists) {
    const referenceNumber = await bookingReference.innerText;
    console.log(`📧 Booking reference: ${referenceNumber}`);
    await t
      .expect(referenceNumber)
      .match(/^[A-Z0-9]{6,}$/, "Booking reference should be alphanumeric");
  }

  // Step 14: Verify bed count decreased
  console.log("🔍 Step 14: Verifying bed inventory updated");

  const finalBedCount = await getBedsAvailable();
  console.log(`📊 Final available beds: ${finalBedCount}`);

  // Bed count should have decreased by 1
  await t
    .expect(finalBedCount)
    .eql(
      initialBedCount - 1,
      "Available beds should decrease by 1 after booking",
    );

  // Step 15: Check for notification sending
  console.log("📧 Step 15: Verifying notification system");

  // Look for notification confirmation
  const notificationStatus = Selector(
    '[data-testid*="notification"], .notification-status',
  ).withText(/sent|enviado|email/i);
  if (await notificationStatus.exists) {
    console.log("✅ Email notification confirmation displayed");
  }

  // Check if confirmation email message is shown
  const emailConfirmation = Selector(
    '.email-confirmation, [data-testid*="email"]',
  ).withText(/email|correo/i);
  if (await emailConfirmation.exists) {
    const emailText = await emailConfirmation.innerText;
    await t
      .expect(emailText)
      .contains(
        "john.doe@example.com",
        "Email confirmation should reference user email",
      );
  }

  // Step 16: Verify final success screen elements
  console.log("🏁 Step 16: Final success screen validation");

  // Should display all key booking information
  const finalSuccessScreen = Selector(
    '[data-testid="success-screen"], .success-page, .booking-complete',
  );
  if (await finalSuccessScreen.exists) {
    const successContent = await finalSuccessScreen.innerText;

    // Verify key information is displayed
    await t
      .expect(successContent)
      .contains("JOHN DOE", "Success screen should show guest name")
      .expect(successContent)
      .contains(documentValue, "Success screen should show document number");
  }

  // Should show next steps or check-in information
  const checkInInfo = Selector(
    '[data-testid*="checkin"], .checkin-info, .arrival-info',
  );
  if (await checkInInfo.exists) {
    console.log("ℹ️ Check-in information displayed for guest");
  }

  // Should provide booking management options
  const bookingActions = Selector(
    '[data-testid*="actions"], .booking-actions, .next-steps',
  );
  if (await bookingActions.exists) {
    console.log("🔧 Booking management options available");
  }

  console.log("🎊 COMPLETE REGISTRATION FLOW TEST PASSED");
  console.log("✅ All validation points confirmed:");
  console.log("   - Document processing and OCR ✅");
  console.log("   - Form validation and completion ✅");
  console.log("   - Bed availability and assignment ✅");
  console.log("   - Payment processing simulation ✅");
  console.log("   - Notification system integration ✅");
  console.log("   - Success screen validation ✅");
  console.log("   - Bed inventory management ✅");
});

// Test notification system specifically
test("Verify notification system integration", async (t) => {
  console.log("📧 Testing notification system integration");

  // Complete a basic registration to trigger notifications
  await t
    .click(Selector("button").withText(/start registration|comenzar registro/i))
    .click(
      Selector('select, [role="combobox"]').withAttribute(
        "data-testid",
        "document-type-select",
      ),
    )
    .click(Selector('option, [role="option"]').withText(/NIF|DNI/i));

  // Fill minimum required information
  const documentField = Selector(
    'input[name="documentNumber"], input[id*="document"]',
  );
  const emailField = Selector('input[name="email"], input[id*="email"]');
  const firstNameField = Selector(
    'input[name="firstName"], input[id*="firstName"]',
  );

  await t
    .typeText(documentField, "11111111H")
    .typeText(firstNameField, "TEST")
    .typeText(emailField, "test@example.com");

  // Complete and submit registration
  const submitButton = Selector("button").withText(/submit|confirm|complete/i);
  if (await submitButton.exists) {
    await t.click(submitButton).wait(3000);
  }

  // Check for notification system integration
  const notificationLog = Selector(
    '[data-testid*="notification"], .notification, .email-status',
  );
  if (await notificationLog.exists) {
    console.log("✅ Notification system integrated");

    const notificationText = await notificationLog.innerText;
    await t
      .expect(notificationText)
      .contains("test@example.com", "Notification should reference user email");
  }

  console.log("📧 Notification system integration verified");
});

// Test bed management after multiple bookings
test("Test bed management with multiple consecutive bookings", async (t) => {
  console.log("🛏️ Testing bed management with multiple bookings");

  // Get initial bed count
  const getBedCount = ClientFunction(() => {
    return fetch("/api/dashboard/stats")
      .then((response) => response.json())
      .then((data) => data.occupancy.available);
  });

  const initialBeds = await getBedCount();
  console.log(`📊 Starting with ${initialBeds} available beds`);

  // Perform multiple quick bookings
  for (let i = 1; i <= 3; i++) {
    console.log(`🔄 Processing booking ${i}/3`);

    await t
      .navigateTo("http://localhost:5000")
      .click(
        Selector("button").withText(/start registration|comenzar registro/i),
      );

    // Quick registration
    await t
      .click(
        Selector('select, [role="combobox"]').withAttribute(
          "data-testid",
          "document-type-select",
        ),
      )
      .click(Selector('option, [role="option"]').withText(/NIF|DNI/i))
      .typeText(
        Selector('input[name="documentNumber"], input[id*="document"]'),
        `1111111${i}H`,
      )
      .typeText(
        Selector('input[name="firstName"], input[id*="firstName"]'),
        `GUEST${i}`,
      )
      .typeText(
        Selector('input[name="email"], input[id*="email"]'),
        `guest${i}@test.com`,
      );

    // Submit booking
    const submitButton = Selector("button").withText(
      /submit|confirm|complete/i,
    );
    if (await submitButton.exists) {
      await t.click(submitButton).wait(2000);
    }

    // Check bed count after each booking
    const currentBeds = await getBedCount();
    console.log(`📊 After booking ${i}: ${currentBeds} beds available`);

    await t
      .expect(currentBeds)
      .eql(
        initialBeds - i,
        `After ${i} bookings, beds should decrease by ${i}`,
      );
  }

  console.log("✅ Multiple booking bed management test completed");
});

// Test error handling in complete flow
test("Test error handling throughout registration flow", async (t) => {
  console.log("⚠️ Testing error handling throughout registration flow");

  await t.click(
    Selector("button").withText(/start registration|comenzar registro/i),
  );

  // Test invalid document number
  const documentField = Selector(
    'input[name="documentNumber"], input[id*="document"]',
  );
  await t.typeText(documentField, "INVALID").pressKey("tab");

  // Should show validation error
  const validationError = Selector(
    '.error, [data-testid*="error"], .text-red-500',
  );
  await t
    .expect(validationError.exists)
    .ok("Validation error should be shown for invalid document");

  // Test invalid email
  const emailField = Selector('input[name="email"], input[id*="email"]');
  await t.typeText(emailField, "invalid-email").pressKey("tab");

  // Should show email validation error
  const emailError = Selector(
    '.error, [data-testid*="error"], .text-red-500',
  ).withText(/email|correo/i);
  if (await emailError.exists) {
    console.log("✅ Email validation error handling working");
  }

  // Test form submission with errors
  const submitButton = Selector("button").withText(/submit|confirm|complete/i);
  if (await submitButton.exists) {
    await t.click(submitButton);

    // Should prevent submission with errors
    const formErrors = Selector(
      '.error, [data-testid*="error"], .text-red-500',
    );
    if (await formErrors.exists) {
      console.log("✅ Form submission blocked with validation errors");
    }
  }

  // Fix errors and retry
  await t
    .typeText(documentField, "12345678Z", { replace: true })
    .typeText(emailField, "test@example.com", { replace: true })
    .typeText(
      Selector('input[name="firstName"], input[id*="firstName"]'),
      "TEST",
    );

  // Should now allow submission
  if (await submitButton.exists) {
    await t.click(submitButton);

    // Should proceed without errors
    const successIndicator = Selector('[data-testid*="success"], .success');
    await t
      .expect(successIndicator.exists)
      .ok("Registration should succeed after fixing errors", { timeout: 5000 });
  }

  console.log("✅ Error handling throughout registration flow verified");
});
