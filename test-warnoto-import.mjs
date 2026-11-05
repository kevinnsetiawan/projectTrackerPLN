import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { Client } from 'pg';
import { DDL, ensureUnitConstraints, migrateGarduSchema } from './server/_lib/schema.js';
import { applyWarnotoSnapshot, normalizeWarnotoSnapshot } from './server/_lib/warnotoImport.js';

let db;
if (process.env.UNIT_TEST_PG_URL) {
  const name=decodeURIComponent(new URL(process.env.UNIT_TEST_PG_URL).pathname.slice(1));
  if (!/test/i.test(name)) throw new Error('UNIT_TEST_PG_URL must name a disposable test database.');
  const client=new Client({connectionString:process.env.UNIT_TEST_PG_URL});
  await client.connect();
  db={query:(sql,params)=>client.query(sql,params),close:()=>client.end()};
} else db=new PGlite();
const q=(sql,params)=>db.query(sql,params);
async function transaction(fn) {
  await q('BEGIN');
  try { const result=await fn(q); await q('COMMIT'); return result; }
  catch (e) { await q('ROLLBACK'); throw e; }
}
const clone=value=>JSON.parse(JSON.stringify(value));
const snapshot={version:1,uit:[{id:'I',kode:'UIT-X',nama:'Induk X'}],upt:[{id:'A',uit_id:'I',kode:'UPT-A',nama:'UPT A'},{id:'B',uit_id:'I',kode:'UPT-B',nama:'UPT B'}],gi:[{id:'GA',upt_id:'A',ultg_id:'UL',nama:'GI A',latitude:-7.123456789,longitude:112.1,map_source_url:'https://maps.example/gi',active:true},{id:'GB',upt_id:'B',ultg_id:null,nama:'GI B',latitude:null,longitude:null,map_source_url:null,active:true}]};
try {
  for (const stmt of DDL.split(';').map(s=>s.trim()).filter(Boolean)) await q(stmt);
  await ensureUnitConstraints(q);
  // Rehearse an existing schema with location ownership missing, then migrate twice.
  const legacyUnit=(await q("INSERT INTO units(code,name,kind) VALUES ('LEGACY','Legacy','upt') RETURNING id")).rows[0].id;
  const legacyProject=(await q("INSERT INTO projects(unit_id,kode,nama,tipe,uip,lokasi,kontraktor) VALUES ($1,'LEGACY-P','Legacy','GI','Legacy','existing','Contractor') RETURNING id",[legacyUnit])).rows[0].id;
  await q("INSERT INTO lokasis(project_id,unit_id,nama,latitude,longitude) VALUES ($1,$2,'existing',-7,112)",[legacyProject,legacyUnit]);
  await q('ALTER TABLE lokasis DROP CONSTRAINT lokasis_project_unit_fk');
  await q('ALTER TABLE lokasis DROP CONSTRAINT lokasis_gardu_unit_fk');
  await q('ALTER TABLE lokasis DROP COLUMN unit_id');
  await transaction(migrateGarduSchema);
  await transaction(migrateGarduSchema);
  const legacy=(await q('SELECT unit_id,nama,latitude,longitude FROM lokasis WHERE project_id=$1',[legacyProject])).rows[0];
  assert.equal(Number(legacy.unit_id),Number(legacyUnit));
  assert.equal(legacy.nama,'existing'); assert.equal(Number(legacy.latitude),-7); assert.equal(Number(legacy.longitude),112);
  await q('DELETE FROM projects WHERE id=$1',[legacyProject]); await q('DELETE FROM units WHERE id=$1',[legacyUnit]);
  assert.deepEqual(await transaction(tx=>applyWarnotoSnapshot(tx,snapshot)),{uit:1,upt:2,gi:2});
  const unitRows=(await q("SELECT id,source_id FROM units WHERE source_system='warnoto' ORDER BY source_id")).rows;
  const giRows=(await q("SELECT id,source_id,unit_id,latitude FROM gardu_induk WHERE source_system='warnoto' ORDER BY source_id")).rows;
  await transaction(tx=>applyWarnotoSnapshot(tx,snapshot));
  assert.deepEqual((await q("SELECT id,source_id FROM units WHERE source_system='warnoto' ORDER BY source_id")).rows,unitRows);
  assert.deepEqual((await q("SELECT id,source_id,unit_id,latitude FROM gardu_induk WHERE source_system='warnoto' ORDER BY source_id")).rows,giRows);
  assert.equal(Number(giRows[0].latitude),-7.123456789);
  const unitA=unitRows.find(row=>row.source_id==='A').id;
  const project=(await q("INSERT INTO projects(unit_id,kode,nama,tipe,uip,lokasi,kontraktor) VALUES ($1,'P','P','GI','X','kept','Contractor') RETURNING id",[unitA])).rows[0].id;
  await q("INSERT INTO lokasis(project_id,unit_id,gardu_induk_id,nama,latitude,longitude) VALUES ($1,$2,$3,'kept',-6,111)",[project,unitA,giRows[0].id]);
  await assert.rejects(()=>q("INSERT INTO lokasis(project_id,unit_id,gardu_induk_id,nama) VALUES ($1,$2,$3,'wrong')",[project,unitA,giRows[1].id]));
  await assert.rejects(()=>q('UPDATE gardu_induk SET unit_id=$1 WHERE id=$2',[giRows[1].unit_id,giRows[0].id]));
  const before=(await q('SELECT nama,latitude,longitude,gardu_induk_id FROM lokasis WHERE project_id=$1',[project])).rows[0];
  const changed=clone(snapshot); changed.gi[0].latitude=-8; changed.gi[0].nama='GI updated';
  await transaction(tx=>applyWarnotoSnapshot(tx,changed));
  assert.deepEqual((await q('SELECT nama,latitude,longitude,gardu_induk_id FROM lokasis WHERE project_id=$1',[project])).rows[0],before);
  const bad=clone(changed); bad.gi[0].latitude=91;
  await assert.rejects(()=>transaction(tx=>applyWarnotoSnapshot(tx,bad)),/rentang/);
  bad.gi[0].latitude=-8; bad.gi.pop();
  await assert.rejects(()=>transaction(tx=>applyWarnotoSnapshot(tx,bad)),/kehilangan GI/);
  const collision=clone(changed); collision.upt[1].kode=collision.upt[0].kode.toLowerCase();
  assert.throws(()=>normalizeWarnotoSnapshot(collision),/duplikat/);
  await q("UPDATE units SET name='local edit' WHERE id=$1",[unitA]);
  await assert.rejects(()=>transaction(tx=>applyWarnotoSnapshot(tx,changed)),/lokal berubah/);
  assert.equal((await q('SELECT name FROM units WHERE id=$1',[unitA])).rows[0].name,'local edit');
  console.log('WARNOTO import, legacy migration, ownership and rollback checks passed');
} finally { await db.close(); }
