import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@ui/components/card';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Select } from '@ui/components/select';
import { Alert, AlertDescription } from '@ui/components/alert';
import { useI18n } from '@contexts/i18n';
import { useAuth } from '@contexts/auth';
import { IDVerification } from './id-verification';
import { PhoneInput } from './phone-input';
import { StayDateSelector } from './stay-date-selector';
import { AddressInput } from './address-input';
import { LanguageSelector } from './language-selector';
import type { RegistrationFormData, registrationSchema } from '../types';

const registrationSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, { message: 'Nombre demasiado corto' }),
  lastName1: z.string().min(2, { message: 'Apellido demasiado corto' }),
  lastName2: z.string().optional(),
  birthDate: z.string().min(1, "La fecha de nacimiento es obligatoria"),
  gender: z.enum(["M", "F", "O"]),
  nationality: z.string().min(2, { message: 'Nacionalidad requerida' }),
  email: z.string().email({ message: 'Email no válido' }),

  // Document Information
  documentType: z.string().min(1, { message: 'Tipo de documento requerido' }),
  documentNumber: z.string().min(5, { message: 'Número de documento demasiado corto' }),

  // Contact Information
  countryCode: z.string().min(2, { message: 'Código de país requerido' }),
  localPhone: z.string().min(5, { message: 'Número local demasiado corto' }),

  // Address
  addressCountry: z.string().min(1, "País obligatorio"),
  addressStreet: z.string().min(5, "Dirección obligatoria"),
  addressCity: z.string().min(2, "Ciudad obligatoria"),
  addressPostalCode: z.string().min(4, "Código postal obligatorio"),

  // Booking Details
  checkInDate: z.string().min(1, "Fecha de entrada obligatoria"),
  checkOutDate: z.string().min(1, "Fecha de salida obligatoria"),
  arrivalTime: z.string().optional(),
  selectedBed: z.string().optional(),

  // Legal
  consentGiven: z.boolean().refine((val) => val === true, "Debes aceptar el tratamiento de datos"),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationForm: React.FC = () => {
  const { t } = useI18n();
  const { isAuthenticated, user, token } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      gender: 'M',
      nationality: 'ES',
      addressCountry: 'ES',
      consentGiven: false,
      ...(isAuthenticated && user ? {
        firstName: user.name?.split(' ')[0] || '',
        lastName1: user.name?.split(' ').slice(1).join(' ') || '',
        email: user.email || '',
      } : {})
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    console.log('Form submitted:', data);
    if (!isAuthenticated || !token) {
      console.error('User not authenticated');
      return;
    }
    // Add token to request headers
    // Send form data to API
  };

  const [countryInfo, setCountryInfo] = React.useState<{
    countryCode: string;
    callingCode: string;
    flag: string;
  } | null>(null);

  return (
    <Card className="p-6">
      {!isAuthenticated ? (
        <div className="text-center py-8">
          <Alert variant="warning">
            {t('please_login')}
          </Alert>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t('personal_info')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">{t('first_name')}</Label>
                <Input
                  id="firstName"
                  {...register('firstName')}
                  error={errors.firstName?.message}
                  disabled={!!user?.name}
                />
                {errors.firstName && (
                  <AlertDescription className="text-red-500">
                    {errors.firstName.message}
                  </AlertDescription>
                )}
              </div>
              <div>
                <Label htmlFor="lastName1">{t('last_name_1')}</Label>
                <Input
                  id="lastName1"
                  {...register('lastName1')}
                  error={errors.lastName1?.message}
                  disabled={!!user?.name}
                />
                {errors.lastName1 && (
                  <AlertDescription className="text-red-500">
                    {errors.lastName1.message}
                  </AlertDescription>
                )}
              </div>
              <div>
                <Label htmlFor="lastName2">{t('last_name_2')}</Label>
                <Input
                  id="lastName2"
                  {...register('lastName2')}
                  error={errors.lastName2?.message}
                />
                {errors.lastName2 && (
                  <AlertDescription className="text-red-500">
                    {errors.lastName2.message}
                  </AlertDescription>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="birthDate">{t('birth_date')}</Label>
              <Input
                id="birthDate"
                type="date"
                {...register('birthDate')}
                error={errors.birthDate?.message}
              />
              {errors.birthDate && (
                <AlertDescription className="text-red-500">
                  {errors.birthDate.message}
                </AlertDescription>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">{t('gender')}</Label>
                <Select
                  id="gender"
                  {...register('gender')}
                  error={errors.gender?.message}
                >
                  <option value="M">{t('gender_male')}</option>
                  <option value="F">{t('gender_female')}</option>
                  <option value="O">{t('gender_other')}</option>
                </Select>
                {errors.gender && (
                  <AlertDescription className="text-red-500">
                    {errors.gender.message}
                  </AlertDescription>
                )}
              </div>
              <div>
                <Label htmlFor="nationality">{t('nationality')}</Label>
                <Select
                  id="nationality"
                  {...register('nationality')}
                  error={errors.nationality?.message}
                >
                  <option value="ES">España</option>
                  <option value="FR">Francia</option>
                  <option value="PT">Portugal</option>
                  <option value="IT">Italia</option>
                  <option value="OT">{t('other_country')}</option>
                </Select>
                {errors.nationality && (
                  <AlertDescription className="text-red-500">
                    {errors.nationality.message}
                  </AlertDescription>
                )}
              </div>
            </div>
          </div>

          {/* Document Information */}
          <div>
            <h3 className="text-lg font-semibold">{t('document_info')}</h3>
            <IDVerification 
              documentType={register('documentType')}
              documentNumber={register('documentNumber')}
              errors={errors}
            />
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold">{t('contact_info')}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                />
                {errors.email && (
                  <AlertDescription className="text-red-500">
                    {errors.email.message}
                  </AlertDescription>
                )}
              </div>
              <div>
                <CountryPhoneInput
                  countryCode={register('countryCode')}
                  localPhone={register('localPhone')}
                  countryInfo={countryInfo}
                  errors={errors}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold">{t('address')}</h3>
            <AddressInput 
              addressCountry={register('addressCountry')}
              addressStreet={register('addressStreet')}
              addressCity={register('addressCity')}
              addressPostalCode={register('addressPostalCode')}
              onCountryChange={(countryInfo) => setCountryInfo(countryInfo)}
              errors={errors}
            />
          </div>

          {/* Booking Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('booking_details')}</h3>
            <StayDateSelector 
              checkIn={register('checkInDate')}
              checkOut={register('checkOutDate')}
              arrivalTime={register('arrivalTime')}
              errors={errors}
            />
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <div className="flex items-center">
              <Input
                type="checkbox"
                id="consentGiven"
                {...register('consentGiven')}
              />
              <Label htmlFor="consentGiven" className="ml-2">
                {t('registration.consent_text')}
              </Label>
            </div>
            {errors.consentGiven && (
              <Alert variant="destructive">
                <AlertDescription>
                  {t('validation.required')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!isAuthenticated}>
            {t('submit')}
          </Button>
        </form>
      )}
    </Card>
  );
};
