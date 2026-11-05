// Explicit migration; dry-run by default. Never infer or overwrite project ownership.
import { Client } from 'pg';
import { migrateGarduSchema } from '../_lib/schema.js';

const url=process.env.GI_MIGRATION_DATABASE_URL;
const apply=process.argv.includes('--apply');
const confirm=process.argv.find(arg=>arg.startsWith('--confirm-db='))?.slice('--confirm-db='.length);
if (!url || !confirm) throw new Error('Set GI_MIGRATION_DATABASE_URL and --confirm-db=<database>; add --apply only after review.');
const client=new Client({connectionString:url});
try {
  await client.connect();
  const actual=(await client.query('SELECT current_database() AS name')).rows[0].name;
  if (actual!==confirm) throw new Error('Database confirmation does not match target.');
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('protrack-warnoto-gi-migration'))");
  await migrateGarduSchema((text,params)=>client.query(text,params));
  await client.query(apply ? 'COMMIT' : 'ROLLBACK');
  console.log(apply ? 'GI schema migration applied.' : 'GI schema migration dry-run passed and rolled back.');
} catch (e) {
  await client.query('ROLLBACK').catch(()=>{});
  throw e;
} finally { await client.end(); }
