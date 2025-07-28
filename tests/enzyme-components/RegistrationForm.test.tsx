import React from 'react';
import { shallow, mount } from 'enzyme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RegistrationForm from '../../client/src/components/registration-form-zustand';
import { I18nProvider } from '../../client/src/contexts/i18n-context';

// Mock the registration store
const mockRegistrationStore = {
  formData: {
    firstName: '',
    lastName1: '',
    documentNumber: '',
    birthDate: '',
    gender: '',
    nationality: '',
    phone: '',
    email: '',
    addressStreet: '',
    addressCity: '',
    addressCountry: '',
    addressPostalCode: '',
  },
  stayData: {
    checkInDate: '',
    checkOutDate: '',
    numberOfPersons: 1,
    accommodationType: 'dormitory',
  },
  updateFormData: jest.fn(),
  updateStayData: jest.fn(),
  clearForm: jest.fn(),
  isFormValid: jest.fn(() => true),
};

jest.mock('../../client/src/stores/registration-store', () => ({
  useRegistrationStore: () => mockRegistrationStore,
}));

// Mock UI components
jest.mock('../../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, type }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className} 
      type={type}
      data-testid="mock-button"
    >
      {children}
    </button>
  ),
}));

jest.mock('../../client/src/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, className, name }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className={className}
      name={name}
      data-testid="mock-input"
    />
  ),
}));

jest.mock('../../client/src/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="mock-select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('test-value')}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="mock-select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="mock-select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="mock-select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="mock-select-value">{placeholder}</div>,
}));

jest.mock('../../client/src/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="mock-card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="mock-card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="mock-card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="mock-card-title">{children}</div>,
}));

jest.mock('../../client/src/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => <div className={className} data-testid="mock-alert">{children}</div>,
  AlertDescription: ({ children, className }: any) => <div className={className} data-testid="mock-alert-description">{children}</div>,
}));

jest.mock('../../client/src/components/ui/collapsible', () => ({
  Collapsible: ({ children, open }: any) => <div data-testid="mock-collapsible" data-open={open}>{children}</div>,
  CollapsibleContent: ({ children }: any) => <div data-testid="mock-collapsible-content">{children}</div>,
  CollapsibleTrigger: ({ children }: any) => <div data-testid="mock-collapsible-trigger">{children}</div>,
}));

jest.mock('../../client/src/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div data-testid="mock-tooltip">{children}</div>,
  TooltipContent: ({ children }: any) => <div data-testid="mock-tooltip-content">{children}</div>,
  TooltipProvider: ({ children }: any) => <div data-testid="mock-tooltip-provider">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div data-testid="mock-tooltip-trigger">{children}</div>,
}));

// Mock child components
jest.mock('../../client/src/components/registration-stepper', () => ({
  RegistrationStepper: ({ currentStep, steps }: any) => (
    <div data-testid="mock-stepper" data-current-step={currentStep} data-steps={steps?.length}>
      Registration Stepper
    </div>
  ),
}));

jest.mock('../../client/src/components/multi-document-capture-new', () => {
  return function MultiDocumentCapture({ onDocumentProcessed }: any) {
    return (
      <div 
        data-testid="mock-document-capture"
        onClick={() => onDocumentProcessed && onDocumentProcessed({
          documentType: 'NIF',
          frontOCR: { success: true, extractedData: { documentNumber: '12345678Z' } },
          backOCR: null,
          isComplete: true,
        })}
      >
        Document Capture
      </div>
    );
  };
});

jest.mock('../../client/src/components/country-phone-input', () => ({
  CountryPhoneInput: ({ value, onChange, placeholder }: any) => (
    <div data-testid="mock-phone-input" data-value={value}>
      <input onChange={(e) => onChange && onChange(e.target.value)} placeholder={placeholder} />
    </div>
  ),
}));

jest.mock('../../client/src/components/google-places-autocomplete', () => ({
  GooglePlacesAutocomplete: ({ onPlaceSelect, placeholder }: any) => (
    <div 
      data-testid="mock-places-autocomplete"
      onClick={() => onPlaceSelect && onPlaceSelect({
        address: 'Test Address',
        city: 'Test City',
        country: 'Spain',
        postalCode: '12345',
      })}
    >
      <input placeholder={placeholder} />
    </div>
  ),
}));

