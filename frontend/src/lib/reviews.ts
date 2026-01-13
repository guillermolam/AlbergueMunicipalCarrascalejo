export interface Review {
  id: string;
  pilgrimId: string;
  pilgrimName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  date: string;
  verified: boolean;
  helpful: number;
  response?: {
    author: string;
    comment: string;
    date: string;
  };
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface CreateReviewRequest {
  pilgrimId: string;
  rating: number;
  title: string;
  comment: string;
}

export interface UpdateReviewRequest {
  reviewId: string;
  helpful?: boolean;
  response?: {
    comment: string;
  };
}

export async function getReviews(limit: number = 10, offset: number = 0): Promise<Review[]> {
  const response = await fetch(`/api/reviews?limit=${limit}&offset=${offset}`);

  if (!response.ok) {
    throw new Error('Failed to get reviews');
  }

  return response.json();
}

export async function getReviewStats(): Promise<ReviewStats> {
  const response = await fetch('/api/reviews/stats');

  if (!response.ok) {
    throw new Error('Failed to get review statistics');
  }

  return response.json();
}

export async function createReview(request: CreateReviewRequest): Promise<Review> {
  const response = await fetch('/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to create review');
  }

  return response.json();
}

export async function updateReview(request: UpdateReviewRequest): Promise<Review> {
  const response = await fetch(`/api/reviews/${request.reviewId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to update review');
  }

  return response.json();
}

export async function getPilgrimReviews(pilgrimId: string): Promise<Review[]> {
  const response = await fetch(`/api/reviews/pilgrim/${pilgrimId}`);

  if (!response.ok) {
    throw new Error('Failed to get pilgrim reviews');
  }

  return response.json();
}
