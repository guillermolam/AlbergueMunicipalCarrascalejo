import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiDocumentCapture from "../../src/components/multi-document-capture-new";

// Mock UI components
jest.mock("../../src/components/ui/button", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
}));

jest.mock("../../src/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h2>{children}</h2>,
}));

jest.mock("../../src/components/ui/alert", () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

jest.mock("../../src/components/ui/progress", () => ({
  Progress: ({ value }: any) => <div data-testid="progress" data-value={value} />,
}));

describe("MultiDocumentCapture Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render without crashing", () => {
    const { container } = render(<MultiDocumentCapture onDocumentsChange={jest.fn()} />);
    expect(container).toBeInTheDocument();
  });

  it("should render card structure", () => {
    render(<MultiDocumentCapture onDocumentsChange={jest.fn()} />);
    
    expect(screen.getByTestId("card")).toBeInTheDocument();
  });

  it("should render upload button", () => {
    render(<MultiDocumentCapture onDocumentsChange={jest.fn()} />);
    
    expect(screen.getByTestId("button")).toBeInTheDocument();
  });

  it("should handle documents change callback", () => {
    const mockOnDocumentsChange = jest.fn();
    render(<MultiDocumentCapture onDocumentsChange={mockOnDocumentsChange} />);
    
    expect(mockOnDocumentsChange).not.toHaveBeenCalled();
  });
});