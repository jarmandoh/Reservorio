import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ApiResponse, Customer } from '../models/reservation.model';
import { Business, OwnerAuthPayload } from '../models/businesses.model';
import { SessionStore } from '../state/session.store';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

const SESSION_KEY   = 'reservorio_unlocked';
const PIN_KEY       = 'reservorio_admin_pin';
const ADMIN_JWT     = 'reservorio_admin_jwt';
const OWNER_JWT     = 'reservorio_owner_jwt';
const CUSTOMER_JWT  = 'reservorio_customer_jwt';
const DEFAULT_PIN   = '1234';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly sessionStore = inject(SessionStore);
  private readonly storage = inject(StorageService);
  private _unlocked = signal(this.storage.getItem(SESSION_KEY) === '1');
  readonly isUnlocked = computed(() => this._unlocked());
  readonly isOwnerUnlocked = computed(() => !!this.getOwnerToken());
  readonly isCustomerUnlocked = computed(() => !!this.getCustomerToken());

  get storedPin(): string {
    return this.storage.getItem(PIN_KEY, 'local') ?? DEFAULT_PIN;
  }

  login(pin: string): boolean {
    if (pin === this.storedPin) {
      this.storage.setItem(SESSION_KEY, '1');
      this._unlocked.set(true);
      this.sessionStore.setAdminAuthenticated(true);
      this.sessionStore.setAuthenticated(true);
      return true;
    }
    return false;
  }

  logout(): void {
    this.storage.removeItem(SESSION_KEY);
    this.storage.removeItem(ADMIN_JWT);
    this._unlocked.set(false);
    this.sessionStore.reset();
  }

  changePin(current: string, next: string): boolean {
    if (current !== this.storedPin)  return false;
    if (!/^\d{4}$/.test(next))        return false;
    this.storage.setItem(PIN_KEY, next, 'local');
    return true;
  }

  // ── Auth flows ───────────────────────────────────────────────────────

  loginAdmin(pin: string): Observable<ApiResponse<{ token: string }>> {
    return this.api.loginAdmin(pin).pipe(
      tap(res => {
        if (res.data?.token) this.setAdminToken(res.data.token);
      }),
      catchError(err => {
        this.clearAdminToken();
        return throwError(() => err);
      })
    );
  }

  loginBusiness(businessId: string, pin: string): Observable<ApiResponse<{ token: string; business: Business }>> {
    return this.api.loginBusiness(businessId, pin).pipe(
      tap(res => {
        if (res.data?.token) this.setBusinessToken(businessId, res.data.token);
      }),
      catchError(err => {
        this.clearBusinessToken(businessId);
        return throwError(() => err);
      })
    );
  }

  loginOwner(email: string, password: string): Observable<ApiResponse<{ token: string }>> {
    return this.api.loginOwner(email, password).pipe(
      tap(res => {
        if (res.data?.token) this.setOwnerToken(res.data.token);
      }),
      catchError(err => {
        this.clearOwnerToken();
        return throwError(() => err);
      })
    );
  }

  registerOwner(payload: OwnerAuthPayload): Observable<ApiResponse<{ token: string }>> {
    return this.api.registerOwner(payload).pipe(
      tap(res => {
        if (res.data?.token) this.setOwnerToken(res.data.token);
      }),
      catchError(err => {
        this.clearOwnerToken();
        return throwError(() => err);
      })
    );
  }

  loginCustomer(email: string, phone: string): Observable<ApiResponse<{ token: string; customer: Customer }>> {
    return this.api.loginCustomer(email, phone).pipe(
      tap(res => {
        if (res.data?.token) this.setCustomerToken(res.data.token);
      }),
      catchError(err => {
        this.clearCustomerToken();
        return throwError(() => err);
      })
    );
  }

  requestCustomerOtp(email: string): Observable<ApiResponse<{ message?: string; debugCode?: string }>> {
    return this.api.requestCustomerOtp(email);
  }

  loginCustomerWithOtp(email: string, code: string): Observable<ApiResponse<{ token: string; customer: Customer }>> {
    return this.api.verifyCustomerOtp(email, code).pipe(
      tap(res => {
        if (res.data?.token) this.setCustomerToken(res.data.token);
      }),
      catchError(err => {
        this.clearCustomerToken();
        return throwError(() => err);
      })
    );
  }

  requestCustomerMagicLink(email: string): Observable<ApiResponse<{ message?: string; debugToken?: string }>> {
    return this.api.requestCustomerMagicLink(email);
  }

  redeemCustomerMagicLink(token: string): Observable<ApiResponse<{ token: string; customer: Customer }>> {
    return this.api.verifyCustomerMagicLink(token).pipe(
      tap(res => {
        if (res.data?.token) this.setCustomerToken(res.data.token);
      }),
      catchError(err => {
        this.clearCustomerToken();
        return throwError(() => err);
      })
    );
  }

  // ── Admin JWT ─────────────────────────────────────────────────────────

  getAdminToken(): string | null {
    const token = this.storage.getItem(ADMIN_JWT);
    return this.isTokenValid(token) ? token : null;
  }

  setAdminToken(token: string): void {
    this.storage.setItem(ADMIN_JWT, token);
    this.sessionStore.setAdminAuthenticated(true);
    this.sessionStore.setAuthenticated(true);
  }

  clearAdminToken(): void {
    this.storage.removeItem(ADMIN_JWT);
    this.sessionStore.setAdminAuthenticated(false);
    this.sessionStore.setAuthenticated(false);
  }

  getOwnerToken(): string | null {
    const token = this.storage.getItem(OWNER_JWT);
    return this.isTokenValid(token) ? token : null;
  }

  setOwnerToken(token: string): void {
    this.storage.setItem(OWNER_JWT, token);
    this.sessionStore.setOwnerAuthenticated(true);
    this.sessionStore.setAuthenticated(true);
  }

  clearOwnerToken(): void {
    this.storage.removeItem(OWNER_JWT);
    this.sessionStore.setOwnerAuthenticated(false);
    this.sessionStore.setAuthenticated(false);
  }

  getOwnerPayload(): { ownerId?: string; role?: string; [key: string]: unknown } | null {
    return this.decodeToken(this.getOwnerToken());
  }

  // ── Customer JWT (panel de cliente, persistente) ──────────────────────

  getCustomerToken(): string | null {
    const token = this.storage.getItem(CUSTOMER_JWT, 'local');
    return this.isTokenValid(token) ? token : null;
  }

  setCustomerToken(token: string): void {
    this.storage.setItem(CUSTOMER_JWT, token, 'local');
    this.sessionStore.setAuthenticated(true);
  }

  clearCustomerToken(): void {
    this.storage.removeItem(CUSTOMER_JWT, 'local');
  }

  getCustomerPayload(): { customerId?: string; role?: string; [key: string]: unknown } | null {
    return this.decodeToken(this.getCustomerToken());
  }

  // ── Business JWT ──────────────────────────────────────────────────────

  getBusinessToken(businessId: string): string | null {
    const token = this.storage.getItem(`negocio_jwt_${businessId}`);
    return this.isTokenValid(token) ? token : null;
  }

  setBusinessToken(businessId: string, token: string): void {
    this.storage.setItem(`negocio_jwt_${businessId}`, token);
    this.sessionStore.setAuthenticated(true);
  }

  clearBusinessToken(businessId: string): void {
    this.storage.removeItem(`negocio_jwt_${businessId}`);
  }

  isBusinessUnlocked(businessId: string): boolean {
    return !!this.getBusinessToken(businessId);
  }

  // ── JWT helper ────────────────────────────────────────────────────────

  private decodeToken(token: string | null): { [key: string]: unknown } | null {
    if (!token) return null;
    try {
      const [, payload] = token.split('.');
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  private isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const payload = this.decodeToken(token);
      return typeof payload?.['exp'] === 'number' && payload['exp'] * 1000 > Date.now();
    } catch { return false; }
  }
}
