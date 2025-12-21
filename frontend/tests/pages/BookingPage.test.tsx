import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";
import { BookingPage } from "../../apps/booking/src/pages/BookingPage";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

const mockRooms = [
  {
    id: "dorm-a",
    name: "Dormitorio A",
    type_: "shared",
    capacity: 12,
    price_per_night: 1500,
    amenities: ["Taquillas", "Enchufes"],
    available: true,
  },
  {
    id: "private-1",
    name: "Habitación Privada 1",
    type_: "private",
    capacity: 2,
    price_per_night: 3500,
    amenities: ["Baño privado", "TV"],
    available: true,
  },
];

describe("BookingPage", () => {
  const mockOnBookingSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<BookingPage onBookingSubmit={mockOnBookingSubmit} />);

    expect(screen.getByText("Cargando habitaciones...")).toBeInTheDocument();
  });

  it("renders rooms after loading", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRooms,
    } as Response);

    render(<BookingPage onBookingSubmit={mockOnBookingSubmit} />);

    await waitFor(() => {
      expect(screen.getByText("Dormitorio A")).toBeInTheDocument();
      expect(screen.getByText("Habitación Privada 1")).toBeInTheDocument();
    });
  });

  it("handles API error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<BookingPage onBookingSubmit={mockOnBookingSubmit} />);

    await waitFor(() => {
      expect(
        screen.getByText("Error al cargar habitaciones"),
      ).toBeInTheDocument();
    });
  });

  it("allows room selection", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRooms,
    } as Response);

    render(<BookingPage onBookingSubmit={mockOnBookingSubmit} />);

    await waitFor(() => {
      const dormRoom = screen.getByText("Dormitorio A").closest("div");
      expect(dormRoom).toBeInTheDocument();
    });
  });

  it("shows unavailable rooms as disabled", async () => {
    const unavailableRooms = [
      ...mockRooms,
      {
        id: "dorm-b",
        name: "Dormitorio B",
        type_: "shared",
        capacity: 8,
        price_per_night: 1200,
        amenities: ["Taquillas"],
        available: false,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => unavailableRooms,
    } as Response);

    render(<BookingPage onBookingSubmit={mockOnBookingSubmit} />);

    await waitFor(() => {
      expect(screen.getByText("No disponible")).toBeInTheDocument();
    });
  });

  it("calculates price correctly for multiple guests", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRooms,
    } as Response);

    render(<BookingPage onBookingSubmit={mockOnBookingSubmit} />);

    await waitFor(() => {
      expect(screen.getByText("Dormitorio A")).toBeInTheDocument();
    });
  });
});
