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
