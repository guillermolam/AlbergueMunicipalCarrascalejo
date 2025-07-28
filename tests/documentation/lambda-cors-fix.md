
# AWS Lambda CORS Fix - UPDATED CODE READY

## ✅ Code Updated with CORS Support

I've updated your Lambda function code to include proper CORS headers. Now you have 3 deployment options:

## Option 1: Deploy Updated Code (Recommended)

1. **AWS Lambda Console** → `spanish-document-ocr` function
2. **Configuration** → **Function URL** → **Edit**
3. **CORS Settings**:
   ```
   Allow origins: *
   Allow headers: Content-Type,Origin,Accept,Authorization
   Allow methods: HEAD,POST,PATCH,OPTIONS
   Max age: 86400
   ```
4. **Save**

## Alternative: Deploy Updated Code

If you want to deploy the latest code with CORS fixes:

Run the CORS-enabled deployment script:
```bash
# On your local machine with AWS CLI configured
chmod +x update-lambda-cors.sh
./update-lambda-cors.sh
```

## Option 2: AWS Console CORS Configuration (Quick Fix)

If you prefer not to redeploy, configure CORS in AWS Console:

### Option B: Manual ZIP Upload
1. Build the Rust code locally:
   ```bash
   cd backend-rust/src/spanish-document-ocr
   cargo lambda build --release
   zip deployment.zip target/lambda/spanish-document-ocr/bootstrap
   ```
2. AWS Console → Lambda → Upload .zip file

### Option C: Update Function Code in Console
Paste this CORS-enabled handler in the Lambda console inline editor:

```rust
// Add to main.rs lambda handler
use lambda_web::{lambda_web, Request, RequestExt, Response};

#[lambda_web]
async fn handler(request: Request) -> Result<Response<String>, lambda_web::Error> {
    // Handle preflight OPTIONS requests
    if request.method() == "OPTIONS" {
        return Ok(Response::builder()
            .status(200)
            .header("Access-Control-Allow-Origin", "*")
            .header("Access-Control-Allow-Methods", "POST, OPTIONS")
            .header("Access-Control-Allow-Headers", "Content-Type, Origin, Accept")
            .header("Access-Control-Max-Age", "86400")
            .body("".to_string())?);
    }
    
    // Your existing OCR processing code here...
    let result = process_document(&request).await?;
    
    // Return response with CORS headers
    Ok(Response::builder()
        .status(200)
        .header("Content-Type", "application/json")
        .header("Access-Control-Allow-Origin", "*")
        .header("Access-Control-Allow-Methods", "POST, OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Origin, Accept")
        .body(serde_json::to_string(&result)?)?)
}
```

## Test After Fix

Once CORS is fixed, test with:
```bash
curl -X POST https://ypeekiyyo4wb4mvzg3vsa2yy2m0lhmew.lambda-url.eu-west-3.on.aws/ \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5000" \
  -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "document_type": "DNI", "side": "front"}'
```

Should return JSON response instead of 403 Forbidden.

## Status
- ✅ Lambda function deployed and running
- ✅ SSL/TLS working correctly  
- ❌ CORS headers missing (causing 403)
- 🔧 **Fix needed**: Configure CORS in Function URL settings

The fastest fix is Method 1 (AWS Console CORS configuration).
```
