
#!/bin/bash

# Deployment script for spanish-document-ocr AWS Lambda function
# Run this script locally with AWS CLI configured

set -e

echo "=== AWS Lambda Deployment Script ==="
echo "Function URL: https://ypeekiyyo4wb4mvzg3vsa2yy2m0lhmew.lambda-url.eu-west-3.on.aws/"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo not found. Please install: https://rustup.rs/"
    exit 1
fi

if ! command -v cargo-lambda &> /dev/null; then
    echo "❌ cargo-lambda not found. Installing..."
    cargo install cargo-lambda
fi

# Check AWS credentials
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Navigate to project directory
cd backend-rust/src/spanish-document-ocr

echo "Building Lambda function..."
cargo lambda build --release

echo "Deploying to AWS Lambda..."
cargo lambda deploy \
    --function-name spanish-document-ocr \
    --memory 256 \
    --timeout 30 \
    --environment-variables "RUST_LOG=info,TESSERACT_LANG=spa,MAX_IMAGE_SIZE=10485760"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Function URL: https://ypeekiyyo4wb4mvzg3vsa2yy2m0lhmew.lambda-url.eu-west-3.on.aws/"
echo ""
echo "Testing deployment..."
curl -X POST https://ypeekiyyo4wb4mvzg3vsa2yy2m0lhmew.lambda-url.eu-west-3.on.aws/ \
    -H "Content-Type: application/json" \
    -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==", "document_type": "DNI", "side": "front"}' \
    -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🎉 Lambda function is ready for Spanish document OCR processing!"
