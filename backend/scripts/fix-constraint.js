const db = require('../src/db');
async function main() {
  await db.query("ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_business_type_check");
  await db.query("ALTER TABLE businesses ADD CONSTRAINT businesses_business_type_check CHECK (business_type IN ('appointment','onsite_service','no_appointments'))");
  console.log('OK');
  await db.end();
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
