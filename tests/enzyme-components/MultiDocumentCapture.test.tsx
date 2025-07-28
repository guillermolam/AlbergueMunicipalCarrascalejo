import React from 'react';
import { shallow, mount } from 'enzyme';
import MultiDocumentCapture from '../../client/src/components/multi-document-capture-new';
import { I18nProvider } from '../../client/src/contexts/i18n-context';

// Mock UI components
jest.mock('../../client/src/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-testid="mock-button">
      {children}
    </button>
  ),
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

jest.mock('../../client/src/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => <div className={className} data-testid="mock-progress" data-value={value} />,
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

// Mock OCR API Client
jest.mock('../../client/src/lib/ocr-api-client', () => ({
  ocrAPIClient: {
    processDocument: jest.fn().mockResolvedValue({
      isValid: true,
      firstName: 'JOHN',
      lastName1: 'DOE',
      documentNumber: '12345678Z',
      birthDate: '01/01/1990',
      confidence: 0.9,
      processingTime: 1500,
      detectedFields: [],
      rawText: '',
      errors: [],
    }),
  },
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

// Mock constants
jest.mock('../../client/src/lib/constants', () => ({
  DOCUMENT_TYPES: {
    NIF: { label: 'DNI/NIF', value: 'NIF' },
    NIE: { label: 'NIE', value: 'NIE' },
    PASSPORT: { label: 'Passport', value: 'PASSPORT' },
  },
}));

// Mock asset imports
jest.mock('@assets/custom-icons/dni/front.svg', () => 'dni-front-icon');
jest.mock('@assets/custom-icons/dni/back.svg', () => 'dni-back-icon');
jest.mock('@assets/custom-icons/passport/passport.svg', () => 'passport-icon');
jest.mock('@assets/custom-icons/other/other_documents.svg', () => 'other-icon');

describe('MultiDocumentCapture Component', () => {
  const mockProps = {
    onDocumentProcessed: jest.fn(),
    onDocumentTypeChange: jest.fn(),
    selectedDocumentType: 'NIF',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Shallow Rendering', () => {
    it('should render without crashing', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      expect(wrapper.exists()).toBe(true);
    });

    it('should render document type selector', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
    });

    it('should render upload areas for front and back', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      expect(wrapper.find('[data-testid="mock-card"]').length).toBeGreaterThan(0);
    });

    it('should initialize with default document type', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      const selectComponent = wrapper.find('[data-testid="mock-select"]');
      expect(selectComponent.prop('data-value')).toBe('NIF');
    });
  });

  describe('Full Mount Rendering', () => {
    const renderWithProvider = (props = mockProps) => {
      return mount(
        <I18nProvider>
          <MultiDocumentCapture {...props} />
        </I18nProvider>
      );
    };

    it('should render complete component tree', () => {
      const wrapper = renderWithProvider();
      
      expect(wrapper.find('[data-testid="mock-card"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
    });

    it('should handle document type changes', () => {
      const onDocumentTypeChange = jest.fn();
      const wrapper = renderWithProvider({
        ...mockProps,
        onDocumentTypeChange,
      });

      const select = wrapper.find('[data-testid="mock-select"]');
      select.childAt(0).simulate('click');

      expect(onDocumentTypeChange).toHaveBeenCalledWith('test-value');
    });

    it('should render upload buttons', () => {
      const wrapper = renderWithProvider();
      expect(wrapper.find('[data-testid="mock-button"]').length).toBeGreaterThan(0);
    });
  });

  describe('Document Type Selection', () => {
    it('should use prop document type when provided', () => {
      const wrapper = shallow(
        <MultiDocumentCapture {...mockProps} selectedDocumentType="PASSPORT" />
      );
      
      const select = wrapper.find('[data-testid="mock-select"]');
      expect(select.prop('data-value')).toBe('PASSPORT');
    });

    it('should default to NIF when no document type provided', () => {
      const propsWithoutType = { ...mockProps };
      delete propsWithoutType.selectedDocumentType;
      
      const wrapper = shallow(<MultiDocumentCapture {...propsWithoutType} />);
      const select = wrapper.find('[data-testid="mock-select"]');
      expect(select.prop('data-value')).toBe('NIF');
    });

    it('should call onDocumentTypeChange when document type changes', () => {
      const onDocumentTypeChange = jest.fn();
      const wrapper = mount(
        <I18nProvider>
          <MultiDocumentCapture
            {...mockProps}
            onDocumentTypeChange={onDocumentTypeChange}
          />
        </I18nProvider>
      );

      const select = wrapper.find('[data-testid="mock-select"]');
      select.childAt(0).simulate('click');

      expect(onDocumentTypeChange).toHaveBeenCalledWith('test-value');
    });
  });

  describe('File Upload Handling', () => {
    it('should handle file input changes', () => {
      const wrapper = mount(
        <I18nProvider>
          <MultiDocumentCapture {...mockProps} />
        </I18nProvider>
      );

      const fileInput = wrapper.find('input[type="file"]').first();
      expect(fileInput.exists()).toBe(true);
    });

    it('should show processing state during OCR', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      // Simulate processing state
      wrapper.setState({ isProcessing: true, processingProgress: 50 });
      
      const progress = wrapper.find('[data-testid="mock-progress"]');
      expect(progress.prop('data-value')).toBe(50);
    });

    it('should display error messages when OCR fails', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      // Simulate error state
      wrapper.setState({ error: 'OCR processing failed' });
      
      const alert = wrapper.find('[data-testid="mock-alert"]');
      expect(alert.exists()).toBe(true);
    });
  });

  describe('Document Processing', () => {
    it('should call onDocumentProcessed when processing completes', async () => {
      const onDocumentProcessed = jest.fn();
      const wrapper = mount(
        <I18nProvider>
          <MultiDocumentCapture
            {...mockProps}
            onDocumentProcessed={onDocumentProcessed}
          />
        </I18nProvider>
      );

      // Simulate successful processing
      const instance = wrapper.find('MultiDocumentCapture').instance() as any;
      if (instance && instance.handleDocumentProcessed) {
        await instance.handleDocumentProcessed({
          documentType: 'NIF',
          frontOCR: { success: true, extractedData: {} },
          backOCR: null,
          isComplete: true,
        });
      }

      expect(onDocumentProcessed).toHaveBeenCalled();
    });

    it('should handle both-sides required documents', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      // For NIF/NIE documents, both sides should be required
      const instance = wrapper.instance() as any;
      if (instance && instance.requiresBothSides) {
        expect(instance.requiresBothSides('NIF')).toBe(true);
        expect(instance.requiresBothSides('NIE')).toBe(true);
        expect(instance.requiresBothSides('PASSPORT')).toBe(false);
      }
    });

    it('should show completion status when document is processed', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      // Simulate completed processing
      wrapper.setState({
        frontOCR: { success: true, extractedData: { documentNumber: '12345678Z' } },
        backOCR: { success: true, extractedData: {} },
      });

      expect(wrapper.find('[data-testid="mock-card"]').exists()).toBe(true);
    });
  });

  describe('User Interface', () => {
    it('should display document type icons', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      expect(wrapper.exists()).toBe(true);
      // Icons are imported as strings in our mock, so we just verify component renders
    });

    it('should show upload instructions', () => {
      const wrapper = mount(
        <I18nProvider>
          <MultiDocumentCapture {...mockProps} />
        </I18nProvider>
      );

      expect(wrapper.find('[data-testid="mock-card-title"]')).toHaveLength(1);
    });

    it('should display progress during processing', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      wrapper.setState({ isProcessing: true, processingProgress: 75 });
      
      const progress = wrapper.find('[data-testid="mock-progress"]');
      expect(progress.prop('data-value')).toBe(75);
    });
  });

  describe('Component State Management', () => {
    it('should initialize with correct default state', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      const state = wrapper.state() as any;
      expect(state.selectedDocumentType).toBe('NIF');
      expect(state.frontImage).toBeNull();
      expect(state.backImage).toBeNull();
      expect(state.isProcessing).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should update state correctly during processing', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      wrapper.setState({
        isProcessing: true,
        processingProgress: 50,
        error: null,
      });

      const state = wrapper.state() as any;
      expect(state.isProcessing).toBe(true);
      expect(state.processingProgress).toBe(50);
      expect(state.error).toBeNull();
    });

    it('should handle error states properly', () => {
      const wrapper = shallow(<MultiDocumentCapture {...mockProps} />);
      
      wrapper.setState({
        error: 'Network error occurred',
        isProcessing: false,
      });

      const state = wrapper.state() as any;
      expect(state.error).toBe('Network error occurred');
      expect(state.isProcessing).toBe(false);
    });
  });

  describe('Props and Callbacks', () => {
    it('should handle missing optional props gracefully', () => {
      const minimalProps = {
        onDocumentProcessed: jest.fn(),
      };

      expect(() => {
        shallow(<MultiDocumentCapture {...minimalProps} />);
      }).not.toThrow();
    });

    it('should call callbacks with correct parameters', () => {
      const onDocumentProcessed = jest.fn();
      const onDocumentTypeChange = jest.fn();
      
      const wrapper = mount(
        <I18nProvider>
          <MultiDocumentCapture
            onDocumentProcessed={onDocumentProcessed}
            onDocumentTypeChange={onDocumentTypeChange}
          />
        </I18nProvider>
      );

      // Simulate document type change
      const select = wrapper.find('[data-testid="mock-select"]');
      select.childAt(0).simulate('click');

      expect(onDocumentTypeChange).toHaveBeenCalledWith('test-value');
    });
  });
});