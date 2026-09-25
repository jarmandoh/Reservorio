import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../services/storage.service';
import { ToastService } from '../services/toast.service';

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    const [, payload] = token.split('.');
    const data = JSON.parse(atob(payload));
    return typeof data?.exp === 'number' && data.exp * 1000 > Date.now();
  } catch {
    return false;
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

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        // 401: sesión expirada — solo toastea si no es un login explícito
        if (err.status === 401) {
          const isAuthCall = req.url.includes('/auth/');
          if (!isAuthCall) {
            toast.show(err.error?.message || 'Sesión expirada, vuelve a iniciar sesión', 'error');
            // Opcional: redirige a login según rol (no forzamos para no romper flujos públicos)
            // router.navigate(['/login']);
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
