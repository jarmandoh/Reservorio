import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-3xl border border-warning/25 bg-surface-lowest p-8 shadow-soft text-center">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
          <span class="material-icons-round text-4xl">cancel</span>
        </div>

        <p class="text-xs font-medium uppercase tracking-[0.18em] text-warning">Pago cancelado</p>
        <h1 class="mt-3 font-display text-3xl font-bold">La reserva sigue creada</h1>

        <p class="mt-3 text-sm text-on-surface-variant">
          El proceso de pago se interrumpió y no se ha cobrado ningún importe. La reserva sigue en estado pendiente y
          puedes intentarlo otra vez cuando quieras.
        </p>

        <div class="mt-6 rounded-2xl bg-surface-container p-4 text-left text-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="text-on-surface-variant">Reserva</span>
            <strong>{{ bookingId || '—' }}</strong>
          </div>
          <div class="mt-3 flex items-center justify-between gap-3">
            <span class="text-on-surface-variant">Estado</span>
            <span class="badge badge-info">Pendiente</span>
          </div>
          <div class="mt-3 flex items-center justify-between gap-3">
            <span class="text-on-surface-variant">Acción</span>
            <span class="font-medium text-on-surface">Reintentar pago</span>
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            [routerLink]="providerId ? ['/business', providerId, 'admin'] : '/'"
            [queryParams]="providerId ? { bookingId: bookingId, paymentStatus: 'cancelled' } : null"
            class="btn-primary"
          >
            Volver al panel
          </a>
          <a routerLink="/" class="btn-secondary">Volver al inicio</a>
        </div>
      </div>
    </div>
  `,
})
export class PaymentCancelComponent implements OnInit {
  private route = inject(ActivatedRoute);

  bookingId = '';
  providerId = '';

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.queryParamMap.get('bookingId') ?? '';
    this.providerId = this.route.snapshot.queryParamMap.get('providerId') ?? '';
  }
}
