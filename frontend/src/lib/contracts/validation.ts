export interface DocumentValidationRequest {
  documentType: 'DNI' | 'NIE' | 'PASSPORT';
  documentNumber: string;
  countryCode?: string;
}

export interface DocumentValidationResponse {
  valid: boolean;
  confidence: number;   // 0–1
  checksumValid: boolean;
  extractedData: {
    documentNumber: string;
    name?: string;
    surname?: string;
    birthDate?: string;
    nationality?: string;
    expiryDate?: string;
  } | null;
  errors: string[];
}

export interface BookingValidationRules {
  minAdvanceDays: number;
  maxNights: number;
  minNights: number;
  maxPersonsPerBooking: number;
  requireDocumentUpload: boolean;
  cancellationPolicyHours: number;
  reservationExpiryMinutes: number;
}
