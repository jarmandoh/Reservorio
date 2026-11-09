const db = require('../src/db');
async function main() {
  const r = await db.query(
    "SELECT disponibilidad, count(*) FROM reservations WHERE business_id LIKE 'dummy-%' GROUP BY disponibilidad"
  );
  console.log(JSON.stringify(r.rows));
  const b = await db.query("SELECT count(*) FROM businesses WHERE id LIKE 'dummy-%' AND business_type='appointment'");
  console.log('appointment businesses:', b.rows[0].count);
  await db.end();
}
main().catch(e => {
  console.error('ERR', e.message);
  process.exit(1);
});
