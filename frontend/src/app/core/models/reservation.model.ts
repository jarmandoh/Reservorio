export interface Reservation {
  id: number;
  _rowIndex: number;
  franja: string;
  disponibilidad: string;
  cliente: string;
  telefono: string;
  servicio: string;
  notas: string;
}

export interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
  createdAt?: string;
}

export interface CustomerPayload {
  name: string;
  email: string;
  phone?: string;
  dataConsent?: boolean;
  marketingConsent?: boolean;
}

export interface BookingRecord {
  id: string;
  providerId: string;
  customerId: string;
  serviceId: string;
  date: string;
  slot: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingPayload {
  franja: string;
  cliente: string;
  telefono: string;
  servicio: string;
  notas: string;
}

export interface BookingRequest {
  providerId: string;
  customerId: string;
  serviceId: string;
  date: string;
  slot: string;
  notes?: string;
}

export type PaymentMethod = 'card' | 'paypal' | 'transfer' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  bookingId: string;
  providerId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt?: string;
}

export interface PaymentRequest {
  bookingId: string;
  providerId: string;
  customerId: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  status?: PaymentStatus;
}

export interface CheckoutInstructions {
  beneficiary?: string;
  iban?: string;
  bank?: string;
  reference?: string;
  message?: string;
}

export interface CheckoutSession {
  sessionId?: string;
  checkoutUrl: string | null;
  paymentId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  instructions?: CheckoutInstructions;
}

export interface UpdatePayload {
  rowIndex: number;
  disponibilidad: string;
  notas?: string;
}

export interface UxTip {
  title: string;
  description: string;
}

export type DispStatus = 'Disponible' | 'Pendiente' | 'Reservado' | 'Confirmado';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface GoogleStatus {
  linked: boolean;
  email: string | null;
  sheetId: string | null;
  tokenExpiry: string | null;
}

export interface NotificationItem {
  id: string;
  businessId: string;
  customerId?: string | null;
  bookingId?: string | null;
  type: string;
  channel: string;
  title: string;
  message: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt?: string;
  sentAt?: string | null;
}

export interface AdminFunnel {
  views: number;
  bookings: number;
  paid: number;
  days: number;
}

export interface AdminStats {
  businesses: number;
  activeBusinesses: number;
  verifiedBusinesses: number;
  customers: number;
  bookings: number;
  confirmedBookings: number;
  reservations: number;
  payments: number;
  paidPayments: number;
  pendingPayments: number;
  revenue: number;
  reviews: number;
  averageRating: number;
  funnel?: AdminFunnel;
}

export interface CustomerExportBooking {
  id: string;
  provider_id: string;
  service_id: string;
  booking_date: string;
  slot: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface CustomerExportPayment {
  id: string;
  booking_id: string;
  provider_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  external_reference?: string;
  created_at: string;
}

export interface CustomerExportNotification {
  id: string;
  business_id: string;
  booking_id?: string;
  type: string;
  channel: string;
  title: string;
  message: string;
  status: string;
  created_at: string;
}

export interface CustomerExport {
  exportedAt: string;
  customer: Customer;
  bookings: CustomerExportBooking[];
  payments: CustomerExportPayment[];
  notifications: CustomerExportNotification[];
}

export interface AdminReview {
  id: number;
  businessId: string;
  businessName: string;
  rating: number;
  review: string;
  createdAt: string;
}

export interface AdminServiceRecord {
  id: number;
  businessId: string;
  businessName: string;
  nombre: string;
  active: boolean;
  createdAt: string;
}

export interface CustomerHistoryBooking {
  id: string;
  providerId: string;
  businessName: string;
  serviceId: string;
  date: string;
  slot: string;
  status: PaymentStatus | 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  createdAt?: string;
  paymentAmount?: number | null;
  paymentCurrency?: string | null;
  paymentStatus?: PaymentStatus | null;
  paymentMethod?: PaymentMethod | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomerHistory {
  customer: Customer;
  bookings: CustomerHistoryBooking[];
  meta?: PaginationMeta;
}
