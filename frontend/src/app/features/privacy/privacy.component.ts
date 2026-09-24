import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-surface p-4 sm:p-6">
      <div class="max-w-3xl mx-auto space-y-6">
        <button class="btn-tertiary btn-sm" routerLink="/" type="button">Volver al inicio</button>

        <article class="card p-6 sm:p-8 space-y-6">
          <header>
            <h1 class="font-display text-2xl font-bold">Política de privacidad</h1>
            <p class="text-sm text-on-surface-variant mt-1">Última actualización: septiembre de 2026</p>
          </header>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">1. Qué datos tratamos</h2>
            <p>
              Para gestionar tu reserva tratamos tu <strong>nombre</strong>, tu <strong>teléfono</strong> y, si lo
              facilitas, tu <strong>email</strong>. Conservamos el historial de tus reservas, pagos y notificaciones
              asociadas para poder prestarte el servicio y generar los comprobantes de pago.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">2. Base legal y finalidad</h2>
            <p>
              El tratamiento se basa en el <strong>consentimiento</strong> que prestas al confirmar una reserva y en la
              <strong>relación contractual</strong> (prestación del servicio). Solo usamos tus datos para gestionar la
              reserva, el pago y, si lo autorizas, comunicaciones y recordatorios.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">3. Tus derechos (RGPD)</h2>
            <ul class="list-disc pl-5 space-y-1">
              <li><strong>Acceso</strong>: puedes consultar tus datos en tu panel de historial.</li>
              <li><strong>Exportación</strong>: puedes descargar una copia completa de tus datos.</li>
              <li><strong>Supresión</strong> ("derecho al olvido"): puedes solicitar la anonimización de tu cuenta.</li>
              <li><strong>Oposición/rectificación</strong>: puedes contactar con el negocio o el administrador.</li>
            </ul>
            <p class="mt-3">
              En <strong>Reservorio</strong> puedes solicitar ambas cosas desde la sección
              <strong>"Mis datos"</strong> de tu historial sin necesidad de contactar con nadie.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">4. Conservación</h2>
            <p>
              Conservamos los datos mientras el negocio necesite el registro de la reserva y el comprobante asociado.
              Tras una solicitud de supresión, tus datos personales se <strong>anonimizan</strong> de forma irreversible.
            </p>
          </section>

          <section class="space-y-2 text-sm leading-6">
            <h2 class="font-semibold text-base">5. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad puedes escribir al administrador de la plataforma.
            </p>
          </section>
        </article>
      </div>
    </div>
  `,
})
export class PrivacyPolicyComponent {}