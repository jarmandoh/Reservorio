import { Injectable, signal, computed } from '@angular/core';
import { formatCurrency } from '../../core/config/currency';
import type { BookingStep, ConfirmedBooking, ServiceFilter, ServiceMeta } from './booking.types';
import type { Reservation, PaymentMethod, CheckoutInstructions } from '../../core/models/reservation.model';
import type { Business } from '../../core/models/business.model';
import type { Review, RatingStats } from '../../core/models/reviews.model';

@Injectable()  // No providedIn — provided at component level
export class BookingStateService {
  // ── Core state signals ───────────────────────────────────────────────
  readonly step = signal<BookingStep>(1);
  readonly business = signal<Business | null>(null);

  // Services
  readonly services = signal<string[]>([]);
  readonly servicePrices = signal<Record<string, number>>({});
  readonly servicesLoading = signal(false);
  readonly servicesError = signal<string | null>(null);
  readonly serviceFilter = signal<ServiceFilter>('all');

  // Availability
  readonly reservations = signal<Reservation[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Reviews
  readonly reviews = signal<Review[]>([]);
  readonly ratingStats = signal<RatingStats | null>(null);

  // Booking flow
  readonly submitting = signal(false);
  readonly submitAttempted = signal(false);
  readonly selectedService = signal<string | null>(null);
  readonly selectedSlot = signal<Reservation | null>(null);
  readonly confirmed = signal<ConfirmedBooking | null>(null);
  readonly reservationId = signal('');
  readonly customerId = signal('');
  readonly lastBooking = signal<{ servicio: string; franja: string; cliente: string; telefono: string } | null>(null);

  // Payment
  readonly paymentLoading = signal(false);
  readonly paymentMethod = signal<PaymentMethod>('card');
  readonly depositActive = signal(false);
  readonly paymentDetailsOpen = signal(false);
  readonly checkoutInstructions = signal<CheckoutInstructions | null>(null);

  // ── Computed ─────────────────────────────────────────────────────────
  readonly stepProgress = computed(() => ((this.step() - 1) / 3) * 100);

  readonly availableSlotsCount = computed(() =>
    this.reservations().filter(row => !this.isTaken(row)).length
  );

  readonly visibleServices = computed(() => {
    const list = this.services();
    const filter = this.serviceFilter();
    if (filter === 'all') return list;
    return list.filter(svc => {
      const meta = this.serviceMeta(svc);
      if (filter === 'popular') return meta.tag === 'popular';
      if (filter === 'quick') return meta.durationMinutes <= 45;
      if (filter === 'premium') return meta.priceNumber >= 90;
      return true;
    });
  });

  // ── Helpers ──────────────────────────────────────────────────────────
  isTaken(row: Reservation): boolean {
    const d = (row.disponibilidad ?? '').toLowerCase();
    return d.includes('ocup') || d.includes('reserv') || d.includes('conf') ||
           d.includes('pend') || d.includes('book') || d.includes('taken');
  }

  serviceIcon(service: string): string {
    const lc = service.toLowerCase();
    if (lc.includes('facial') || lc.includes('spa') || lc.includes('mani') || lc.includes('pedi')) return 'spa';
    if (lc.includes('corte') || lc.includes('barba') || lc.includes('peinado')) return 'content_cut';
    if (lc.includes('maquillaje') || lc.includes('celebr') || lc.includes('evento')) return 'brush';
    if (lc.includes('depil') || lc.includes('laser')) return 'auto_awesome';
    return 'self_improvement';
  }

  serviceMeta(service: string): ServiceMeta {
    const lc = service.toLowerCase();
    const configuredPrice = this.servicePrices()[service];

    if (lc.includes('facial') || lc.includes('spa') || lc.includes('mani') || lc.includes('pedi')) {
      return { price: formatCurrency(configuredPrice ?? 39000), duration: '45 min', availability: 'Hoy', summary: 'Tratamiento completo con cuidado personalizado.', tag: 'popular', durationMinutes: 45, priceNumber: configuredPrice ?? 39000 };
    }
    if (lc.includes('corte') || lc.includes('barba') || lc.includes('peinado')) {
      return { price: formatCurrency(configuredPrice ?? 28000), duration: '30 min', availability: '2 huecos', summary: 'Tiempos rápidos para una cita eficiente.', tag: 'quick', durationMinutes: 30, priceNumber: configuredPrice ?? 28000 };
    }
    if (lc.includes('maquillaje') || lc.includes('celebr') || lc.includes('evento')) {
      return { price: formatCurrency(configuredPrice ?? 95000), duration: '75 min', availability: 'Agotado', summary: 'Servicio premium para eventos y finishing touch.', tag: 'premium', durationMinutes: 75, priceNumber: configuredPrice ?? 95000 };
    }
    if (lc.includes('depil') || lc.includes('laser')) {
      return { price: formatCurrency(configuredPrice ?? 54000), duration: '50 min', availability: 'Hoy', summary: 'Ideal para rutinas de mantenimiento y confort.', tag: 'popular', durationMinutes: 50, priceNumber: configuredPrice ?? 54000 };
    }
    return { price: formatCurrency(configuredPrice ?? 49000), duration: '60 min', availability: 'Disponible', summary: 'Servicio de consulta y atención personalizada.', tag: 'popular', durationMinutes: 60, priceNumber: configuredPrice ?? 49000 };
  }

  resetFlow(): void {
    this.selectedSlot.set(null);
    this.selectedService.set(null);
    this.confirmed.set(null);
    this.reservationId.set('');
    this.customerId.set('');
    this.depositActive.set(false);
    this.paymentDetailsOpen.set(false);
    this.checkoutInstructions.set(null);
    this.paymentMethod.set('card');
    this.step.set(1);
  }
}
