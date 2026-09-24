#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
DB_CONTAINER="${DB_CONTAINER:-reservorio-db}"
DB_USER="${DB_USER:-reservorio}"
DB_NAME="${DB_NAME:-reservorio}"

if [ "$#" -lt 1 ]; then
  echo "Uso: $0 <archivo.dump>"
  echo "  Restaura un volcado binario de pg_dump en la base de datos del contenedor '$DB_CONTAINER'."
  exit 1
fi

DUMP="$1"

if [ ! -f "$DUMP" ]; then
  echo "ERROR: no existe el archivo '$DUMP'." >&2
  exit 1
fi

echo "Restaurando '$DUMP' en $DB_CONTAINER... (la base de datos se reemplaza por completo)"
echo "¿Continuar? Escribe 'yes'"
read -r CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Cancelado."
  exit 1
fi

# El backend debe estar detenido durante la restauración para evitar escrituras concurrentes.
if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  echo "Cerrando conexiones activas..."
  docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null
fi

echo "Recreando base de datos '$DB_NAME'..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  -c "CREATE DATABASE \"$DB_NAME\";" >/dev/null

echo "Aplicando volcado..."
docker exec -i "$DB_CONTAINER" pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --no-privileges -v < "$DUMP" >/tmp/restore.log 2>&1 || {
  echo "El volcado se aplicó pero hubo avisos/errores no fatales. Revisa /tmp/restore.log (docker exec)." >&2
}

echo "Verificación:"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT count(*) AS tablas FROM pg_tables WHERE schemaname='public';"
echo "Restauración completada."