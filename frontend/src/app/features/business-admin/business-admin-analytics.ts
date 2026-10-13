import { BookingRecord, Payment, Reservation } from '../../core/models/reservation.model';

type GroupItem = { label: string; value: number };

function countBy<T>(items: T[], getLabel: (item: T) => string): GroupItem[] {
  return Object.entries(
    items.reduce(
      (counts, item) => {
        const label = getLabel(item);
        counts[label] = (counts[label] ?? 0) + 1;
        return counts;
      },
      {} as Record<string, number>
    )
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
}

export function summarizeReservations(rows: Reservation[]) {
  return {
    total: rows.length,
    items: [
      { label: 'Total', value: rows.length },
      { label: 'Disponibles', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length },
      { label: 'Reservados', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('reserv')).length },
      { label: 'Pendientes', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('pend')).length },
    ],
  };
}

export function groupReservationActivity(rows: Reservation[], bookings: BookingRecord[]) {
  return {
    statusGroups: [
      {
        label: 'Pendientes',
        value: rows.filter(
          r => r.disponibilidad.toLowerCase().includes('pend') || r.disponibilidad.toLowerCase().includes('reserv')
        ).length,
      },
      { label: 'Confirmadas', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('confirm')).length },
      { label: 'Disponibles', value: rows.filter(r => r.disponibilidad.toLowerCase().includes('disp')).length },
    ],
    byService: countBy(rows, row => row.servicio || 'Sin servicio'),
    byDay: countBy(bookings, booking => booking.date),
  };
}

export function calculateBusinessAnalytics(rows: Reservation[], bookings: BookingRecord[], payments: Payment[]) {
  const totalSlots = rows.length;
  const reservedSlots = rows.filter(r => {
    const status = r.disponibilidad.toLowerCase();
    return status.includes('pend') || status.includes('reserv') || status.includes('confirm');
  }).length;
  const confirmedSlots = rows.filter(r => r.disponibilidad.toLowerCase().includes('confirm')).length;
  const paidBookings = payments.filter(p => p.status === 'paid').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  const reservationRate = totalSlots ? Math.round((reservedSlots / totalSlots) * 100) : 0;
  const confirmationRate = totalSlots ? Math.round((confirmedSlots / totalSlots) * 100) : 0;
  const paymentRate = bookings.length ? Math.round((paidBookings / bookings.length) * 100) : 0;
  const abandonmentRate = bookings.length
    ? Math.round(((pendingBookings + cancelledBookings) / bookings.length) * 100)
    : 0;

  return {
    cards: [
      { label: 'Reserva', value: `${reservationRate}%`, tone: 'primary' },
      { label: 'Confirmación', value: `${confirmationRate}%`, tone: 'success' },
      { label: 'Pago', value: `${paymentRate}%`, tone: 'primary' },
      { label: 'Abandono', value: `${abandonmentRate}%`, tone: 'warning' },
    ],
    byService: countBy(rows, row => row.servicio || 'Sin servicio'),
    bySlot: countBy(bookings, booking => booking.slot),
  };
}
