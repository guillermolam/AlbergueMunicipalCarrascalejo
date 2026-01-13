// Comprehensive data validation and integrity checks
// SSR-safe validation with proper error handling

import type {
  PilgrimProfile,
  PersonalInfo,
  EmergencyContact,
  MedicalInfo,
  Pilgrimage,
  Booking,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '@/types/pilgrim';

import type {
  CreatePilgrimProfileDto,
  UpdatePilgrimProfileDto,
  CreatePilgrimageDto,
  CreateBookingDto,
} from '@/types/pilgrim-operations';

/**
 * Base validator class with common validation utilities
 */
abstract class BaseValidator<T> {
  protected errors: ValidationError[] = [];
  protected warnings: ValidationWarning[] = [];

  abstract validate(data: T): ValidationResult;

  protected addError(field: string, message: string, code: string, value?: unknown): void {
    this.errors.push({ field, message, code, value });
  }

  protected addWarning(field: string, message: string, code: string, value?: unknown): void {
    this.warnings.push({ field, message, code, value });
  }

  protected reset(): void {
    this.errors = [];
    this.warnings = [];
  }

  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  protected isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{6,}$/;
    return phoneRegex.test(phone);
  }

  protected isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  protected isValidAge(dateOfBirth: Date, minAge: number = 16): boolean {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= minAge;
  }

  protected isValidPassport(passport: string): boolean {
    const passportRegex = /^[A-Z0-9]{6,}$/;
    return passportRegex.test(passport);
  }

  protected isValidIdCard(idCard: string): boolean {
    const idCardRegex = /^[A-Z0-9]{8,}$/;
    return idCardRegex.test(idCard);
  }

  protected getValidationResult(): ValidationResult {
    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}

/**
 * Personal info validator
 */
export class PersonalInfoValidator extends BaseValidator<PersonalInfo> {
  validate(data: PersonalInfo): ValidationResult {
    this.reset();

    // First name validation
    if (!data.firstName || data.firstName.trim().length < 2) {
      this.addError(
        'firstName',
        'First name must be at least 2 characters long',
        'MIN_LENGTH',
        data.firstName
      );
    } else if (data.firstName.length > 50) {
      this.addError(
        'firstName',
        'First name must not exceed 50 characters',
        'MAX_LENGTH',
        data.firstName
      );
    } else if (!/^[a-zA-ZÀ-ÿ\s\-\']+$/.test(data.firstName)) {
      this.addError(
        'firstName',
        'First name contains invalid characters',
        'INVALID_CHARACTERS',
        data.firstName
      );
    }

    // Last name validation
    if (!data.lastName || data.lastName.trim().length < 2) {
      this.addError(
        'lastName',
        'Last name must be at least 2 characters long',
        'MIN_LENGTH',
        data.lastName
      );
    } else if (data.lastName.length > 50) {
      this.addError(
        'lastName',
        'Last name must not exceed 50 characters',
        'MAX_LENGTH',
        data.lastName
      );
    } else if (!/^[a-zA-ZÀ-ÿ\s\-\']+$/.test(data.lastName)) {
      this.addError(
        'lastName',
        'Last name contains invalid characters',
        'INVALID_CHARACTERS',
        data.lastName
      );
    }

    // Email validation
    if (!data.email || !this.isValidEmail(data.email)) {
      this.addError('email', 'Please provide a valid email address', 'INVALID_EMAIL', data.email);
    } else if (data.email.length > 100) {
      this.addError('email', 'Email must not exceed 100 characters', 'MAX_LENGTH', data.email);
    }

    // Phone validation
    if (!data.phone || !this.isValidPhone(data.phone)) {
      this.addError('phone', 'Please provide a valid phone number', 'INVALID_PHONE', data.phone);
    }

    // Date of birth validation
    if (!data.dateOfBirth || !this.isValidDate(data.dateOfBirth)) {
      this.addError(
        'dateOfBirth',
        'Please provide a valid date of birth',
        'INVALID_DATE',
        data.dateOfBirth
      );
    } else if (!this.isValidAge(data.dateOfBirth, 16)) {
      this.addError(
        'dateOfBirth',
        'Pilgrim must be at least 16 years old',
        'MIN_AGE',
        data.dateOfBirth
      );
    } else if (data.dateOfBirth > new Date()) {
      this.addError(
        'dateOfBirth',
        'Date of birth cannot be in the future',
        'FUTURE_DATE',
        data.dateOfBirth
      );
    }

    // Nationality validation
    if (!data.nationality || data.nationality.length < 2) {
      this.addError(
        'nationality',
        'Please provide a valid nationality',
        'INVALID_NATIONALITY',
        data.nationality
      );
    }

    // Document validation (passport or ID card required)
    if (!data.passportNumber && !data.idCardNumber) {
      this.addError(
        'documents',
        'Either passport number or ID card number is required',
        'REQUIRED_DOCUMENT'
      );
    }

    if (data.passportNumber && !this.isValidPassport(data.passportNumber)) {
      this.addError(
        'passportNumber',
        'Please provide a valid passport number',
        'INVALID_PASSPORT',
        data.passportNumber
      );
    }

    if (data.idCardNumber && !this.isValidIdCard(data.idCardNumber)) {
      this.addError(
        'idCardNumber',
        'Please provide a valid ID card number',
        'INVALID_ID_CARD',
        data.idCardNumber
      );
    }

    // Emergency contact validation
    const emergencyContactValidation = new EmergencyContactValidator().validate(
      data.emergencyContact
    );
    if (!emergencyContactValidation.isValid) {
      this.errors.push(
        ...emergencyContactValidation.errors.map((error) => ({
          ...error,
          field: `emergencyContact.${error.field}`,
        }))
      );
    }

    // Medical info validation (if provided)
    if (data.medicalInfo) {
      const medicalValidation = new MedicalInfoValidator().validate(data.medicalInfo);
      if (!medicalValidation.isValid) {
        this.errors.push(
          ...medicalValidation.errors.map((error) => ({
            ...error,
            field: `medicalInfo.${error.field}`,
          }))
        );
      }
    }

    return this.getValidationResult();
  }
}

/**
 * Emergency contact validator
 */
export class EmergencyContactValidator extends BaseValidator<EmergencyContact> {
  validate(data: EmergencyContact): ValidationResult {
    this.reset();

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
      this.addError(
        'name',
        'Emergency contact name must be at least 2 characters long',
        'MIN_LENGTH',
        data.name
      );
    } else if (data.name.length > 100) {
      this.addError(
        'name',
        'Emergency contact name must not exceed 100 characters',
        'MAX_LENGTH',
        data.name
      );
    }

    // Relationship validation
    if (!data.relationship || data.relationship.trim().length < 2) {
      this.addError(
        'relationship',
        'Please specify the relationship to the emergency contact',
        'REQUIRED',
        data.relationship
      );
    }

    // Phone validation
    if (!data.phone || !this.isValidPhone(data.phone)) {
      this.addError(
        'phone',
        'Please provide a valid phone number for the emergency contact',
        'INVALID_PHONE',
        data.phone
      );
    }

    // Email validation (optional)
    if (data.email && !this.isValidEmail(data.email)) {
      this.addError(
        'email',
        'Please provide a valid email address for the emergency contact',
        'INVALID_EMAIL',
        data.email
      );
    }

    // Country validation
    if (!data.country || data.country.length < 2) {
      this.addError(
        'country',
        'Please provide the country where the emergency contact is located',
        'REQUIRED',
        data.country
      );
    }

    return this.getValidationResult();
  }
}

/**
 * Medical info validator
 */
export class MedicalInfoValidator extends BaseValidator<MedicalInfo> {
  validate(data: MedicalInfo): ValidationResult {
    this.reset();

    // Blood type validation (optional)
    if (
      data.bloodType &&
      !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(data.bloodType)
    ) {
      this.addError(
        'bloodType',
        'Please provide a valid blood type',
        'INVALID_BLOOD_TYPE',
        data.bloodType
      );
    }

    // Allergies validation (optional)
    if (data.allergies) {
      if (!Array.isArray(data.allergies)) {
        this.addError('allergies', 'Allergies must be an array', 'INVALID_TYPE', data.allergies);
      } else {
        data.allergies.forEach((allergy, index) => {
          if (typeof allergy !== 'string' || allergy.trim().length < 2) {
            this.addError(
              `allergies[${index}]`,
              'Each allergy must be a valid string',
              'INVALID_ALLERGY',
              allergy
            );
          }
        });
      }
    }

    // Medications validation (optional)
    if (data.medications) {
      if (!Array.isArray(data.medications)) {
        this.addError(
          'medications',
          'Medications must be an array',
          'INVALID_TYPE',
          data.medications
        );
      } else {
        data.medications.forEach((medication, index) => {
          if (typeof medication !== 'string' || medication.trim().length < 2) {
            this.addError(
              `medications[${index}]`,
              'Each medication must be a valid string',
              'INVALID_MEDICATION',
              medication
            );
          }
        });
      }
    }

    // Medical conditions validation (optional)
    if (data.medicalConditions) {
      if (!Array.isArray(data.medicalConditions)) {
        this.addError(
          'medicalConditions',
          'Medical conditions must be an array',
          'INVALID_TYPE',
          data.medicalConditions
        );
      } else {
        data.medicalConditions.forEach((condition, index) => {
          if (typeof condition !== 'string' || condition.trim().length < 2) {
            this.addError(
              `medicalConditions[${index}]`,
              'Each medical condition must be a valid string',
              'INVALID_CONDITION',
              condition
            );
          }
        });
      }
    }

    // Special requirements validation (optional)
    if (data.specialRequirements && data.specialRequirements.length > 500) {
      this.addError(
        'specialRequirements',
        'Special requirements must not exceed 500 characters',
        'MAX_LENGTH',
        data.specialRequirements
      );
    }

    // Last medical check validation (optional)
    if (data.lastMedicalCheck && !this.isValidDate(data.lastMedicalCheck)) {
      this.addError(
        'lastMedicalCheck',
        'Please provide a valid date for the last medical check',
        'INVALID_DATE',
        data.lastMedicalCheck
      );
    } else if (data.lastMedicalCheck && data.lastMedicalCheck > new Date()) {
      this.addError(
        'lastMedicalCheck',
        'Last medical check date cannot be in the future',
        'FUTURE_DATE',
        data.lastMedicalCheck
      );
    }

    return this.getValidationResult();
  }
}

/**
 * Pilgrim profile validator
 */
export class PilgrimProfileValidator extends BaseValidator<PilgrimProfile> {
  validate(data: PilgrimProfile): ValidationResult {
    this.reset();

    // Validate base entity fields
    if (!data.id || data.id.trim().length === 0) {
      this.addError('id', 'Profile ID is required', 'REQUIRED', data.id);
    }

    if (!data.createdAt || !this.isValidDate(data.createdAt)) {
      this.addError(
        'createdAt',
        'Created date is required and must be valid',
        'INVALID_DATE',
        data.createdAt
      );
    }

    if (!data.updatedAt || !this.isValidDate(data.updatedAt)) {
      this.addError(
        'updatedAt',
        'Updated date is required and must be valid',
        'INVALID_DATE',
        data.updatedAt
      );
    }

    if (data.version < 1) {
      this.addError('version', 'Version must be at least 1', 'INVALID_VERSION', data.version);
    }

    // Personal info validation
    if (!data.personalInfo) {
      this.addError(
        'personalInfo',
        'Personal information is required',
        'REQUIRED',
        data.personalInfo
      );
    } else {
      const personalInfoValidation = new PersonalInfoValidator().validate(data.personalInfo);
      if (!personalInfoValidation.isValid) {
        this.errors.push(...personalInfoValidation.errors);
      }
    }

    // Languages validation
    if (!data.languages || !Array.isArray(data.languages) || data.languages.length === 0) {
      this.addError(
        'languages',
        'At least one language must be specified',
        'REQUIRED',
        data.languages
      );
    } else {
      data.languages.forEach((language, index) => {
        if (typeof language !== 'string' || language.length < 2) {
          this.addError(
            `languages[${index}]`,
            'Each language must be a valid string',
            'INVALID_LANGUAGE',
            language
          );
        }
      });
    }

    // Experience level validation
    if (
      !data.experienceLevel ||
      !['beginner', 'intermediate', 'advanced', 'expert'].includes(data.experienceLevel)
    ) {
      this.addError(
        'experienceLevel',
        'Please select a valid experience level',
        'INVALID_EXPERIENCE_LEVEL',
        data.experienceLevel
      );
    }

    // Preferred pace validation
    if (!data.preferredPace || !['slow', 'moderate', 'fast'].includes(data.preferredPace)) {
      this.addError(
        'preferredPace',
        'Please select a valid preferred pace',
        'INVALID_PACE',
        data.preferredPace
      );
    }

    // Motivation validation
    if (!data.motivation || data.motivation.trim().length < 10) {
      this.addError(
        'motivation',
        'Please provide a motivation of at least 10 characters',
        'MIN_LENGTH',
        data.motivation
      );
    } else if (data.motivation.length > 1000) {
      this.addError(
        'motivation',
        'Motivation must not exceed 1000 characters',
        'MAX_LENGTH',
        data.motivation
      );
    }

    // Previous experience validation (optional)
    if (data.previousCaminoExperience) {
      if (!Array.isArray(data.previousCaminoExperience)) {
        this.addError(
          'previousCaminoExperience',
          'Previous Camino experience must be an array',
          'INVALID_TYPE',
          data.previousCaminoExperience
        );
      } else {
        // Additional validation for each experience would go here
      }
    }

    // Social links validation (optional)
    if (data.socialLinks) {
      // Additional validation for social links would go here
    }

    return this.getValidationResult();
  }
}

/**
 * Pilgrimage validator
 */
export class PilgrimageValidator extends BaseValidator<Pilgrimage> {
  validate(data: Pilgrimage): ValidationResult {
    this.reset();

    // Basic required fields
    if (!data.pilgrimId || data.pilgrimId.trim().length === 0) {
      this.addError('pilgrimId', 'Pilgrim ID is required', 'REQUIRED', data.pilgrimId);
    }

    if (
      !data.route ||
      ![
        'frances',
        'portugues',
        'del-norte',
        'primitivo',
        'ingles',
        'via-plata',
        'finisterre',
        'muxia',
      ].includes(data.route)
    ) {
      this.addError('route', 'Please select a valid Camino route', 'INVALID_ROUTE', data.route);
    }

    if (!data.startDate || !this.isValidDate(data.startDate)) {
      this.addError(
        'startDate',
        'Start date is required and must be valid',
        'INVALID_DATE',
        data.startDate
      );
    }

    if (!data.estimatedEndDate || !this.isValidDate(data.estimatedEndDate)) {
      this.addError(
        'estimatedEndDate',
        'Estimated end date is required and must be valid',
        'INVALID_DATE',
        data.estimatedEndDate
      );
    }

    // Date logic validation
    if (data.startDate && data.estimatedEndDate && data.startDate >= data.estimatedEndDate) {
      this.addError(
        'estimatedEndDate',
        'Estimated end date must be after start date',
        'INVALID_DATE_RANGE',
        data.estimatedEndDate
      );
    }

    if (data.startDate && data.startDate < new Date()) {
      this.addWarning('startDate', 'Start date is in the past', 'PAST_DATE', data.startDate);
    }

    // Location validation
    if (!data.startingPoint || data.startingPoint.trim().length < 2) {
      this.addError('startingPoint', 'Starting point is required', 'REQUIRED', data.startingPoint);
    }

    if (!data.finalDestination || data.finalDestination.trim().length < 2) {
      this.addError(
        'finalDestination',
        'Final destination is required',
        'REQUIRED',
        data.finalDestination
      );
    }

    // Distance validation
    if (!data.totalDistance || data.totalDistance <= 0) {
      this.addError(
        'totalDistance',
        'Total distance must be greater than 0',
        'INVALID_DISTANCE',
        data.totalDistance
      );
    }

    if (data.completedDistance < 0 || data.completedDistance > data.totalDistance) {
      this.addError(
        'completedDistance',
        'Completed distance must be between 0 and total distance',
        'INVALID_DISTANCE',
        data.completedDistance
      );
    }

    if (data.dailyDistance <= 0 || data.dailyDistance > 100) {
      this.addError(
        'dailyDistance',
        'Daily distance must be between 0 and 100 km',
        'INVALID_DAILY_DISTANCE',
        data.dailyDistance
      );
    }

    return this.getValidationResult();
  }
}

/**
 * Booking validator
 */
export class BookingValidator extends BaseValidator<Booking> {
  validate(data: Booking): ValidationResult {
    this.reset();

    // Basic required fields
    if (!data.pilgrimId || data.pilgrimId.trim().length === 0) {
      this.addError('pilgrimId', 'Pilgrim ID is required', 'REQUIRED', data.pilgrimId);
    }

    if (!data.accommodationId || data.accommodationId.trim().length === 0) {
      this.addError(
        'accommodationId',
        'Accommodation ID is required',
        'REQUIRED',
        data.accommodationId
      );
    }

    if (!data.accommodationName || data.accommodationName.trim().length === 0) {
      this.addError(
        'accommodationName',
        'Accommodation name is required',
        'REQUIRED',
        data.accommodationName
      );
    }

    // Date validation
    if (!data.checkInDate || !this.isValidDate(data.checkInDate)) {
      this.addError(
        'checkInDate',
        'Check-in date is required and must be valid',
        'INVALID_DATE',
        data.checkInDate
      );
    }

    if (!data.checkOutDate || !this.isValidDate(data.checkOutDate)) {
      this.addError(
        'checkOutDate',
        'Check-out date is required and must be valid',
        'INVALID_DATE',
        data.checkOutDate
      );
    }

    // Date logic validation
    if (data.checkInDate && data.checkOutDate && data.checkInDate >= data.checkOutDate) {
      this.addError(
        'checkOutDate',
        'Check-out date must be after check-in date',
        'INVALID_DATE_RANGE',
        data.checkOutDate
      );
    }

    if (data.checkInDate && data.checkInDate < new Date()) {
      this.addWarning('checkInDate', 'Check-in date is in the past', 'PAST_DATE', data.checkInDate);
    }

    // Booking details validation
    if (!data.roomType || !['shared', 'private', 'family'].includes(data.roomType)) {
      this.addError(
        'roomType',
        'Please select a valid room type',
        'INVALID_ROOM_TYPE',
        data.roomType
      );
    }

    if (!data.numberOfBeds || data.numberOfBeds < 1 || data.numberOfBeds > 10) {
      this.addError(
        'numberOfBeds',
        'Number of beds must be between 1 and 10',
        'INVALID_BED_COUNT',
        data.numberOfBeds
      );
    }

    // Price validation
    if (!data.pricePerNight || data.pricePerNight < 0) {
      this.addError(
        'pricePerNight',
        'Price per night must be a positive number',
        'INVALID_PRICE',
        data.pricePerNight
      );
    }

    if (!data.totalPrice || data.totalPrice < 0) {
      this.addError(
        'totalPrice',
        'Total price must be a positive number',
        'INVALID_PRICE',
        data.totalPrice
      );
    }

    // Status validation
    if (
      !data.status ||
      !['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled', 'no-show'].includes(
        data.status
      )
    ) {
      this.addError(
        'status',
        'Please select a valid booking status',
        'INVALID_STATUS',
        data.status
      );
    }

    if (
      !data.paymentStatus ||
      !['pending', 'partial', 'paid', 'refunded', 'failed'].includes(data.paymentStatus)
    ) {
      this.addError(
        'paymentStatus',
        'Please select a valid payment status',
        'INVALID_PAYMENT_STATUS',
        data.paymentStatus
      );
    }

    // Confirmation code validation
    if (!data.confirmationCode || data.confirmationCode.length < 6) {
      this.addError(
        'confirmationCode',
        'Confirmation code must be at least 6 characters long',
        'MIN_LENGTH',
        data.confirmationCode
      );
    }

    return this.getValidationResult();
  }
}

/**
 * DTO validators for create operations
 */
export class CreatePilgrimProfileDtoValidator extends BaseValidator<CreatePilgrimProfileDto> {
  validate(data: CreatePilgrimProfileDto): ValidationResult {
    this.reset();

    // Personal info validation
    if (!data.personalInfo) {
      this.addError(
        'personalInfo',
        'Personal information is required',
        'REQUIRED',
        data.personalInfo
      );
    } else {
      const personalInfoValidation = new PersonalInfoValidator().validate(data.personalInfo);
      if (!personalInfoValidation.isValid) {
        this.errors.push(...personalInfoValidation.errors);
      }
    }

    // Languages validation
    if (!data.languages || !Array.isArray(data.languages) || data.languages.length === 0) {
      this.addError(
        'languages',
        'At least one language must be specified',
        'REQUIRED',
        data.languages
      );
    }

    // Experience level validation
    if (
      !data.experienceLevel ||
      !['beginner', 'intermediate', 'advanced', 'expert'].includes(data.experienceLevel)
    ) {
      this.addError(
        'experienceLevel',
        'Please select a valid experience level',
        'INVALID_EXPERIENCE_LEVEL',
        data.experienceLevel
      );
    }

    // Preferred pace validation
    if (!data.preferredPace || !['slow', 'moderate', 'fast'].includes(data.preferredPace)) {
      this.addError(
        'preferredPace',
        'Please select a valid preferred pace',
        'INVALID_PACE',
        data.preferredPace
      );
    }

    // Motivation validation
    if (!data.motivation || data.motivation.trim().length < 10) {
      this.addError(
        'motivation',
        'Please provide a motivation of at least 10 characters',
        'MIN_LENGTH',
        data.motivation
      );
    }

    return this.getValidationResult();
  }
}

/**
 * Utility function to validate all pilgrim data
 */
export function validatePilgrimData(data: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Basic structure validation
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: [
          { field: 'data', message: 'Invalid data format', code: 'INVALID_FORMAT', value: data },
        ],
        warnings: [],
      };
    }

    // Type-specific validation
    if (data.personalInfo) {
      const personalInfoValidation = new PersonalInfoValidator().validate(data.personalInfo);
      if (!personalInfoValidation.isValid) {
        errors.push(...personalInfoValidation.errors);
      }
      warnings.push(...personalInfoValidation.warnings);
    }

    if (data.personalInfo?.emergencyContact) {
      const emergencyContactValidation = new EmergencyContactValidator().validate(
        data.personalInfo.emergencyContact
      );
      if (!emergencyContactValidation.isValid) {
        errors.push(
          ...emergencyContactValidation.errors.map((error) => ({
            ...error,
            field: `emergencyContact.${error.field}`,
          }))
        );
      }
    }

    if (data.personalInfo?.medicalInfo) {
      const medicalInfoValidation = new MedicalInfoValidator().validate(
        data.personalInfo.medicalInfo
      );
      if (!medicalInfoValidation.isValid) {
        errors.push(
          ...medicalInfoValidation.errors.map((error) => ({
            ...error,
            field: `medicalInfo.${error.field}`,
          }))
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          field: 'validation',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          value: error,
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Sanitize input data to prevent XSS and injection attacks
 */
export function sanitizePilgrimData(data: any): any {
  if (typeof data === 'string') {
    return data.trim().replace(/[<>"'&]/g, (match) => {
      const escapeMap: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return escapeMap[match];
    });
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePilgrimData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        sanitized[key] = sanitizePilgrimData(data[key]);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Normalize data for consistent storage
 */
export function normalizePilgrimData(data: any): any {
  const normalized = { ...data };

  // Normalize strings
  if (normalized.personalInfo?.firstName) {
    normalized.personalInfo.firstName = normalized.personalInfo.firstName
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  if (normalized.personalInfo?.lastName) {
    normalized.personalInfo.lastName = normalized.personalInfo.lastName
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  if (normalized.personalInfo?.email) {
    normalized.personalInfo.email = normalized.personalInfo.email.trim().toLowerCase();
  }

  if (normalized.personalInfo?.nationality) {
    normalized.personalInfo.nationality = normalized.personalInfo.nationality
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  // Normalize dates
  if (normalized.personalInfo?.dateOfBirth) {
    normalized.personalInfo.dateOfBirth = new Date(normalized.personalInfo.dateOfBirth);
  }

  // Normalize arrays
  if (normalized.languages) {
    normalized.languages = normalized.languages.map((lang: string) => lang.trim().toLowerCase());
  }

  return normalized;
}
