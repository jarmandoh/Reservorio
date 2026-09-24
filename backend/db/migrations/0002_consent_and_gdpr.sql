-- RGPD: consentimiento para procesar datos personales (nombre/email/telefono).
-- data_consent: consentimiento obligatorio para crear/reutilizar el cliente.
-- consent_at:   marca de tiempo del consentimiento más reciente.
-- marketing_consent: opt-in para comunicaciones comerciales/recordatorios.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS data_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;