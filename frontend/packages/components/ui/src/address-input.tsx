import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { useI18n } from '@contexts/i18n';

interface CountryInfo {
  country: string;
  countryCode: string;
  callingCode: string;
  flag: string;
}

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onCountryChange?: (countryInfo: CountryInfo) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput({
  value,
  onChange,
  onCountryChange,
  placeholder = 'Enter your address',
  className = '',
}: AddressInputProps) {
  const { t } = useI18n();
  const [address, setAddress] = useState(value);
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [isAutocompleteReady, setIsAutocompleteReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // API endpoint for country service
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://alberguedelcarrascalejo.com'
    : 'https://*.picard.replit.dev';

  const getCountryInfo = async (countryCode: string): Promise<CountryInfo | null> => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/countries/${countryCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching country info:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | null = null;

    if (window.google?.maps?.places) {
      const input = document.querySelector('#address-input') as HTMLInputElement;
      if (input) {
        autocomplete = new window.google.maps.places.Autocomplete(input, {
          componentRestrictions: { country: ['ES', 'FR', 'PT', 'IT'] },
          types: ['address'],
        });

        autocomplete.addListener('place_changed', async () => {
          const place = autocomplete.getPlace();
          if (place && place.address_components) {
            const components = place.address_components;
            const country = components.find(
              (component) => component.types.includes('country')
            );

            if (country) {
              const countryCode = country.short_name;
              const data = await getCountryInfo(countryCode);
              
              if (data) {
                setCountryInfo(data);
                onCountryChange?.(data);
              }
            }
          }
        });

        setIsAutocompleteReady(true);
      }
    }

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAddress(newValue);
    onChange(newValue);
  };

  const handleCountrySelect = async (countryCode: string) => {
    const data = await getCountryInfo(countryCode);
    if (data) {
      setCountryInfo(data);
      onCountryChange?.(data);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="address-input" className="block text-sm font-medium mb-2">
          {t('address')}
        </label>
        <Input
          id="address-input"
          type="text"
          value={address}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={className}
          disabled={!isAutocompleteReady}
        />
        {!isAutocompleteReady && (
          <p className="text-sm text-muted-foreground mt-1">
            {t('loading_address_autocomplete')}
          </p>
        )}
      </div>

      {countryInfo && (
        <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
          <img 
            src={countryInfo.flag} 
            alt={countryInfo.country} 
            className="w-6 h-4 object-cover rounded"
          />
          <span className="font-medium">{countryInfo.country}</span>
          <span className="text-sm text-muted-foreground">
            ({countryInfo.callingCode})
          </span>
        </div>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">
          {t('loading_country_info')}
        </div>
      )}
    </div>
  );
}