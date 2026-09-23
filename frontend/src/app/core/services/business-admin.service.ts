import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { ApiResponse, BookingRecord, Customer, Payment, PaymentRequest, Reservation, UpdatePayload } from '../models/reservation.model';
import { Business } from '../models/businesses.model';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

export interface BusinessAdminProfileValues {
  name: string | null;
  category: string | null;
  description: string | null;
  location: string | null;
  schedule: string | null;
  phone: string | null;
  cancellationPolicy?: string | null;
}

@Injectable({ providedIn: 'root' })
export class BusinessAdminService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  loadBusiness(negocioId: string, token: string): Observable<Business> {
    return this.api.getBusinessById(negocioId, token);
  }

  loadReservations(negocioId: string): Observable<Reservation[]> {
    return this.api.getBusinessReservations(negocioId);
  }

  loadMarketplaceBookings(): Observable<BookingRecord[]> {
    return this.api.getBookings();
  }

  loadCustomers(): Observable<Customer[]> {
    return this.api.getCustomers();
  }

  loadPayments(): Observable<Payment[]> {
    return this.api.getPayments();
  }

  loadNotifications(businessId: string, bookingId?: string): Observable<any[]> {
    return this.api.getNotifications(businessId, bookingId);
  }

  createNotification(payload: { businessId: string; customerId?: string; bookingId?: string; type?: string; channel?: string; title: string; message: string; status?: string }): Observable<ApiResponse<any>> {
    return this.api.createNotification(payload);
  }

  createPayment(payload: PaymentRequest): Observable<ApiResponse<Payment>> {
    return this.api.createPayment(payload);
  }

  createCheckoutSession(payload: PaymentRequest & { successUrl?: string; cancelUrl?: string }): Observable<ApiResponse<{ sessionId: string; checkoutUrl: string; paymentId?: string }>> {
    return this.api.createCheckoutSession(payload);
  }

  loadServices(negocioId: string): Observable<string[]> {
    return this.api.getBusinessServices(negocioId);
  }

  addService(negocioId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.api.createBusinessService(negocioId, nombre, token);
  }

  removeService(negocioId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.api.deleteBusinessService(negocioId, nombre, token);
  }

  saveProfile(negocioId: string, values: BusinessAdminProfileValues, token: string): Observable<ApiResponse> {
    return this.api.updateBusiness(negocioId, {
      name: String(values.name ?? '').trim(),
      category: String(values.category ?? '').trim(),
      description: String(values.description ?? '').trim(),
      location: String(values.location ?? '').trim(),
      schedule: String(values.schedule ?? '').trim(),
      phone: String(values.phone ?? '').trim(),
      cancellationPolicy: String(values.cancellationPolicy ?? '').trim(),
    }, token);
  }

  updatePin(negocioId: string, pin: string, token: string): Observable<ApiResponse> {
    return this.api.updateBusiness(negocioId, { pin } as any, token);
  }

  updateReservationStatus(negocioId: string, payload: UpdatePayload, token: string): Observable<ApiResponse> {
    return this.api.updateBusinessReservation(negocioId, payload, token);
  }

  getGoogleStatus(negocioId: string, token: string): Observable<any> {
    return this.api.getGoogleStatus(negocioId, token);
  }

  getGoogleAuthUrl(negocioId: string, token: string): Observable<string> {
    return this.api.getGoogleAuthUrl(negocioId, token);
  }

  syncGoogleSheet(negocioId: string, token: string): Observable<ApiResponse> {
    return this.api.syncGoogleSheet(negocioId, token);
  }

  createGoogleSheet(negocioId: string, token: string): Observable<ApiResponse & { sheetId?: string }> {
    return this.api.createGoogleSheet(negocioId, token);
  }

  linkGoogleSheet(negocioId: string, sheetId: string, token: string): Observable<ApiResponse> {
    return this.api.linkGoogleSheet(negocioId, sheetId, token);
  }

  disconnectGoogle(negocioId: string, token: string): Observable<ApiResponse> {
    return this.api.disconnectGoogle(negocioId, token);
  }

  resolveToken(negocioId: string): string | null {
    return this.auth.getBusinessToken(negocioId) ?? this.auth.getOwnerToken();
  }

  requireToken(negocioId: string): Observable<string> {
    const token = this.resolveToken(negocioId);
    if (!token) {
      return throwError(() => new Error('No hay token disponible para este negocio'));
    }
    return new Observable(observer => {
      observer.next(token);
      observer.complete();
    });
  }
}
