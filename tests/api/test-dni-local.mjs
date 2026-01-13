import fs from "fs";

async function testDNILocalOCR() {
  try {
    // Read the DNI image
    const imageBuffer = fs.readFileSync(
      "attached_assets/Screenshot 2025-07-17 214623_1753387007460.gif",
    );
    const base64Image = imageBuffer.toString("base64");
    const dataURL = `data:image/gif;base64,${base64Image}`;

    console.log("Testing local OCR endpoint with DNI image...");
    console.log("Image size:", imageBuffer.length, "bytes");

    const requestBody = {
      documentType: "DNI",
      fileData: dataURL,
      documentSide: "front",
    };

    console.log("Sending request to local server...");
    const response = await fetch("http://localhost:5000/api/ocr/dni", {
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
    console.log("\n=== OCR RESULTS ===");
    console.log("Success:", result.success);
    console.log("Confidence:", result.confidence);
    console.log("Processing Time:", result.processingTimeMs, "ms");

    if (result.extractedData) {
      console.log("\n=== EXTRACTED DATA ===");
      console.log(
        "Full extracted object:",
        JSON.stringify(result.extractedData, null, 2),
      );
      console.log("Document Number:", result.extractedData.documentNumber);
      console.log("First Name:", result.extractedData.firstName);
      console.log("Last Names:", result.extractedData.lastNames);
      console.log("LastName1:", result.extractedData.lastName1);
      console.log("LastName2:", result.extractedData.lastName2);
      console.log("Birth Date:", result.extractedData.birthDate);
      console.log("Expiry Date:", result.extractedData.expiryDate);
      console.log("Nationality:", result.extractedData.nationality);
      console.log("Gender:", result.extractedData.gender);
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
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testDNILocalOCR();
