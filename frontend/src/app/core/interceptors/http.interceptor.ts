import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { SessionStore } from '../state/session.store';

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
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
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
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

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(StorageService);

  // Solo para llamadas a la API
  const isApi = req.url.startsWith(environment.apiUrl) || req.url.startsWith('/api');
  if (isApi) {
    // Inyecta Authorization si no existe y hay token disponible
    if (!req.headers.has('Authorization')) {
      const token = getActiveToken(storage, req.url);
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

  // Si ya está en login, redirige a home igualmente si la sesión expiró allí (purga en segundo plano)
  // Pero evita loop si el 401 vino del propio login
  // Para sesión expirada en cualquier ruta protegida -> home
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

            // Evita manejo concurrente múltiple (varias peticiones 401 a la vez)
            if (!handlingSessionExpiry) {
              handlingSessionExpiry = true;
              setTimeout(() => (handlingSessionExpiry = false), 2000);

              const sentToken = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;
              const payload = decodePayload(sentToken);
              const role = (payload?.['role'] as string) || null;
              const businessId = (payload?.['businessId'] as string) || null;
              let purgedCount = 0;

              // Limpieza específica según el rol del token enviado
              if (sentToken) {
                if (role === 'admin') auth.clearAdminToken();
                else if (role === 'owner') auth.clearOwnerToken();
                else if (role === 'customer') auth.clearCustomerToken();
                else if (role === 'business-admin' && businessId) auth.clearBusinessToken(businessId);
                else {
                  // Token con formato inválido o rol desconocido -> purga general
                  purgedCount = auth.purgeInvalidTokens().length;
                  // Si aún no se limpió, fuerza limpieza total
                  if (sentToken && !isTokenValid(sentToken)) {
                    auth.clearAllAuthTokens();
                    purgedCount = 1;
                  }
                }
              } else {
                // No se envió token (ya era inválido localmente) -> purga todos los expirados
                purgedCount = auth.purgeInvalidTokens().length;
              }

              // Asegura que cualquier token expirado remanente se elimine
              purgedCount += auth.purgeInvalidTokens().length;

              // Si no hay sesión activa tras la purga, resetea el store por seguridad
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

              // Solo mostrar toast si realmente había sesión que cerrar
              const hadSession = !!sentToken || purgedCount > 0 || hasRawSession;
              if (!hadSession) {
                return throwError(() => err);
              }

              const redirect = getRedirectForExpiry(router, role || undefined, businessId || undefined);
              const message = err.error?.message || 'Token inválido o expirado. Sesión cerrada, vuelve a iniciar sesión.';

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
          toast.show(err.error?.message || 'Demasiadas peticiones, inténtalo más tarde', 'error');
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
