import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { BookingSuccess } from "../../apps/booking/src/components/BookingSuccess";

const mockBookingData = {
  roomId: "dorm-a",
  roomName: "Dormitorio A",
  checkIn: "2024-01-15",
  checkOut: "2024-01-17",
  guests: 2,
  totalPrice: 60,
  guestInfo: {
    name: "Juan García",
    email: "juan@email.com",
    phone: "600123456",
    passport: "12345678A",
  },
};

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("BookingSuccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("displays success message", () => {
    render(<BookingSuccess bookingData={mockBookingData} />);

    expect(screen.getByText("¡Reserva Confirmada!")).toBeInTheDocument();
    expect(
      screen.getByText("Tu reserva ha sido confirmada"),
    ).toBeInTheDocument();
    expect(screen.getByText("juan@email.com")).toBeInTheDocument();
  });

  it("displays booking details correctly", () => {
    render(<BookingSuccess bookingData={mockBookingData} />);

    expect(screen.getByText("Dormitorio A")).toBeInTheDocument();
    expect(screen.getByText("15/1/2024")).toBeInTheDocument();
    expect(screen.getByText("17/1/2024")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("€60.00")).toBeInTheDocument();
  });

  it("navigates to new booking when button is clicked", () => {
    render(<BookingSuccess bookingData={mockBookingData} />);

    const newBookingButton = screen.getByText("Nueva Reserva");
    fireEvent.click(newBookingButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("handles different date formats", () => {
    const bookingWithDifferentDates = {
      ...mockBookingData,
      checkIn: "2024-12-25",
      checkOut: "2024-12-31",
    };

    render(<BookingSuccess bookingData={bookingWithDifferentDates} />);

    expect(screen.getByText("25/12/2024")).toBeInTheDocument();
    expect(screen.getByText("31/12/2024")).toBeInTheDocument();
  });

  it("handles single guest", () => {
    const bookingWithSingleGuest = {
      ...mockBookingData,
      guests: 1,
    };

    render(<BookingSuccess bookingData={bookingWithSingleGuest} />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("handles booking without passport", () => {
    const bookingWithoutPassport = {
      ...mockBookingData,
      guestInfo: {
        ...mockBookingData.guestInfo,
        passport: undefined,
      },
    };

    render(<BookingSuccess bookingData={bookingWithoutPassport} />);

    expect(screen.getByText("juan@email.com")).toBeInTheDocument();
  });

  it("handles different room types", () => {
    const bookingWithPrivateRoom = {
      ...mockBookingData,
      roomName: "Habitación Privada 1",
    };

    render(<BookingSuccess bookingData={bookingWithPrivateRoom} />);

    expect(screen.getByText("Habitación Privada 1")).toBeInTheDocument();
  });

  it("handles different price points", () => {
    const bookingWithHighPrice = {
      ...mockBookingData,
      totalPrice: 350,
    };

    render(<BookingSuccess bookingData={bookingWithHighPrice} />);

    expect(screen.getByText("€350.00")).toBeInTheDocument();
  });

  it("handles zero decimal prices", () => {
    const bookingWithRoundPrice = {
      ...mockBookingData,
      totalPrice: 100,
    };

    render(<BookingSuccess bookingData={bookingWithRoundPrice} />);

    expect(screen.getByText("€100.00")).toBeInTheDocument();
  });
});
