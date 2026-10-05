import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center p-6">
      <div class="max-w-xl w-full text-center space-y-6">
        <img src="assets/imgs/not-found.png" alt="404. Página no encontrada" class="w-full max-w-lg h-auto mx-auto" />
        <p class="text-on-surface-variant text-sm sm:text-base max-w-md mx-auto">
          La dirección puede estar mal escrita, el negocio ya no existe o el enlace caducó. Te ayudamos a volver a donde
          estabas:
        </p>
        <div class="flex flex-col sm:flex-col items-center justify-center gap-3">
          <a routerLink="/" class="btn-primary">Explorar negocios</a>
          <a routerLink="/owner/login" class="btn-secondary">Acceso de negocios</a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
