import React from 'react';
import { ReviewCard } from './review-card';
import { Card } from '@ui/card';
import { Button } from '@ui/button';
import { ChevronRight } from 'lucide-react';

interface ReviewsSectionProps {
  reviews: Array<{
    id: string;
    author_name: string;
    rating: number;
    text: string;
    date: string;
    source: string;
    verified: boolean;
    helpful_count: number;
  }>;
  title?: string;
  showMore?: boolean;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({
  reviews,
  title = 'Guest Reviews',
  showMore = true
}) => {
  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  const totalReviews = reviews.length;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showMore && (
          <Button variant="outline">
            <ChevronRight className="mr-2 h-4 w-4" />
            View All Reviews
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-4xl font-bold">{averageRating.toFixed(1)}</span>
          <span className="text-muted-foreground">/ 5</span>
        </div>
        <span className="text-muted-foreground">{totalReviews} reviews</span>
      </div>

      <div className="space-y-6">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </Card>
  );
};
