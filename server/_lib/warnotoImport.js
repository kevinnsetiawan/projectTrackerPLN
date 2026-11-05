// A WARNOTO snapshot contains reference master data only. Call inside one transaction.
const source='warnoto';
const fail=message=>{ throw new Error(message); };
const required=(value,label)=>typeof value==='string' && value.trim() ? value.trim() : fail(`${label} wajib berupa teks.`);
const optional=value=>value==null || value==='' ? null : required(value,'Nilai');
function coordinate(value,limit,label) {
  if (value==null || value==='') return null;
  if ((typeof value!=='number' && typeof value!=='string') || (typeof value==='string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) fail(`${label} tidak valid.`);
  const number=Number(value);
  if (!Number.isFinite(number) || Math.abs(number)>limit) fail(`${label} di luar rentang.`);
  return number;
}
function url(value) {
  if (value==null || value==='') return null;
  const text=required(value,'URL peta');
  let parsed; try { parsed=new URL(text); } catch { fail('URL peta tidak valid.'); }
  if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail('URL peta tidak valid.');
  return text;
}
function unique(rows,key,label) {
  const values=new Set();
  for (const row of rows) { const value=key(row); if (values.has(value)) fail(`${label} duplikat.`); values.add(value); }
  return values;
}
export function normalizeWarnotoSnapshot(raw) {
  if (!raw || raw.version!==1 || !Array.isArray(raw.uit) || !Array.isArray(raw.upt) || !Array.isArray(raw.gi) || !raw.uit.length || !raw.upt.length || !raw.gi.length) fail('Snapshot tidak lengkap.');
  const unit=(row,kind)=>({id:required(row?.id,'ID unit'),code:required(row?.kode,'Kode unit'),name:required(row?.nama,'Nama unit'),kind,parentSourceId:kind==='upt' ? required(row?.uit_id,'Induk UPT') : null});
  const uit=raw.uit.map(r=>unit(r,'unit_induk'));
  const upt=raw.upt.map(r=>unit(r,'upt'));
  const units=[...uit,...upt];
  unique(units,r=>r.id,'ID unit'); unique(units,r=>r.code.toLowerCase(),'Kode unit');
  const parentIds=new Set(uit.map(r=>r.id)), uptIds=new Set(upt.map(r=>r.id));
  for (const row of upt) if (!parentIds.has(row.parentSourceId)) fail('Induk UPT tidak ditemukan.');
  const gi=raw.gi.map(r=>{
    if (typeof r?.active!=='boolean') fail('Status GI tidak valid.');
    return {id:required(r.id,'ID GI'),uptSourceId:required(r.upt_id,'UPT GI'),source_ultg_id:optional(r.ultg_id),nama:required(r.nama,'Nama GI'),latitude:coordinate(r.latitude,90,'Latitude GI'),longitude:coordinate(r.longitude,180,'Longitude GI'),map_source_url:url(r.map_source_url),active:r.active};
  });
  unique(gi,r=>r.id,'ID GI');
  for (const row of gi) if (!uptIds.has(row.uptSourceId)) fail('UPT GI tidak ditemukan.');
  return {uit,upt,gi};
}
function equalFields(actual,baseline,keys) {
  return baseline && keys.every(key => actual[key]===baseline[key]);
}
function numeric(value) { return value==null ? null : Number(value); }
export async function applyWarnotoSnapshot(q,raw) {
  const snapshot=normalizeWarnotoSnapshot(raw);
  const units=[...snapshot.uit,...snapshot.upt];
  const existingUnits=(await q('SELECT source_id FROM units WHERE source_system=$1',[source])).rows;
  const unitIds=new Set(units.map(r=>r.id));
  if (existingUnits.some(row=>!unitIds.has(row.source_id))) fail('Snapshot kehilangan unit yang pernah diimpor.');
  const existingGi=(await q('SELECT source_id FROM gardu_induk WHERE source_system=$1',[source])).rows;
  const giIds=new Set(snapshot.gi.map(r=>r.id));
  if (existingGi.some(row=>!giIds.has(row.source_id))) fail('Snapshot kehilangan GI yang pernah diimpor.');
  const mapped=new Map();
  for (const unit of units) {
    const parent=unit.parentSourceId ? mapped.get(unit.parentSourceId) : null;
    const target={code:unit.code,name:unit.name,kind:unit.kind,parent_id:parent};
    const found=(await q('SELECT * FROM units WHERE source_system=$1 AND source_id=$2 FOR UPDATE',[source,unit.id])).rows[0];
    const collisions=(await q('SELECT id FROM units WHERE lower(code)=lower($1)',[unit.code])).rows;
    if (collisions.some(row=>!found || Number(row.id)!==Number(found.id))) fail('Kode unit bertabrakan dengan data lain.');
    let id;
    if (found) {
      const actual={code:found.code,name:found.name,kind:found.kind,parent_id:found.parent_id==null?null:Number(found.parent_id)};
      if (!equalFields(actual,found.source_snapshot,['code','name','kind','parent_id'])) fail('Unit lokal berubah sejak impor; perlu rekonsiliasi.');
      if (actual.kind!==target.kind || actual.parent_id!==target.parent_id) fail('Perubahan kepemilikan unit memerlukan migrasi manual.');
      id=found.id;
      await q('UPDATE units SET code=$1,name=$2,source_snapshot=$3::jsonb WHERE id=$4',[target.code,target.name,JSON.stringify(target),id]);
    } else {
      id=(await q('INSERT INTO units(code,name,kind,parent_id,source_system,source_id,source_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id',[target.code,target.name,target.kind,target.parent_id,source,unit.id,JSON.stringify(target)])).rows[0].id;
    }
    mapped.set(unit.id,Number(id));
  }
  for (const gi of snapshot.gi) {
    const target={unit_id:mapped.get(gi.uptSourceId),nama:gi.nama,latitude:gi.latitude,longitude:gi.longitude,map_source_url:gi.map_source_url,source_ultg_id:gi.source_ultg_id,active:gi.active};
    const found=(await q('SELECT * FROM gardu_induk WHERE source_system=$1 AND source_id=$2 FOR UPDATE',[source,gi.id])).rows[0];
    if (found) {
      const actual={unit_id:Number(found.unit_id),nama:found.nama,latitude:numeric(found.latitude),longitude:numeric(found.longitude),map_source_url:found.map_source_url,source_ultg_id:found.source_ultg_id,active:found.active};
      if (!equalFields(actual,found.source_snapshot,Object.keys(target))) fail('GI lokal berubah sejak impor; perlu rekonsiliasi.');
      if (actual.unit_id!==target.unit_id) fail('Perubahan UPT GI memerlukan migrasi manual.');
      await q('UPDATE gardu_induk SET nama=$1,latitude=$2,longitude=$3,map_source_url=$4,source_ultg_id=$5,active=$6,source_snapshot=$7::jsonb WHERE id=$8',[target.nama,target.latitude,target.longitude,target.map_source_url,target.source_ultg_id,target.active,JSON.stringify(target),found.id]);
    } else {
      await q('INSERT INTO gardu_induk(source_system,source_id,unit_id,nama,latitude,longitude,map_source_url,source_ultg_id,active,source_snapshot) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)',[source,gi.id,target.unit_id,target.nama,target.latitude,target.longitude,target.map_source_url,target.source_ultg_id,target.active,JSON.stringify(target)]);
    }
  }
  return {uit:snapshot.uit.length,upt:snapshot.upt.length,gi:snapshot.gi.length};
}
