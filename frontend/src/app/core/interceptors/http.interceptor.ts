import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { SessionStore } from '../state/session.store';
import { SupabaseAuthService } from '../services/supabase-auth.service';

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const data = JSON.parse(atob(padded));
    return typeof data?.exp === 'number' && data.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function decodePayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getActiveToken(storage: StorageService, url: string): string | null {
  // Si la URL contiene /businesses/<id>, prioriza el token de ese negocio
  const match = url.match(/\/businesses\/([^\/?#]+)/);
  if (match) {
    const bizToken = storage.getItem(`negocio_jwt_${match[1]}`);
    if (isTokenValid(bizToken)) return bizToken;
  }

  const admin = storage.getItem('reservorio_admin_jwt');
  if (isTokenValid(admin)) return admin;

  const owner = storage.getItem('reservorio_owner_jwt');
  if (isTokenValid(owner)) return owner;

  const customer = storage.getItem('reservorio_customer_jwt', 'local');
  if (isTokenValid(customer)) return customer;

  return null;
}

/** Segundos que el usuario debe esperar tras un 429, si el backend los informa. */
export function retryAfterSeconds(err: HttpErrorResponse): number | null {
  const fromBody = Number(err.error?.retryAfter);
  if (Number.isFinite(fromBody) && fromBody > 0) return Math.ceil(fromBody);

  const retryAfterHeader = err.headers?.get('Retry-After');
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

    const date = Date.parse(retryAfterHeader);
    if (!Number.isNaN(date)) {
      const diff = Math.ceil((date - Date.now()) / 1000);
      if (diff > 0) return diff;
    }
  }

  const resetHeader = Number(err.headers?.get('RateLimit-Reset'));
  if (Number.isFinite(resetHeader) && resetHeader > 0) return Math.ceil(resetHeader);

  return null;
}

/** Formatea una espera en segundos como texto legible en español. */
export function formatRetryWait(seconds: number): string {
  const total = Math.max(1, Math.round(seconds));
  if (total < 60) return `${total} segundo${total === 1 ? '' : 's'}`;

  const minutes = Math.ceil(total / 60);
  if (minutes < 60) return `${minutes} minuto${minutes === 1 ? '' : 's'}`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);
  const supabase = inject(SupabaseAuthService);

  // Solo para llamadas a la API
  const isApi = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api');
  if (isApi) {
    // Inyecta Authorization si no existe y hay token disponible
    if (!req.headers.has('Authorization')) {
      const token = getActiveToken(storage, req.url) ?? supabase.accessToken();
      if (token) {
        req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }
    }

    // Propaga/correlaciona X-Request-Id si no existe
    if (!req.headers.has('X-Request-Id')) {
      const id =
        typeof crypto !== 'undefined' && (crypto as unknown as { randomUUID?: () => string }).randomUUID
          ? (crypto as unknown as { randomUUID: () => string }).randomUUID!()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      req = req.clone({ setHeaders: { 'X-Request-Id': id } });
    }
  }

  return next(req);
};

let handlingSessionExpiry = false;

function hasAnyRawToken(storage: StorageService): boolean {
  try {
    if (storage.getItem('reservorio_admin_jwt') || storage.getItem('reservorio_owner_jwt')) return true;
    if (storage.getItem('reservorio_customer_jwt', 'local')) return true;
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith('negocio_jwt_') && storage.getItem(k)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function isLoginAttempt(url: string): boolean {
  // Endpoints donde 401 significa credenciales inválidas, no sesión expirada
  return (
    url.includes('/auth/admin') ||
    url.includes('/auth/owner/login') ||
    url.includes('/auth/owner/register') ||
    url.includes('/auth/customer/login') ||
    url.includes('/auth/customer/otp/request') ||
    url.includes('/auth/customer/otp/verify') ||
    url.includes('/auth/customer/magic-link/request') ||
    url.includes('/auth/customer/magic-link/verify') ||
    /\/businesses\/[^\/]+\/auth/.test(url)
  );
}

function getRedirectForExpiry(router: Router, role?: string, businessId?: string): string[] | null {
  const current = router.url || '/';

  // Si ya está en home, no redirigir de nuevo
  if (current === '/' || current === '') {
    return null;
  }

  // Al expirar la sesión de cliente, el destino coherente es su login. Evita
  // competir con CustomerHistoryComponent, que también gestiona el 401.
  if (role === 'customer' || current.startsWith('/customer/history')) {
    return ['/customer/login'];
  }

  // Para las demás rutas protegidas, salir al inicio.
  if (
    role === 'admin' ||
    role === 'owner' ||
    role === 'customer' ||
    role === 'business-admin' ||
    current.startsWith('/admin') ||
    current.startsWith('/owner') ||
    current.startsWith('/customer') ||
    current.startsWith('/business')
  ) {
    return ['/'];
  }

  // Para rutas públicas con sesión expirada en segundo plano, también redirige a home si había sesión
  // Si no había sesión (anónimo), el caller ya filtró hasRawSession, así que aquí siempre redirigimos a home
  return ['/'];
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const sessionStore = inject(SessionStore);
  const storage = inject(StorageService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 401) {
          const url = req.url;
          const isRefresh = url.includes('/auth/refresh');
          const isLogin = isLoginAttempt(url);

          // Solo cerrar sesión si no es un intento de login fallido con credenciales incorrectas
          const shouldCloseSession = isRefresh || !isLogin;

          if (shouldCloseSession) {
            // Solo actuar si había alguna sesión almacenada o token enviado
            const hasRawSession = hasAnyRawToken(storage);
            const sentTokenEarly = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
            if (!hasRawSession && !sentTokenEarly) {
              // 401 sin sesión previa (acceso anónimo a recurso protegido) -> no cerrar sesión ni toastear como expiración
              return throwError(() => err);
            }

            const sentToken = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
            const payload = decodePayload(sentToken);
            const requestUrl = req.url;
            const isCustomerRequest = /\/customers(?:\/|$)/.test(requestUrl);
            const role = (payload?.['role'] as string) || (isCustomerRequest ? 'customer' : null);
            const businessId = (payload?.['businessId'] as string) || null;
            let purgedCount = 0;

            // La limpieza debe ocurrir en cada 401, incluso si otra respuesta
            // activó el limitador de navegación. De lo contrario el token aún
            // válido localmente puede hacer que login vuelva a abrir history.
            if (sentToken) {
              if (role === 'admin') auth.clearAdminToken();
              else if (role === 'owner') auth.clearOwnerToken();
              else if (role === 'customer') auth.clearCustomerToken();
              else if (role === 'business-admin' && businessId) auth.clearBusinessToken(businessId);
              else if (!isTokenValid(sentToken)) {
                auth.clearAllAuthTokens();
                purgedCount = 1;
              }
            } else {
              purgedCount = auth.purgeInvalidTokens().length;
            }

            // Asegura que cualquier token expirado remanente se elimine.
            purgedCount += auth.purgeInvalidTokens().length;

            // Si no hay sesión activa tras la purga, resetea el store por seguridad.
            try {
              const hasAdmin = !!auth.getAdminToken();
              const hasOwner = !!auth.getOwnerToken();
              const hasCustomer = !!auth.getCustomerToken();
              if (!hasAdmin && !hasOwner && !hasCustomer) {
                sessionStore.reset();
              }
            } catch {
              // ignore
            }

            // Evita navegación y toast duplicados si varias peticiones responden 401.
            if (!handlingSessionExpiry) {
              handlingSessionExpiry = true;
              setTimeout(() => (handlingSessionExpiry = false), 2000);

              // Solo mostrar toast si realmente había sesión que cerrar.
              const hadSession = !!sentToken || purgedCount > 0 || hasRawSession;
              if (!hadSession) {
                return throwError(() => err);
              }

              const redirect = getRedirectForExpiry(router, role || undefined, businessId || undefined);
              const message =
                err.error?.message || 'Token inválido o expirado. Sesión cerrada, vuelve a iniciar sesión.';

              toast.show(message, 'error');

              if (redirect) {
                router.navigate(redirect, { replaceUrl: true }).catch(() => {});
              }
            }
          } else {
            // Login fallido (credenciales incorrectas) -> no cerrar sesión, solo propagar error
            // El componente de login mostrará su propio mensaje
          }
        } else if (err.status === 429) {
          const waitSeconds = retryAfterSeconds(err);
          const baseMessage = err.error?.message || 'Demasiadas peticiones, inténtalo más tarde';
          const message = waitSeconds
            ? `${baseMessage} Podrás reintentarlo en ${formatRetryWait(waitSeconds)}.`
            : baseMessage;
          const duration = waitSeconds ? Math.min(15000, Math.max(6000, waitSeconds * 1000)) : 6000;

          toast.show(message, 'error', duration);
        } else if (err.status >= 500) {
          // Evita spam en GETs públicos cacheables
          if (!req.url.includes('/businesses') || req.method !== 'GET') {
            toast.show('Error del servidor, intenta de nuevo', 'error');
          }
        }
      }
      return throwError(() => err);
    })
  );
};
