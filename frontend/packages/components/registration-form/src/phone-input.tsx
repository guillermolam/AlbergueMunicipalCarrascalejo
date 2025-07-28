import React from 'react';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select } from '@ui/components/select';
import { Alert } from '@ui/components/alert';
import { Phone } from 'lucide-react';
import { useI18n } from '@i18n';

interface PhoneInputProps {
  phone: any;
  email: any;
  errors: any;
  disabled?: boolean;
  className?: string;
}

const countryCodes = [
  { value: '+34', label: 'España (+34)', flag: '🇪🇸' },
  { value: '+33', label: 'Francia (+33)', flag: '🇫🇷' },
  { value: '+39', label: 'Italia (+39)', flag: '🇮🇹' },
  { value: '+44', label: 'Reino Unido (+44)', flag: '🇬🇧' },
  // Add more country codes as needed
];

export const PhoneInput: React.FC<PhoneInputProps> = ({ phone, email, errors, disabled = false, className = '' }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t('phone')}
            </div>
          </Label>
          <div className="flex gap-2">
            <Select {...phone} className="w-24">
              <SelectTrigger>
                <SelectValue placeholder="Código" />
              </SelectTrigger>
              <SelectContent>
                {countryCodes.map((code) => (
                  <SelectItem key={code.value} value={code.value}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{code.flag}</span>
                      <span>{code.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="phone"
              type="tel"
              {...phone}
              error={errors.phone?.message}
              disabled={disabled}
              className={className}
            />
          </div>
          <Label htmlFor="phone">{t('registration.contact_info.phone')}</Label>
          {errors.phone && (
            <Alert variant="destructive">
              <AlertDescription>{errors.phone.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label htmlFor="email">{t('registration.contact_info.email')}</Label>
          <Input
            id="email"
            type="email"
            {...email}
            error={errors.email?.message}
            disabled={disabled}
            className={className}
          />
          {errors.email && (
            <Alert variant="destructive">
              <AlertDescription>{errors.email.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};
