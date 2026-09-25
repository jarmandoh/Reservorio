import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Review, RatingStats } from '../models/businesses.model';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  BookingPayload,
  BookingRecord,
  BookingRequest,
  CheckoutSession,
  Customer,
  CustomerPayload,
  CustomerHistory,
  CustomerExport,
  AdminStats,
  AdminReview,
  AdminServiceRecord,
  GoogleStatus,
  NotificationItem,
  Payment,
  PaymentRequest,
  PaymentStatus,
  Reservation,
  UpdatePayload,
} from '../models/reservation.model';
import { Categoria } from '../models/categorias.model';
import { Business, NewBusinessPayload, Owner, OwnerAuthPayload } from '../models/businesses.model';
import { OfflineService } from './offline.service';

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
  private readonly offline = inject(OfflineService);
  private readonly base = environment.apiUrl;

  private authHeader(token: string): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  private cachedGet<T>(key: string, request$: Observable<T>): Observable<T> {
    const cached = this.offline.read<T>(key);
    if (!this.offline.online() && cached !== null) {
      return of(cached);
    }

    return request$.pipe(
      map(value => {
        this.offline.write(key, value);
        return value;
      }),
      catchError(err => (cached !== null ? of(cached) : throwError(() => err)))
    );
  }

  // ── Legacy / single-business ──────────────────────────────────────────

  getReservations(): Observable<Reservation[]> {
    return this.http.get<ApiResponse<Reservation[]>>(`${this.base}/reservations`).pipe(
      map(r => (r.data ?? []).map(row => ({ ...row, _rowIndex: Number(row.id) }))),
      catchError(this.handleError)
    );
  }

  getServices(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.base}/services`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  createReservation(payload: BookingPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.base}/reservations`, payload).pipe(catchError(this.handleError));
  }

  updateReservation(payload: UpdatePayload): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/reservations/${payload.rowIndex}`, payload)
      .pipe(catchError(this.handleError));
  }

  createService(nombre: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.base}/services`, { nombre }).pipe(catchError(this.handleError));
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

  loginCustomer(email: string, phone: string): Observable<ApiResponse<{ token: string; customer: Customer }>> {
    return this.http
      .post<ApiResponse<{ token: string; customer: Customer }>>(`${this.base}/auth/customer/login`, { email, phone })
      .pipe(catchError(this.handleError));
  }

  requestCustomerOtp(email: string): Observable<ApiResponse<{ message?: string; debugCode?: string }>> {
    return this.http
      .post<ApiResponse<{ message?: string; debugCode?: string }>>(`${this.base}/auth/customer/otp/request`, { email })
      .pipe(catchError(this.handleError));
  }

  verifyCustomerOtp(email: string, code: string): Observable<ApiResponse<{ token: string; customer: Customer }>> {
    return this.http
      .post<ApiResponse<{ token: string; customer: Customer }>>(`${this.base}/auth/customer/otp/verify`, {
        email,
        code,
      })
      .pipe(catchError(this.handleError));
  }

  requestCustomerMagicLink(email: string): Observable<ApiResponse<{ message?: string; debugToken?: string }>> {
    return this.http
      .post<ApiResponse<{ message?: string; debugToken?: string }>>(`${this.base}/auth/customer/magic-link/request`, {
        email,
      })
      .pipe(catchError(this.handleError));
  }

  verifyCustomerMagicLink(token: string): Observable<ApiResponse<{ token: string; customer: Customer }>> {
    return this.http
      .post<ApiResponse<{ token: string; customer: Customer }>>(`${this.base}/auth/customer/magic-link/verify`, {
        token,
      })
      .pipe(catchError(this.handleError));
  }

  registerOwner(payload: OwnerAuthPayload): Observable<ApiResponse<{ token: string }>> {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.base}/auth/owner/register`, payload)
      .pipe(catchError(this.handleError));
  }

  refreshToken(token: string): Observable<ApiResponse<{ token: string }>> {
    return this.http
      .post<ApiResponse<{ token: string }>>(`${this.base}/auth/refresh`, { token })
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

    const request$ = this.http.get<ApiResponse<Business[]>>(`${this.base}/businesses`, { params: httpParams }).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );

    return this.cachedGet(`businesses:${httpParams.toString()}`, request$);
  }

  getOwnerBusinesses(token: string): Observable<Business[]> {
    return this.http.get<ApiResponse<Business[]>>(`${this.base}/businesses/owner`, this.authHeader(token)).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  getBusinessById(businessId: string, token: string): Observable<Business> {
    const request$ = this.http
      .get<ApiResponse<Business>>(`${this.base}/businesses/${businessId}`, this.authHeader(token))
      .pipe(
        map(r => r.data!),
        catchError(this.handleError)
      );

    return this.cachedGet(`business:${businessId}`, request$);
  }

  // ── Multi-business (admin) ────────────────────────────────────────────

  getAllBusinesses(token: string): Observable<Business[]> {
    return this.http.get<ApiResponse<Business[]>>(`${this.base}/businesses/all`, this.authHeader(token)).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  createBusiness(data: NewBusinessPayload, token: string): Observable<ApiResponse<Business>> {
    return this.http
      .post<ApiResponse<Business>>(`${this.base}/businesses`, data, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  updateBusiness(
    id: string,
    data: Partial<NewBusinessPayload> & { pin?: string },
    token: string
  ): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(`${this.base}/businesses/${id}`, data, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  toggleBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/businesses/${id}/toggle`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  verifyBusiness(id: string, verified: boolean, token: string): Observable<ApiResponse> {
    return this.http
      .patch<ApiResponse>(`${this.base}/businesses/${id}/verify`, { verified }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  deleteBusiness(id: string, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/businesses/${id}`, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  // ── Per-business operations ───────────────────────────────────────────

  getBusinessReservations(negocioId: string, token?: string): Observable<Reservation[]> {
    const httpOptions = token ? this.authHeader(token) : {};
    return this.http
      .get<ApiResponse<Reservation[]>>(`${this.base}/businesses/${negocioId}/reservations`, httpOptions)
      .pipe(
        map(r => (r.data ?? []).map(row => ({ ...row, _rowIndex: Number(row.id) }))),
        catchError(this.handleError)
      );
  }

  getBusinessAvailability(negocioId: string): Observable<Reservation[]> {
    const request$ = this.http
      .get<ApiResponse<Reservation[]>>(`${this.base}/businesses/${negocioId}/availability`)
      .pipe(
        map(r => (r.data ?? []).map(row => ({ ...row, _rowIndex: Number(row.id) }))),
        catchError(this.handleError)
      );

    return this.cachedGet(`availability:${negocioId}`, request$);
  }

  createBusinessReservation(negocioId: string, payload: BookingPayload): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses/${negocioId}/reservations`, payload)
      .pipe(catchError(this.handleError));
  }

  createBusinessCheckout(
    negocioId: string,
    payload: BookingPayload & { email?: string; dataConsent?: boolean }
  ): Observable<ApiResponse<{ bookingId: string; customerId: string; reservationId: number }>> {
    return this.http
      .post<ApiResponse<{ bookingId: string; customerId: string; reservationId: number }>>(
        `${this.base}/businesses/${negocioId}/checkout`,
        payload
      )
      .pipe(catchError(this.handleError));
  }

  updateBusinessReservation(negocioId: string, payload: UpdatePayload, token: string): Observable<ApiResponse> {
    return this.http
      .put<ApiResponse>(
        `${this.base}/businesses/${negocioId}/reservations/${payload.rowIndex}`,
        payload,
        this.authHeader(token)
      )
      .pipe(catchError(this.handleError));
  }

  getBusinessServices(negocioId: string): Observable<string[]> {
    const request$ = this.http.get<ApiResponse<string[]>>(`${this.base}/businesses/${negocioId}/services`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );

    return this.cachedGet(`services:${negocioId}`, request$);
  }

  createBusinessService(negocioId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/businesses/${negocioId}/services`, { nombre }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  deleteBusinessService(negocioId: string, nombre: string, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(
        `${this.base}/businesses/${negocioId}/services/${encodeURIComponent(nombre)}`,
        this.authHeader(token)
      )
      .pipe(catchError(this.handleError));
  }

  // ── Marketplace real flow ─────────────────────────────────────────────

  getCustomers(): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.base}/customers`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  createCustomer(payload: CustomerPayload): Observable<ApiResponse<Customer>> {
    return this.http.post<ApiResponse<Customer>>(`${this.base}/customers`, payload).pipe(catchError(this.handleError));
  }

  getBookings(): Observable<BookingRecord[]> {
    return this.http.get<ApiResponse<BookingRecord[]>>(`${this.base}/bookings`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  createBooking(payload: BookingRequest): Observable<ApiResponse<BookingRecord>> {
    return this.http
      .post<ApiResponse<BookingRecord>>(`${this.base}/bookings`, payload)
      .pipe(catchError(this.handleError));
  }

  getPayments(): Observable<Payment[]> {
    return this.http.get<ApiResponse<Payment[]>>(`${this.base}/payments`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  getNotifications(businessId: string, bookingId?: string): Observable<NotificationItem[]> {
    let httpParams = new HttpParams().set('businessId', businessId);
    if (bookingId) {
      httpParams = httpParams.set('bookingId', bookingId);
    }

    return this.http.get<ApiResponse<NotificationItem[]>>(`${this.base}/notifications`, { params: httpParams }).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  createNotification(payload: {
    businessId: string;
    customerId?: string;
    bookingId?: string;
    type?: string;
    channel?: string;
    title: string;
    message: string;
    status?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/notifications`, payload).pipe(catchError(this.handleError));
  }

  getReviews(businessId: string): Observable<Review[]> {
    const request$ = this.http.get<ApiResponse<Review[]>>(`${this.base}/ratings/${businessId}`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );

    return this.cachedGet(`reviews:${businessId}`, request$);
  }

  getAverageRating(businessId: string): Observable<RatingStats> {
    const request$ = this.http.get<ApiResponse<RatingStats>>(`${this.base}/ratings/${businessId}/average`).pipe(
      map(r => r.data ?? { businessId, averageRating: 0, reviewCount: 0 }),
      catchError(() => of({ businessId, averageRating: 0, reviewCount: 0 }))
    );

    return this.cachedGet(`rating:${businessId}`, request$);
  }

  createReview(businessId: string, payload: { rating: number; review?: string }): Observable<ApiResponse<Review>> {
    return this.http
      .post<ApiResponse<Review>>(`${this.base}/ratings/${businessId}`, payload)
      .pipe(catchError(this.handleError));
  }

  createPayment(payload: PaymentRequest): Observable<ApiResponse<Payment>> {
    return this.http.post<ApiResponse<Payment>>(`${this.base}/payments`, payload).pipe(catchError(this.handleError));
  }

  createCheckoutSession(
    payload: PaymentRequest & { successUrl?: string; cancelUrl?: string }
  ): Observable<ApiResponse<CheckoutSession>> {
    return this.http
      .post<ApiResponse<CheckoutSession>>(`${this.base}/payments/checkout`, payload)
      .pipe(catchError(this.handleError));
  }

  markPaymentStatus(paymentId: string, status: PaymentStatus, token: string): Observable<ApiResponse<Payment>> {
    return this.http
      .patch<ApiResponse<Payment>>(`${this.base}/payments/${paymentId}`, { status }, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  getCustomerByEmail(email: string): Observable<Customer> {
    return this.http.get<ApiResponse<Customer>>(`${this.base}/customers/email/${encodeURIComponent(email)}`).pipe(
      map(r => r.data!),
      catchError(this.handleError)
    );
  }

  getCustomerMe(token: string): Observable<Customer> {
    return this.http
      .get<ApiResponse<Customer>>(`${this.base}/customers/me`, this.authHeader(token))
      .pipe(map(r => r.data!));
  }

  getCustomerHistory(customerId: string, token: string, page?: number, pageSize?: number): Observable<CustomerHistory> {
    let httpParams = new HttpParams();
    if (page != null) httpParams = httpParams.set('page', String(page));
    if (pageSize != null) httpParams = httpParams.set('pageSize', String(pageSize));

    return this.http
      .get<ApiResponse<CustomerHistory>>(`${this.base}/customers/${customerId}/history`, {
        params: httpParams,
        ...this.authHeader(token),
      })
      .pipe(map(r => r.data!));
  }

  // ── RGPD: export y borrado de datos del cliente ────────────────────────

  exportCustomerData(customerId: string, token: string): Observable<CustomerExport> {
    return this.http
      .get<ApiResponse<CustomerExport>>(`${this.base}/customers/${customerId}/export`, this.authHeader(token))
      .pipe(
        map(r => r.data!),
        catchError(this.handleError)
      );
  }

  deleteCustomer(customerId: string, token: string): Observable<ApiResponse<{ id: string; anonymized: boolean }>> {
    return this.http
      .delete<ApiResponse<{ id: string; anonymized: boolean }>>(
        `${this.base}/customers/${customerId}`,
        this.authHeader(token)
      )
      .pipe(catchError(this.handleError));
  }

  // ── Analítica (embudo de conversión) ───────────────────────────────────

  trackBusinessView(businessId: string): Observable<void> {
    return this.http.post<ApiResponse>(`${this.base}/analytics/view`, { businessId }).pipe(
      map(() => undefined),
      catchError(() => of(undefined))
    );
  }

  // ── Admin panel (avanzado) ────────────────────────────────────────────

  getAdminStats(token: string): Observable<AdminStats> {
    return this.http.get<ApiResponse<AdminStats>>(`${this.base}/admin/stats`, this.authHeader(token)).pipe(
      map(r => r.data!),
      catchError(this.handleError)
    );
  }

  getAdminReviews(token: string): Observable<AdminReview[]> {
    return this.http.get<ApiResponse<AdminReview[]>>(`${this.base}/admin/reviews`, this.authHeader(token)).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  deleteAdminReview(id: number, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/admin/reviews/${id}`, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  getAdminServices(token: string): Observable<AdminServiceRecord[]> {
    return this.http.get<ApiResponse<AdminServiceRecord[]>>(`${this.base}/admin/services`, this.authHeader(token)).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  deleteAdminService(id: number, token: string): Observable<ApiResponse> {
    return this.http
      .delete<ApiResponse>(`${this.base}/admin/services/${id}`, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  getAdminPayments(token: string, status?: PaymentStatus): Observable<Payment[]> {
    let httpParams = new HttpParams();
    if (status) {
      httpParams = httpParams.set('status', status);
    }
    return this.http
      .get<ApiResponse<Payment[]>>(`${this.base}/admin/payments`, { params: httpParams, ...this.authHeader(token) })
      .pipe(
        map(r => r.data ?? []),
        catchError(this.handleError)
      );
  }

  // ── Google OAuth ──────────────────────────────────────────────────────

  getGoogleAuthUrl(negocioId: string, token: string): Observable<string> {
    return this.http
      .get<ApiResponse<never> & { url: string }>(`${this.base}/google/start/${negocioId}`, this.authHeader(token))
      .pipe(
        map(r => r.url),
        catchError(this.handleError)
      );
  }

  getGoogleStatus(negocioId: string, token: string): Observable<GoogleStatus> {
    return this.http
      .get<ApiResponse<GoogleStatus>>(`${this.base}/google/status/${negocioId}`, this.authHeader(token))
      .pipe(
        map(r => r.data!),
        catchError(this.handleError)
      );
  }

  disconnectGoogle(negocioId: string, token: string): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.base}/google/disconnect/${negocioId}`, {}, this.authHeader(token))
      .pipe(catchError(this.handleError));
  }

  createGoogleSheet(negocioId: string, token: string): Observable<ApiResponse & { sheetId?: string }> {
    return this.http
      .post<ApiResponse & { sheetId?: string }>(
        `${this.base}/google/create-sheet/${negocioId}`,
        {},
        this.authHeader(token)
      )
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
    const msg = err.error?.message ?? err.error?.errors?.join(', ') ?? `HTTP ${err.status}`;
    return throwError(() => new Error(msg));
  }

  getCategories(): Observable<Categoria[]> {
    return this.http.get<ApiResponse<Categoria[]>>(`${this.base}/categories/all`).pipe(
      map(r => r.data ?? []),
      catchError(this.handleError)
    );
  }

  getTags(): Observable<string[]> {
    return this.http.get<ApiResponse<{ id: number; name: string }[]>>(`${this.base}/tags/all`).pipe(
      map(r => (r.data ?? []).map(tag => tag.name)),
      catchError(this.handleError)
    );
  }
}
