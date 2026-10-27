#!/usr/bin/env sh
set -eu

DB_NAME="${DB_NAME:-reservorio}"
RESTORE_DATABASE_URL="${RESTORE_DATABASE_URL:-}"
MAINTENANCE_DATABASE_URL="${MAINTENANCE_DATABASE_URL:-}"

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <archivo.dump|archivo.sql>"
  echo "  Requiere RESTORE_DATABASE_URL, MAINTENANCE_DATABASE_URL y DB_NAME (destino reemplazado)."
  exit 1
fi

DUMP="$1"

if [ ! -f "$DUMP" ]; then
  echo "ERROR: no existe el archivo '$DUMP'." >&2
  exit 1
fi

case "$DUMP" in
  *.dump) FORMAT=custom ;;
  *.sql) FORMAT=plain ;;
  *)
    echo "ERROR: formato no soportado; usa un archivo .dump o .sql." >&2
    exit 1
    ;;
esac

if [ -z "$RESTORE_DATABASE_URL" ] || [ -z "$MAINTENANCE_DATABASE_URL" ]; then
  echo "ERROR: define RESTORE_DATABASE_URL y MAINTENANCE_DATABASE_URL." >&2
  exit 1
fi

if ! printf '%s' "$DB_NAME" | grep -Eq '^[A-Za-z_][A-Za-z0-9_]*$'; then
  echo "ERROR: DB_NAME solo puede contener letras, números y guion bajo, y no puede empezar con número." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql no está instalado o no está en PATH." >&2
  exit 1
fi

if [ "$FORMAT" = custom ] && { ! command -v pg_restore >/dev/null 2>&1 || ! pg_restore --list < "$DUMP" >/dev/null 2>&1; }; then
  echo "ERROR: el archivo no es un dump custom válido o pg_restore no puede leerlo." >&2
  exit 1
fi

CONNECTED_DB="$(psql "$RESTORE_DATABASE_URL" -X -A -t -c 'SELECT current_database()')"
if [ "$CONNECTED_DB" != "$DB_NAME" ]; then
  echo "ERROR: RESTORE_DATABASE_URL apunta a '$CONNECTED_DB', pero DB_NAME es '$DB_NAME'." >&2
  exit 1
fi

echo "Restaurando '$DUMP' en '$DB_NAME'... (la base destino se reemplaza por completo)"
echo "¿Continuar? Escribe 'yes'"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelado."
  exit 1
fi

# El backend debe estar detenido durante la restauración para evitar escrituras concurrentes.
echo "Cerrando conexiones activas..."
psql "$MAINTENANCE_DATABASE_URL" -X --set ON_ERROR_STOP=on \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null

echo "Recreando base de datos '$DB_NAME'..."
psql "$MAINTENANCE_DATABASE_URL" -X --set ON_ERROR_STOP=on \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null

echo "Aplicando volcado..."
LOG_FILE="${TMPDIR:-/tmp}/reservorio-restore-$$.log"
if [ "$FORMAT" = custom ]; then
  if ! pg_restore --dbname="$RESTORE_DATABASE_URL" --exit-on-error --no-owner --no-privileges -v < "$DUMP" >"$LOG_FILE" 2>&1; then
    echo "ERROR: pg_restore falló. La base destino puede estar incompleta; revisa $LOG_FILE y repite la restauración." >&2
    exit 1
  fi
else
  if ! psql "$RESTORE_DATABASE_URL" -X --set ON_ERROR_STOP=on < "$DUMP" >"$LOG_FILE" 2>&1; then
    echo "ERROR: psql falló. La base destino puede estar incompleta; revisa $LOG_FILE y repite la restauración." >&2
    exit 1
  fi
fi

echo "Verificación:"
psql "$RESTORE_DATABASE_URL" -X -A -t -c "SELECT 'owners=' || count(*) FROM public.owners UNION ALL SELECT 'customers=' || count(*) FROM public.customers UNION ALL SELECT 'reservations=' || count(*) FROM public.reservations UNION ALL SELECT 'bookings=' || count(*) FROM public.bookings UNION ALL SELECT 'payments=' || count(*) FROM public.payments;"
rm -f "$LOG_FILE"
echo "Restauración completada."
