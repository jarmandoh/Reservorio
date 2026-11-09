const db = require('../src/db');
async function main() {
  await db.query("ALTER TABLE services ADD COLUMN IF NOT EXISTS precio NUMERIC(12,2)");
  await db.query("ALTER TABLE services ADD COLUMN IF NOT EXISTS variaciones TEXT NOT NULL DEFAULT ''");
  console.log('OK');
  await db.end();
}
main().catch(e => { console.error('ERR', e.message); process.exit(1); });
