#!/usr/bin/env bash
# backup.sh — copia de seguridad de la base de datos PostgreSQL (pg_dump).
#
# Requisitos: psql/pg_dump instalados y DATABASE_URL en el entorno.
#
# Uso:
#   DATABASE_URL="postgres://user:pass@host:5432/reservorio" ./scripts/backup.sh
#
# Variables opcionales:
#   BACKUP_DIR   directorio destino (por defecto ./backups)
#   RETENTION    días a conservar (por defecto 14)
#
# Programación con cron (diario a las 03:30):
#   crontab -e
#   30 3 * * *  cd /opt/reservorio && DATABASE_URL="$PGURL" ./scripts/backup.sh >> /var/log/reservorio-backup.log 2>&1
#
# Restauración:
#   pg_restore -d "$DATABASE_URL" < backups/reservorio_YYYYMMDD_HHMMSS.sql
#   (o: psql "$DATABASE_URL" < backups/reservorio_YYYYMMDD_HHMMSS.sql)

set -euo pipefail

DATABASE_URL="${DATABASE_URL:-}"
BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/../backups}"
RETENTION="${RETENTION:-14}"

if [ -z "$DATABASE_URL" ]; then
  echo "[backup] ERROR: DATABASE_URL no definida." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[backup] ERROR: pg_dump no está instalado." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/reservorio_${STAMP}.sql"

echo "[backup] Iniciando dump -> $FILE"
pg_dump "$DATABASE_URL" --format=plain --no-owner --file="$FILE"

echo "[backup] Limpiando backups con más de ${RETENTION} días"
find "$BACKUP_DIR" -name 'reservorio_*.sql' -mtime "+${RETENTION}" -delete

echo "[backup] Completado. Fichero: $FILE"