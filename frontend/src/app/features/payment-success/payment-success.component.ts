import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen bg-surface flex items-center justify-center p-6">
      <div class="w-full max-w-md rounded-3xl border border-success/20 bg-surface-lowest p-8 shadow-soft text-center">
        <div class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success">
          <span class="material-icons-round text-4xl">check_circle</span>
        </div>

        <p class="text-xs font-medium uppercase tracking-[0.18em] text-success">Pago completado</p>
        <h1 class="mt-3 font-display text-3xl font-bold">¡Todo listo!</h1>

        <p class="mt-3 text-sm text-on-surface-variant">
          El pago de la reserva se ha confirmado correctamente. El proveedor puede ver el estado actualizado en su panel.
        </p>

        <div class="mt-6 rounded-2xl bg-surface-container p-4 text-left text-sm">
          <div class="flex items-center justify-between gap-3">
            <span class="text-on-surface-variant">Reserva</span>
            <strong>{{ bookingId || '—' }}</strong>
          </div>
        </div>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a [routerLink]="providerId ? ['/business', providerId, 'admin'] : '/'" [queryParams]="providerId ? { bookingId: bookingId, paymentStatus: 'paid' } : null" class="btn-primary">
            Volver al panel
          </a>
          <a routerLink="/" class="btn-secondary">Volver al inicio</a>
        </div>
      </div>
    </div>
  `,
})
export class PaymentSuccessComponent implements OnInit {
  private route = inject(ActivatedRoute);

  bookingId = '';
  providerId = '';

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.queryParamMap.get('bookingId') ?? '';
    this.providerId = this.route.snapshot.queryParamMap.get('providerId') ?? '';
  }
}
