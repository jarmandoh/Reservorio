import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, Reservation, UpdatePayload, BookingPayload } from '../models/reservation.model';
import { Categoria } from '../models/categorias.model';
import { Business, NewBusinessPayload } from '../models/businesses.model';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  ensureAdminToken(): Observable<string> {
    const cached = this.auth.getAdminToken();
    if (cached) return of(cached);

    return this.auth.loginAdmin(this.auth.storedPin).pipe(
      map(res => {
        const token = res.data?.token ?? this.auth.getAdminToken();
        if (!token) throw new Error('No se pudo autenticar como administrador');
        return token;
      })
    );
  }

  getReservations(): Observable<Reservation[]> {
    return this.api.getReservations();
  }

  getServices(): Observable<string[]> {
    return this.api.getServices();
  }

  createService(nombre: string): Observable<ApiResponse> {
    return this.api.createService(nombre);
  }

  deleteService(nombre: string): Observable<ApiResponse> {
    return this.api.deleteService(nombre);
  }

  updateReservation(payload: UpdatePayload): Observable<ApiResponse> {
    return this.api.updateReservation(payload);
  }

  createReservation(payload: BookingPayload): Observable<ApiResponse> {
    return this.api.createReservation(payload);
  }

  getCategories(): Observable<Categoria[]> {
    return this.api.getCategories();
  }

  getTags(): Observable<string[]> {
    return this.api.getTags();
  }

  getAllBusinesses(token: string): Observable<Business[]> {
    return this.api.getAllBusinesses(token);
  }

  createBusiness(payload: NewBusinessPayload, token: string): Observable<ApiResponse<Business>> {
    return this.api.createBusiness(payload, token);
  }

  updateBusiness(id: string, payload: Partial<NewBusinessPayload> & { pin?: string }, token: string): Observable<ApiResponse> {
    return this.api.updateBusiness(id, payload, token);
  }

  toggleBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.api.toggleBusiness(id, token);
  }

  verifyBusiness(id: string, verified: boolean, token: string): Observable<ApiResponse> {
    return this.api.verifyBusiness(id, verified, token);
  }

  deleteBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.api.deleteBusiness(id, token);
  }
}