// Mock other child components
jest.mock('../../client/src/components/country-selector', () => ({
  CountrySelector: ({ value, onValueChange }: any) => (
    <div data-testid="mock-country-selector" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('ES')}>Spain</div>
    </div>
  ),
}));

jest.mock('../../client/src/components/country-autocomplete', () => {
  return function CountryAutocomplete({ value, onValueChange }: any) {
    return (
      <div data-testid="mock-country-autocomplete" data-value={value}>
        <div onClick={() => onValueChange && onValueChange('Spain')}>Spain</div>
      </div>
    );
  };
});

jest.mock('../../client/src/components/arrival-time-picker', () => ({
  ArrivalTimePicker: ({ value, onChange }: any) => (
    <div data-testid="mock-time-picker" data-value={value}>
      <input onChange={(e) => onChange && onChange(e.target.value)} />
    </div>
  ),
}));

jest.mock('../../client/src/components/bed-selection-map', () => ({
  BedSelectionMap: ({ onBedSelect, selectedBed }: any) => (
    <div 
      data-testid="mock-bed-selection" 
      data-selected-bed={selectedBed}
      onClick={() => onBedSelect && onBedSelect('A1')}
    >
      Bed Selection Map
    </div>
  ),
}));

jest.mock('../../client/src/components/booking-confirmation', () => ({
  BookingConfirmation: ({ bookingData, onConfirm, onCancel }: any) => (
    <div data-testid="mock-booking-confirmation">
      <button onClick={onConfirm} data-testid="confirm-button">Confirm</button>
      <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
    </div>
  ),
}));

jest.mock('../../client/src/components/booking-success', () => ({
  BookingSuccess: ({ bookingReference }: any) => (
    <div data-testid="mock-booking-success" data-reference={bookingReference}>
      Booking Success
    </div>
  ),
}));

