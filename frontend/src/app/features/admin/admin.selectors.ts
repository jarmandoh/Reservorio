import { Business } from '../../core/models/business.model';
import { Reservation } from '../../core/models/reservation.model';

export function getReservationStats(rows: readonly Reservation[]) {
  return [
    { label: 'Total', value: rows.length },
    { label: 'Disponibles', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length },
    { label: 'Reservados', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('reserv')).length },
    { label: 'Pendientes', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('pend')).length },
  ];
}

export function filterReservations(rows: readonly Reservation[], query: string, status: string) {
  const normalizedQuery = query.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  return rows.filter(row => {
    const matchesQuery =
      !normalizedQuery ||
      row.cliente?.toLowerCase().includes(normalizedQuery) ||
      row.servicio?.toLowerCase().includes(normalizedQuery) ||
      row.franja?.toLowerCase().includes(normalizedQuery);
    const matchesStatus = !normalizedStatus || row.disponibilidad.toLowerCase().includes(normalizedStatus);
    return matchesQuery && matchesStatus;
  });
}

export function filterBusinesses(rows: readonly Business[], query: string, status: string) {
  const normalizedQuery = query.toLowerCase();
  const normalizedStatus = status.toLowerCase();

  return rows.filter(business => {
    const matchesQuery =
      !normalizedQuery ||
      business.name.toLowerCase().includes(normalizedQuery) ||
      business.category.toLowerCase().includes(normalizedQuery) ||
      (business.location ?? '').toLowerCase().includes(normalizedQuery);
    const matchesStatus = !normalizedStatus || (business.active ? 'activo' : 'inactivo').includes(normalizedStatus);
    return matchesQuery && matchesStatus;
  });
}
