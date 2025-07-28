// Original arrival time picker from client/ - exact restoration
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

interface ArrivalTimePickerProps {
  checkInDate: string;
  value?: string;
  onChange: (time: string) => void;
  error?: string;
}

// Convert 24h time to 12h AM/PM format
const convertTo12Hour = (time24: string): string => {
  if (!time24 || !time24.includes(':')) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${period}`;
};

// Get default arrival time based on check-in date
const getDefaultArrivalTime = (checkInDate: string): string => {
  const today = new Date();
  const checkIn = new Date(checkInDate);
  
  // If check-in is today and it's before 15:00, default to current time + 1 hour
  if (checkIn.toDateString() === today.toDateString()) {
    const currentHour = today.getHours();
    if (currentHour < 15) {
      const nextHour = (currentHour + 1) % 24;
      return `${nextHour.toString().padStart(2, '0')}:00`;
    }
  }
  
  // Otherwise default to 15:00 (3 PM)
  return '15:00';
};

export const ArrivalTimePicker: React.FC<ArrivalTimePickerProps> = ({
  checkInDate,
  value,
  onChange,
  error
}) => {
  const { t } = useI18n();
  const [selectedTime, setSelectedTime] = useState(value || getDefaultArrivalTime(checkInDate));

  // Update default time when check-in date changes
  useEffect(() => {
    if (!value) {
      const defaultTime = getDefaultArrivalTime(checkInDate);
      setSelectedTime(defaultTime);
      onChange(defaultTime);
    }
  }, [checkInDate, value, onChange]);

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
    onChange(newTime);
  };

  const generateTimeOptions = () => {
    const options = [];
    const today = new Date();
    const checkIn = new Date(checkInDate);
    const isToday = checkIn.toDateString() === today.toDateString();
    
    // For today: start from current hour, for future dates: start from 00:00
    const startHour = isToday ? today.getHours() : 0;
    const endHour = isToday ? Math.min(23, today.getHours() + 12) : 23; // Show next 12 hours for today
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeStr);
      }
    }
    
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {t('arrival.estimated_time')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="arrival-time">{t('arrival.select_time')}</Label>
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <Input
                id="arrival-time"
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className={`w-full ${error ? 'border-red-500' : ''}`}
                min={timeOptions[0]}
                max={timeOptions[timeOptions.length - 1]}
              />
            </div>
            <div className="text-sm text-gray-600 min-w-[80px]">
              {selectedTime && (
                <span className="font-mono">
                  {convertTo12Hour(selectedTime)}
                </span>
              )}
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          
          <div className="text-xs text-gray-500 mt-2">
            <p>{t('arrival.time_note')}</p>
            <p className="mt-1">{t('arrival.cancellation_policy')}</p>
          </div>
        </div>

        {/* Quick time selection buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['15:00', '16:00', '17:00', '18:00'].map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => handleTimeChange(time)}
              className={`px-3 py-2 text-sm border rounded transition-colors ${
                selectedTime === time
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {time}
              <div className="text-xs opacity-75">
                {convertTo12Hour(time)}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};