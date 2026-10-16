import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Payment, PaymentStatus } from '../../core/models/reservation.model';

@Component({
  selector: 'app-admin-payments',
  imports: [CommonModule],
  templateUrl: './admin-payments.component.html',
})
export class AdminPaymentsComponent {
  @Input() payments: Payment[] = [];
  @Input() revenue = 0;
  @Input() filter: PaymentStatus | '' = '';
  @Input() paidUpdating: string | null = null;
  @Output() filterChange = new EventEmitter<PaymentStatus | ''>();
  @Output() refresh = new EventEmitter<void>();
  @Output() paymentStatusChange = new EventEmitter<{ payment: Payment; status: PaymentStatus }>();

  paymentStats() {
    return {
      total: this.payments.length,
      paid: this.payments.filter(payment => payment.status === 'paid').length,
      pending: this.payments.filter(payment => payment.status === 'pending').length,
      revenue: this.revenue,
    };
  }

  filteredPayments(): Payment[] {
    return this.filter ? this.payments.filter(payment => payment.status === this.filter) : this.payments;
  }

  onPaymentFilterChange(event: Event): void {
    this.filterChange.emit((event.target as HTMLSelectElement).value as PaymentStatus | '');
  }

  statusBadgeClass(status: PaymentStatus): string {
    switch (status) {
      case 'paid':
        return 'text-success-on bg-success-container';
      case 'pending':
        return 'text-tertiary bg-amber-100';
      case 'failed':
        return 'text-error-on-container bg-error-container';
      case 'refunded':
        return 'text-indigo-700 bg-indigo-100';
      default:
        return 'text-on-surface-variant bg-surface-low';
    }
  }
}
