import React from 'react';
import { Card } from '@ui/card';
import { Stars } from '@ui/icons';
import { Badge } from '@ui/badge';
import { format } from 'date-fns';

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

export const ReviewCard: React.FC<{ review: Review }> = ({ review }) => {
  const formattedDate = format(new Date(review.date), 'MMMM d, yyyy');

  return (
    <Card className="p-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Stars className="text-yellow-500" />
          <span className="text-lg font-semibold">{review.rating}</span>
        </div>
        <Badge variant={review.verified ? 'default' : 'secondary'}>
          {review.verified ? 'Verified' : 'Unverified'}
        </Badge>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">{review.author_name}</h3>
        <p className="text-muted-foreground">{review.source}</p>
        <p className="text-muted-foreground">{formattedDate}</p>
      </div>
      <p className="mt-4 text-justify">{review.text}</p>
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <span>Helpful: {review.helpful_count}</span>
      </div>
    </Card>
  );
};
