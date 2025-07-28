import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { useI18n } from '@contexts/i18n';
import { countryService } from '@services/country';
import { type AddressInfo } from '@services/country/types';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onCountryChange?: (countryInfo: AddressInfo) => void;
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
  const [countryInfo, setCountryInfo] = useState<AddressInfo | null>(null);
  const [isAutocompleteReady, setIsAutocompleteReady] = useState(false);

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | null = null;

    if (window.google?.maps?.places) {
      const input = document.querySelector(`#${addressInputId}`);
      if (input) {
        autocomplete = new window.google.maps.places.Autocomplete(
          input as HTMLInputElement,
          {
            componentRestrictions: { country: ['ES', 'FR', 'PT', 'IT'] },
            types: ['address'],
          }
        );

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place && place.address_components) {
            const components = place.address_components;
            const country = components.find(
              (component) => component.types.includes('country')
            );

            if (country) {
              const countryCode = country.short_name;
              countryService.getCountryInfo(countryCode).then((data) => {
                if (data) {
                  const countryInfo: AddressInfo = {
                    country: data.name,
                    countryCode: data.countryCode,
                    callingCode: data.callingCodes[0],
                    flag: data.flag,
                  };
                  setCountryInfo(countryInfo);
                  onCountryChange?.(countryInfo);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="addressCountry">{t('country')}</Label>
        <select
          id="addressCountry"
          {...addressCountry}
          onChange={handleCountryChange}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="ES">España</option>
          <option value="FR">Francia</option>
          <option value="PT">Portugal</option>
          <option value="IT">Italia</option>
          <option value="OT">{t('other_country')}</option>
        </select>
        {errors?.addressCountry && (
          <AlertDescription className="text-red-500">
            {errors.addressCountry.message}
          </AlertDescription>
        )}
      </div>
      <div>
        <Label htmlFor="addressStreet">{t('street')}</Label>
        <Input
          id="addressStreet"
          {...addressStreet}
          placeholder={t('street_placeholder')}
        />
        {errors?.addressStreet && (
          <AlertDescription className="text-red-500">
            {errors.addressStreet.message}
          </AlertDescription>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="addressCity">{t('city')}</Label>
          <Input
            id="addressCity"
            {...addressCity}
            placeholder={t('city_placeholder')}
          />
          {errors?.addressCity && (
            <AlertDescription className="text-red-500">
              {errors.addressCity.message}
            </AlertDescription>
          )}
            <span className="font-medium">{countryInfo.callingCode}</span>
          </div>
        </div>
      )}
    </div>
  );
}
