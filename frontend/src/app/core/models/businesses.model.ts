export interface Business {
  id:             string;
  name:           string;
  category:       string;
  description:    string;
  location:       string;
  rating:         number;
  reviews:        number;
  tags:           string[];
  available:      number;
  total:          number;
  routePath:      string;
  gradient:       string;
  icon:           string;
  // Extended fields
  schedule?:      string;
  logo?:          string;
  phone?:         string;
  facebook?:      string;
  instagram?:     string;
  tiktok?:        string;
  whatsapp?:      string;
  linkedin?:      string;
  active?:        boolean;
  sheetId?:       string;
  appsScriptUrl?: string;
  verified?:      boolean;
  cancellationPolicy?: string;
}

export interface Review {
  id: number;
  businessId: string;
  rating: number;
  review: string;
  createdAt: string;
}

export interface NewBusinessPayload {
  name:          string;
  category:      string;
  description?:  string;
  location?:     string;
  gradient?:     string;
  icon?:         string;
  schedule?:     string;
  logo?:         string;
  phone?:        string;
  facebook?:     string;
  instagram?:    string;
  tiktok?:       string;
  whatsapp?:     string;
  linkedin?:     string;
  tags?:         string[] | string;
  pin:           string;
}

export interface Owner {
  id:    string;
  name:  string;
  email: string;
}

export interface OwnerAuthPayload {
  name:     string;
  email:    string;
  password: string;
}
