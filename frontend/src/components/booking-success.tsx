// Original booking success from client/ - exact restoration
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MapPin, Camera, Utensils, Coffee, Mountain, Church, Info } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';

interface BookingSuccessProps {
  bookingReference: string;
  onNewBooking: () => void;
}

const ActivityCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  distance?: string;
  category: 'attraction' | 'restaurant' | 'service';
}> = ({ icon, title, description, distance, category }) => {
  const getCategoryColor = () => {
    switch (category) {
      case 'attraction': return 'bg-blue-50 border-blue-200';
      case 'restaurant': return 'bg-orange-50 border-orange-200';
      case 'service': return 'bg-green-50 border-green-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={`${getCategoryColor()} hover:shadow-md transition-shadow cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
            {icon}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
            <p className="text-sm text-gray-600 mb-2">{description}</p>
            {distance && (
              <Badge variant="outline" className="text-xs">
                {distance}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const BookingSuccess: React.FC<BookingSuccessProps> = ({
  bookingReference,
  onNewBooking
}) => {
  const { t } = useI18n();

  const attractions = [
    {
      icon: <Church className="w-5 h-5 text-blue-600" />,
      title: "Iglesia de Santa María",
      description: "Historic 12th century church with beautiful Romanesque architecture",
      distance: "300m walk",
      category: 'attraction' as const
    },
    {
      icon: <Mountain className="w-5 h-5 text-green-600" />,
      title: "Carrascalejo Nature Trail",
      description: "Scenic hiking trail through oak forests with mountain views",
      distance: "500m",
      category: 'attraction' as const
    },
    {
      icon: <Camera className="w-5 h-5 text-purple-600" />,
      title: "Mirador del Valle",
      description: "Panoramic viewpoint overlooking the Camino valley",
      distance: "1.2km",
      category: 'attraction' as const
    }
  ];

  const restaurants = [
    {
      icon: <Utensils className="w-5 h-5 text-orange-600" />,
      title: "Restaurante El Peregrino",
      description: "Traditional Spanish cuisine with pilgrim menu",
      distance: "200m",
      category: 'restaurant' as const
    },
    {
      icon: <Coffee className="w-5 h-5 text-brown-600" />,
      title: "Café del Camino",
      description: "Coffee, pastries, and light meals for pilgrims",
      distance: "150m",
      category: 'restaurant' as const
    }
  ];

  const services = [
    {
      icon: <MapPin className="w-5 h-5 text-red-600" />,
      title: "Farmacia San Pedro",
      description: "Full pharmacy with pilgrim supplies and first aid",
      distance: "400m",
      category: 'service' as const
    },
    {
      icon: <Info className="w-5 h-5 text-blue-600" />,
      title: "Tourist Information",
      description: "Maps, guides, and local recommendations",
      distance: "300m",
      category: 'service' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl text-green-800 mb-2">
            {t('success.congratulations')}
          </CardTitle>
          <p className="text-lg text-green-700 mb-4">
            {t('success.booking_confirmed')}
          </p>
          <div className="bg-white rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600 mb-1">{t('success.reference_number')}</p>
            <p className="text-2xl font-mono font-bold text-gray-900">{bookingReference}</p>
          </div>
        </CardHeader>
      </Card>

      {/* Confirmation Details */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="text-center text-blue-800">
            <h3 className="font-semibold mb-3">{t('success.what_happens_next')}</h3>
            <div className="space-y-2 text-sm">
              <p>✓ {t('success.email_sent')}</p>
              <p>✓ {t('success.owner_notified')}</p>
              <p>✓ {t('success.government_submitted')}</p>
              <p>✓ {t('success.bed_reserved')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities and Recommendations */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl">
              {t('success.explore_area')}
            </CardTitle>
            <p className="text-center text-gray-600">
              {t('success.recommendations')}
            </p>
          </CardHeader>
        </Card>

        {/* Attractions */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            {t('success.attractions')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attractions.map((attraction, index) => (
              <ActivityCard key={index} {...attraction} />
            ))}
          </div>
        </div>

        {/* Restaurants */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-600" />
            {t('success.dining')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {restaurants.map((restaurant, index) => (
              <ActivityCard key={index} {...restaurant} />
            ))}
          </div>
        </div>

        {/* Services */}
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Info className="w-5 h-5 text-green-600" />
            {t('success.services')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service, index) => (
              <ActivityCard key={index} {...service} />
            ))}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="text-center text-amber-800">
            <h3 className="font-semibold mb-3">{t('success.need_help')}</h3>
            <div className="space-y-1 text-sm">
              <p>{t('success.contact_reception')}</p>
              <p className="font-medium">📞 +34 987 123 456</p>
              <p className="font-medium">📧 info@alberguedelcarrascalejo.com</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="text-center">
        <Button 
          onClick={onNewBooking}
          className="bg-[#45c655] hover:bg-[#3bb048] px-8 py-3"
        >
          {t('success.new_booking')}
        </Button>
      </div>
    </div>
  );
};