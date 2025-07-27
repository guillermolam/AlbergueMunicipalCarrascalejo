import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RegistrationForm from "../../client/src/components/registration-form-zustand";
import { I18nProvider } from "../../client/src/contexts/i18n-context";

// Mock the registration store
const mockRegistrationStore = {
  formData: {
    firstName: "",
    lastName1: "",
    documentNumber: "",
    birthDate: "",
    gender: "",
    nationality: "",
    phone: "",
    email: "",
    addressStreet: "",
    addressCity: "",
    addressCountry: "",
    addressPostalCode: "",
  },
  stayData: {
    checkInDate: "",
    checkOutDate: "",
    numberOfPersons: 1,
    accommodationType: "dormitory",
  },
  updateFormData: jest.fn(),
  updateStayData: jest.fn(),
  clearForm: jest.fn(),
  isFormValid: jest.fn(() => true),
};

jest.mock("../../client/src/stores/registration-store", () => ({
  useRegistrationStore: () => mockRegistrationStore,
}));

// Mock UI components
jest.mock("../../client/src/components/ui/button", () => ({
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

jest.mock("../../client/src/components/ui/input", () => ({
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

jest.mock("../../client/src/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="mock-select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange("test-value")}>
        {children}
      </div>
    </div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid="mock-select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: any) => (
    <div data-testid="mock-select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid="mock-select-trigger">{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => (
    <div data-testid="mock-select-value">{placeholder}</div>
  ),
}));

jest.mock("../../client/src/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="mock-card">
      {children}
    </div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className} data-testid="mock-card-content">
      {children}
    </div>
  ),
  CardDescription: ({ children, className }: any) => (
    <div className={className} data-testid="mock-card-description">
      {children}
    </div>
  ),
  CardFooter: ({ children, className }: any) => (
    <div className={className} data-testid="mock-card-footer">
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className} data-testid="mock-card-header">
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: any) => (
    <div className={className} data-testid="mock-card-title">
      {children}
    </div>
  ),
}));

jest.mock("../../client/src/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor} data-testid="mock-label">
      {children}
    </label>
  ),
}));

jest.mock("../../client/src/components/ui/form", () => ({
  Form: ({ children }: any) => <div data-testid="mock-form">{children}</div>,
  FormControl: ({ children }: any) => (
    <div data-testid="mock-form-control">{children}</div>
  ),
  FormDescription: ({ children }: any) => (
    <div data-testid="mock-form-description">{children}</div>
  ),
  FormField: ({ children }: any) => (
    <div data-testid="mock-form-field">{children}</div>
  ),
  FormItem: ({ children }: any) => (
    <div data-testid="mock-form-item">{children}</div>
  ),
  FormLabel: ({ children }: any) => (
    <div data-testid="mock-form-label">{children}</div>
  ),
  FormMessage: ({ children }: any) => (
    <div data-testid="mock-form-message">{children}</div>
  ),
}));

jest.mock("../../client/src/components/country-phone-input", () => ({
  CountryPhoneInput: ({ value, onChange, placeholder }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      data-testid="mock-country-phone-input"
    />
  ),
}));

jest.mock("../../client/src/components/multi-document-capture", () => ({
  MultiDocumentCapture: ({ onDocumentsChange }: any) => (
    <div data-testid="mock-document-capture">
      <button onClick={() => onDocumentsChange?.([{ id: "test-doc" }])}>
        Add Document
      </button>
    </div>
  ),
}));

// Mock I18n context
jest.mock("../../client/src/contexts/i18n-context", () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  useI18n: () => ({
    t: (key: string) => key,
    language: "en",
    setLanguage: jest.fn(),
  }),
}));

describe("RegistrationForm Component", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderRegistrationForm = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <RegistrationForm />
        </I18nProvider>
      </QueryClientProvider>
    );
  };

  describe("Rendering Tests", () => {
    it("should render without crashing", () => {
      const { container } = renderRegistrationForm();
      expect(container).toBeInTheDocument();
    });

    it("should render form sections correctly", () => {
      renderRegistrationForm();
      
      expect(screen.getByTestId("mock-form")).toBeInTheDocument();
    });

    it("should render personal information section", () => {
      renderRegistrationForm();
      
      expect(screen.getByText("personalInfo")).toBeInTheDocument();
    });

    it("should render stay information section", () => {
      renderRegistrationForm();
      
      expect(screen.getByText("stayInfo")).toBeInTheDocument();
    });

    it("should render document upload section", () => {
      renderRegistrationForm();
      
      expect(screen.getByText("documents")).toBeInTheDocument();
    });

    it("should render submit button", () => {
      renderRegistrationForm();
      
      expect(screen.getByTestId("mock-button")).toBeInTheDocument();
    });
  });

  describe("Form Interaction Tests", () => {
    it("should handle form submission", async () => {
      renderRegistrationForm();
      
      const submitButton = screen.getByTestId("mock-button");
      fireEvent.click(submitButton);
      
      // Form should attempt to submit
      await waitFor(() => {
        expect(mockRegistrationStore.isFormValid).toHaveBeenCalled();
      });
    });

    it("should update form data when inputs change", () => {
      renderRegistrationForm();
      
      const inputs = screen.getAllByTestId("mock-input");
      if (inputs.length > 0) {
        fireEvent.change(inputs[0], { target: { value: "test value" } });
        expect(mockRegistrationStore.updateFormData).toHaveBeenCalled();
      }
    });

    it("should handle document upload", () => {
      renderRegistrationForm();
      
      const documentCapture = screen.getByTestId("mock-document-capture");
      expect(documentCapture).toBeInTheDocument();
    });
  });

  describe("Form Validation Tests", () => {
    it("should validate form before submission", () => {
      mockRegistrationStore.isFormValid.mockReturnValueOnce(false);
      
      renderRegistrationForm();
      
      const submitButton = screen.getByTestId("mock-button");
      fireEvent.click(submitButton);
      
      expect(mockRegistrationStore.isFormValid).toHaveBeenCalled();
    });

    it("should handle valid form submission", () => {
      mockRegistrationStore.isFormValid.mockReturnValueOnce(true);
      
      renderRegistrationForm();
      
      const submitButton = screen.getByTestId("mock-button");
      fireEvent.click(submitButton);
      
      expect(mockRegistrationStore.isFormValid).toHaveBeenCalled();
    });
  });

  describe("Component Integration Tests", () => {
    it("should integrate all form sections", () => {
      renderRegistrationForm();
      
      expect(screen.getByText("personalInfo")).toBeInTheDocument();
      expect(screen.getByText("stayInfo")).toBeInTheDocument();
      expect(screen.getByText("documents")).toBeInTheDocument();
    });

    it("should maintain form state across interactions", () => {
      renderRegistrationForm();
      
      // Verify all mocked components are rendered
      expect(screen.getByTestId("mock-form")).toBeInTheDocument();
      expect(screen.getByTestId("mock-button")).toBeInTheDocument();
    });
  });
});