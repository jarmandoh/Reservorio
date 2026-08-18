import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiResponse } from '../models/reservation.model';
import { Business, NewBusinessPayload } from '../models/businesses.model';
import { AuthService } from './auth.service';
import { BusinessService } from './business.service';

export interface OwnerBusinessFormValues {
  name: string | null;
  category: string | null;
  description: string | null;
  location: string | null;
  phone: string | null;
  logo: string | null;
  tags: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
  whatsapp: string | null;
  linkedin: string | null;
  pin: string | null;
}

@Injectable({ providedIn: 'root' })
export class OwnerBusinessService {
  private readonly auth = inject(AuthService);
  private readonly businessService = inject(BusinessService);

  loadBusinesses(): Observable<Business[]> {
    const token = this.auth.getOwnerToken();
    if (!token) {
      return throwError(() => new Error('No owner token available'));
    }

    return this.businessService.getOwnerBusinesses(token);
  }

  saveBusiness(formValues: OwnerBusinessFormValues, currentBusiness: Business | null): Observable<ApiResponse> {
    const token = this.auth.getOwnerToken();
    if (!token) {
      return throwError(() => new Error('No owner token available'));
    }

    const payload: NewBusinessPayload = this.toBusinessPayload(formValues);

    if (currentBusiness) {
      return this.businessService.updateBusiness(currentBusiness.id, payload, token);
    }

    return this.businessService.createBusiness(payload, token);
  }

  createDefaults(): OwnerBusinessFormValues {
    return {
      name: '',
      category: '',
      description: '',
      location: '',
      phone: '',
      logo: '',
      tags: '',
      facebook: '',
      instagram: '',
      tiktok: '',
      whatsapp: '',
      linkedin: '',
      pin: '',
    };
  }

  editDefaults(negocio: Business): OwnerBusinessFormValues {
    return {
      name: negocio.name ?? '',
      category: negocio.category ?? '',
      description: negocio.description ?? '',
      location: negocio.location ?? '',
      phone: negocio.phone ?? '',
      logo: negocio.logo ?? '',
      tags: negocio.tags?.join(', ') ?? '',
      facebook: negocio.facebook ?? '',
      instagram: negocio.instagram ?? '',
      tiktok: negocio.tiktok ?? '',
      whatsapp: negocio.whatsapp ?? '',
      linkedin: negocio.linkedin ?? '',
      pin: '',
    };
  }

  private toBusinessPayload(formValues: OwnerBusinessFormValues): NewBusinessPayload {
    const tags = (formValues.tags ?? '')
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);

    return {
      name: String(formValues.name ?? '').trim(),
      category: String(formValues.category ?? '').trim(),
      description: String(formValues.description ?? '').trim(),
      location: String(formValues.location ?? '').trim(),
      phone: String(formValues.phone ?? '').trim(),
      logo: String(formValues.logo ?? '').trim(),
      tags,
      facebook: String(formValues.facebook ?? '').trim(),
      instagram: String(formValues.instagram ?? '').trim(),
      tiktok: String(formValues.tiktok ?? '').trim(),
      whatsapp: String(formValues.whatsapp ?? '').trim(),
      linkedin: String(formValues.linkedin ?? '').trim(),
      pin: String(formValues.pin ?? '').trim(),
    };
  }
}
