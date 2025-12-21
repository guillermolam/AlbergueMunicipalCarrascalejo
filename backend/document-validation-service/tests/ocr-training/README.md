# OCR Training Data

This directory contains training and test data for OCR validation of Spanish identity documents.

## Structure

- `dni-nif/` - Spanish DNI (Documento Nacional de Identidad) samples
- `nie-tie/` - NIE (Número de Identidad de Extranjero) samples
- `passports/` - International passport samples

## Data Privacy

All training data should be:

- Anonymized or synthetic
- Compliant with GDPR
- Not contain real personal information
- Used only for testing OCR accuracy

## File Naming Convention

- `{document_type}_{sample_number}_{quality}.jpg`
- Example: `dni_001_high.jpg`, `nie_002_medium.jpg`

## Test Usage

Training data is loaded by test suites in `../mod.rs` to validate OCR accuracy across different document types and image qualities.
