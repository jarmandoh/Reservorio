-- Cambia moneda por defecto de EUR a COP (peso colombiano)
-- Permite agregar otras monedas via SUPPORTED_CURRENCIES env sin migracion adicional
ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'COP';
-- No se actualizan filas existentes; conservan su moneda original (EUR) para historico
