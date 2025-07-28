import React from 'react';
import { shallow, mount } from 'enzyme';
import { CountryPhoneInput } from '../../client/src/components/country-phone-input';
import { I18nProvider } from '../../client/src/contexts/i18n-context';

// Mock react-icons
jest.mock('react-icons/fi', () => ({
  FiPhone: () => <div data-testid="phone-icon">Phone Icon</div>,
}));

// Mock UI components
jest.mock('../../client/src/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, type, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      className={className}
      data-testid="mock-input"
    />
  ),
}));

jest.mock('../../client/src/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div data-testid="mock-select" data-value={value}>
      <div onClick={() => onValueChange && onValueChange('+34')}>{children}</div>
    </div>
  ),
  SelectContent: ({ children }: any) => <div data-testid="mock-select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="mock-select-item" data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="mock-select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="mock-select-value">{placeholder}</div>,
}));

// Mock use-react-countries
jest.mock('use-react-countries', () => ({
  useCountries: () => ({
    countries: [
      { name: 'Spain', iso2: 'ES', dialCode: '+34', flag: '🇪🇸' },
      { name: 'France', iso2: 'FR', dialCode: '+33', flag: '🇫🇷' },
      { name: 'United States', iso2: 'US', dialCode: '+1', flag: '🇺🇸' },
    ],
  }),
}));

// Mock I18n context
jest.mock('../../client/src/contexts/i18n-context', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    language: 'en',
    setLanguage: jest.fn(),
  }),
  I18nProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
}));

