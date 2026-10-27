# Migraciones SQL

El esquema se gestiona con migraciones **numeradas** en este directorio. Cada archivo
`NNNN_nombre.sql` se aplica una sola vez en orden, dentro de una transacción, y queda
registrado en la tabla `schema_migrations`.

## Uso

```bash
# Aplicar pendientes (idempotente — seguro repetir)
pnpm db:migrate

# Crear el siguiente archivo numerado
pnpm db:migrate:create -- anadir_columna_x
```

El runner (`backend/db/migrate.js`) requiere `DATABASE_URL` válida. En desarrollo y
despliegues, aplica `pnpm db:migrate` antes de iniciar el backend para actualizar el
schema existente.

## Retención de idempotencia

El backend elimina cada día las respuestas idempotentes completadas con más de 30 días,
las solicitudes abandonadas cuyo lease expiró hace más de un día y los webhooks procesados
hace más de 90 días. Los clientes deben reutilizar la misma clave durante los reintentos
dentro de esa ventana; después, la garantía de replay expira.

## Baseline

`backend/db/init.sql` es la única baseline del esquema inicial. Registra `init.sql`
en `schema_migrations`; las nuevas migraciones numeradas comienzan en `0001` y se
aplican después de ese snapshot. Las bases locales anteriores a este reinicio deben
recrearse desde `init.sql` antes de usar las nuevas migraciones, porque sus nombres
históricos `0001`–`0007` ya no forman parte del proyecto.

## Convenciones

- Prefijo de 4 dígitos (`0001_`, `0002_`, ...). No renumerar ni editar una migración
  una vez aplicada a producción — crea una nueva.
- Las migraciones no deben contener parámetros (`$1`, ...); el runner las ejecuta como
  bloque simple.
- Todo cambio permanente al schema va en una migración numerada. `init.sql` representa
  la baseline de este reinicio y no se actualiza con cada migración posterior.
- Las migraciones con objetos reversibles deben documentar su SQL de rollback en un
  archivo `.rollback.md` junto a la migración. El runner solo ejecuta archivos `.sql`.
