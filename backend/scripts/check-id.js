const db = require('../src/db');
async function main() {
  const r = await db.query("SELECT id FROM businesses WHERE id LIKE 'dummy-69%' LIMIT 1");
  console.log(JSON.stringify(r.rows));
  await db.end();
}
main().catch(e => {
  console.error('ERR', e.message);
  process.exit(1);
});
