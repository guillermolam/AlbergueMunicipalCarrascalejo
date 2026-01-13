import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Booking } from '../../apps/booking/src/components/Booking';

const mockRooms = [
  {
    id: 'dorm-a',
    name: 'Dormitorio A',
    type_: 'shared',
    capacity: 12,
    price_per_night: 1500,
    amenities: ['Taquillas', 'Enchufes'],
    available: true,
  },
  {
    id: 'private-1',
    name: 'Habitación Privada 1',
    type_: 'private',
    capacity: 2,
    price_per_night: 3500,
    amenities: ['Baño privado', 'TV'],
    available: true,
  },
];

describe('Booking', () => {
  const mockOnBookingComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays warning when no room is selected', () => {
    render(<Booking selectedRoom="" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />);

    expect(
      screen.getByText('Por favor selecciona una habitación arriba para continuar')
    ).toBeInTheDocument();
  });

  it('displays selected room info when room is selected', () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    expect(screen.getByText('Dormitorio A')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    const submitButton = screen.getByText('Continuar con la reserva');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('La fecha de entrada es requerida')).toBeInTheDocument();
      expect(screen.getByText('La fecha de salida es requerida')).toBeInTheDocument();
      expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
      expect(screen.getByText('El teléfono debe tener al menos 9 dígitos')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    const emailInput = screen.getByPlaceholderText('juan@email.com');
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByText('Continuar con la reserva');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });
  });

  it('validates guest count limits', () => {
    render(
      <Booking
        selectedRoom="private-1"
        rooms={mockRooms}
        onBookingComplete={mockOnBookingComplete}
      />
    );

    const guestSelect = screen.getByRole('combobox');
    expect(guestSelect).toBeInTheDocument();

    // Should show options up to room capacity
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2); // private room has capacity 2
  });

  it('calculates total price correctly', () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    const checkInInput = screen.getByLabelText('Fecha de entrada');
    const checkOutInput = screen.getByLabelText('Fecha de salida');
    const guestsSelect = screen.getByLabelText('Número de huéspedes');

    fireEvent.change(checkInInput, { target: { value: '2024-01-15' } });
    fireEvent.change(checkOutInput, { target: { value: '2024-01-17' } }); // 2 nights
    fireEvent.change(guestsSelect, { target: { value: '2' } });

    expect(screen.getByText('€60.00')).toBeInTheDocument(); // 15 * 2 nights * 2 guests
  });

  it('submits form with valid data', async () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Fecha de entrada'), {
      target: { value: '2024-01-15' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de salida'), {
      target: { value: '2024-01-17' },
    });
    fireEvent.change(screen.getByLabelText('Número de huéspedes'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByPlaceholderText('Juan García'), {
      target: { value: 'Juan García' },
    });
    fireEvent.change(screen.getByPlaceholderText('juan@email.com'), {
      target: { value: 'juan@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('+34 600 123 456'), {
      target: { value: '600123456' },
    });

    const submitButton = screen.getByText('Continuar con la reserva');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnBookingComplete).toHaveBeenCalledWith({
        roomId: 'dorm-a',
        checkIn: '2024-01-15',
        checkOut: '2024-01-17',
        guests: 1,
        name: 'Juan García',
        email: 'juan@email.com',
        phone: '600123456',
      });
    });
  });

  it('disables submit button when no room is selected', () => {
    render(<Booking selectedRoom="" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />);

    const submitButton = screen.getByText('Continuar con la reserva');
    expect(submitButton).toBeDisabled();
  });

  it('handles optional passport field', async () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Fecha de entrada'), {
      target: { value: '2024-01-15' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de salida'), {
      target: { value: '2024-01-16' },
    });
    fireEvent.change(screen.getByPlaceholderText('Juan García'), {
      target: { value: 'Juan García' },
    });
    fireEvent.change(screen.getByPlaceholderText('juan@email.com'), {
      target: { value: 'juan@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('+34 600 123 456'), {
      target: { value: '600123456' },
    });
    fireEvent.change(screen.getByPlaceholderText('12345678A'), {
      target: { value: '12345678A' },
    });

    const submitButton = screen.getByText('Continuar con la reserva');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnBookingComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          passport: '12345678A',
        })
      );
    });
  });

  it('shows loading state during submission', () => {
    render(
      <Booking selectedRoom="dorm-a" rooms={mockRooms} onBookingComplete={mockOnBookingComplete} />
    );

    // Fill form quickly
    fireEvent.change(screen.getByLabelText('Fecha de entrada'), {
      target: { value: '2024-01-15' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de salida'), {
      target: { value: '2024-01-16' },
    });
    fireEvent.change(screen.getByPlaceholderText('Juan García'), {
      target: { value: 'Juan García' },
    });
    fireEvent.change(screen.getByPlaceholderText('juan@email.com'), {
      target: { value: 'juan@email.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('+34 600 123 456'), {
      target: { value: '600123456' },
    });

    const submitButton = screen.getByText('Continuar con la reserva');
    fireEvent.click(submitButton);

    expect(screen.getByText('Procesando...')).toBeInTheDocument();
  });
});
