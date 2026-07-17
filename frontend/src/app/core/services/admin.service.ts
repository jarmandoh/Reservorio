import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiResponse, Reservation, UpdatePayload, BookingPayload } from '../models/reservation.model';
import { Categoria } from '../models/categorias.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

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
}
