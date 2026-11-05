// Adversarial HTTP checks use an isolated in-memory database only.
if (process.env.UNIT_TEST_PG_URL) {
  process.env.DB_DRIVER = 'pg';
  process.env.DATABASE_URL = process.env.UNIT_TEST_PG_URL;
  process.env.PG_POOL_MAX = '5'; // Exercise concurrent transactions, not pool serialization.
} else {
  process.env.DB_DRIVER = 'pglite';
  delete process.env.DATABASE_URL;
}
process.env.SEED_DEMO = '0';
import assert from 'node:assert/strict';
import http from 'node:http';
const { query, withTransaction } = await import('./server/_lib/db.js');
const { ensureUnitConstraints } = await import('./server/_lib/schema.js');
const { signToken, hashPassword } = await import('./server/_lib/auth.js');
const { default: app } = await import('./api/index.js');
const { broadcast, TOPIC } = await import('./server/_lib/events.js');
const logError = console.error;
console.error = (e, ...args) => { if (!e?.status || e.status >= 500) logError(e, ...args); };
let checks = 0;
const check = (ok, label) => { assert.ok(ok, label); checks++; };
const parent = (await query("INSERT INTO units(code,name,kind) VALUES ('CENTRAL','Central','unit_induk') RETURNING id")).rows[0].id;
const units = [];
for (const code of ['A','B']) units.push((await query("INSERT INTO units(code,name,kind,parent_id) VALUES ($1,$1,'upt',$2) RETURNING id", [code,parent])).rows[0].id);
async function user(name, memberships, technical=false) {
  const row = (await query('INSERT INTO users(nama,email,password_hash,role,is_superadmin) VALUES ($1,$2,$3,$4,$5) RETURNING *', [name,name+'@test.local',hashPassword('test123'),'admin',technical])).rows[0];
  for (const [unit,role] of memberships) await query('INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,$3)', [row.id,unit,role]);
  return {...row,token:signToken(row)};
}
const adminA = await user('adminA',[[units[0],'admin']]);
const adminB = await user('adminB',[[units[1],'admin']]);
const central = await user('central',[[parent,'admin']]);
const vendor1 = await user('vendor1',[[units[0],'vendor']]);
const vendor2 = await user('vendor2',[[units[0],'vendor']]);
const staff = await user('staff',[[units[0],'staff']]);
const dalkon = await user('dalkon',[[units[0],'dalkon']]);
const enjin = await user('enjin',[[units[0],'enjin']]);
const multi = await user('multi',[[units[0],'staff'],[units[1],'admin']]);
const technical = await user('technical',[],true);
const server = http.createServer(app);
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base = `http://127.0.0.1:${server.address().port}`;
async function req(path,u=adminA,unit=units[0],method='GET',body) {
  const headers = {'Content-Type':'application/json'};
  if (u) headers.Authorization='Bearer '+u.token;
  if (unit !== null) headers['X-Unit-ID']=String(unit);
  const res = await fetch(base+'/api'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
  const raw = await res.text();
  return {status:res.status,body:res.headers.get('content-type')?.includes('json')?JSON.parse(raw):raw,headers:res.headers};
}
const payload = code => ({kode:code,nama:code,tipe:'Gardu Induk (GI)',uip:'UIP',lokasi:code,kontraktor:'Test',lokasis:[{nama:code,latitude:-6,longitude:106}],nilai_kontrak:1000,target_cod:'2027-01-01'});
try {
  const a = await req('/projects',adminA,units[0],'POST',payload('SECRET_A'));
  check(a.status===201,JSON.stringify(a.body));
  const b = await req('/projects',adminB,units[1],'POST',payload('SECRET_B'));
  check(b.status===201,JSON.stringify(b.body));
  const v = await req('/projects',vendor1,units[0],'POST',payload('SECRET_V1'));
  check(v.status===201,'vendor may create assigned UPT project');
  const aid=a.body.id,bid=b.body.id,vid=v.body.id;
  check((await query('SELECT 1 FROM vendor_project_assignments WHERE project_id=$1 AND user_id=$2',[vid,vendor1.id])).rows.length===1,'creator assignment atomic');
  for (const path of ['/projects','/dashboard','/gis/projects','/reports','/reports/export-csv','/reports/export-excel','/agenda','/agenda/rekap','/kendala','/drawings','/instruksi','/events/rev','/events/peers']) {
    const unauth=await req(path,null);check(unauth.status===401,path+' unauthenticated');
    const scoped=await req(path);check(scoped.status===200,path+' scoped status '+JSON.stringify(scoped.body));
    if (!path.endsWith('export-excel')) check(!JSON.stringify(scoped.body).includes('SECRET_B'),path+' no foreign project');
    check(scoped.headers.get('cache-control')?.includes('no-store'),path+' private cache');
  }
  check((await req('/projects/'+bid)).status===404,'foreign project opaque');
  check((await req('/projects/'+aid,vendor1)).status===404,'vendor sameunit unassigned opaque');
  check((await req('/projects/'+vid,vendor2)).status===404,'vendor peer project opaque');
  check((await req('/projects/'+vid,vendor1)).status===200,'vendor assigned read');
  check((await req('/projects/'+aid,technical)).status===403,'technical no business bypass');
  check((await req('/projects',staff,units[0],'POST',payload('FAIL_STAFF'))).status===403,'staff readonly');
  check((await req('/projects/'+aid,adminA,units[0],'PUT',{unit_id:units[1]})).status===403,'cannot move project');
  check((await req('/projects',adminA,units[1])).status===403,'forged unit header');
  check((await req('/projects?unit='+units[1])).status===400,'conflicting header and query');
  check((await req('/projects',central,'all')).body.data.length===3,'central monitor all');
  check((await req('/projects/'+aid,central,parent,'PUT',{nama:'bad'})).status===403,'parent cannot edit child');
  check((await req('/projects',multi,units[0],'POST',payload('BAD_MULTI'))).status===403,'membership role selected unit');
  check((await req('/projects',multi,units[1])).body.data.length===1,'multi membership separate scope');
  check((await req('/users/'+adminB.id+'/memberships/'+units[0],adminA,units[0],'PUT',{role:'enjin'})).status===403,'UPT admin cannot grant foreign account first membership');
  check((await query('SELECT 1 FROM unit_memberships WHERE user_id=$1 AND unit_id=$2',[adminB.id,units[0]])).rows.length===0,'foreign membership was not created');
  const controlMatrix=await req('/security-matrix',central,'all');
  check(controlMatrix.status===200&&controlMatrix.body.capabilities.user_manage&&!controlMatrix.body.capabilities.project_write,'all context preserves central control but business readonly');
  const group=(await query('INSERT INTO boq_groups(project_id,nama) VALUES ($1,$2) RETURNING id',[aid,'Invariant Fixture'])).rows[0].id;
  for (const [sql,params,label] of [
    ['INSERT INTO boqs(project_id,boq_group_id,uraian) VALUES ($1,$2,$3)',[bid,group,'bad'],'BOQ group project FK'],
    ['INSERT INTO boqs(project_id,milestone_id,uraian) VALUES ($1,$2,$3)',[aid,b.body.milestones[0].id,'bad'],'BOQ milestone project FK'],
    ['INSERT INTO vendor_project_assignments(project_id,user_id,unit_id) VALUES ($1,$2,$3)',[aid,adminB.id,units[0]],'vendor membership unit FK'],
    ['INSERT INTO vendor_project_assignments(project_id,user_id,unit_id) VALUES ($1,$2,$3)',[aid,adminB.id,units[1]],'vendor project unit FK'],
  ]) {
    await assert.rejects(query(sql,params),e=>e.code==='23503',label);checks++;
  }
  const rollback = new Error('isolated corrupt fixture rollback');
  await assert.rejects(withTransaction(async q=>{
    await q('ALTER TABLE boqs DROP CONSTRAINT boqs_group_project_fk');
    await q('INSERT INTO boqs(project_id,boq_group_id,uraian) VALUES ($1,$2,$3)',[bid,group,'legacy corrupt']);
    await assert.rejects(ensureUnitConstraints(q),e=>e.code==='23503','legacy corruption rejected explicitly');checks++;
    throw rollback;
  }),e=>e===rollback);
  const ga=await req('/agenda',adminA,units[0],'POST',{judul:'AGENDA_A',tgl_rapat:'2026-11-05'});
  const gb=await req('/agenda',adminB,units[1],'POST',{judul:'AGENDA_B',tgl_rapat:'2026-11-05'});
  const gp=await req('/agenda',central,parent,'POST',{judul:'CENTRAL_INTERNAL',tgl_rapat:'2026-11-05'});
  check(ga.status===201&&gb.status===201&&gp.status===201,'standalone agendas bind units');
  check(!(await req('/agenda')).body.data.some(x=>x.judul==='CENTRAL_INTERNAL'),'parent internal invisible UPT');
  check((await req('/agendas/'+gb.body.id,adminA,units[0],'PUT',{judul:'leak'})).status===404,'foreign agenda write');
  check((await req('/agenda',adminA,units[0],'POST',{judul:'BADPIC',tgl_rapat:'2026-11-05',pic_user_id:adminB.id})).status===400,'foreign PIC');
  check((await req('/agenda',adminA,units[0],'POST',{judul:'BADPIC',tgl_rapat:'2026-11-05',project_id:aid,pic_user_id:vendor2.id})).status===400,'unassigned vendor PIC');
  const doc=await req('/projects/'+bid+'/dokumentasi',adminB,units[1],'POST',{judul:'secret',tahap:'Awal',foto:'data:text/plain;base64,c2VjcmV0'});
  check(doc.status===201,'foreign file fixture');
  check((await req('/dokumentasi/'+doc.body.id+'/foto')).status===404,'foreign file opaque');
  check((await req('/projects/'+aid+'/dokumentasi/'+doc.body.id,adminA,units[0],'PUT',{judul:'x',tahap:'x'})).status===404,'URL parent cannot substitute child');
  const foreignFiles = [
    ['/projects/'+bid+'/kurva-s-dokumen', {nama:'B Kurva',file_data:'data:text/plain;base64,eA=='}, id=>'/kurva-s-dokumen/'+id+'/file'],
    ['/projects/'+bid+'/drawings', {judul:'B Drawing',file_vendor:'data:text/plain;base64,eA=='}, id=>'/drawings/'+id+'/file/vendor'],
    ['/projects/'+bid+'/instruksi', {judul:'B IK',file:'data:text/plain;base64,eA=='}, id=>'/instruksi/'+id+'/file'],
    ['/amandemen', {project_id:bid,durasi_hari:1,file:'data:text/plain;base64,eA=='}, id=>'/amandemen/'+id+'/file'],
  ];
  for (const [path,body,filePath] of foreignFiles) {
    const item=await req(path,adminB,units[1],'POST',body);
    check(item.status===201,'file fixture '+path+JSON.stringify(item.body));
    check((await req(filePath(item.body.id))).status===404,'foreign file '+filePath(item.body.id));
    const ownFile=await req(filePath(item.body.id),adminB,units[1]);
    check(ownFile.status===200&&ownFile.body==='x','authorized file bytes');
    check(ownFile.headers.get('cache-control')==='private, no-store','file no-store');
  }
  const drawing=await req('/projects/'+aid+'/drawings',adminA,units[0],'POST',{judul:'A Drawing',file_vendor:'data:text/plain;base64,eA=='});
  check((await req('/drawings/'+drawing.body.id+'/dalkon',adminA,units[0],'PATCH',{})).status===403,'admin cannot impersonate drawing dalkon');
  check((await req('/drawings/'+drawing.body.id+'/enjin',adminA,units[0],'PATCH',{})).status===403,'admin cannot impersonate drawing enjin');
  check((await req('/drawings/'+drawing.body.id+'/enjin',enjin,units[0],'PATCH',{})).status===409,'drawing engineering cannot jump handover');
  const foreignMilestone=b.body.milestones[0].id;
  const boq=await req('/projects/'+aid+'/boq',adminA,units[0],'POST',{nama:'bad',items:[{uraian:'bad',milestone_id:foreignMilestone}]});
  check(boq.status===404,'foreign BOQ milestone rejected');
  check((await query('SELECT 1 FROM boq_groups WHERE project_id=$1 AND nama=$2',[aid,'bad'])).rows.length===0,'failed BOQ create rolls back group');
  const foreignBoq=await req('/projects/'+bid+'/boq',adminB,units[1],'POST',{nama:'Foreign BOQ',items:[{uraian:'foreign',foto_vendor:'data:text/plain;base64,eA=='}]});
  const foreignItem=foreignBoq.body.boqGroups.find(g=>g.nama==='Foreign BOQ').items[0];
  check((await req('/boqs/'+foreignItem.id+'/foto/vendor')).status===404,'foreign BOQ photo opaque');
  const ik=await req('/projects/'+aid+'/instruksi',adminA,units[0],'POST',{judul:'IK',file:'data:text/plain;base64,eA=='});
  check(ik.status===201,'IK fixture');
  await query('UPDATE ik_approvals SET file=$1 WHERE id=$2',['data:text/plain;base64,eA==',ik.body.approvals[0].id]);
  check((await req('/instruksi-approval/'+ik.body.approvals[0].id+'/file',adminB,units[1])).status===404,'foreign approval attachment opaque');
  check((await req('/instruksi-approval/'+ik.body.approvals[0].id+'/file')).status===200,'own approval attachment');
  check((await req('/instruksi/'+ik.body.id+'/approve',adminA,units[0],'PATCH',{level:1})).status===403,'UPT admin cannot impersonate approval');
  check((await req('/instruksi/'+ik.body.id+'/approve',central,parent,'PATCH',{level:3})).status===409,'parent cannot jump approval');
  for (const [actor,unit,level] of [[dalkon,units[0],1],[enjin,units[0],2],[central,parent,3]]) {
    const r=await req('/instruksi/'+ik.body.id+'/approve',actor,unit,'PATCH',{level,keputusan:'Approved'});
    check(r.status===200,'approval '+level+JSON.stringify(r.body));
  }
  check((await req('/instruksi/'+ik.body.id,adminA,units[0],'PUT',{judul:'silent change'})).status===403,'reviewed IK immutable');
  const before=(await req('/events/rev')).body.tables;
  await req('/projects/'+bid,adminB,units[1],'PUT',{nama:'SECRET_B_CHANGED'});
  const after=(await req('/events/rev')).body.tables;
  // PG resolves concurrent revision queries in varying key insertion order.
  assert.deepEqual(after,before,'foreign mutations do not alter revision hashes');checks++;
  const controller=new AbortController();
  const response=await fetch(base+'/api/events/stream?token='+encodeURIComponent(vendor1.token)+'&unit='+units[0],{signal:controller.signal});
  check(response.status===200,'SSE token query auth');
  const reader=response.body.getReader();
  await broadcast(TOPIC.PROJECTS,{project_id:bid,action:'update'});
  await broadcast(TOPIC.PROJECTS,{project_id:vid,action:'update'});
  let chunk='';
  while (!chunk.includes('"action":"update"')) chunk+=new TextDecoder().decode((await reader.read()).value);
  check(chunk.includes('"project_id":'+vid)&&!chunk.includes('"project_id":'+bid),'SSE only assigned events');
  check(!chunk.includes('audience_vendor_ids'),'SSE internal audience hidden');
  await req('/projects/'+vid,adminA,units[0],'DELETE');
  const deletion=new TextDecoder().decode((await reader.read()).value);
  check(deletion.includes('"action":"delete"')&&!deletion.includes('audience_vendor_ids'),'former assigned vendor receives scoped deletion');
  await query('UPDATE unit_memberships SET active=false WHERE user_id=$1 AND unit_id=$2',[vendor1.id,units[0]]);
  await broadcast(TOPIC.PROJECTS,{project_id:aid,action:'update'});
  check((await reader.read()).done,'SSE closes on membership revocation');
  controller.abort();
  check((await req('/projects/'+vid,vendor1)).status===403,'membership revoked fresh');
  check((await req('/projects/'+vid+'?token='+encodeURIComponent(vendor1.token)+'&unit='+units[0],null,null)).status===403,'download token refreshed');
  const localUsersBefore=(await req('/events/rev')).body.tables.users;
  const foreignUsersBefore=(await req('/events/rev',adminB,units[1])).body.tables.users;
  check((await req('/users/'+staff.id+'/memberships/'+units[0],adminA,units[0],'PUT',{role:'enjin'})).status===200,'own nonadmin membership edit');
  check((await req('/events/rev')).body.tables.users!==localUsersBefore,'own membership change updates scoped revision');
  check((await req('/events/rev',adminB,units[1])).body.tables.users===foreignUsersBefore,'other UPT user revision unchanged');
  const technical2=await user('technical2',[],true);
  const concurrent=await Promise.all([
    req('/users/'+technical2.id,technical,null,'PUT',{active:false}),
    req('/users/'+technical.id,technical2,null,'PUT',{active:false}),
  ]);
  check(concurrent.filter(r=>r.status===200).length===1,'concurrent root deactivation permits exactly one');
  check((await query('SELECT COUNT(*)::int AS n FROM users WHERE is_superadmin=true AND active=true')).rows[0].n===1,'one active root survives concurrent requests');
  console.log(`UPT isolation: ${checks} checks passed`);
} finally {
  server.closeAllConnections();
  await new Promise(r=>server.close(r));
}
// The PG listener intentionally owns a persistent dedicated connection.
process.exit(0);
