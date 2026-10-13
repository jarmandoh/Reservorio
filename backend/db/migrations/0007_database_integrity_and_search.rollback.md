# Reversión de 0007_database_integrity_and_search.sql

Ejecutar manualmente dentro de una transacción si se necesita revertir esta migración:

```sql
BEGIN;
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_rating_range_check;
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_reviews_nonnegative_check;
DROP INDEX IF EXISTS idx_businesses_active_name;
DROP INDEX IF EXISTS idx_businesses_name_trgm;
DROP INDEX IF EXISTS idx_businesses_description_trgm;
DROP INDEX IF EXISTS idx_businesses_location_trgm;
DROP INDEX IF EXISTS idx_businesses_category_trgm;
DROP INDEX IF EXISTS idx_businesses_profession_trgm;
DROP INDEX IF EXISTS idx_businesses_tags_trgm;
DROP INDEX IF EXISTS idx_business_owners_owner_business;
DROP INDEX IF EXISTS idx_business_categories_category_business;
DROP INDEX IF EXISTS idx_business_tags_tag_business;
DROP INDEX IF EXISTS idx_notifications_customer;
DROP INDEX IF EXISTS idx_payments_booking;
DROP INDEX IF EXISTS idx_payments_provider_created;
DROP INDEX IF EXISTS idx_payments_customer_created;
DELETE FROM schema_migrations WHERE name = '0007_database_integrity_and_search.sql';
COMMIT;
```

La extensión `pg_trgm` se conserva porque puede estar compartida por otras partes de la base. La reversión elimina solo los objetos introducidos por esta migración.
