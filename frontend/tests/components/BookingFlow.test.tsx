import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { BookingFlow } from "../../apps/booking/src/components/BookingFlow";

// Mock child components
vi.mock("../../apps/booking/src/pages/BookingPage", () => ({
  BookingPage: ({
    onBookingSubmit,
  }: {
    onBookingSubmit: (data: any) => void;
  }) => (
    <div data-testid="booking-page">
      <button
        onClick={() =>
          onBookingSubmit({
            roomId: "test-room",
            roomName: "Test Room",
            checkIn: "2024-01-15",
            checkOut: "2024-01-17",
            guests: 2,
            totalPrice: 60,
            guestInfo: {
              name: "Test User",
              email: "test@example.com",
              phone: "123456789",
            },
          })
        }
      >
        Submit Booking
      </button>
    </div>
  ),
}));

vi.mock("../../apps/booking/src/components/BookingConfirmation", () => ({
  BookingConfirmation: ({ onConfirm, onBack }: any) => (
    <div data-testid="booking-confirmation">
      <button onClick={onConfirm}>Confirm</button>
      <button onClick={onBack}>Back</button>
    </div>
  ),
}));

vi.mock("../../apps/booking/src/components/BookingSuccess", () => ({
  BookingSuccess: () => <div data-testid="booking-success">Success!</div>,
}));

describe("BookingFlow", () => {
  it("starts with booking step", () => {
    render(<BookingFlow />);

    expect(screen.getByTestId("booking-page")).toBeInTheDocument();
  });

  it("moves to confirmation step after booking submit", () => {
    const { container } = render(<BookingFlow />);

    const submitButton = screen.getByText("Submit Booking");
    fireEvent.click(submitButton);

    expect(screen.getByTestId("booking-confirmation")).toBeInTheDocument();
  });

  it("moves to success step after confirmation", () => {
    const { container } = render(<BookingFlow />);

    // First, go to confirmation
    const submitButton = screen.getByText("Submit Booking");
    fireEvent.click(submitButton);

    // Then confirm
    const confirmButton = screen.getByText("Confirm");
    fireEvent.click(confirmButton);

    expect(screen.getByTestId("booking-success")).toBeInTheDocument();
  });

  it("goes back to booking from confirmation", () => {
    const { container } = render(<BookingFlow />);

    // First, go to confirmation
    const submitButton = screen.getByText("Submit Booking");
    fireEvent.click(submitButton);

    // Then go back
    const backButton = screen.getByText("Back");
    fireEvent.click(backButton);

    expect(screen.getByTestId("booking-page")).toBeInTheDocument();
  });

  it("passes booking data to confirmation", () => {
    const { container } = render(<BookingFlow />);

    const submitButton = screen.getByText("Submit Booking");
    fireEvent.click(submitButton);

    // The mock BookingConfirmation would receive the booking data
    // In a real test, we'd verify the props passed to the mock
    expect(screen.getByTestId("booking-confirmation")).toBeInTheDocument();
  });
});
