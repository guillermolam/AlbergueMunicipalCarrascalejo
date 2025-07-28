// Original booking confirmation from client/ - exact restoration
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MapPin, Clock, User, Mail, Phone, CreditCard } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { RegistrationFormData } from '@/stores/registration-store';
import { StayData } from './stay-info-form';

interface BookingConfirmationProps {
  formData: RegistrationFormData;
  stayData: StayData;
  bedInfo?: {
    roomName: string;
    bedNumber: number;
    position: 'top' | 'bottom';
    bunkNumber: number;
  };
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  formData,
  stayData,
  bedInfo,
  onConfirm,
  onBack,
  isSubmitting = false
}) => {
  const { t } = useI18n();

  const formatTime12Hour = (time24: string): string => {
    if (!time24 || !time24.includes(':')) return time24;
    
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minutes} ${period}`;
  };

  const totalAmount = stayData.nights * 15; // €15 per night

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-800">
            {t('confirmation.review_booking')}
          </CardTitle>
          <p className="text-green-700 mt-2">
            {t('confirmation.review_details')}
          </p>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('confirmation.personal_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('registration.first_name')}</p>
              <p className="font-medium">{formData.firstName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('registration.last_name_1')}</p>
              <p className="font-medium">{formData.lastName1}</p>
            </div>
            {formData.lastName2 && (
              <div>
                <p className="text-sm text-gray-600">{t('registration.last_name_2')}</p>
                <p className="font-medium">{formData.lastName2}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">{t('registration.document')}</p>
              <p className="font-medium">{formData.documentType} {formData.documentNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('registration.birth_date')}</p>
              <p className="font-medium">{formData.birthDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('registration.nationality')}</p>
              <p className="font-medium">{formData.nationality}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {t('confirmation.contact_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('registration.email')}</p>
              <p className="font-medium">{formData.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('registration.phone')}</p>
              <p className="font-medium">{formData.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stay Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t('confirmation.stay_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('stay.check_in')}</p>
              <p className="font-medium">{stayData.checkInDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('stay.check_out')}</p>
              <p className="font-medium">{stayData.checkOutDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('stay.nights')}</p>
              <p className="font-medium">{stayData.nights}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('arrival.estimated_time')}</p>
              <p className="font-medium">
                {formData.estimatedArrivalTime} ({formatTime12Hour(formData.estimatedArrivalTime || '')})
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bed Assignment */}
      {bedInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('confirmation.bed_assignment')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-900">{bedInfo.roomName}</p>
                <p className="text-blue-700">
                  {bedInfo.position === 'top' ? 'Top' : 'Bottom'} Bed {bedInfo.bedNumber} (Bunk {bedInfo.bunkNumber})
                </p>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {t('bed_selection.confirmed')}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t('confirmation.payment_info')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">{stayData.nights} × €15.00 per night</p>
              <p className="text-sm text-gray-600">Payment method: {formData.paymentType}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">€{totalAmount.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-1" />
            <div className="text-amber-800">
              <p className="font-medium mb-2">{t('confirmation.important_notice')}</p>
              <ul className="text-sm space-y-1">
                <li>• {t('confirmation.cancellation_policy')}</li>
                <li>• {t('confirmation.check_in_time')}</li>
                <li>• {t('confirmation.payment_due')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1"
        >
          {t('confirmation.back')}
        </Button>
        <Button 
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 bg-[#45c655] hover:bg-[#3bb048]"
        >
          {isSubmitting ? t('confirmation.processing') : t('confirmation.confirm_booking')}
        </Button>
      </div>
    </div>
  );
};