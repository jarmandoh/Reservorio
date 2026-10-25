import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withViewTransitions, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';


import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from './core/interceptors/http.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withViewTransitions({
        onViewTransitionCreated: ({ transition }) => {
          // Una navegación nueva puede cancelar la transición anterior de forma esperable.
          transition.finished.catch(() => undefined);
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
