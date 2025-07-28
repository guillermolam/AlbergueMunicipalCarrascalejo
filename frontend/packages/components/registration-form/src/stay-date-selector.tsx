import React, { useState } from 'react';
import { Calendar } from '@ui/components/calendar';
import { Button } from '@ui/components/button';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Alert } from '@ui/components/alert';
import { useI18n } from '@i18n';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StayDateSelectorProps {
  checkIn: any;
  checkOut: any;
  arrivalTime: any;
  errors: any;
}

export const StayDateSelector: React.FC<StayDateSelectorProps> = ({
  checkIn,
  checkOut,
  arrivalTime,
  errors,
}) => {
  const { t } = useI18n();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="checkInDate">{t('check_in_date')}</Label>
          <div className="relative">
            <Input
              id="checkInDate"
              type="text"
              {...checkIn}
              placeholder="Selecciona fecha de entrada"
              onClick={() => setCalendarOpen(true)}
              className="cursor-pointer"
            />
            <Button
              variant="outline"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setCalendarOpen(true)}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
          {errors.checkInDate && (
            <Alert variant="destructive">
              <AlertDescription>{errors.checkInDate.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label htmlFor="checkOutDate">{t('check_out_date')}</Label>
          <div className="relative">
            <Input
              id="checkOutDate"
              type="text"
              {...checkOut}
              placeholder="Selecciona fecha de salida"
              onClick={() => setCalendarOpen(true)}
              className="cursor-pointer"
            />
            <Button
              variant="outline"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setCalendarOpen(true)}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </div>
          {errors.checkOutDate && (
            <Alert variant="destructive">
              <AlertDescription>{errors.checkOutDate.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div>
          <Label htmlFor="arrivalTime">{t('arrival_time')}</Label>
          <Input
            id="arrivalTime"
            type="text"
            value={`${t('registration.booking_details.arrival_date')} - ${t('registration.booking_details.departure_date')} time`}
            {...arrivalTime}
            placeholder="HH:mm"
          />
          {errors.arrivalTime && (
            <Alert variant="destructive">
              <AlertDescription>{errors.arrivalTime.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {calendarOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <Calendar
            mode="range"
            selected={[
              checkIn.value ? new Date(checkIn.value) : null,
              checkOut.value ? new Date(checkOut.value) : null,
            ]}
            onSelect={(range) => {
              if (range.from) checkIn.onChange(format(range.from, 'yyyy-MM-dd'));
              if (range.to) checkOut.onChange(format(range.to, 'yyyy-MM-dd'));
              setCalendarOpen(false);
            }}
            initialFocus
            locale={es}
          />
        </div>
      )}
    </div>
  );
};
