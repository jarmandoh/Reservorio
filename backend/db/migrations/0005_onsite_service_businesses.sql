ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'appointment',
  ADD COLUMN IF NOT EXISTS profession TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'businesses_business_type_check'
       AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_business_type_check
      CHECK (business_type IN ('appointment', 'onsite_service'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'businesses_onsite_profession_required'
       AND conrelid = 'businesses'::regclass
  ) THEN
    ALTER TABLE businesses ADD CONSTRAINT businesses_onsite_profession_required
      CHECK (business_type <> 'onsite_service' OR NULLIF(BTRIM(profession), '') IS NOT NULL);
  END IF;
END $$;
