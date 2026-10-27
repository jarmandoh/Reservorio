# Simulacro de restauración PostgreSQL

Completa este registro en staging después de restaurar un backup reciente con el procedimiento de [DEPLOY.md](../DEPLOY.md#6-backup-y-restauración-de-la-base-de-datos). No restaures sobre producción.

## Registro del ejercicio

- Fecha y zona horaria:
- Commit/despliegue probado:
- Backup usado y fecha de creación:
- Destino de staging (host/base):
- Inicio de restauración:
- Fin de restauración y validaciones:
- RTO medido:
- Punto de recuperación elegido:
- RPO medido (antigüedad del backup):
- Resultado del smoke de API:
- Incidencias y acciones correctivas:

## Conteos comparados

| Tabla        | Origen | Staging restaurado | Resultado |
| ------------ | -----: | -----------------: | --------- |
| owners       |        |                    |           |
| customers    |        |                    |           |
| reservations |        |                    |           |
| bookings     |        |                    |           |
| payments     |        |                    |           |

El script de restauración imprime los conteos del destino. Compara esos valores con el origen o con un inventario tomado antes del simulacro y verifica además el smoke de salud/API en staging.
