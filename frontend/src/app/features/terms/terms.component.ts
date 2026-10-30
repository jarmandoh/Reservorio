import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-surface p-4 sm:p-6">
      <div class="max-w-3xl mx-auto space-y-6">
        <button class="btn-tertiary btn-sm" routerLink="/" type="button">Volver al inicio</button>

        <article class="card p-6 sm:p-8 space-y-6">
          <header>
            <h1 class="font-display text-2xl font-bold">Términos y condiciones</h1>
            <p class="text-sm text-on-surface-variant mt-1">Última actualización: septiembre de 2026</p>
          </header>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">1. Uso del servicio</h2>
            <p>
              MiVeci permite a los usuarios consultar negocios locales, revisar disponibilidad y realizar reservas
              online. Al usar el servicio aceptas estos términos y te comprometes a proporcionar información veraz.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">2. Cuentas de usuario</h2>
            <p>
              Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades que se
              realicen con tu cuenta. Notifícanos de inmediato ante cualquier uso no autorizado.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">3. Reservas y pagos</h2>
            <p>
              Las reservas están sujetas a la disponibilidad del negocio y a sus propias políticas. Los pagos se
              procesan a través de pasarelas externas; MiVeci no almacena datos de tarjeta.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">4. Cancelaciones</h2>
            <p>
              Las cancelaciones y reprogramaciones dependen de la política de cada negocio. Revisa las condiciones
              antes de confirmar tu reserva.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">5. Contacto</h2>
            <p>
              Para dudas o reclamos escríbenos a través de los canales de contacto publicados en el sitio.
            </p>
          </section>
        </article>
      </div>
    </div>
  `,
})
export class TermsComponent {}
