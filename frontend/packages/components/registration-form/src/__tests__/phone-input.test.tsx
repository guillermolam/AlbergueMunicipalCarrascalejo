import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhoneInput } from '../phone-input';
import { useI18n } from '@contexts/i18n-context';

// Mock the i18n context
jest.mock('@contexts/i18n-context', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('PhoneInput', () => {
  const mockRegister = () => ({
    onChange: jest.fn(),
    onBlur: jest.fn(),
    name: 'phone',
    ref: jest.fn(),
  });

  const mockErrors = {
    phone: { message: 'Phone error' },
    email: { message: 'Email error' },
  };

  it('renders phone input with country code selector', () => {
    render(<PhoneInput phone={mockRegister()} email={mockRegister()} errors={{}} />);

    expect(screen.getByRole('combobox', { name: /phone/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ej: 612345678/i)).toBeInTheDocument();
  });

  it('displays error message when phone input is invalid', () => {
    render(<PhoneInput phone={mockRegister()} email={mockRegister()} errors={mockErrors} />);

    expect(screen.getByText('Phone error')).toBeInTheDocument();
  });

  it('renders email input correctly', () => {
    render(<PhoneInput phone={mockRegister()} email={mockRegister()} errors={{}} />);

    expect(screen.getByPlaceholderText(/ej: ejemplo@email.com/i)).toBeInTheDocument();
  });

  it('displays email error message when email is invalid', () => {
    render(<PhoneInput phone={mockRegister()} email={mockRegister()} errors={mockErrors} />);

    expect(screen.getByText('Email error')).toBeInTheDocument();
  });

  it('calls onChange when phone number is entered', () => {
    const phoneRegister = mockRegister();
    render(<PhoneInput phone={phoneRegister} email={mockRegister()} errors={{}} />);

    const phoneInput = screen.getByPlaceholderText(/ej: 612345678/i);
    fireEvent.change(phoneInput, { target: { value: '612345678' } });

    expect(phoneRegister.onChange).toHaveBeenCalled();
  });
});
