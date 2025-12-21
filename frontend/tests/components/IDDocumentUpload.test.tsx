import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { IDDocumentUpload } from "../../apps/booking/src/components/IDDocumentUpload";

// Mock fetch for OCR API
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn();

const createMockFile = (name: string, type: string, size: number = 1024) => {
  const file = new File(["test"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("IDDocumentUpload", () => {
  const mockOnOCRComplete = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders document type selector", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    expect(screen.getByText("Tipo de documento")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows DNI/NIF option by default", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("DNI");
  });

  it("shows front and back upload areas for DNI", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    expect(screen.getByText("Parte frontal")).toBeInTheDocument();
    expect(screen.getByText("Parte trasera")).toBeInTheDocument();
  });

  it("shows only front upload area for passport", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "PASSPORT" } });

    expect(screen.getByText("Parte frontal")).toBeInTheDocument();
    expect(screen.queryByText("Parte trasera")).not.toBeInTheDocument();
  });

  it("handles file upload for front side", async () => {
    const file = createMockFile("test.jpg", "image/jpeg");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documentType: "DNI",
        documentNumber: "12345678A",
        firstName: "Juan",
        lastName: "García",
        birthDate: "1990-01-01",
        expiryDate: "2030-01-01",
        nationality: "ES",
        confidence: 0.95,
      }),
    });

    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/ocr/scan",
        expect.any(Object),
      );
    });
  });

  it("validates file size", () => {
    render(
      <IDDocumentUpload
        onOCRComplete={mockOnOCRComplete}
        onError={mockOnError}
      />,
    );

    const largeFile = createMockFile(
      "large.jpg",
      "image/jpeg",
      6 * 1024 * 1024,
    );
    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(
      screen.getByText("El archivo es demasiado grande. Máximo 5MB."),
    ).toBeInTheDocument();
  });

  it("validates file extensions", () => {
    render(
      <IDDocumentUpload
        onOCRComplete={mockOnOCRComplete}
        onError={mockOnError}
      />,
    );

    const invalidFile = createMockFile("test.txt", "text/plain");
    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(screen.getByText(/Formato no válido/)).toBeInTheDocument();
  });

  it("handles camera capture", async () => {
    const file = createMockFile("camera.jpg", "image/jpeg");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documentType: "DNI",
        documentNumber: "12345678A",
        firstName: "Juan",
        lastName: "García",
        birthDate: "1990-01-01",
        expiryDate: "2030-01-01",
        nationality: "ES",
        confidence: 0.95,
      }),
    });

    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const cameraButton = screen.getAllByText("Cámara")[0];
    const cameraInput = cameraButton
      .closest("button")
      ?.nextElementSibling?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;

    fireEvent.change(cameraInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("shows OCR results when processing is complete", async () => {
    const file = createMockFile("test.jpg", "image/jpeg");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documentType: "DNI",
        documentNumber: "12345678A",
        firstName: "Juan",
        lastName: "García",
        birthDate: "1990-01-01",
        expiryDate: "2030-01-01",
        nationality: "ES",
        confidence: 0.95,
      }),
    });

    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText("Datos extraídos")).toBeInTheDocument();
      expect(screen.getByText("12345678A")).toBeInTheDocument();
      expect(screen.getByText("Juan García")).toBeInTheDocument();
    });
  });

  it("handles OCR API errors", async () => {
    render(
      <IDDocumentUpload
        onOCRComplete={mockOnOCRComplete}
        onError={mockOnError}
      />,
    );

    const file = createMockFile("test.jpg", "image/jpeg");
    mockFetch.mockRejectedValueOnce(new Error("API Error"));

    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText("Error al procesar el documento"),
      ).toBeInTheDocument();
      expect(mockOnError).toHaveBeenCalledWith(
        "Error al procesar el documento",
      );
    });
  });

  it("clears data when document type changes", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    // Upload a file first
    const file = createMockFile("test.jpg", "image/jpeg");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documentType: "DNI",
        documentNumber: "12345678A",
        firstName: "Juan",
        lastName: "García",
        birthDate: "1990-01-01",
        expiryDate: "2030-01-01",
        nationality: "ES",
        confidence: 0.95,
      }),
    });

    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    // Change document type
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "PASSPORT" } });

    // Should clear the OCR results
    expect(screen.queryByText("Datos extraídos")).not.toBeInTheDocument();
  });

  it("shows correct file extensions for OTHER document type", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "OTHER" } });

    expect(screen.getByText("Formatos: .pdf, .doc, .docx")).toBeInTheDocument();
  });

  it("allows removing uploaded images", () => {
    render(<IDDocumentUpload onOCRComplete={mockOnOCRComplete} />);

    const file = createMockFile("test.jpg", "image/jpeg");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documentType: "DNI",
        documentNumber: "12345678A",
        firstName: "Juan",
        lastName: "García",
        birthDate: "1990-01-01",
        expiryDate: "2030-01-01",
        nationality: "ES",
        confidence: 0.95,
      }),
    });

    const input = screen
      .getAllByText("Subir")[0]
      .closest("button")
      ?.nextElementSibling?.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText("Eliminar")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Eliminar"));

    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });
});
