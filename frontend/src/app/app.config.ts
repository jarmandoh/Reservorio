import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
// Para modo zoneless experimental (Angular 22+): descomenta la línea siguiente,
// elimina `zone.js` de `polyfills` en `angular.json:50` y añade
// `provideZonelessChangeDetection()` aquí. Requiere migrar `interval`/`fromEvent`
// a `afterRender`/`resource` donde aplique; ver `booking.component.ts:1051`.
// import { provideZonelessChangeDetection } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { authInterceptor, errorInterceptor } from './core/interceptors/http.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // provideZonelessChangeDetection(), // <- activa zoneless (P3) cuando se quite zone.js
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:3000',
    }),
  ],
};
