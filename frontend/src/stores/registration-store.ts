// Original registration store from client/ - exact restoration
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RegistrationFormData {
  // Personal Information (Step 1)
  firstName: string;
  lastName1: string;
  lastName2?: string;
  documentType: 'dni' | 'nie' | 'passport';
  documentNumber: string;
  birthDate: string;
  nationality: string;
  
  // Contact Information (Step 2)
  email: string;
  phone: string;
  
  // Arrival Information (Step 3)
  estimatedArrivalTime?: string;
  paymentType: 'cash' | 'card' | 'bizum';
  
  // Document Images (Step 4)
  documentFrontImage?: string; // base64
  documentBackImage?: string; // base64
  
  // Internal validation state
  isValidated: boolean;
  validationErrors: Record<string, string>;
}

export interface RegistrationState {
  // Form data
  formData: RegistrationFormData;
  
  // Step management
  currentStep: number;
  completedSteps: number[];
  
  // Stay information
  stayData?: {
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    guests: number;
  };
  
  // Bed selection
  selectedBedId?: number;
  bedInfo?: {
    roomName: string;
    bedNumber: number;
    position: 'top' | 'bottom';
    bunkNumber: number;
  };
  
  // Submission state
  isSubmitting: boolean;
  bookingReference?: string;
  
  // Actions
  updateFormData: (data: Partial<RegistrationFormData>) => void;
  setCurrentStep: (step: number) => void;
  markStepCompleted: (step: number) => void;
  setStayData: (data: RegistrationState['stayData']) => void;
  setBedSelection: (bedId: number, bedInfo: RegistrationState['bedInfo']) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setBookingReference: (reference: string) => void;
  resetRegistration: () => void;
  validateStep: (step: number) => boolean;
}

const initialFormData: RegistrationFormData = {
  firstName: '',
  lastName1: '',
  lastName2: '',
  documentType: 'dni',
  documentNumber: '',
  birthDate: '',
  nationality: '',
  email: '',
  phone: '',
  estimatedArrivalTime: '',
  paymentType: 'card',
  documentFrontImage: '',
  documentBackImage: '',
  isValidated: false,
  validationErrors: {}
};

export const useRegistrationStore = create<RegistrationState>()(
  persist(
    (set, get) => ({
      formData: initialFormData,
      currentStep: 0, // Start at step 0 (stay info)
      completedSteps: [],
      stayData: undefined,
      selectedBedId: undefined,
      bedInfo: undefined,
      isSubmitting: false,
      bookingReference: undefined,

      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data }
        })),

      setCurrentStep: (step) =>
        set({ currentStep: step }),

      markStepCompleted: (step) =>
        set((state) => ({
          completedSteps: [...new Set([...state.completedSteps, step])]
        })),

      setStayData: (data) =>
        set({ stayData: data }),

      setBedSelection: (bedId, bedInfo) =>
        set({ selectedBedId: bedId, bedInfo }),

      setSubmitting: (isSubmitting) =>
        set({ isSubmitting }),

      setBookingReference: (reference) =>
        set({ bookingReference: reference }),

      resetRegistration: () =>
        set({
          formData: initialFormData,
          currentStep: 0,
          completedSteps: [],
          stayData: undefined,
          selectedBedId: undefined,
          bedInfo: undefined,
          isSubmitting: false,
          bookingReference: undefined
        }),

      validateStep: (step) => {
        const { formData, stayData, selectedBedId } = get();
        
        switch (step) {
          case 0: // Stay info
            return !!(stayData?.checkInDate && stayData?.checkOutDate && stayData?.nights);
          
          case 1: // Personal info
            return !!(
              formData.firstName &&
              formData.lastName1 &&
              formData.documentType &&
              formData.documentNumber &&
              formData.birthDate &&
              formData.nationality
            );
          
          case 2: // Contact info
            return !!(formData.email && formData.phone);
          
          case 3: // Arrival info
            return !!(formData.estimatedArrivalTime && formData.paymentType);
          
          case 4: // Document validation
            return !!(formData.documentFrontImage && formData.documentBackImage && formData.isValidated);
          
          case 5: // Bed selection
            return !!selectedBedId;
          
          case 6: // Confirmation
            return true;
          
          default:
            return false;
        }
      }
    }),
    {
      name: 'registration-store',
      partialize: (state) => ({
        formData: state.formData,
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        stayData: state.stayData,
        selectedBedId: state.selectedBedId,
        bedInfo: state.bedInfo
      })
    }
  )
);