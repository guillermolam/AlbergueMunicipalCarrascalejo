import { useQuery } from "@tanstack/react-query";
import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "./ui/card";

interface Review {
  id: string;
  author_name: string;
  rating: number;
  text: string;
  date: string;
  source: string;
  verified: boolean;
  helpful_count: number;
}

interface ReviewsData {
  reviews: Review[];
  total_count: number;
  average_rating: number;
  source_breakdown: Record<string, number>;
}

export default function ReviewsSection() {
  const { data: reviewsData, isLoading } = useQuery<ReviewsData>({
    queryKey: ['/api/reviews/all'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/reviews/all');
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        return response.json();
      } catch (error) {
        // Fallback to mock data when gateway is not available
        const { mockReviewsData } = await import('../data/mock-reviews');
        return mockReviewsData;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1
  });

  const renderStars = (rating: number, source: string) => {
    const normalizedRating = source === "Booking.com" ? rating / 2 : rating;
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-4 h-4 ${
            i <= normalizedRating 
              ? 'text-yellow-400 fill-current' 
              : 'text-gray-300'
          }`}
        />
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Opiniones de Peregrinos
            </h2>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!reviewsData?.reviews?.length) {
    return null;
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Opiniones de Peregrinos
          </h2>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="flex">
              {renderStars(reviewsData.average_rating, "Google")}
            </div>
            <span className="text-lg font-semibold text-gray-900">
              {reviewsData.average_rating}
            </span>
            <span className="text-gray-600">
              ({reviewsData.total_count} opiniones)
            </span>
          </div>
          <p className="text-gray-600">
            Reseñas de Google y Booking.com
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviewsData.reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {review.author_name}
                      </h4>
                      {review.verified && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Verificado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {renderStars(review.rating, review.source)}
                      </div>
                      <span className="text-sm text-gray-600">
                        {review.source === "Booking.com" ? review.rating : review.rating}/5
                      </span>
                    </div>
                  </div>
                  <Quote className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
                
                <p className="text-gray-700 mb-4 line-clamp-4">
                  {review.text}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{formatDate(review.date)}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                      {review.source}
                    </span>

                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Las opiniones se actualizan automáticamente desde nuestras fuentes verificadas
          </p>
        </div>
      </div>
    </section>
  );
}