import type { Reservation, PaymentMethod, CheckoutInstructions } from '../../core/models/reservation.model';
import type { Business } from '../../core/models/business.model';
import type { Review, RatingStats } from '../../core/models/reviews.model';

export type BookingStep = 1 | 2 | 3 | 4;

export interface ConfirmedBooking {
  franja: string;
  cliente: string;
  telefono: string;
  servicio: string;
  notas: string;
}

export interface BookingProgress {
  service: string;
  slotRowIndex: number | undefined;
}

export interface ServiceMeta {
  price: string;
  duration: string;
  availability: string;
  summary: string;
  tag: 'popular' | 'quick' | 'premium';
  durationMinutes: number;
  priceNumber: number;
}

export type ServiceFilter = 'all' | 'popular' | 'quick' | 'premium';

export interface BookingState {
  step: BookingStep;
  business: Business | null;
  services: string[];
  servicePrices: Record<string, number>;
  servicesLoading: boolean;
  servicesError: string | null;
  reservations: Reservation[];
  reviews: Review[];
  ratingStats: RatingStats | null;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  paymentLoading: boolean;
  selectedService: string | null;
  selectedSlot: Reservation | null;
  confirmed: ConfirmedBooking | null;
  reservationId: string;
  customerId: string;
  paymentMethod: PaymentMethod;
  depositActive: boolean;
  paymentDetailsOpen: boolean;
  checkoutInstructions: CheckoutInstructions | null;
  lastBooking: { servicio: string; franja: string; cliente: string; telefono: string } | null;
  serviceFilter: ServiceFilter;
  submitAttempted: boolean;
}