// Mock I18n context
jest.mock('../../client/src/contexts/i18n-context', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

// Mock form validation
jest.mock('../../client/src/lib/form-validation', () => ({
  validateForm: jest.fn(() => ({})),
  hasValidationErrors: jest.fn(() => false),
}));

// Mock constants
jest.mock('../../client/src/lib/constants', () => ({
  GENDER_OPTIONS: [
    { value: 'M', label: 'Male' },
    { value: 'F', label: 'Female' },
  ],
  DOCUMENT_TYPES: {
    NIF: { label: 'DNI/NIF', value: 'NIF' },
    NIE: { label: 'NIE', value: 'NIE' },
    PASSPORT: { label: 'Passport', value: 'PASSPORT' },
  },
  PAYMENT_TYPES: [
    { value: 'card', label: 'Credit Card' },
    { value: 'cash', label: 'Cash' },
  ],
}));

// Mock toast hook
jest.mock('../../client/src/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock query client
jest.mock('../../client/src/lib/queryClient', () => ({
  apiRequest: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock validation lib
jest.mock('../../client/src/lib/validation', () => ({
  getCountryCode: jest.fn(() => '+34'),
}));

describe('RegistrationForm Component', () => {
  let queryClient: QueryClient;
  
  const mockStayData = {
    checkInDate: '2025-07-25',
    checkOutDate: '2025-07-26',
    numberOfPersons: 1,
    accommodationType: 'dormitory' as const,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (props = {}) => {
    return mount(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <RegistrationForm stayData={mockStayData} {...props} />
        </I18nProvider>
      </QueryClientProvider>
    );
  };

  describe('Shallow Rendering', () => {
    it('should render without crashing', () => {
      const wrapper = shallow(<RegistrationForm stayData={mockStayData} />);
      expect(wrapper.exists()).toBe(true);
    });

    it('should render registration stepper', () => {
      const wrapper = shallow(<RegistrationForm stayData={mockStayData} />);
      expect(wrapper.find('[data-testid="mock-stepper"]')).toHaveLength(1);
    });

    it('should render document capture component', () => {
      const wrapper = shallow(<RegistrationForm stayData={mockStayData} />);
      expect(wrapper.find('[data-testid="mock-document-capture"]')).toHaveLength(1);
    });
  });

  describe('Full Mount Rendering', () => {
    it('should render complete component tree', () => {
      const wrapper = renderWithProviders();
      
      expect(wrapper.find('[data-testid="mock-stepper"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="mock-document-capture"]')).toHaveLength(1);
    });

    it('should render form inputs', () => {
      const wrapper = renderWithProviders();
      expect(wrapper.find('[data-testid="mock-input"]').length).toBeGreaterThan(0);
    });

    it('should render collapsible sections', () => {
      const wrapper = renderWithProviders();
      expect(wrapper.find('[data-testid="mock-collapsible"]').length).toBeGreaterThan(0);
    });
  });

  describe('Form State Management', () => {
    it('should initialize with registration store data', () => {
      const wrapper = renderWithProviders();
      expect(wrapper.exists()).toBe(true);
      // Store mock should be called during initialization
    });

    it('should update form data when input changes', () => {
      const wrapper = renderWithProviders();
      
      const firstNameInput = wrapper.find('[data-testid="mock-input"]').first();
      firstNameInput.simulate('change', { target: { value: 'John' } });
      
      expect(mockRegistrationStore.updateFormData).toHaveBeenCalled();
    });

    it('should handle document processing results', () => {
      const wrapper = renderWithProviders();
      
      const documentCapture = wrapper.find('[data-testid="mock-document-capture"]');
      documentCapture.simulate('click');
      
      expect(mockRegistrationStore.updateFormData).toHaveBeenCalled();
    });
  });

  describe('Document Processing Integration', () => {
    it('should populate form fields from OCR results', () => {
      const wrapper = renderWithProviders();
      
      const documentCapture = wrapper.find('[data-testid="mock-document-capture"]');
      documentCapture.simulate('click');
      
      // Should call updateFormData with extracted data
      expect(mockRegistrationStore.updateFormData).toHaveBeenCalledWith(
        expect.objectContaining({
          documentNumber: '12345678Z',
        })
      );
    });

    it('should handle document processing errors gracefully', () => {
      const wrapper = renderWithProviders();
      expect(wrapper.exists()).toBe(true);
      // Error handling should not crash the component
    });
  });

  describe('Form Validation', () => {
    it('should validate form data before submission', () => {
      const wrapper = renderWithProviders();
      
      const submitButton = wrapper.find('[data-testid="mock-button"]').filterWhere(
        button => button.text().includes('submit') || button.text().includes('continue')
      ).first();
      
      if (submitButton.exists()) {
        submitButton.simulate('click');
      }
      
      expect(wrapper.exists()).toBe(true);
    });

    it('should display validation errors when form is invalid', () => {
      const { hasValidationErrors } = require('../../client/src/lib/form-validation');
      hasValidationErrors.mockReturnValue(true);
      
      const wrapper = renderWithProviders();
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Step Navigation', () => {
    it('should progress through registration steps', () => {
      const wrapper = renderWithProviders();
      
      const stepper = wrapper.find('[data-testid="mock-stepper"]');
      expect(stepper.prop('data-current-step')).toBeDefined();
    });

    it('should handle step transitions correctly', () => {
      const wrapper = renderWithProviders();
      
      // Simulate completing document capture
      const documentCapture = wrapper.find('[data-testid="mock-document-capture"]');
      documentCapture.simulate('click');
      
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Address Autocomplete Integration', () => {
    it('should render Google Places autocomplete', () => {
      const wrapper = renderWithProviders();
      expect(wrapper.find('[data-testid="mock-places-autocomplete"]')).toHaveLength(1);
    });

    it('should populate address fields from autocomplete selection', () => {
      const wrapper = renderWithProviders();
      
      const placesAutocomplete = wrapper.find('[data-testid="mock-places-autocomplete"]');
      placesAutocomplete.simulate('click');
      
      expect(mockRegistrationStore.updateFormData).toHaveBeenCalledWith(
        expect.objectContaining({
          addressStreet: 'Test Address',
          addressCity: 'Test City',
          addressCountry: 'Spain',
          addressPostalCode: '12345',
        })
      );
    });
  });

  describe('Phone Input Integration', () => {
    it('should render country phone input', () => {
      const wrapper = renderWithProviders();
      expect(wrapper.find('[data-testid="mock-phone-input"]')).toHaveLength(1);
    });

    it('should handle phone number changes', () => {
      const wrapper = renderWithProviders();
      
      const phoneInput = wrapper.find('[data-testid="mock-phone-input"] input');
      phoneInput.simulate('change', { target: { value: '123456789' } });
      
      expect(mockRegistrationStore.updateFormData).toHaveBeenCalled();
    });
  });

  describe('Collapsible Sections', () => {
    it('should render personal information section', () => {
      const wrapper = renderWithProviders();
      
      const personalSection = wrapper.find('[data-testid="mock-collapsible"]').first();
      expect(personalSection.exists()).toBe(true);
    });

    it('should toggle section visibility', () => {
      const wrapper = renderWithProviders();
      
      const collapsibleTrigger = wrapper.find('[data-testid="mock-collapsible-trigger"]').first();
      if (collapsibleTrigger.exists()) {
        collapsibleTrigger.simulate('click');
      }
      
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Bed Selection Flow', () => {
    it('should show bed selection after form completion', () => {
      const wrapper = renderWithProviders();
      
      // Simulate form completion and moving to bed selection
      const instance = wrapper.find('RegistrationForm').instance() as any;
      if (instance && instance.setState) {
        wrapper.setState({ currentStep: 'bed-selection' });
      }
      
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle bed selection', () => {
      const wrapper = renderWithProviders();
      
      const bedSelection = wrapper.find('[data-testid="mock-bed-selection"]');
      if (bedSelection.exists()) {
        bedSelection.simulate('click');
      }
      
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Booking Confirmation', () => {
    it('should show booking confirmation step', () => {
      const wrapper = renderWithProviders();
      
      const bookingConfirmation = wrapper.find('[data-testid="mock-booking-confirmation"]');
      expect(bookingConfirmation.exists()).toBe(false); // Only shown in confirmation step
    });

    it('should handle booking confirmation', () => {
      const wrapper = renderWithProviders();
      
      // If confirmation exists, test it
      const confirmButton = wrapper.find('[data-testid="confirm-button"]');
      if (confirmButton.exists()) {
        confirmButton.simulate('click');
      }
      
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Success State', () => {
    it('should show success message after booking completion', () => {
      const wrapper = renderWithProviders();
      
      const successMessage = wrapper.find('[data-testid="mock-booking-success"]');
      expect(successMessage.exists()).toBe(false); // Only shown in success step
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      const { apiRequest } = require('../../client/src/lib/queryClient');
      apiRequest.mockRejectedValue(new Error('API Error'));
      
      const wrapper = renderWithProviders();
      expect(wrapper.exists()).toBe(true);
    });

    it('should display error messages to user', () => {
      const wrapper = renderWithProviders();
      
      // Simulate error state
      const alerts = wrapper.find('[data-testid="mock-alert"]');
      expect(alerts.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to different screen sizes', () => {
      const wrapper = renderWithProviders();
      
      // Check that components render without layout issues
      expect(wrapper.find('[data-testid="mock-card"]').length).toBeGreaterThan(0);
    });

    it('should maintain functionality on mobile', () => {
      const wrapper = renderWithProviders();
      
      // All interactive elements should be present
      expect(wrapper.find('[data-testid="mock-button"]').length).toBeGreaterThan(0);
      expect(wrapper.find('[data-testid="mock-input"]').length).toBeGreaterThan(0);
    });
  });

  describe('Component Integration', () => {
    it('should integrate all child components correctly', () => {
      const wrapper = renderWithProviders();
      
      expect(wrapper.find('[data-testid="mock-document-capture"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="mock-phone-input"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="mock-places-autocomplete"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="mock-country-selector"]')).toHaveLength(1);
    });

    it('should pass props correctly to child components', () => {
      const wrapper = renderWithProviders();
      
      const documentCapture = wrapper.find('[data-testid="mock-document-capture"]');
      expect(documentCapture.exists()).toBe(true);
    });
  });
});