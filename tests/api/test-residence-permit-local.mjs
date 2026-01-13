import fs from "fs";

async function testResidencePermitLocalOCR() {
  try {
    // Test with the modern TIE residence permit image
    const imageBuffer = fs.readFileSync(
      "attached_assets/tie-nie-card-featured_1753387245233.jpg",
    );
    const base64Image = imageBuffer.toString("base64");
    const dataURL = `data:image/jpeg;base64,${base64Image}`;

    console.log("Testing Residence Permit OCR endpoint with TIE card...");
    console.log("Image size:", imageBuffer.length, "bytes");

    const requestBody = {
      documentType: "RESIDENCE_PERMIT",
      fileData: dataURL,
      documentSide: "front",
    };

    console.log("Sending request to local server...");
    const response = await fetch("http://localhost:5000/api/ocr/nie", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    const result = await response.json();
    console.log("\n=== RESIDENCE PERMIT OCR RESULTS ===");
    console.log("Success:", result.success);
    console.log("Confidence:", result.confidence);
    console.log("Processing Time:", result.processingTimeMs, "ms");

    if (result.extractedData) {
      console.log("\n=== EXTRACTED DATA ===");
      console.log(
        "Full extracted object:",
        JSON.stringify(result.extractedData, null, 2),
      );
      console.log("Document Type:", result.extractedData.documentType);
      console.log("TIE Number:", result.extractedData.tieNumber);
      console.log("NIE Number:", result.extractedData.nieNumber);
      console.log("Document Number:", result.extractedData.documentNumber);
      console.log("First Name:", result.extractedData.firstName);
      console.log("Last Names:", result.extractedData.lastNames);
      console.log("Birth Date:", result.extractedData.birthDate);
      console.log("Expiry Date:", result.extractedData.expiryDate);
      console.log("Nationality:", result.extractedData.nationality);
      console.log("Gender:", result.extractedData.gender);
      console.log("Residence Type:", result.extractedData.residenceType);
      console.log("Residence Status:", result.extractedData.residenceStatus);
      console.log(
        "Work Authorization:",
        result.extractedData.workAuthorization,
      );
    }

    if (result.rawText) {
      console.log("\n=== RAW OCR TEXT ===");
      console.log(result.rawText);
    }

    if (result.error) {
      console.log("\n=== ERROR ===");
      console.log(result.error);
    }

    if (result.errors && result.errors.length > 0) {
      console.log("\n=== ERRORS ===");
      result.errors.forEach((error) => console.log("-", error));
    }

    // Test summary
    console.log("\n=== TEST SUMMARY ===");
    console.log(
      "✅ TIE Number Extracted:",
      result.extractedData?.tieNumber ? "YES" : "NO",
    );
    console.log(
      "✅ NIE Number Extracted:",
      result.extractedData?.nieNumber ? "YES" : "NO",
    );
    console.log(
      "✅ Personal Data Complete:",
      result.extractedData?.firstName && result.extractedData?.lastName1
        ? "YES"
        : "NO",
    );
    console.log(
      "✅ Birth Date Extracted:",
      result.extractedData?.birthDate ? "YES" : "NO",
    );
    console.log(
      "✅ Work Authorization:",
      result.extractedData?.workAuthorization ? "YES" : "NO",
    );
    console.log(
      "✅ Nationality Extracted:",
      result.extractedData?.nationality ? "YES" : "NO",
    );
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testResidencePermitLocalOCR();
