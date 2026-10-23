import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { ApiResponse, Customer } from '../models/reservation.model';
import { Business } from '../models/business.model';
import { OwnerAuthPayload } from '../models/owner.model';
import { SessionStore } from '../state/session.store';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';
import { SupabaseAuthService } from './supabase-auth.service';

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
  private readonly supabase = inject(SupabaseAuthService);
  private _unlocked = signal(this.storage.getItem(SESSION_KEY) === '1');

  constructor() {
    // Mantiene sincronizado el Bearer que usa HttpClient con los refresh automáticos
    // de Supabase Auth (incluidos cambios de sesión en otras pestañas).
    effect(() => {
      const refreshedToken = this.supabase.accessToken();
      const admin = this.storage.getItem(ADMIN_JWT);
      const owner = this.storage.getItem(OWNER_JWT);
      const customer = this.storage.getItem(CUSTOMER_JWT, 'local');

      if (!refreshedToken) {
        if (admin && this.isSupabaseToken(admin)) this.clearAdminToken();
        if (owner && this.isSupabaseToken(owner)) this.clearOwnerToken();
        if (customer && this.isSupabaseToken(customer)) this.clearCustomerToken();
        return;
      }

      if (admin && this.isSupabaseToken(admin)) this.setAdminToken(refreshedToken);
      else if (owner && this.isSupabaseToken(owner)) this.setOwnerToken(refreshedToken);
      else if (customer && this.isSupabaseToken(customer)) this.setCustomerToken(refreshedToken);
    });
  }

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
    void this.supabase.signOut();
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

  hasActiveSession(): boolean {
    return this.isUnlocked() || this.hasAnyValidToken();
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

  activateSupabaseSession(): Observable<'customer' | 'owner' | 'admin'> {
    return from(this.supabase.getSession()).pipe(
      switchMap(({ data, error }) => {
        if (error || !data.session?.access_token) return throwError(() => error ?? new Error('No hay sesión activa'));
        return this.api.getAuthMe(data.session.access_token).pipe(
          map(response => {
            const role = response.data?.role;
            if (role === 'admin') this.setAdminToken(data.session!.access_token);
            else if (role === 'owner') this.setOwnerToken(data.session!.access_token);
            else if (role === 'customer') this.setCustomerToken(data.session!.access_token);
            else throw new Error('Tu cuenta no tiene un rol habilitado');
            return role;
          })
        );
      })
    );
  }

  loginWithGoogle(role: 'customer' | 'owner' | 'admin' = 'customer'): Observable<void> {
    return from(this.supabase.signInWithGoogle(`${window.location.origin}/auth/callback?role=${role}`)).pipe(
      map(({ error }) => {
        if (error) throw error;
        return undefined;
      })
    );
  }

  requestRoleMagicLink(email: string): Observable<void> {
    return from(this.supabase.signInWithMagicLink(email, `${window.location.origin}/auth/callback`, false)).pipe(
      map(({ error }) => {
        if (error) throw error;
        return undefined;
      })
    );
  }

  requestEmailOtp(email: string, shouldCreateUser = false): Observable<void> {
    return from(this.supabase.signInWithOtp(email, shouldCreateUser)).pipe(
      map(({ error }) => {
        if (error) throw error;
        return undefined;
      })
    );
  }

  verifyEmailOtp(email: string, code: string, role: 'customer' | 'owner' | 'admin' = 'customer'): Observable<string> {
    return from(this.supabase.verifyEmailOtp(email, code)).pipe(
      switchMap(({ data, error }) => {
        if (error || !data.session?.access_token) return throwError(() => error ?? new Error('No se pudo verificar el código'));
        const token = data.session.access_token;
        return this.api.getAuthMe(token).pipe(
          map(response => {
            if (response.data?.role !== role) throw new Error('Esta cuenta no tiene permisos para este tipo de acceso.');
            if (role === 'owner') this.setOwnerToken(token);
            else if (role === 'admin') this.setAdminToken(token);
            else this.setCustomerToken(token);
            return token;
          })
        );
      })
    );
  }

  loginWithPassword(email: string, password: string, role: 'customer' | 'owner' | 'admin' = 'customer'): Observable<string> {
    return from(this.supabase.signInWithPassword(email, password)).pipe(
      switchMap(({ data, error }) => {
        if (error || !data.session?.access_token) return throwError(() => error ?? new Error('Credenciales inválidas'));
        const token = data.session.access_token;
        return this.api.getAuthMe(token).pipe(
          map(response => {
            if (response.data?.role !== role) throw new Error('Esta cuenta no tiene permisos para este tipo de acceso.');
            if (role === 'owner') this.setOwnerToken(token);
            else if (role === 'admin') this.setAdminToken(token);
            else this.setCustomerToken(token);
            return token;
          })
        );
      })
    );
  }

  loginOwner(email: string, password: string): Observable<ApiResponse<{ token: string }>> {
    if (this.supabase.enabled) {
      return this.loginWithPassword(email, password, 'owner').pipe(
        map(token => ({ ok: true, status: 200, data: { token } })),
        catchError(err => {
          this.clearOwnerToken();
          return throwError(() => err);
        })
      );
    }

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

  registerOwner(payload: OwnerAuthPayload): Observable<ApiResponse<{ token?: string; confirmationRequired?: boolean }>> {
    if (!this.supabase.enabled) {
      return this.api.registerOwner(payload).pipe(
        tap(res => { if (res.data?.token) this.setOwnerToken(res.data.token); }),
        catchError(err => { this.clearOwnerToken(); return throwError(() => err); })
      );
    }
    return this.api.registerOwner(payload).pipe(
      map(() => payload),
      // Primero se crea el registro interno; después Supabase crea la identidad verificada.
      // El JWT legacy de respuesta nunca se guarda cuando Supabase está habilitado.
      switchMap(owner => from(this.supabase.signUp(owner.email, owner.password, owner.name))),
      map(({ data, error }) => {
        if (error) throw error;
        return {
          ok: true,
          status: 201,
          data: {
            token: data.session?.access_token,
            confirmationRequired: !data.session,
          },
        };
      }),
      tap(res => { if (res.data?.token) this.setOwnerToken(res.data.token); }),
      catchError(err => { this.clearOwnerToken(); return throwError(() => err); })
    );
  }

  registerCustomerWithPassword(email: string, password: string, name: string): Observable<ApiResponse<{ token?: string; confirmationRequired?: boolean }>> {
    return from(this.supabase.signUp(email, password, name)).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          ok: true,
          status: 201,
          data: { token: data.session?.access_token, confirmationRequired: !data.session },
        };
      }),
      tap(res => { if (res.data?.token) this.setCustomerToken(res.data.token); })
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
    if (this.supabase.enabled) {
      return from(this.supabase.signInWithOtp(email, true)).pipe(
        map(({ error }) => {
          if (error) throw error;
          return { ok: true, status: 200, data: { message: 'Si el correo está registrado, recibirás un código de acceso.' } };
        })
      );
    }
    return this.api.requestCustomerOtp(email);
  }

  loginCustomerWithOtp(email: string, code: string): Observable<ApiResponse<{ token: string; customer?: Customer }>> {
    if (this.supabase.enabled) {
      return this.verifyEmailOtp(email, code, 'customer').pipe(
        map(token => ({ ok: true, status: 200, data: { token } })),
        catchError(err => { this.clearCustomerToken(); return throwError(() => err); })
      );
    }
    return this.api.verifyCustomerOtp(email, code).pipe(
      tap(res => { if (res.data?.token) this.setCustomerToken(res.data.token); }),
      catchError(err => { this.clearCustomerToken(); return throwError(() => err); })
    );
  }

  requestCustomerMagicLink(email: string): Observable<ApiResponse<{ message?: string; debugToken?: string }>> {
    if (this.supabase.enabled) {
      return from(this.supabase.signInWithMagicLink(email, `${window.location.origin}/customer/verify`, true)).pipe(
        map(({ error }) => {
          if (error) throw error;
          return {
            ok: true,
            status: 200,
            data: { message: 'Si el correo está registrado, recibirás un enlace de acceso.' },
          };
        }),
        catchError(err => throwError(() => err))
      );
    }
    return this.api.requestCustomerMagicLink(email);
  }

  redeemCustomerMagicLink(token: string): Observable<ApiResponse<{ token: string; customer?: Customer }>> {
    if (this.supabase.enabled) {
      return from(this.supabase.getSession()).pipe(
        map(({ data, error }) => {
          if (error || !data.session?.access_token) throw error ?? new Error('El enlace no pudo validarse');
          this.setCustomerToken(data.session.access_token);
          return { ok: true, status: 200, data: { token: data.session.access_token } };
        })
      );
    }
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
    const activeSupabaseToken = admin || owner || customer;

    // Supabase renueva sus propios refresh tokens; el token nuevo debe copiarse
    // al almacén por rol que usa el interceptor de la API de Reservorio.
    if (activeSupabaseToken && this.isSupabaseToken(activeSupabaseToken)) {
      return from(this.supabase.getSession()).pipe(
        switchMap(({ data, error }) => {
          if (error || !data.session?.access_token) return throwError(() => error ?? new Error('Sesión Supabase expirada'));
          const token = data.session.access_token;
          return this.api.getAuthMe(token).pipe(
            map(response => {
              const role = response.data?.role;
              if (role === 'admin') this.setAdminToken(token);
              else if (role === 'owner') this.setOwnerToken(token);
              else if (role === 'customer') this.setCustomerToken(token);
              else throw new Error('Rol de sesión no reconocido');
              return undefined;
            })
          );
        }),
        catchError(() => {
          this.clearAdminToken();
          this.clearOwnerToken();
          this.clearCustomerToken();
          return of(undefined);
        })
      );
    }

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

  private isSupabaseToken(token: string): boolean {
    const payload = this.decodeToken(token);
    return typeof payload?.['iss'] === 'string' && String(payload['iss']).includes('.supabase.co/auth/v1');
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
