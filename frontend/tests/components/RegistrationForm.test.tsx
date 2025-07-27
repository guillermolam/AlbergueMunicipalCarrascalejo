import React from "react";
import { render, screen } from "@testing-library/react";
import RegistrationForm from "../../src/components/registration-form-zustand";

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

jest.mock("../../src/stores/registration-store", () => ({
  useRegistrationStore: () => mockRegistrationStore,
}));

// Mock UI components
jest.mock("../../src/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="submit-button">
      {children}
    </button>
  ),
}));

jest.mock("../../src/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, name }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      name={name}
      data-testid={`input-${name}`}
    />
  ),
}));

jest.mock("../../src/components/ui/select", () => ({
  Select: ({ children }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../../src/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardFooter: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../../src/components/ui/form", () => ({
  Form: ({ children }: any) => <form>{children}</form>,
  FormField: ({ children }: any) => <div>{children}</div>,
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormControl: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../../src/components/country-phone-input", () => ({
  CountryPhoneInput: ({ value, onChange }: any) => (
    <input
      value={value}
      onChange={onChange}
      data-testid="country-phone-input"
    />
  ),
}));

jest.mock("../../src/components/multi-document-capture", () => ({
  MultiDocumentCapture: () => <div data-testid="document-capture" />,
}));

describe("RegistrationForm Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<RegistrationForm />);
    expect(container).toBeInTheDocument();
  });

  it("should render form sections", () => {
    render(<RegistrationForm />);
    
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(<RegistrationForm />);
    
    expect(screen.getByTestId("submit-button")).toBeInTheDocument();
  });

  it("should render document capture component", () => {
    render(<RegistrationForm />);
    
    expect(screen.getByTestId("document-capture")).toBeInTheDocument();
  });
});