export interface Reservation {
  _rowIndex: number;
  franja:         string;
  disponibilidad: string;
  cliente:        string;
  telefono:       string;
  servicio:       string;
  notas:          string;
}

export interface BookingPayload {
  franja:   string;
  cliente:  string;
  telefono: string;
  servicio: string;
  notas:    string;
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
