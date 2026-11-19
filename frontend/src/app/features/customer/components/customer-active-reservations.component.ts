import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatCurrency } from '../../../core/config/currency';
import { formatTime24 } from '../../../core/config/time';
import { CustomerHistoryBooking } from '../../../core/models/reservation.model';

@Component({
  selector: 'app-customer-active-reservations',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (reservations.length === 0) {
      <section class="card p-8 sm:p-12 border border-outline-variant/30 flex flex-col items-center gap-4 text-center">
        <div class="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-1" aria-hidden="true">
          <span class="material-icons-round text-3xl">event_available</span>
        </div>
        <div>
          <h3 class="font-display text-lg sm:text-xl font-bold text-on-surface">No tienes reservas pendientes</h3>
          <p class="text-sm text-on-surface-variant max-w-md mt-1.5 leading-relaxed">
            Cuando agendes una cita con cualquier negocio de la plataforma, podrás consultar los detalles y horario aquí.
          </p>
        </div>
        <a
          routerLink="/"
          class="btn-primary min-h-[44px] px-5 py-2.5 inline-flex items-center gap-2 text-sm font-semibold shadow-xs mt-2"
        >
          <span class="material-icons-round text-lg" aria-hidden="true">storefront</span>
          Explorar negocios disponibles
        </a>
      </section>
    } @else {
      <section class="space-y-3.5" aria-label="Listado de reservas activas">
        @for (reservation of reservations; track reservation.id) {
          <article class="card p-4 sm:p-5 border border-outline-variant/30 shadow-xs hover:border-primary/40 transition-colors">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <div class="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
                    <span class="material-icons-round text-base">store</span>
                  </div>
                  <h3 class="font-display font-bold text-base text-on-surface truncate">{{ reservation.businessName || 'Negocio' }}</h3>
                </div>

                <div class="mt-2.5 space-y-1.5">
                  <p class="text-sm font-semibold text-primary flex items-center gap-1.5">
                    <span class="material-icons-round text-base" aria-hidden="true">spa</span>
                    <span>{{ reservation.serviceId || 'Servicio agendado' }}</span>
                  </p>
                  <p class="text-sm text-on-surface-variant flex items-center gap-2">
                    <span class="material-icons-round text-base opacity-70" aria-hidden="true">calendar_today</span>
                    <span class="font-medium text-on-surface">{{ formatDate(reservation.date) }}</span>
                    <span>·</span>
                    <span class="material-icons-round text-base opacity-70" aria-hidden="true">schedule</span>
                    <span class="font-medium text-on-surface">{{ formatSlot(reservation.slot) }}</span>
                  </p>
                </div>
              </div>

              <!-- Badge con estado e icono accesible -->
              <span class="badge inline-flex items-center gap-1.5 px-3 py-1 font-semibold text-xs rounded-full" [class]="statusCss(reservation.status)">
                <span class="material-icons-round text-sm" aria-hidden="true">{{ statusIcon(reservation.status) }}</span>
                <span>{{ statusLabel(reservation.status) }}</span>
              </span>
            </div>

            <!-- Importe o estado del pago si aplica -->
            @if (reservation.paymentAmount != null) {
              <div class="flex items-center gap-2 mt-3.5 pt-3 border-t border-outline-variant/20 text-xs sm:text-sm text-on-surface-variant">
                <span class="material-icons-round text-base text-primary" aria-hidden="true">payments</span>
                <span>Importe:</span>
                <span class="font-semibold text-on-surface font-mono">{{ formatAmount(reservation.paymentAmount, reservation.paymentCurrency) }}</span>
                @if (reservation.paymentStatus) {
                  <span class="text-xs px-2 py-0.5 rounded-md bg-surface-low font-medium">
                    {{ reservation.paymentStatus === 'paid' ? 'Pagado' : 'Pago al asistir' }}
                  </span>
                }
              </div>
            }

            <!-- Botón de acción con tamaño táctil adecuado -->
            <div class="mt-4 pt-2 flex items-center justify-between gap-3">
              <a
                [routerLink]="['/booking', reservation.providerId]"
                class="btn-secondary min-h-[44px] px-4 py-2 inline-flex items-center gap-2 text-sm font-semibold rounded-xl"
                [attr.aria-label]="'Agendar otra cita en ' + (reservation.businessName || 'el negocio')"
              >
                <span class="material-icons-round text-base" aria-hidden="true">calendar_month</span>
                <span>Agendar otra cita</span>
              </a>

              @if (reservation.notes) {
                <span class="text-xs text-on-surface-variant italic truncate max-w-xs" title="{{ reservation.notes }}">
                  "{{ reservation.notes }}"
                </span>
              }
            </div>
          </article>
        }
      </section>
    }
  `,
})
export class CustomerActiveReservationsComponent {
  @Input({ required: true }) reservations: CustomerHistoryBooking[] = [];

  formatDate(date: string): string {
    if (!date) return '';
    const [y, m, d] = date.split('-');
    return y && m && d ? `${d}/${m}/${y}` : date;
  }

  formatSlot(slot: string): string {
    return formatTime24(slot);
  }

  formatAmount(amount: number, currency?: string | null): string {
    return formatCurrency(amount, currency ?? undefined);
  }

  statusCss(status: string): string {
    if (status === 'pending') return 'bg-amber-50 text-amber-900 border border-amber-200';
    if (status === 'cancelled') return 'bg-red-50 text-red-900 border border-red-200';
    return 'bg-emerald-50 text-emerald-900 border border-emerald-200';
  }

  statusIcon(status: string): string {
    if (status === 'pending') return 'schedule';
    if (status === 'cancelled') return 'cancel';
    return 'check_circle';
  }

  statusLabel(status: string): string {
    if (status === 'pending') return 'Pendiente de confirmación';
    if (status === 'confirmed') return 'Confirmado';
    if (status === 'completed') return 'Completado';
    if (status === 'cancelled') return 'Cancelado';
    return status;
  }
}
