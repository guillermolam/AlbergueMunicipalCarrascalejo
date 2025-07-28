import React, { useState } from 'react';
import { Phone, Globe } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

const COUNTRIES: Country[] = [
  { code: 'ES', name: 'Spain', flag: '🇪🇸', dialCode: '+34' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44' },
  { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', dialCode: '+49' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', dialCode: '+39' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', dialCode: '+32' },
];

const REGIONAL_FLAGS: Record<string, string> = {
  'Catalonia': '🏴󠁥󠁳󠁣󠁴󠁿',
  'Valencia': '🏴󠁥󠁳󠁶󠁣󠁿',
  'Galicia': '🏴󠁥󠁳󠁧󠁡󠁿',
  'Basque Country': '🏴󠁥󠁳󠁰󠁶󠁿',
};

const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  value,
  onChange,
  placeholder = 'Enter phone number',
  className,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/\D/g, '');
    setPhoneNumber(number);
    onChange(`${selectedCountry.dialCode}${number}`);
  };

  const formatPhoneNumber = (number: string): string => {
    // Spanish phone format: XXX XXX XXX
    if (selectedCountry.code === 'ES') {
      return number.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    return number;
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center space-x-2 px-3 h-10"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm">{selectedCountry.dialCode}</span>
            <Globe className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            {COUNTRIES.map((country) => (
              <Button
                key={country.code}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleCountrySelect(country)}
              >
                <span className="mr-2">{country.flag}</span>
                <span>{country.name}</span>
                <span className="ml-auto text-sm text-gray-500">
                  {country.dialCode}
                </span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      
      <div className="flex-1 relative">
        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="tel"
          value={formatPhoneNumber(phoneNumber)}
          onChange={handlePhoneChange}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
    </div>
  );
};

export default CountryPhoneInput;