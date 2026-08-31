import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  BookingPayload,
  BookingRecord,
  BookingRequest,
  Customer,
  CustomerPayload,
  GoogleStatus,
  Payment,
  PaymentRequest,
  Reservation,
  UpdatePayload
} from '../models/reservation.model';
import { Categoria } from '../models/categorias.model';
import { Business, NewBusinessPayload, Owner, OwnerAuthPayload } from '../models/businesses.model';

export interface BusinessQuery {
  q?: string;
  category?: string;
  tags?: string;
  location?: string;
  interest?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private authHeader(token: string): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ── Legacy / single-business ──────────────────────────────────────────

  getReservations(): Observable<Reservation[]> {
    return this.http
      .get<ApiResponse<Reservation[]>>(`${this.base}/reservations`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  getServices(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.base}/services`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createReservation(payload: BookingPayload): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/reservations`, payload)
      .pipe(catchError(this.handleError));
  }

  updateReservation(payload: UpdatePayload): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/reservations/${payload.rowIndex}`, payload)
      .pipe(catchError(this.handleError));
  }

  createService(nombre: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/services`, { nombre })
      .pipe(catchError(this.handleError));
  }

  deleteService(nombre: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/services/${encodeURIComponent(nombre)}`)
      .pipe(catchError(this.handleError));
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  loginAdmin(pin: string): Observable<ApiResponse<{ token: string }>> {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.base}/auth/admin`, { pin })
      .pipe(catchError(this.handleError));
  }

  loginBusiness(id: string, pin: string): Observable<ApiResponse<{ token: string; business: Business }>> {
    return this.http
      .post<ApiResponse<{ token: string; business: Business }>>(`${this.base}/businesses/${id}/auth`, { pin })
      .pipe(catchError(this.handleError));
  }

  loginOwner(email: string, password: string): Observable<ApiResponse<{ token: string }>> {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.base}/auth/owner/login`, { email, password })
      .pipe(catchError(this.handleError));
  }

  registerOwner(payload: OwnerAuthPayload): Observable<ApiResponse<{ token: string }>> {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.base}/auth/owner/register`, payload)
      .pipe(catchError(this.handleError));
  }

  // ── Multi-business (public) ───────────────────────────────────────────
  getBusinesses(params?: BusinessQuery): Observable<Business[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value != null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }

    return this.http
      .get<ApiResponse<Business[]>>(`${this.base}/businesses`, { params: httpParams })
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  };

  getOwnerBusinesses(token: string): Observable<Business[]> {
    return this.http
      .get<ApiResponse<Business[]>>(`${this.base}/businesses/owner`, this.authHeader(token))
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  getBusinessById(businessId: string, token: string): Observable<Business> {
    return this.http
      .get<ApiResponse<Business>>(`${this.base}/businesses/${businessId}`, this.authHeader(token))
      .pipe(map(r => r.data!), catchError(this.handleError));
  }

  // ── Multi-business (admin) ────────────────────────────────────────────

  getAllBusinesses(token: string): Observable<Business[]> {
    return this.http
      .get<ApiResponse<Business[]>>(`${this.base}/businesses/all`, this.authHeader(token))
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createBusiness(data: NewBusinessPayload, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses`, data, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  updateBusiness(id: string, data: Partial<NewBusinessPayload> & { pin?: string }, token: string): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/businesses/${id}`, data, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  toggleBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/businesses/${id}/toggle`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  deleteBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/businesses/${id}`, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  // ── Per-business operations ───────────────────────────────────────────

  getBusinessReservations(negocioId: string): Observable<Reservation[]> {
    return this.http
      .get<ApiResponse<Reservation[]>>(`${this.base}/businesses/${negocioId}/reservations`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createBusinessReservation(negocioId: string, payload: BookingPayload): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses/${negocioId}/reservations`, payload)
      .pipe(catchError(this.handleError));
  }

  updateBusinessReservation(negocioId: string, payload: UpdatePayload, token: string): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/businesses/${negocioId}/reservations/${payload.rowIndex}`, payload, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  getBusinessServices(negocioId: string): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.base}/businesses/${negocioId}/services`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createBusinessService(negocioId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses/${negocioId}/services`, { nombre }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  deleteBusinessService(negocioId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/businesses/${negocioId}/services/${encodeURIComponent(nombre)}`, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  // ── Marketplace real flow ─────────────────────────────────────────────

  getCustomers(): Observable<Customer[]> {
    return this.http
      .get<ApiResponse<Customer[]>>(`${this.base}/customers`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createCustomer(payload: CustomerPayload): Observable<ApiResponse<Customer>> {
    return this.http
      .post<ApiResponse<Customer>>(`${this.base}/customers`, payload)
      .pipe(catchError(this.handleError));
  }

  getBookings(): Observable<BookingRecord[]> {
    return this.http
      .get<ApiResponse<BookingRecord[]>>(`${this.base}/bookings`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createBooking(payload: BookingRequest): Observable<ApiResponse<BookingRecord>> {
    return this.http
      .post<ApiResponse<BookingRecord>>(`${this.base}/bookings`, payload)
      .pipe(catchError(this.handleError));
  }

  getPayments(): Observable<Payment[]> {
    return this.http
      .get<ApiResponse<Payment[]>>(`${this.base}/payments`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createPayment(payload: PaymentRequest): Observable<ApiResponse<Payment>> {
    return this.http
      .post<ApiResponse<Payment>>(`${this.base}/payments`, payload)
      .pipe(catchError(this.handleError));
  }

  // ── Google OAuth ──────────────────────────────────────────────────────

  getGoogleAuthUrl(negocioId: string, token: string): Observable<string> {
    return this.http
      .get<ApiResponse<never> & { url: string }>(`${this.base}/google/start/${negocioId}`, this.authHeader(token))
      .pipe(map(r => r.url), catchError(this.handleError));
  }

  getGoogleStatus(negocioId: string, token: string): Observable<GoogleStatus> {
    return this.http
      .get<ApiResponse<GoogleStatus>>(`${this.base}/google/status/${negocioId}`, this.authHeader(token))
      .pipe(map(r => r.data!), catchError(this.handleError));
  }

  disconnectGoogle(negocioId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/disconnect/${negocioId}`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  createGoogleSheet(negocioId: string, token: string): Observable<ApiResponse & { sheetId?: string }> {
    return this.http
      .post<ApiResponse & { sheetId?: string }>(`${this.base}/google/create-sheet/${negocioId}`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  linkGoogleSheet(negocioId: string, sheetId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/link-sheet/${negocioId}`, { sheetId }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  syncGoogleSheet(negocioId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/sync/${negocioId}`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg =
      err.error?.message ??
      err.error?.errors?.join(', ') ??
      `HTTP ${err.status}`;
    return throwError(() => new Error(msg));
  }

  getCategories(): Observable<Categoria[]> {
    return this.http
      .get<ApiResponse<Categoria[]>>(`${this.base}/categories/all`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  getTags(): Observable<string[]> {
    return this.http
      .get<ApiResponse<{ id: number; name: string }[]>>(`${this.base}/tags/all`)
      .pipe(map(r => (r.data ?? []).map(tag => tag.name)), catchError(this.handleError));
  }

}
