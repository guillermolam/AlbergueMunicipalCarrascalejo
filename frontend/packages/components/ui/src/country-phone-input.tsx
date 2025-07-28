import React, { useState, useEffect } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Flag } from 'lucide-react';
import { useI18n } from '@contexts/i18n';

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryInfo?: {
    countryCode: string;
    callingCode: string;
    flag: string;
  };
  className?: string;
}

export function CountryPhoneInput({
  value,
  onChange,
  countryInfo,
  className = '',
}: CountryPhoneInputProps) {
  const { t } = useI18n();
  const [localNumber, setLocalNumber] = useState('');

  useEffect(() => {
    if (value && countryInfo?.callingCode) {
      const fullNumber = value.replace(/\D/g, '');
      const callingCodeLength = countryInfo.callingCode.replace(/\D/g, '').length;
      const localPart = fullNumber.substring(callingCodeLength);
      setLocalNumber(localPart);
    }
  }, [value, countryInfo?.callingCode]);

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const number = e.target.value.replace(/\D/g, '');
    setLocalNumber(number);
    if (countryInfo?.callingCode) {
      onChange(`${countryInfo.callingCode}${number}`);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {countryInfo && (
        <div className="flex items-center gap-2">
          <img
            src={countryInfo.flag}
            alt={`${countryInfo.countryCode} flag`}
            className="w-4 h-4 rounded"
          />
          <span className="text-sm">{countryInfo.callingCode}</span>
        </div>
      )}
      <div className="flex-1">
        <Input
          type="tel"
          value={localNumber}
          onChange={handleLocalNumberChange}
          placeholder={t('common.phonePlaceholder')}
          className="pl-10"
        />
        <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
