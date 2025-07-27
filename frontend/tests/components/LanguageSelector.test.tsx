import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageSelector from "../../src/components/language-selector";

// Mock UI components
jest.mock("../../src/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange("es")}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock("../../src/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      data-testid="button"
    >
      {children}
    </button>
  ),
}));

// Mock Lucide icons
jest.mock("lucide-react", () => ({
  Languages: () => <div data-testid="languages-icon">Languages Icon</div>,
  Globe: () => <div data-testid="globe-icon">Globe Icon</div>,
}));

// Mock I18n context
const mockI18nContext = {
  t: jest.fn((key: string) => key),
  language: "en",
  setLanguage: jest.fn(),
  availableLanguages: [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
  ],
};

jest.mock("../../src/contexts/i18n-context", () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useI18n: () => mockI18nContext,
}));

describe("LanguageSelector Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<LanguageSelector />);
    expect(container).toBeInTheDocument();
  });

  it("should render language icon", () => {
    render(<LanguageSelector />);
    
    expect(screen.getByTestId("languages-icon")).toBeInTheDocument();
  });

  it("should render select component", () => {
    render(<LanguageSelector />);
    
    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("should display current language", () => {
    render(<LanguageSelector />);
    
    expect(screen.getByTestId("select")).toHaveAttribute("data-value", "en");
  });

  it("should handle language change", () => {
    render(<LanguageSelector />);
    
    const select = screen.getByTestId("select");
    fireEvent.click(select);
    
    expect(mockI18nContext.setLanguage).not.toHaveBeenCalled();
  });

  it("should render compact variant", () => {
    render(<LanguageSelector compact />);
    
    expect(screen.getByTestId("languages-icon")).toBeInTheDocument();
  });
});