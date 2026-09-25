import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-6">
      <div class="max-w-xl w-full text-center space-y-6">
        <p class="font-mono text-6xl font-bold text-primary">404</p>
        <h1 class="font-display text-2xl font-bold sm:text-3xl">Esta página no existe</h1>
        <p class="text-on-surface-variant text-sm sm:text-base max-w-md mx-auto">
          La dirección puede estar mal escrita, el negocio ya no existe o el enlace caducó. Te ayudamos a volver a donde
          estabas:
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a routerLink="/" class="btn-primary">Explorar negocios</a>
          <a routerLink="/owner/login" class="btn-secondary">Acceso de negocios</a>
          <a routerLink="/admin" class="btn-tertiary">Panel de administración</a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
