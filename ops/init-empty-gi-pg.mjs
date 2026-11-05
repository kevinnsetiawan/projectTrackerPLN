import { Client } from 'pg';
import { DDL, ensureUnitConstraints } from '../server/_lib/schema.js';
const url=process.env.UNIT_TEST_PG_URL;
if (!url || !/test/i.test(new URL(url).pathname)) throw new Error('A disposable test database is required.');
const db=new Client({connectionString:url});
try {
  await db.connect();
  for (const stmt of DDL.split(';').map(s=>s.trim()).filter(Boolean)) await db.query(stmt);
  await ensureUnitConstraints((sql,params)=>db.query(sql,params));
} finally { await db.end(); }
