export interface Reservation {
  _rowIndex: number;
  franja:         string;
  disponibilidad: string;
  cliente:        string;
  telefono:       string;
  servicio:       string;
  notas:          string;
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
  franja:   string;
  cliente:  string;
  telefono: string;
  servicio: string;
  notas:    string;
}

export interface BookingRequest {
  providerId: string;
  customerId: string;
  serviceId: string;
  date: string;
  slot: string;
  notes?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  providerId: string;
  customerId: string;
  amount: number;
  currency: string;
  method: 'card' | 'transfer' | 'cash';
  status: 'pending' | 'paid' | 'failed';
  createdAt?: string;
}

export interface PaymentRequest {
  bookingId: string;
  providerId: string;
  customerId: string;
  amount: number;
  currency?: string;
  method: 'card' | 'transfer' | 'cash';
  status?: 'pending' | 'paid' | 'failed';
}

export interface UpdatePayload {
  rowIndex:       number;
  disponibilidad: string;
  notas?:         string;
}

export interface UxTip {
  title:       string;
  description: string;
}

export type DispStatus = 'Disponible' | 'Pendiente' | 'Reservado' | 'Confirmado';

export interface ApiResponse<T = unknown> {
  ok:       boolean;
  data?:    T;
  message?: string;
  errors?:  string[];
}

export interface GoogleStatus {
  linked:      boolean;
  email:       string | null;
  sheetId:     string | null;
  tokenExpiry: string | null;
}
