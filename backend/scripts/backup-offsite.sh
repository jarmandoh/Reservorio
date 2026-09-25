#!/usr/bin/env sh
# Backup offsite a S3 (rclone o AWS CLI) — P3
# Requiere BACKUP_S3_BUCKET (ej. s3://reservorio-backups) y credenciales:
#   - rclone: RCLONE_CONFIG_* o ~/.config/rclone/rclone.conf
#   - aws: AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION
# Uso: ./scripts/backup-offsite.sh [directorio_local]
# Por defecto sincroniza ./backups (generados por pg_dump -Fc -Z9)

set -eu

SRC_DIR="${1:-./backups}"
DEST="${BACKUP_S3_BUCKET:-}"

if [ -z "$DEST" ]; then
  echo "[backup-offsite] BACKUP_S3_BUCKET no definido, omitiendo sync offsite."
  exit 0
fi

if [ ! -d "$SRC_DIR" ]; then
  echo "[backup-offsite] directorio no existe: $SRC_DIR"
  exit 0
fi

# Preferir rclone si está disponible, fallback a aws cli
if command -v rclone >/dev/null 2>&1; then
  echo "[backup-offsite] rclone sync $SRC_DIR -> $DEST (cifrado si RCLONE_CRYPT configurado)"
  # Si BACKUP_S3_CRYPT_REMOTE está definido, usar remote cifrado
  if [ -n "${BACKUP_S3_CRYPT_REMOTE:-}" ]; then
    rclone sync "$SRC_DIR" "$BACKUP_S3_CRYPT_REMOTE" --transfers 2 --checkers 4 --fast-list
  else
    rclone sync "$SRC_DIR" "$DEST" --transfers 2 --checkers 4 --fast-list
  fi
elif command -v aws >/dev/null 2>&1; then
  echo "[backup-offsite] aws s3 sync $SRC_DIR -> $DEST"
  aws s3 sync "$SRC_DIR" "$DEST" --storage-class STANDARD_IA --delete
else
  echo "[backup-offsite] ni rclone ni aws encontrados, no se pudo hacer offsite."
  echo "Instala rclone (https://rclone.org) o aws-cli y configura credenciales."
  exit 0
fi

echo "[backup-offsite] offsite completo: $SRC_DIR -> $DEST"

# Verificación opcional: lista últimos 3 objetos
if command -v rclone >/dev/null 2>&1; then
  rclone ls "$DEST" 2>/dev/null | tail -n 3 || true
elif command -v aws >/dev/null 2>&1; then
  aws s3 ls "$DEST" 2>/dev/null | tail -n 3 || true
fi
