export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  maxLength: number;
  pattern: string;
}

export const countries: Country[] = [
  {
    code: 'ES',
    name: 'Spain',
    dialCode: '+34',
    flag: '🇪🇸',
    maxLength: 9,
    pattern: '^[6-9]\\d{8}$',
  },
  {
    code: 'PT',
    name: 'Portugal',
    dialCode: '+351',
    flag: '🇵🇹',
    maxLength: 9,
    pattern: '^[29]\\d{8}$',
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    flag: '🇫🇷',
    maxLength: 9,
    pattern: '^[1-9]\\d{8}$',
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    maxLength: 11,
    pattern: '^[1-9]\\d{9-11}$',
  },
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    flag: '🇮🇹',
    maxLength: 10,
    pattern: '^[0-9]\\d{6-9}$',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    maxLength: 10,
    pattern: '^[1-9]\\d{9}$',
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    maxLength: 10,
    pattern: '^[2-9]\\d{9}$',
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    maxLength: 10,
    pattern: '^[2-9]\\d{9}$',
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    maxLength: 9,
    pattern: '^[1-9]\\d{8}$',
  },
  {
    code: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    flag: '🇧🇷',
    maxLength: 11,
    pattern: '^[1-9]\\d{10}$',
  },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((country) => country.code === code.toUpperCase());
}

export function getCountryByDialCode(dialCode: string): Country | undefined {
  return countries.find((country) => country.dialCode === dialCode);
}

export function formatPhoneNumber(phone: string, country: Country): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Remove country code if present
  const withoutCountryCode = digits.startsWith(country.dialCode.replace('+', ''))
    ? digits.slice(country.dialCode.replace('+', '').length)
    : digits;

  return withoutCountryCode.slice(0, country.maxLength);
}

export function validatePhoneNumber(phone: string, country: Country): boolean {
  const formatted = formatPhoneNumber(phone, country);
  const regex = new RegExp(country.pattern);
  return regex.test(formatted);
}

export async function getCountries(): Promise<Country[]> {
  // In a real app, this might fetch from an API
  return Promise.resolve(countries);
}
