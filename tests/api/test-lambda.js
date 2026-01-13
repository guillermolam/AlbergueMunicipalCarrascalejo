// Test script for AWS Lambda spanish-document-ocr function

async function testLambda() {
  const lambdaUrl =
    "https://ypeekiyyo4wb4mvzg3vsa2yy2m0lhmew.lambda-url.eu-west-3.on.aws/";

  console.log("=== Testing AWS Lambda OCR Function ===");
  console.log("URL:", lambdaUrl);

  // Simple test image (1x1 pixel PNG)
  const testPayload = {
    image_base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    document_type: "DNI",
    side: "front",
  };

  try {
    console.log("\n=== Sending Test Request ===");
    console.log("Payload:", JSON.stringify(testPayload, null, 2));

    const response = await fetch(lambdaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5000",
      },
      body: JSON.stringify(testPayload),
    });

    console.log("\n=== Response ===");
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    const result = await response.text();
    console.log("Body:", result);

    if (response.ok) {
      console.log("\n✅ Lambda function is working!");
      try {
        const parsed = JSON.parse(result);
        console.log("Parsed response:", JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log("Response is not JSON");
      }
    } else {
      console.log("\n❌ Lambda function returned error");
      if (response.status === 403) {
        console.log("Possible CORS issue - check Function URL CORS settings");
      }
    }
  } catch (error) {
    console.log("\n❌ Request failed:", error.message);
  }
}

testLambda();
