import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StayDateSelector } from '../stay-date-selector';
import { useI18n } from '@contexts/i18n-context';

// Mock the i18n context
jest.mock('@contexts/i18n-context', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the Calendar component
jest.mock('@ui/components/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (range: any) => void }) => (
    <div
      role="calendar"
      onClick={() =>
        onSelect({
          from: new Date('2025-07-28'),
          to: new Date('2025-07-29'),
        })
      }
    />
  ),
}));

describe('StayDateSelector', () => {
  const mockRegister = () => ({
    onChange: jest.fn(),
    onBlur: jest.fn(),
    name: 'checkInDate',
    ref: jest.fn(),
  });

  const mockErrors = {
    checkInDate: { message: 'Check-in date error' },
    checkOutDate: { message: 'Check-out date error' },
    arrivalTime: { message: 'Arrival time error' },
  };

  it('renders check-in and check-out inputs', () => {
    render(<StayDateSelector 
      checkIn={mockRegister()} 
      checkOut={mockRegister()} 
      arrivalTime={mockRegister()} 
      errors={{}} 
    />);

    expect(screen.getByPlaceholderText(/selecciona fecha de entrada/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/selecciona fecha de salida/i)).toBeInTheDocument();
  });

  it('displays error messages when dates are invalid', () => {
    render(<StayDateSelector 
      checkIn={mockRegister()} 
      checkOut={mockRegister()} 
      arrivalTime={mockRegister()} 
      errors={mockErrors} 
    />);

    expect(screen.getByText('Check-in date error')).toBeInTheDocument();
    expect(screen.getByText('Check-out date error')).toBeInTheDocument();
  });

  it('handles date selection from calendar', async () => {
    const checkInRegister = mockRegister();
    const checkOutRegister = mockRegister();
    
    render(<StayDateSelector 
      checkIn={checkInRegister} 
      checkOut={checkOutRegister} 
      arrivalTime={mockRegister()} 
      errors={{}} 
    />);

    const checkInInput = screen.getByPlaceholderText(/selecciona fecha de entrada/i);
    fireEvent.click(checkInInput);

    // Wait for calendar to be rendered
    await waitFor(() => {
      expect(screen.getByRole('calendar')).toBeInTheDocument();
    });

    // Click on calendar to select dates
    fireEvent.click(screen.getByRole('calendar'));

    // Check that onChange was called with correct dates
    expect(checkInRegister.onChange).toHaveBeenCalledWith('2025-07-28');
    expect(checkOutRegister.onChange).toHaveBeenCalledWith('2025-07-29');
  });

  it('handles arrival time input', () => {
    const arrivalTimeRegister = mockRegister();
    render(<StayDateSelector 
      checkIn={mockRegister()} 
      checkOut={mockRegister()} 
      arrivalTime={arrivalTimeRegister} 
      errors={{}} 
    />);

    const arrivalTimeInput = screen.getByPlaceholderText(/hh:mm/i);
    fireEvent.change(arrivalTimeInput, { target: { value: '14:30' } });

    expect(arrivalTimeRegister.onChange).toHaveBeenCalledWith('14:30');
  });
});
