import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CountryPhoneInput } from "../../src/components/country-phone-input";

// Mock react-icons
jest.mock("react-icons/fi", () => ({
  FiPhone: () => <div data-testid="phone-icon">Phone Icon</div>,
}));

// Mock UI components
jest.mock("../../src/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, type }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      data-testid="input"
    />
  ),
}));

jest.mock("../../src/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange("+34")}>
        {children}
      </div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

// Mock use-react-countries
jest.mock("use-react-countries", () => ({
  useCountries: () => ({
    countries: [
      {
        name: "Spain",
        country: "ES",
        callingCode: ["34"],
        flag: "🇪🇸",
      },
      {
        name: "United States",
        country: "US",
        callingCode: ["1"],
        flag: "🇺🇸",
      },
    ],
  }),
}));

describe("CountryPhoneInput Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(
      <CountryPhoneInput value="" onChange={jest.fn()} />
    );
    expect(container).toBeInTheDocument();
  });

  it("should render phone icon", () => {
    render(<CountryPhoneInput value="" onChange={jest.fn()} />);
    
    expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
  });

  it("should render country select", () => {
    render(<CountryPhoneInput value="" onChange={jest.fn()} />);
    
    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("should render phone input", () => {
    render(<CountryPhoneInput value="" onChange={jest.fn()} />);
    
    expect(screen.getByTestId("input")).toBeInTheDocument();
  });

  it("should handle value prop correctly", () => {
    const mockOnChange = jest.fn();
    render(<CountryPhoneInput value="123456789" onChange={mockOnChange} />);
    
    const input = screen.getByTestId("input") as HTMLInputElement;
    expect(input.value).toBe("123456789");
  });

  it("should handle onChange callback", () => {
    const mockOnChange = jest.fn();
    render(<CountryPhoneInput value="" onChange={mockOnChange} />);
    
    const input = screen.getByTestId("input");
    fireEvent.change(input, { target: { value: "123456789" } });
    
    expect(mockOnChange).toHaveBeenCalled();
  });
});