import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { BookingConfirmation } from '../../apps/booking/src/components/BookingConfirmation';

const mockBookingData = {
  roomId: 'dorm-a',
  roomName: 'Dormitorio A',
  checkIn: '2024-01-15',
  checkOut: '2024-01-17',
  guests: 2,
  totalPrice: 60,
  guestInfo: {
    name: 'Juan García',
    email: 'juan@email.com',
    phone: '600123456',
    passport: '12345678A',
  },
};

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('BookingConfirmation', () => {
  const mockOnConfirm = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('displays booking details correctly', () => {
    render(
      <BookingConfirmation
        bookingData={mockBookingData}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Confirmar Reserva')).toBeInTheDocument();
    expect(screen.getByText('Dormitorio A')).toBeInTheDocument();
    expect(screen.getByText('Entrada: 15/1/2024 - Salida: 17/1/2024')).toBeInTheDocument();
    expect(screen.getByText('2 persona(s)')).toBeInTheDocument();
    expect(screen.getByText('Juan García')).toBeInTheDocument();
    expect(screen.getByText('juan@email.com')).toBeInTheDocument();
    expect(screen.getByText('600123456')).toBeInTheDocument();
    expect(screen.getByText('Pasaporte: 12345678A')).toBeInTheDocument();
    expect(screen.getByText('€60')).toBeInTheDocument();
  });

  it('calls onConfirm when booking is successful', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'booking-123' }),
    } as Response);

    render(
      <BookingConfirmation
        bookingData={mockBookingData}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    const confirmButton = screen.getByText('Confirmar Reserva');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockBookingData),
      });
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('shows error message when booking fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BookingConfirmation
        bookingData={mockBookingData}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    const confirmButton = screen.getByText('Confirmar Reserva');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Error al confirmar la reserva')).toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response);

    render(
      <BookingConfirmation
        bookingData={mockBookingData}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    const confirmButton = screen.getByText('Confirmar Reserva');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Error al confirmar la reserva')).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', () => {
    render(
      <BookingConfirmation
        bookingData={mockBookingData}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    const backButton = screen.getByText('Volver');
    fireEvent.click(backButton);

    expect(mockOnBack).toHaveBeenCalled();
  });

  it('displays booking without passport', () => {
    const bookingWithoutPassport = {
      ...mockBookingData,
      guestInfo: {
        ...mockBookingData.guestInfo,
        passport: undefined,
      },
    };

    render(
      <BookingConfirmation
        bookingData={bookingWithoutPassport}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    expect(screen.queryByText(/Pasaporte:/)).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    const bookingWithDifferentDates = {
      ...mockBookingData,
      checkIn: '2024-12-25',
      checkOut: '2024-12-31',
    };

    render(
      <BookingConfirmation
        bookingData={bookingWithDifferentDates}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Entrada: 25/12/2024 - Salida: 31/12/2024')).toBeInTheDocument();
  });

  it('handles single guest correctly', () => {
    const bookingWithSingleGuest = {
      ...mockBookingData,
      guests: 1,
    };

    render(
      <BookingConfirmation
        bookingData={bookingWithSingleGuest}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('1 persona')).toBeInTheDocument();
  });

  it('displays different price points', () => {
    const bookingWithHighPrice = {
      ...mockBookingData,
      totalPrice: 350,
    };

    render(
      <BookingConfirmation
        bookingData={bookingWithHighPrice}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('€350')).toBeInTheDocument();
  });

  it('handles zero decimal prices', () => {
    const bookingWithRoundPrice = {
      ...mockBookingData,
      totalPrice: 100,
    };

    render(
      <BookingConfirmation
        bookingData={bookingWithRoundPrice}
        onConfirm={mockOnConfirm}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('€100')).toBeInTheDocument();
  });
});
