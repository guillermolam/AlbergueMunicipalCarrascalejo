// Original stay info form from client/ - exact restoration
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Plus, Minus, Euro } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useI18n } from "@/contexts/i18n-context";
import { MAX_NIGHTS } from "@/lib/constants";

interface StayInfoFormProps {
  onContinue: (stayData: StayData) => void;
}

export interface StayData {
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
}

export function StayInfoForm({ onContinue }: StayInfoFormProps) {
  const { t, formatDate } = useI18n();
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [nights, setNights] = useState(2); // Default 2 nights
  const [guests] = useState(1); // Fixed to 1 for individual registration
  
  // Set today as default check-in date
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setCheckInDate(todayStr);
    
    // Calculate default checkout date (today + 2 nights)
    const checkoutDate = new Date(today);
    checkoutDate.setDate(checkoutDate.getDate() + 2);
    setCheckOutDate(checkoutDate.toISOString().split('T')[0]);
  }, []);

  // Fetch secure pricing from backend (prevents CSRF/MitM attacks)
  const { data: pricing } = useQuery({
    queryKey: ['/api/pricing'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/pricing');
      return response.json();
    }
  });

  const { data: availability, isLoading, error } = useQuery({
    queryKey: ['/api/availability', checkInDate, checkOutDate, guests],
    enabled: !!(checkInDate && checkOutDate),
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/availability', {
        checkInDate,
        checkOutDate,
        numberOfPersons: guests
      });
      return response.json();
    }
  });

  // Use secure pricing from backend (defaults to 15 EUR if not loaded)
  const pricePerNight = pricing?.dormitory || 15;

  const handleCheckInDateChange = (date: string) => {
    setCheckInDate(date);
    
    // Auto-update checkout date based on current nights setting
    if (date) {
      const startDate = new Date(date);
      const newCheckOutDate = new Date(startDate);
      newCheckOutDate.setDate(newCheckOutDate.getDate() + nights);
      setCheckOutDate(newCheckOutDate.toISOString().split('T')[0]);
    }
  };

  const handleCheckOutDateChange = (date: string) => {
    setCheckOutDate(date);
    if (checkInDate && date) {
      const startDate = new Date(checkInDate);
      const endDate = new Date(date);
      
      // Validate that checkout is after checkin
      if (endDate <= startDate) {
        // Reset to minimum 1 night
        const newCheckOutDate = new Date(startDate);
        newCheckOutDate.setDate(newCheckOutDate.getDate() + 1);
        setCheckOutDate(newCheckOutDate.toISOString().split('T')[0]);
        setNights(1);
        return;
      }
      
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setNights(diffDays);
    }
  };

  const handleNightsChange = (nightsValue: number) => {
    const validNights = Math.max(1, Math.min(MAX_NIGHTS, nightsValue));
    setNights(validNights);
    if (checkInDate) {
      const startDate = new Date(checkInDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + validNights);
      setCheckOutDate(endDate.toISOString().split('T')[0]);
    }
  };

  const adjustNights = (delta: number) => {
    handleNightsChange(nights + delta);
  };

  const handleNightsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    if (value === '') {
      setNights(1);
    } else {
      const numValue = parseInt(value);
      handleNightsChange(numValue);
    }
  };

  const handleContinue = () => {
    if (availability?.available) {
      onContinue({
        checkInDate,
        checkOutDate,
        nights,
        guests
      });
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6 font-title">
          {t('stay.title')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-gray-700 mb-2">
              {t('stay.dates')}
            </Label>
            <div className="flex space-x-2">
              <Input
                type="date"
                value={checkInDate}
                onChange={(e) => handleCheckInDateChange(e.target.value)}
                min={today}
                className="flex-1"
              />
              <Input
                type="date"
                value={checkOutDate}
                onChange={(e) => handleCheckOutDateChange(e.target.value)}
                min={checkInDate || today}
                className="flex-1"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">
              {t('stay.nights')}
            </Label>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustNights(-1)}
                disabled={nights <= 1}
                className="px-2"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                value={nights}
                onChange={handleNightsInputChange}
                className="flex-1 text-center"
                placeholder="2"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => adjustNights(1)}
                disabled={nights >= MAX_NIGHTS}
                className="px-2"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Max {MAX_NIGHTS} nights
            </p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2">
              {t('stay.guests')}
            </Label>
            <Select value="1" disabled>
              <SelectTrigger className="w-full">
                <SelectValue>1 {t('stay.guest_single')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 {t('stay.guest_single')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {t('stay.individual_only')}
            </p>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="bg-gray-50 px-4 py-3 rounded-md mb-6 border-l-4 border-[hsl(75,25%,55%)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-6">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-800">{pricePerNight}€</span> × {nights} {nights === 1 ? t('pricing.night') : t('pricing.nights')}
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-[#45c655]">{nights * pricePerNight}€</span> {t('pricing.total')}
              </div>
            </div>
            <div className="text-xs text-gray-500 italic">
              {t('pricing.payment_due')}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              {t('pricing.accepted_methods')}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-6 h-4 bg-[#45c655] rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">€</span>
              </div>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Former_Visa_%28company%29_logo.svg/330px-Former_Visa_%28company%29_logo.svg.png" 
                alt="Visa" 
                className="h-4 w-auto"
                title="Visa cards accepted"
              />
              <img 
                src="https://brand.mastercard.com/content/dam/mccom/brandcenter/thumbnails/mastercard_circles_92px_2x.png" 
                alt="Mastercard" 
                className="h-4 w-auto"
                title="Mastercard accepted"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/2/2b/Bizum.svg" 
                alt="Bizum" 
                className="h-4 w-auto"
                title="Bizum mobile payments accepted"
              />
            </div>
          </div>
        </div>
        
        {isLoading && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('loading.processing')}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('notifications.error')}
            </AlertDescription>
          </Alert>
        )}

        {availability && (
          <div className="mb-6">
            {availability.available ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-800">
                  {t('stay.available', { count: availability.availableBeds })}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('stay.not_available')}
                  {availability.nextAvailableDate && (
                    <div className="mt-2">
                      {t('stay.next_available', { date: formatDate(availability.nextAvailableDate) })}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!availability?.available || isLoading}
          className="w-full bg-[#45c655] hover:bg-[#3bb048] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {t('stay.continue')}
          <span className="ml-2">→</span>
        </Button>
      </CardContent>
    </Card>
  );
}