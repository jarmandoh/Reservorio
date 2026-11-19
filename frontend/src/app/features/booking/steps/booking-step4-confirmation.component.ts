import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingStateService } from '../booking-state.service';
import { formatTime24 } from '../../../core/config/time';
import { formatCurrency } from '../../../core/config/currency';
import type { PaymentMethod } from '../../../core/models/reservation.model';

const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'card', label: 'Tarjeta', icon: 'credit_card' },
  { id: 'paypal', label: 'PayPal', icon: 'account_balance_wallet' },
  { id: 'transfer', label: 'Transferencia', icon: 'account_balance' },
  { id: 'cash', label: 'Efectivo', icon: 'payments' },
];

@Component({
  selector: 'app-booking-step4-confirmation',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="flex flex-col gap-5 px-5 py-5">
      <!-- Success hero -->
      <div
        class="rounded-[1.75rem] bg-gradient-to-br from-primary to-primary-container p-6 text-center text-white"
        role="status" aria-live="polite" aria-atomic="true"
      >
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
          <span class="material-icons-round text-3xl">check_circle</span>
        </div>
        <h2 class="mt-4 font-display text-2xl font-semibold">¡Reserva registrada!</h2>
        <p class="mt-2 text-sm text-white/85">Tu solicitud ya está creada y queda pendiente de confirmación por parte del negocio.</p>
      </div>

      <!-- Booking detail card -->
      <div class="rounded-2xl border border-outline-variant bg-white p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <p class="section-label">Resumen de la reserva</p>
          <span class="badge badge-info">Pendiente</span>
        </div>
        <dl class="flex flex-col gap-3 text-sm">
          <div class="flex items-center justify-between gap-4">
            <dt class="text-on-surface-variant">Servicio</dt>
            <dd><span class="service-tag">{{ state.confirmed()?.servicio }}</span></dd>
          </div>
          <div class="h-px bg-outline-variant/30"></div>
          <div class="flex items-center justify-between gap-4">
            <dt class="text-on-surface-variant">Horario</dt>
            <dd class="font-semibold text-on-surface">{{ formatTime24(state.confirmed()?.franja) }}</dd>
          </div>
          <div class="h-px bg-outline-variant/30"></div>
          <div class="flex items-center justify-between gap-4">
            <dt class="text-on-surface-variant">Cliente</dt>
            <dd class="font-semibold text-on-surface">{{ state.confirmed()?.cliente }}</dd>
          </div>
          <div class="h-px bg-outline-variant/30"></div>
          <div class="flex items-center justify-between gap-4">
            <dt class="text-on-surface-variant">Teléfono</dt>
            <dd class="font-semibold text-on-surface">{{ state.confirmed()?.telefono }}</dd>
          </div>
          @if (state.reservationId()) {
            <div class="h-px bg-outline-variant/30"></div>
            <div class="flex items-center justify-between gap-4">
              <dt class="text-on-surface-variant">Referencia</dt>
              <dd class="font-semibold font-mono text-on-surface text-xs">{{ state.reservationId() }}</dd>
            </div>
          }
        </dl>
      </div>

      <!-- Payment hint -->
      <div class="rounded-2xl border border-primary/15 bg-primary-fixed px-4 py-4 text-sm text-primary">
        Tu reserva ya quedó registrada. Puedes pagar ahora o revisar el pago más tarde desde tus reservas.
      </div>

      <!-- CTA: Pay now / My bookings -->
      <div class="rounded-2xl border border-outline-variant bg-white p-5">
        <h3 class="font-display text-lg font-semibold text-on-surface">¿Cómo quieres continuar?</h3>
        <p class="mt-1 text-sm text-on-surface-variant">Pagar ahora no cambia la reserva; eliges el método y el importe en el siguiente paso.</p>
        <div class="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            class="btn-primary flex-1"
            [attr.aria-expanded]="state.paymentDetailsOpen()"
            aria-controls="payment-details"
            (click)="state.paymentDetailsOpen.set(true)"
          >
            <span class="material-icons-round text-base">payment</span>
            Pagar ahora
          </button>
          <a routerLink="/usuario/dashboard/historial" class="btn-secondary flex-1 text-center">
            <span class="material-icons-round text-base">history</span>
            Ver mis reservas
          </a>
        </div>
      </div>

      <!-- Payment details panel -->
      @if (state.paymentDetailsOpen()) {
        <div id="payment-details" class="rounded-2xl border border-outline-variant bg-white p-5 flex flex-col gap-4">
          <p class="section-label">Método de pago</p>

          <div class="grid grid-cols-2 gap-2" role="group" aria-label="Método de pago">
            @for (opt of paymentOptions; track opt.id) {
              <button
                type="button"
                class="payment-option"
                [class.selected]="state.paymentMethod() === opt.id"
                [attr.aria-pressed]="state.paymentMethod() === opt.id"
                (click)="state.paymentMethod.set(opt.id)"
              >
                <span class="material-icons-round text-[1.3rem]">{{ opt.icon }}</span>
                <span class="text-sm font-semibold">{{ opt.label }}</span>
              </button>
            }
          </div>

          <!-- Deposit toggle -->
          <label class="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-surface-low p-3">
            <div>
              <p class="text-sm font-semibold text-on-surface">Pagar solo el anticipo</p>
              <p class="text-xs text-on-surface-variant mt-0.5">30% del total — el resto al finalizar el servicio.</p>
            </div>
            <input
              type="checkbox"
              class="h-5 w-5 accent-primary"
              [checked]="state.depositActive()"
              (change)="state.depositActive.set(!state.depositActive())"
              aria-label="Activar pago de anticipo"
            />
          </label>

          <!-- Amount summary -->
          <div class="rounded-2xl border border-primary/15 bg-primary-fixed px-4 py-3 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-on-surface-variant">{{ state.depositActive() ? 'Anticipo (30%)' : 'Total' }}</span>
              <span class="font-display text-xl font-bold text-primary">{{ formattedDue() }}</span>
            </div>
          </div>

          <!-- Checkout instructions (after payment) -->
          @if (state.checkoutInstructions(); as ci) {
            <div class="rounded-2xl bg-surface-low p-4 text-sm space-y-1">
              @if (ci.beneficiary) {
                <p><span class="text-on-surface-variant">Beneficiario: </span><span class="font-semibold">{{ ci.beneficiary }}</span></p>
              }
              @if (ci.iban) {
                <p><span class="text-on-surface-variant">IBAN: </span><span class="font-mono font-semibold">{{ ci.iban }}</span></p>
              }
              @if (ci.bank) {
                <p><span class="text-on-surface-variant">Banco: </span>{{ ci.bank }}</p>
              }
              @if (ci.reference) {
                <p><span class="text-on-surface-variant">Referencia: </span><span class="font-mono font-semibold">{{ ci.reference }}</span></p>
              }
              @if (ci.message && !ci.iban) {
                <p>{{ ci.message }}</p>
              }
            </div>
          }

          <!-- Action buttons -->
          <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              class="btn-primary flex-1"
              data-testid="payment-action"
              [disabled]="state.paymentLoading()"
              [attr.aria-busy]="state.paymentLoading()"
              (click)="startCheckout.emit()"
            >
              @if (state.paymentLoading()) {
                <span class="material-icons-round animate-spin text-base">refresh</span>
              } @else {
                <span>{{ paymentLabel() }}</span>
                <span class="material-icons-round text-base">arrow_forward</span>
              }
            </button>
            <button type="button" class="btn-secondary flex-1" (click)="newBooking.emit()">
              <span class="material-icons-round text-base">add</span>
              <span>Nueva reserva</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class BookingStep4ConfirmationComponent {
  readonly state = inject(BookingStateService);
  readonly formatTime24 = formatTime24;
  readonly paymentOptions = PAYMENT_OPTIONS;

  readonly startCheckout = output<void>();
  readonly newBooking = output<void>();

  readonly baseAmount = (): number => {
    const confirmed = this.state.confirmed();
    return confirmed ? this.state.serviceMeta(confirmed.servicio).priceNumber : 0;
  };

  readonly dueAmount = (): number =>
    this.state.depositActive() ? Math.round(this.baseAmount() * 0.3) : this.baseAmount();

  readonly formattedDue = (): string => formatCurrency(this.dueAmount());

  readonly paymentLabel = (): string => {
    if (this.state.paymentLoading()) return '';
    const amount = formatCurrency(this.dueAmount());
    const payLabel = this.state.depositActive() ? `Pagar anticipo (${amount})` : `Pagar ${amount}`;
    switch (this.state.paymentMethod()) {
      case 'paypal': return `${payLabel} con PayPal`;
      case 'transfer': return `Ver instrucciones de transferencia (${amount})`;
      case 'cash': return `Confirmar pago en efectivo (${amount})`;
      default: return payLabel;
    }
  };
}
