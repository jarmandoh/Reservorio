import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { formatCurrency } from '../../core/config/currency';
import { AdminStats } from '../../core/models/reservation.model';

@Component({
  selector: 'app-admin-overview',
  imports: [CommonModule],
  templateUrl: './admin-overview.component.html',
})
export class AdminOverviewComponent {
  @Input() stats: AdminStats | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;

  panelCards() {
    const stats = this.stats;
    return [
      { label: 'Negocios', value: stats?.businesses ?? 0, icon: 'store' },
      { label: 'Clientes', value: stats?.customers ?? 0, icon: 'people' },
      { label: 'Reservas', value: stats?.bookings ?? 0, icon: 'event_available' },
      { label: 'Reseñas', value: stats?.reviews ?? 0, icon: 'rate_review' },
      { label: 'Cobrados', value: stats?.paidPayments ?? 0, icon: 'payments' },
      { label: 'Ingresos', value: formatCurrency(stats?.revenue ?? 0), icon: 'payments' },
    ];
  }

  funnelSteps() {
    const funnel = this.stats?.funnel;
    if (!funnel) return null;
    const views = Math.max(1, funnel.views);
    return {
      days: funnel.days,
      steps: [
        { label: 'Vistas de negocio', value: funnel.views, pct: 100 },
        { label: 'Reservas', value: funnel.bookings, pct: Math.round((funnel.bookings / views) * 100) },
        { label: 'Pagos completados', value: funnel.paid, pct: Math.round((funnel.paid / views) * 100) },
      ],
    };
  }
}
