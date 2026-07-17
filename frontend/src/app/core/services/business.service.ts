import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/reservation.model';
import { Business, NewBusinessPayload } from '../models/businesses.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private readonly api = inject(ApiService);

  getOwnerBusinesses(token: string): Observable<Business[]> {
    return this.api.getOwnerBusinesses(token);
  }

  getAllBusinesses(token: string): Observable<Business[]> {
    return this.api.getAllBusinesses(token);
  }

  createBusiness(payload: NewBusinessPayload, token: string): Observable<ApiResponse> {
    return this.api.createBusiness(payload, token);
  }

  updateBusiness(id: string, payload: Partial<NewBusinessPayload> & { pin?: string }, token: string): Observable<ApiResponse> {
    return this.api.updateBusiness(id, payload, token);
  }

  toggleBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.api.toggleBusiness(id, token);
  }

  deleteBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.api.deleteBusiness(id, token);
  }
}
