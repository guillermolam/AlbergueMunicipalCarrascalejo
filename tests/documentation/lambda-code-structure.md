
# AWS Lambda Rust OCR Code Structure

## ASCII Directory Tree

```
spanish-document-ocr-lambda/
├── Cargo.toml                          # Main project dependencies
├── Cargo.lock                          # Dependency lock file
├── README.md                           # Lambda documentation
├── template.yaml                       # SAM template (modified version)
├── samconfig.toml                      # SAM configuration
├── .gitignore                          # Git ignore patterns
│
├── src/
│   ├── main.rs                         # Lambda entry point and handler
│   ├── lib.rs                          # Main library module
│   ├── ocr/
│   │   ├── mod.rs                      # OCR module declarations
│   │   ├── processor.rs                # Core OCR processing logic
│   │   ├── spanish_documents.rs        # Spanish DNI/NIE parsing
│   │   └── passport.rs                 # International passport MRZ parsing
│   ├── validation/
│   │   ├── mod.rs                      # Validation module declarations
│   │   ├── dni_nie.rs                  # Spanish document validation (mod-23)
│   │   └── checksum.rs                 # Document checksum algorithms
│   ├── models/
│   │   ├── mod.rs                      # Data model declarations
│   │   ├── request.rs                  # Lambda request structures
│   │   ├── response.rs                 # Lambda response structures
│   │   └── document.rs                 # Document data structures
│   ├── utils/
│   │   ├── mod.rs                      # Utility module declarations
│   │   ├── image.rs                    # Image processing utilities
│   │   ├── text.rs                     # Text cleaning and parsing
│   │   └── error.rs                    # Error handling utilities
│   └── config/
│       ├── mod.rs                      # Configuration module
│       └── tesseract.rs                # Tesseract configuration
│
├── tests/
│   ├── integration_test.rs             # End-to-end tests
│   ├── ocr_tests.rs                    # OCR processing tests
│   └── fixtures/
│       ├── sample_dni_front.jpg        # Test DNI front image
│       ├── sample_dni_back.jpg         # Test DNI back image
│       ├── sample_nie.jpg              # Test NIE image
│       └── sample_passport.jpg         # Test passport image
│
├── layers/
│   └── tesseract/
│       ├── bin/
│       │   └── tesseract               # Tesseract binary
│       ├── lib/
│       │   └── (tesseract libraries)   # Required libraries
│       └── share/
│           └── tessdata/
│               ├── spa.traineddata     # Spanish language data
│               ├── eng.traineddata     # English language data
│               └── osd.traineddata     # Orientation detection
│
├── target/
│   └── lambda/
│       └── spanish-document-ocr/
│           └── bootstrap               # Compiled Lambda binary
│
└── scripts/
    ├── build.sh                        # Build script for Lambda
    ├── deploy.sh                       # Deployment script
    ├── test-local.sh                   # Local testing script
    └── package-layer.sh                # Tesseract layer packaging
```

## Key Files Content Overview

### 1. `src/main.rs` - Lambda Entry Point
```rust
use lambda_runtime::{service_fn, Error, LambdaEvent};
use lambda_web::{is_running_on_lambda, launch, LambdaError};
use spanish_document_ocr::handler;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::init();
    
    if is_running_on_lambda() {
        launch(handler).await
    } else {
        // Local development server
        tokio::spawn(async {
            warp::serve(routes()).run(([0, 0, 0, 0], 3000)).await;
        }).await.unwrap();
        Ok(())
    }
}
```

### 2. `src/lib.rs` - Main Handler
```rust
pub mod ocr;
pub mod validation;
pub mod models;
pub mod utils;
pub mod config;

use lambda_web::{Request, Response, Body};
use crate::models::{OCRRequest, OCRResponse};

pub async fn handler(request: Request) -> Result<Response<Body>, LambdaError> {
    match request.method() {
        &Method::POST => process_ocr_request(request).await,
        &Method::OPTIONS => handle_cors_preflight().await,
        _ => Ok(Response::builder()
            .status(405)
            .body("Method Not Allowed".into())?),
    }
}
```

### 3. `Cargo.toml` - Dependencies
```toml
[package]
name = "spanish-document-ocr"
version = "0.1.0"
edition = "2021"

[dependencies]
lambda_runtime = "0.8"
lambda_web = "0.2"
tokio = { version = "1", features = ["macros"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tesseract-plumbing = "0.4"
image = "0.24"
base64 = "0.21"
regex = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"
anyhow = "1.0"
```

## Deployment Commands

1. **Build**: `cargo lambda build --release`
2. **Package**: `sam build`
3. **Deploy**: `sam deploy --guided`
4. **Test Local**: `cargo lambda watch`

## Environment Variables

- `RUST_LOG`: Logging level (info, debug, error)
- `TESSERACT_PREFIX`: Path to Tesseract installation (/opt/tesseract)

## CORS Configuration

The template includes proper CORS headers for:
- Replit development domains
- Production deployment domains
- Local development (localhost)

## Cost Optimization

- **Memory**: 256MB (optimal for OCR processing)
- **Timeout**: 30 seconds (sufficient for document processing)
- **Free Tier**: Supports ~720 requests/month at 24 users/day
- **Cold Start**: ~2-3 seconds, warm requests ~200ms
```
