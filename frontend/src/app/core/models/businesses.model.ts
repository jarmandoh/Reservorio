export interface Business {
  id: string;
  name: string;
  category: string;
  businessType: 'appointment' | 'onsite_service';
  profession?: string;
  description: string;
  location: string;
  rating: number;
  reviews: number;
  tags: string[];
  available: number;
  total: number;
  routePath: string;
  gradient: string;
  icon: string;
  // Extended fields
  schedule?: string;
  logo?: string;
  storeCoverImage?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  linkedin?: string;
  active?: boolean;
  sheetId?: string;
  appsScriptUrl?: string;
  verified?: boolean;
  cancellationPolicy?: string;
  businessOwner?: Owner;
}

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

export interface NewBusinessPayload {
  name: string;
  category: string;
  businessType?: 'appointment' | 'onsite_service';
  profession?: string;
  description?: string;
  location?: string;
  gradient?: string;
  icon?: string;
  schedule?: string;
  logo?: string;
  storeCoverImage?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  whatsapp?: string;
  linkedin?: string;
  tags?: string[] | string;
  pin: string;
  verified?: boolean;
  cancellationPolicy?: string;
}

export interface Owner {
  id: string;
  name: string;
  email: string;
}

export interface OwnerAuthPayload {
  name: string;
  email: string;
  password: string;
}

export interface CatalogProduct {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl: string;
  imagePublicId: string;
  active: boolean;
}

export interface CloudinaryUploadSignature {
  apiKey: string;
  cloudName: string;
  publicId: string;
  signature: string;
  timestamp: number;
}

export interface CloudinaryUploadedImage {
  secure_url: string;
  public_id: string;
}
