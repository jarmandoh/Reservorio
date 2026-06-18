import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  BookingPayload,
  GoogleStatus,
  Reservation,
  UpdatePayload
} from '../models/reservation.model';
import { Categoria } from '../models/categorias.model';
import { Business, NewBusinessPayload } from '../models/businesses.model';

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

  // ── Multi-business (public) ───────────────────────────────────────────
  getBusinesses(): Observable<Business[]> {
    return this.http
      .get<ApiResponse<Business[]>>(`${this.base}/businesses`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  };

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

  getBusinessReservations(bizId: string): Observable<Reservation[]> {
    return this.http
      .get<ApiResponse<Reservation[]>>(`${this.base}/businesses/${bizId}/reservations`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createBusinessReservation(bizId: string, payload: BookingPayload): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses/${bizId}/reservations`, payload)
      .pipe(catchError(this.handleError));
  }

  updateBusinessReservation(bizId: string, payload: UpdatePayload, token: string): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/businesses/${bizId}/reservations/${payload.rowIndex}`, payload, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  getBusinessServices(bizId: string): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.base}/businesses/${bizId}/services`)
      .pipe(map(r => r.data ?? []), catchError(this.handleError));
  }

  createBusinessService(bizId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses/${bizId}/services`, { nombre }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  deleteBusinessService(bizId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/businesses/${bizId}/services/${encodeURIComponent(nombre)}`, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  // ── Google OAuth ──────────────────────────────────────────────────────

  getGoogleAuthUrl(bizId: string, token: string): Observable<string> {
    return this.http
      .get<ApiResponse<never> & { url: string }>(`${this.base}/google/start/${bizId}`, this.authHeader(token))
      .pipe(map(r => r.url), catchError(this.handleError));
  }

  getGoogleStatus(bizId: string, token: string): Observable<GoogleStatus> {
    return this.http
      .get<ApiResponse<GoogleStatus>>(`${this.base}/google/status/${bizId}`, this.authHeader(token))
      .pipe(map(r => r.data!), catchError(this.handleError));
  }

  disconnectGoogle(bizId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/disconnect/${bizId}`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  createGoogleSheet(bizId: string, token: string): Observable<ApiResponse & { sheetId?: string }> {
    return this.http
      .post<ApiResponse & { sheetId?: string }>(`${this.base}/google/create-sheet/${bizId}`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  linkGoogleSheet(bizId: string, sheetId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/link-sheet/${bizId}`, { sheetId }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  syncGoogleSheet(bizId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/sync/${bizId}`, {}, this.authHeader(token))
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

}
