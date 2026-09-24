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

El runner (`backend/db/migrate.js`) requiere `DATABASE_URL` válida. En Docker el
backend aplica `db:migrate` antes de arrancar (ver `backend/Dockerfile`), por lo que
un despliegue sobre un volumen existente recibe los cambios de schema automáticamente.

## Baseline

`0001_init.sql` es la baseline (equivale a `backend/db/init.sql`, la misma fuente de
verdad que usa el contenedor de PostgreSQL en su primer arranque). Las sentencias son
idempotentes (`IF NOT EXISTS` + `ON CONFLICT DO NOTHING`), por lo que aplicarla sobre
una base ya creada con `init.sql` no causa errores.

## Convenciones

- Prefijo de 4 dígitos (`0001_`, `0002_`, ...). No renumerar ni editar una migración
  una vez aplicada a producción — crea una nueva.
- Las migraciones no deben contener parámetros (`$1`, ...); el runner las ejecuta como
  bloque simple.
- Todo cambio permanente al schema va primero como migración; si afecta a contenedores
  nuevos, refleja el cambio también en `init.sql`.