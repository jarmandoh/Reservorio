import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiResponse, Customer } from '../models/reservation.model';
import { Business, OwnerAuthPayload } from '../models/businesses.model';
import { SessionStore } from '../state/session.store';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

const SESSION_KEY = 'reservorio_unlocked';
const PIN_KEY = 'reservorio_admin_pin';
const ADMIN_JWT = 'reservorio_admin_jwt';
const OWNER_JWT = 'reservorio_owner_jwt';
const CUSTOMER_JWT = 'reservorio_customer_jwt';
const BUSINESS_PREFIX = 'negocio_jwt_';
const DEFAULT_PIN = '1234';

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
    this.clearAllAuthTokens();
    this.storage.removeItem(SESSION_KEY);
    this._unlocked.set(false);
  }

  /** Cierra todas las sesiones JWT (admin, owner, customer, business) y resetea el store. */
  clearAllAuthTokens(): void {
    this.storage.removeItem(ADMIN_JWT);
    this.storage.removeItem(OWNER_JWT);
    this.storage.removeItem(CUSTOMER_JWT, 'local');
    this.clearAllBusinessTokens();
    this._unlocked.set(false);
    this.sessionStore.reset();
  }

  /** Elimina todos los tokens de negocio (`negocio_jwt_*`) expirados o no. */
  clearAllBusinessTokens(): void {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(BUSINESS_PREFIX)) toRemove.push(key);
      }
      toRemove.forEach(k => this.storage.removeItem(k));
    } catch {
      // SSR / storage no disponible
    }
  }

  /**
   * Recorre todos los tokens almacenados y elimina los inválidos o expirados.
   * Cierra la sesión correspondiente a cada token expirado.
   * Retorna la lista de claves purgadas (útil para debug/tests).
   */
  purgeInvalidTokens(): string[] {
    const purged: string[] = [];

    const check = (key: string, storage: 'local' | 'session', clearer: () => void) => {
      const token = this.storage.getItem(key, storage);
      if (token && !this.isTokenValid(token)) {
        clearer();
        purged.push(key);
      }
    };

    check(ADMIN_JWT, 'session', () => this.clearAdminToken());
    check(OWNER_JWT, 'session', () => this.clearOwnerToken());
    check(CUSTOMER_JWT, 'local', () => this.clearCustomerToken());

    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(BUSINESS_PREFIX)) keys.push(k!);
      }
      keys.forEach(k => {
        const token = this.storage.getItem(k);
        if (token && !this.isTokenValid(token)) {
          this.storage.removeItem(k);
          purged.push(k);
        }
      });
    } catch {
      // storage no disponible
    }

    return purged;
  }

  changePin(current: string, next: string): boolean {
    if (current !== this.storedPin) return false;
    if (!/^\d{4}$/.test(next)) return false;
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
    if (!token) return null;
    if (!this.isTokenValid(token)) {
      this.clearAdminToken();
      return null;
    }
    return token;
  }

  setAdminToken(token: string): void {
    this.storage.setItem(ADMIN_JWT, token);
    this.sessionStore.setAdminAuthenticated(true);
    this.sessionStore.setAuthenticated(true);
  }

  clearAdminToken(): void {
    this.storage.removeItem(ADMIN_JWT);
    this.storage.removeItem(SESSION_KEY);
    this._unlocked.set(false);
    this.sessionStore.setAdminAuthenticated(false);
    // Si no queda ningún otro token (incluyendo business), resetea autenticación general
    if (!this.hasAnyValidToken()) {
      this.sessionStore.setAuthenticated(false);
    }
  }

  getOwnerToken(): string | null {
    const token = this.storage.getItem(OWNER_JWT);
    if (!token) return null;
    if (!this.isTokenValid(token)) {
      this.clearOwnerToken();
      return null;
    }
    return token;
  }

  setOwnerToken(token: string): void {
    this.storage.setItem(OWNER_JWT, token);
    this.sessionStore.setOwnerAuthenticated(true);
    this.sessionStore.setAuthenticated(true);
  }

  clearOwnerToken(): void {
    this.storage.removeItem(OWNER_JWT);
    this.sessionStore.setOwnerAuthenticated(false);
    if (!this.hasAnyValidToken()) {
      this.sessionStore.setAuthenticated(false);
    }
  }

  getOwnerPayload(): { ownerId?: string; role?: string; [key: string]: unknown } | null {
    return this.decodeToken(this.getOwnerToken());
  }

  // ── Customer JWT (panel de cliente, persistente) ──────────────────────

  getCustomerToken(): string | null {
    const token = this.storage.getItem(CUSTOMER_JWT, 'local');
    if (!token) return null;
    if (!this.isTokenValid(token)) {
      this.clearCustomerToken();
      return null;
    }
    return token;
  }

  setCustomerToken(token: string): void {
    this.storage.setItem(CUSTOMER_JWT, token, 'local');
    this.sessionStore.setAuthenticated(true);
  }

  clearCustomerToken(): void {
    this.storage.removeItem(CUSTOMER_JWT, 'local');
    if (!this.hasAnyValidToken()) {
      this.sessionStore.setAuthenticated(false);
    }
  }

  getCustomerPayload(): { customerId?: string; role?: string; [key: string]: unknown } | null {
    return this.decodeToken(this.getCustomerToken());
  }

  // ── Business JWT ──────────────────────────────────────────────────────

  getBusinessToken(businessId: string): string | null {
    const token = this.storage.getItem(`${BUSINESS_PREFIX}${businessId}`);
    if (!token) return null;
    if (!this.isTokenValid(token)) {
      this.clearBusinessToken(businessId);
      return null;
    }
    return token;
  }

  setBusinessToken(businessId: string, token: string): void {
    this.storage.setItem(`${BUSINESS_PREFIX}${businessId}`, token);
    this.sessionStore.setAuthenticated(true);
  }

  clearBusinessToken(businessId: string): void {
    this.storage.removeItem(`${BUSINESS_PREFIX}${businessId}`);
    if (!this.hasAnyValidToken()) {
      this.sessionStore.setAuthenticated(false);
    }
  }

  isBusinessUnlocked(businessId: string): boolean {
    return !!this.getBusinessToken(businessId);
  }

  // ── JWT helpers ───────────────────────────────────────────────────────

  /**
   * Renueva la sesión activa (admin, owner o customer) vía POST /auth/refresh.
   * El backend solo reemite si el token expiró dentro de la ventana de gracia,
   * por lo que una sesión activa nunca se corta mientras se use la app.
   * Si el refresh falla con 401 (token inválido o gracia expirada), cierra la sesión.
   */
  refreshSession(): Observable<void> {
    const admin = this.storage.getItem(ADMIN_JWT);
    const owner = this.storage.getItem(OWNER_JWT);
    const customer = this.storage.getItem(CUSTOMER_JWT, 'local');

    let target: { token: string; apply: (t: string) => void; clear: () => void } | null = null;
    if (admin) {
      target = { token: admin, apply: t => this.setAdminToken(t), clear: () => this.clearAdminToken() };
    } else if (owner) {
      target = { token: owner, apply: t => this.setOwnerToken(t), clear: () => this.clearOwnerToken() };
    } else if (customer) {
      target = { token: customer, apply: t => this.setCustomerToken(t), clear: () => this.clearCustomerToken() };
    }

    if (!target) return of(undefined);

    // Si el token ya es inválido localmente, cierra sesión sin llamar al backend
    if (!this.isTokenValid(target.token)) {
      const isWithinGrace = this.isWithinGracePeriod(target.token);
      if (!isWithinGrace) {
        target.clear();
        return of(undefined);
      }
      // Dentro de gracia: intenta refresh aun expirado
    }

    return this.api.refreshToken(target.token).pipe(
      tap(res => {
        if (res.data?.token) target!.apply(res.data.token);
      }),
      map(() => undefined),
      catchError(err => {
        // Error 401 del refresh implica sesión irreparable -> cerrar sesión
        const msg = err instanceof Error ? err.message : String(err);
        const isUnauthorized = msg.toLowerCase().includes('token') || msg.toLowerCase().includes('sesión') || msg.toLowerCase().includes('expirada');
        if (isUnauthorized) {
          target!.clear();
        }
        return of(undefined);
      })
    );
  }

  decodeToken(token: string | null): { [key: string]: unknown } | null {
    if (!token) return null;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      // Maneja base64url y padding
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
      const payload = this.decodeToken(token);
      if (!payload || typeof payload['exp'] !== 'number') return false;
      return payload['exp'] * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  /** Verifica si el token expirado aún está dentro de la ventana de gracia para refresh. */
  private isWithinGracePeriod(token: string | null): boolean {
    const payload = this.decodeToken(token);
    if (!payload || typeof payload['exp'] !== 'number') return false;
    const expMs = payload['exp'] * 1000;
    const graceMs = 6 * 60 * 60 * 1000; // 6h por defecto, igual que backend
    return Date.now() <= expMs + graceMs;
  }

  private hasAnyValidToken(): boolean {
    if (this.isTokenValid(this.storage.getItem(ADMIN_JWT))) return true;
    if (this.isTokenValid(this.storage.getItem(OWNER_JWT))) return true;
    if (this.isTokenValid(this.storage.getItem(CUSTOMER_JWT, 'local'))) return true;
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(BUSINESS_PREFIX)) {
          const t = this.storage.getItem(k!);
          if (this.isTokenValid(t)) return true;
        }
      }
    } catch {
      // storage no disponible
    }
    return false;
  }
}
