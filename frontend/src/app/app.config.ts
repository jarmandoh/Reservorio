import { ApplicationConfig, isDevMode, LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import {
  provideRouter,
  withInMemoryScrolling,
  withViewTransitions,
  withComponentInputBinding,
  ActivatedRouteSnapshot,
} from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from './core/interceptors/http.interceptor';

registerLocaleData(localeEsCo);

function isInternalShellTransition(from: ActivatedRouteSnapshot, to: ActivatedRouteSnapshot): boolean {
  const getUrl = (snapshot: ActivatedRouteSnapshot | null): string => {
    let curr = snapshot;
    const segments: string[] = [];
    while (curr) {
      if (curr.url?.length) {
        segments.push(...curr.url.map(u => u.path));
      }
      curr = curr.firstChild;
    }
    return segments.join('/');
  };

  const fromUrl = getUrl(from);
  const toUrl = getUrl(to);

  // Evita animar toda la página cuando se navega dentro del mismo shell (mantiene menú y barra lateral fijos)
  if (fromUrl.startsWith('usuario/dashboard') && toUrl.startsWith('usuario/dashboard')) {
    return true;
  }
  if (fromUrl.startsWith('propietario/dashboard') && toUrl.startsWith('propietario/dashboard')) {
    return true;
  }
  return false;
}

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-CO' },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withViewTransitions({
        onViewTransitionCreated: ({ transition, from, to }) => {
          transition.finished.catch(() => undefined);
          if (isInternalShellTransition(from, to)) {
            transition.skipTransition();
          }
        },
      })
    ),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // provideZonelessChangeDetection(), // <- activa zoneless (P3) cuando se quite zone.js
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:3000',
    }),
  ],
};
