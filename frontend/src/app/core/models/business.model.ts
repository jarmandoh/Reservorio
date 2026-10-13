import type { Owner } from './owner.model';

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
