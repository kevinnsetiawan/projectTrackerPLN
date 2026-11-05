if (process.env.NODE_ENV !== 'test' || process.env.SEED_DEMO !== '1') {
  throw new Error('Seed hanya tersedia dengan NODE_ENV=test dan SEED_DEMO=1.');
}
const { getPool } = await import('../_lib/db.js');
const { autoSeed } = await import('../_lib/seedRunner.js');
const pool = getPool();
const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM projects');
if (!rows[0].count) await autoSeed(pool);
