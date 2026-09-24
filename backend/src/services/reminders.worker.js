'use strict';

/**
 * Worker de recordatorios agendados.
 *
 * Busca reservas (bookings) cuyo inicio cae dentro de la ventana configurable
 * (REMINDER_WINDOW_HOURS, defecto 24 h) y que aún no tienen un recordatorio
 * encolado/enviado (notifications type='reminder'). Para cada una crea la
 * notificación in_app + copia externa (email y SMS si sms_opt_in) vía
 * notificationsService.sendReminderNotification.
 *
 * Es opt-in: solo se arranca desde src/index.js cuando ENABLE_REMINDER_WORKER=1,
 * por lo que jamás corre dentro de los tests unitarios.
 */

const db = require('../db');
const notificationsService = require('./notifications.service');
const logger = require('../logger');

const WINDOW_HOURS = Number(process.env.REMINDER_WINDOW_HOURS) || 24;
const INTERVAL_MINUTES = Number(process.env.REMINDER_INTERVAL_MINUTES) || 60;

async function runDueReminders() {
  const { rows } = await db.query(
    `SELECT b.id AS booking_id,
            b.provider_id AS business_id,
            b.customer_id,
            b.booking_date,
            b.slot
       FROM bookings b
      WHERE b.status IN ('pending', 'confirmed')
        AND (b.booking_date::timestamp + b.slot::time) > NOW()
        AND (b.booking_date::timestamp + b.slot::time) <= NOW() + $1::interval
        AND NOT EXISTS (
              SELECT 1
                FROM notifications n
               WHERE n.booking_id = b.id
                 AND n.type = 'reminder'
                 AND n.status IN ('queued', 'sent')
            )
      ORDER BY b.booking_date, b.slot`,
    [`${WINDOW_HOURS} hours`]
  );

  let sent = 0;
  for (const booking of rows) {
    // sendReminderNotification valida businessId/bookingId y exige customerId.
    const result = await notificationsService.sendReminderNotification({
      businessId: booking.business_id,
      customerId: booking.customer_id,
      bookingId: booking.booking_id,
    });

    if (result?.ok) {
      sent += 1;
    } else {
      logger.error(`[reminders] fallo al crear recordatorio para ${booking.booking_id}: ${result?.message ?? 'sin detalle'}`);
    }
  }

  return { due: rows.length, sent };
}

/**
 * Arranca el bucle. Devuelve el interval para poder desactivarlo en tests.
 * El intervalo no impide que el proceso termine (unref).
 */
function startReminderWorker() {
  const run = () => {
    runDueReminders()
      .then(({ due, sent }) => logger.info(`[reminders] corrida: ${sent}/${due} recordatorios creados`))
      .catch(error => logger.error('[reminders] corrida falló:', error.message));
  };

  run(); // corrida inicial inmediata
  const interval = setInterval(run, INTERVAL_MINUTES * 60 * 1000);
  if (interval && typeof interval.unref === 'function') interval.unref();
  return interval;
}

module.exports = { runDueReminders, startReminderWorker, WINDOW_HOURS, INTERVAL_MINUTES };
