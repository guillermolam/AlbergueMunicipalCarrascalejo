export interface ValidationResult {
  isValid: boolean
  confidence: number
  documentType: 'dni' | 'nie' | 'passport' | 'unknown'
  extractedData?: {
    documentNumber?: string
    name?: string
    surname?: string
    nationality?: string
    expiryDate?: string
  }
  errors: string[]
}

export interface DocumentUploadRequest {
  file: File
  documentType: 'dni' | 'nie' | 'passport'
  pilgrimId: string
}

export interface ValidationRequest {
  documentNumber: string
  documentType: 'dni' | 'nie' | 'passport'
  name: string
  surname: string
  nationality: string
  expiryDate?: string
}

export async function uploadDocument(request: DocumentUploadRequest): Promise<ValidationResult> {
  const formData = new FormData()
  formData.append('file', request.file)
  formData.append('documentType', request.documentType)
  formData.append('pilgrimId', request.pilgrimId)

  const response = await fetch('/api/document/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Document upload failed')
  }

  return response.json()
}

export async function validateDocument(request: ValidationRequest): Promise<ValidationResult> {
  const response = await fetch('/api/document/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('Document validation failed')
  }

  return response.json()
}

export function validateSpanishDNI(dni: string): boolean {
  const dniRegex = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i
  if (!dniRegex.test(dni)) return false

  const numbers = dni.slice(0, 8)
  const letter = dni.slice(8, 9).toUpperCase()
  const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const calculatedLetter = validLetters[parseInt(numbers) % 23]
  
  return letter === calculatedLetter
}

export function validateSpanishNIE(nie: string): boolean {
  const nieRegex = /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i
  if (!nieRegex.test(nie)) return false

  const firstLetter = nie.slice(0, 1).toUpperCase()
  const numbers = nie.slice(1, 8)
  const letter = nie.slice(8, 9).toUpperCase()
  
  // Convert first letter to number
  const firstDigit = firstLetter === 'X' ? '0' : firstLetter === 'Y' ? '1' : '2'
  const fullNumber = firstDigit + numbers
  
  const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE'
  const calculatedLetter = validLetters[parseInt(fullNumber) % 23]
  
  return letter === calculatedLetter
}

export function validatePassport(passport: string): boolean {
  // Basic passport validation - 6-12 alphanumeric characters
  const passportRegex = /^[A-Z0-9]{6,12}$/i
  return passportRegex.test(passport)
}