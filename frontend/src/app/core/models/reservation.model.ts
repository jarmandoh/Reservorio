export interface Business {
  id:             string;
  name:           string;
  category:       string;
  description:    string;
  location:       string;
  rating:         number;
  reviews:        number;
  tags:           string[];
  available:      number;
  total:          number;
  routePath:      string;
  gradient:       string;
  icon:           string;
  // Extended fields
  schedule?:      string;
  logo?:          string;
  phone?:         string;
  active?:        boolean;
  sheetId?:       string;
  appsScriptUrl?: string;
}

export interface NewBusinessPayload {
  name:          string;
  category:      string;
  description?:  string;
  location?:     string;
  gradient?:     string;
  icon?:         string;
  schedule?:     string;
  logo?:         string;
  phone?:        string;
  tags?:         string[] | string;
  pin:           string;
}

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