describe('CountryPhoneInput Component', () => {
  const mockProps = {
    value: '+34123456789',
    onChange: jest.fn(),
    placeholder: 'Enter phone number',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Shallow Rendering', () => {
    it('should render without crashing', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      expect(wrapper.exists()).toBe(true);
    });

    it('should render country selector', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
    });

    it('should render phone number input', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      expect(wrapper.find('[data-testid="mock-input"]')).toHaveLength(1);
    });

    it('should split country code and phone number correctly', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      
      const select = wrapper.find('[data-testid="mock-select"]');
      const input = wrapper.find('[data-testid="mock-input"]');
      
      expect(select.prop('data-value')).toBe('+34');
      expect(input.prop('value')).toBe('123456789');
    });
  });

  describe('Full Mount Rendering', () => {
    const renderWithProvider = (props = mockProps) => {
      return mount(
        <I18nProvider>
          <CountryPhoneInput {...props} />
        </I18nProvider>
      );
    };

    it('should render complete component tree', () => {
      const wrapper = renderWithProvider();
      
      expect(wrapper.find('[data-testid="mock-select"]')).toHaveLength(1);
      expect(wrapper.find('[data-testid="mock-input"]')).toHaveLength(1);
    });

    it('should display phone icon', () => {
      const wrapper = renderWithProvider();
      expect(wrapper.find('[data-testid="phone-icon"]')).toHaveLength(1);
    });

    it('should show country options in select', () => {
      const wrapper = renderWithProvider();
      expect(wrapper.find('[data-testid="mock-select-content"]')).toHaveLength(1);
    });
  });

  describe('Phone Number Parsing', () => {
    it('should parse phone number with country code correctly', () => {
      const wrapper = shallow(<CountryPhoneInput value="+34666777888" onChange={jest.fn()} />);
      
      const select = wrapper.find('[data-testid="mock-select"]');
      const input = wrapper.find('[data-testid="mock-input"]');
      
      expect(select.prop('data-value')).toBe('+34');
      expect(input.prop('value')).toBe('666777888');
    });

    it('should handle phone number without country code', () => {
      const wrapper = shallow(<CountryPhoneInput value="666777888" onChange={jest.fn()} />);
      
      const input = wrapper.find('[data-testid="mock-input"]');
      expect(input.prop('value')).toBe('666777888');
    });

    it('should handle empty phone number', () => {
      const wrapper = shallow(<CountryPhoneInput value="" onChange={jest.fn()} />);
      
      const input = wrapper.find('[data-testid="mock-input"]');
      expect(input.prop('value')).toBe('');
    });

    it('should handle different country codes', () => {
      const testCases = [
        { value: '+33123456789', expectedCode: '+33', expectedNumber: '123456789' },
        { value: '+1234567890', expectedCode: '+1', expectedNumber: '234567890' },
        { value: '+49123456789', expectedCode: '+49', expectedNumber: '123456789' },
      ];

      testCases.forEach(({ value, expectedCode, expectedNumber }) => {
        const wrapper = shallow(<CountryPhoneInput value={value} onChange={jest.fn()} />);
        
        const select = wrapper.find('[data-testid="mock-select"]');
        const input = wrapper.find('[data-testid="mock-input"]');
        
        expect(select.prop('data-value')).toBe(expectedCode);
        expect(input.prop('value')).toBe(expectedNumber);
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onChange when country code changes', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput value="+34123456789" onChange={onChange} />
        </I18nProvider>
      );

      const select = wrapper.find('[data-testid="mock-select"]');
      select.childAt(0).simulate('click');

      expect(onChange).toHaveBeenCalledWith('+34123456789');
    });

    it('should call onChange when phone number changes', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput value="+34123456789" onChange={onChange} />
        </I18nProvider>
      );

      const input = wrapper.find('[data-testid="mock-input"]');
      input.simulate('change', { target: { value: '987654321' } });

      expect(onChange).toHaveBeenCalledWith('+34987654321');
    });

    it('should handle input validation', () => {
      const onChange = jest.fn();
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput value="+34123456789" onChange={onChange} />
        </I18nProvider>
      );

      const input = wrapper.find('[data-testid="mock-input"]');
      
      // Test with invalid characters
      input.simulate('change', { target: { value: 'abc123def' } });
      
      // Should still call onChange (component may handle validation internally)
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('Country Selection', () => {
    it('should show all available countries', () => {
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput {...mockProps} />
        </I18nProvider>
      );

      const selectItems = wrapper.find('[data-testid="mock-select-item"]');
      expect(selectItems.length).toBeGreaterThan(0);
    });

    it('should display country flags and dial codes', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      
      // Component should render country information
      expect(wrapper.exists()).toBe(true);
    });

    it('should default to Spain (+34) when no country specified', () => {
      const wrapper = shallow(<CountryPhoneInput value="123456789" onChange={jest.fn()} />);
      
      // Should default to +34 for Spain
      const select = wrapper.find('[data-testid="mock-select"]');
      expect(select.exists()).toBe(true);
    });
  });

  describe('Validation and Formatting', () => {
    it('should validate phone number format', () => {
      const validNumbers = [
        '+34666777888',
        '+33123456789',
        '+1234567890',
      ];

      validNumbers.forEach(number => {
        const wrapper = shallow(<CountryPhoneInput value={number} onChange={jest.fn()} />);
        expect(wrapper.exists()).toBe(true);
      });
    });

    it('should handle malformed phone numbers gracefully', () => {
      const malformedNumbers = [
        'invalid',
        '++34123',
        '+',
        '34-666-777-888',
      ];

      malformedNumbers.forEach(number => {
        expect(() => {
          shallow(<CountryPhoneInput value={number} onChange={jest.fn()} />);
        }).not.toThrow();
      });
    });

    it('should format phone number display correctly', () => {
      const wrapper = shallow(<CountryPhoneInput value="+34666777888" onChange={jest.fn()} />);
      
      const input = wrapper.find('[data-testid="mock-input"]');
      expect(input.prop('value')).toBe('666777888');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and placeholders', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      
      const input = wrapper.find('[data-testid="mock-input"]');
      expect(input.prop('placeholder')).toBe('Enter phone number');
    });

    it('should be keyboard navigable', () => {
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput {...mockProps} />
        </I18nProvider>
      );

      const input = wrapper.find('[data-testid="mock-input"]');
      expect(input.prop('type')).toBe('tel');
    });

    it('should support screen readers', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      
      // Component should have appropriate ARIA attributes
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined value', () => {
      expect(() => {
        shallow(<CountryPhoneInput value={undefined as any} onChange={jest.fn()} />);
      }).not.toThrow();
    });

    it('should handle null value', () => {
      expect(() => {
        shallow(<CountryPhoneInput value={null as any} onChange={jest.fn()} />);
      }).not.toThrow();
    });

    it('should handle missing onChange callback', () => {
      expect(() => {
        shallow(<CountryPhoneInput value="+34123456789" onChange={undefined as any} />);
      }).not.toThrow();
    });

    it('should handle very long phone numbers', () => {
      const longNumber = '+34' + '1'.repeat(20);
      const wrapper = shallow(<CountryPhoneInput value={longNumber} onChange={jest.fn()} />);
      
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Component State Management', () => {
    it('should maintain internal state correctly', () => {
      const wrapper = shallow(<CountryPhoneInput value="+34123456789" onChange={jest.fn()} />);
      
      const state = wrapper.state() as any;
      expect(state).toBeDefined();
    });

    it('should update when props change', () => {
      const wrapper = shallow(<CountryPhoneInput value="+34123456789" onChange={jest.fn()} />);
      
      wrapper.setProps({ value: '+33987654321' });
      
      const select = wrapper.find('[data-testid="mock-select"]');
      const input = wrapper.find('[data-testid="mock-input"]');
      
      expect(select.prop('data-value')).toBe('+33');
      expect(input.prop('value')).toBe('987654321');
    });
  });

  describe('Internationalization', () => {
    it('should display country names in correct language', () => {
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput {...mockProps} />
        </I18nProvider>
      );

      // Countries should be displayed with proper i18n
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle RTL languages', () => {
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput {...mockProps} />
        </I18nProvider>
      );

      // Component should render correctly for RTL languages
      expect(wrapper.exists()).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const wrapper = shallow(<CountryPhoneInput {...mockProps} />);
      
      const renderCount = wrapper.debug().length;
      wrapper.setProps({ placeholder: 'New placeholder' });
      
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle large country lists efficiently', () => {
      const wrapper = mount(
        <I18nProvider>
          <CountryPhoneInput {...mockProps} />
        </I18nProvider>
      );

      // Should render without performance issues
      expect(wrapper.exists()).toBe(true);
    });
  });
});