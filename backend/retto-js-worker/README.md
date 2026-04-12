# Retto OCR Worker

Cloudflare Worker using `@nekoimageland/retto-wasm` for PaddleOCR.

## Setup

1. **Upload models to R2**:
   ```bash
   # Models go in: albergue-documents/models/
   wrangler r2 object put albergue-documents/models/ch_PP-OCRv4_det_infer.onnx --file /path/to/model.onnx
   wrangler r2 object put albergue-documents/models/ch_ppocr_mobile_v2.0_cls_infer.onnx --file /path/to/model.onnx
   wrangler r2 object put albergue-documents/models/ch_PP-OCRv4_rec_infer.onnx --file /path/to/model.onnx
   wrangler r2 object put albergue-documents/models/ppocr_keys_v1.txt --file /path/to/dict.txt
   ```

   Get models from: https://huggingface.co/pk5ls20/PaddleModel

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Deploy**:
   ```bash
   pnpm run deploy
   ```

## Endpoints

- `GET /health` - Health check
- `POST /ocr` - Run OCR on document image

## Development

```bash
pnpm run dev
```