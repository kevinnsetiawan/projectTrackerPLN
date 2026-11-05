// Read only a previously exported, checksum-verified snapshot. Dry-run by default.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { applyWarnotoSnapshot } from '../_lib/warnotoImport.js';

const arg=name=>process.argv.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3);
const file=arg('snapshot'), expected=arg('sha256'), confirm=arg('confirm-db');
const apply=process.argv.includes('--apply'), connectionString=process.env.GI_IMPORT_DATABASE_URL;
if (!file || !/^[a-f0-9]{64}$/.test(expected||'') || !confirm || !connectionString) throw new Error('Set GI_IMPORT_DATABASE_URL and --snapshot=<path> --sha256=<sha256> --confirm-db=<database>; add --apply only after review.');
const stat=fs.lstatSync(file);
if (!stat.isFile() || stat.isSymbolicLink() || stat.size>10*1024*1024) throw new Error('Snapshot file tidak valid.');
if (process.platform!=='win32' && ((stat.mode & 0o077)!==0 || stat.uid!==process.getuid())) throw new Error('Snapshot harus dimiliki operator dan mode 0600.');
const real=fs.realpathSync(file), repo=fs.realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
if (real===repo || real.startsWith(repo+path.sep)) throw new Error('Snapshot harus berada di luar repository.');
const data=fs.readFileSync(real);
if (crypto.createHash('sha256').update(data).digest('hex')!==expected) throw new Error('Checksum snapshot tidak cocok.');
const snapshot=JSON.parse(data.toString('utf8'));
const client=new Client({connectionString});
try {
  await client.connect();
  if ((await client.query('SELECT current_database() AS name')).rows[0].name!==confirm) throw new Error('Database confirmation does not match target.');
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('protrack-warnoto-gi-import'))");
  await client.query('LOCK TABLE units, gardu_induk IN SHARE ROW EXCLUSIVE MODE');
  const counts=await applyWarnotoSnapshot((text,params)=>client.query(text,params),snapshot);
  await client.query(apply?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({mode:apply?'applied':'dry-run rolled back',...counts}));
} catch (e) {
  await client.query('ROLLBACK').catch(()=>{});
  throw e;
} finally { await client.end(); }
