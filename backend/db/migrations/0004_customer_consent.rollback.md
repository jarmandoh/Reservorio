```sql
ALTER TABLE customers
  DROP COLUMN IF EXISTS marketing_consent,
  DROP COLUMN IF EXISTS consent_at,
  DROP COLUMN IF EXISTS data_consent;
```
