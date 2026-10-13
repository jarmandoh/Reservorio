export interface Review {
  id: number;
  businessId: string;
  rating: number;
  review: string;
  createdAt: string;
}

export interface RatingStats {
  businessId: string;
  averageRating: number;
  reviewCount: number;
}
