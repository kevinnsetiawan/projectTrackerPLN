// GI reference and project linkage checks run only against an isolated database.
if (process.env.UNIT_TEST_PG_URL) {
  if (!/test/i.test(decodeURIComponent(new URL(process.env.UNIT_TEST_PG_URL).pathname.slice(1)))) throw new Error('UNIT_TEST_PG_URL must name a disposable test database.');
  process.env.DB_DRIVER='pg';
  process.env.DATABASE_URL=process.env.UNIT_TEST_PG_URL;
  process.env.PG_POOL_MAX='5';
} else {
  process.env.DB_DRIVER='pglite';
  delete process.env.DATABASE_URL;
}
process.env.SEED_DEMO='0';
import assert from 'node:assert/strict';
import http from 'node:http';
const {query}=await import('./server/_lib/db.js');
const {signToken,hashPassword}=await import('./server/_lib/auth.js');
const {normalizeLokasis}=await import('./server/_lib/business.js');
const {default:app}=await import('./api/index.js');
const originalError=console.error;
console.error=(error,...rest)=>{if (!error?.status || error.status>=500) originalError(error,...rest);};
let checks=0;
function check(value,label){assert.ok(value,label);checks++;}
const parent=(await query("INSERT INTO units(code,name,kind) VALUES ('GI-PARENT','GI Parent','unit_induk') RETURNING id")).rows[0].id;
const units=[];
for(const code of ['GI-A','GI-B']) units.push((await query("INSERT INTO units(code,name,kind,parent_id) VALUES ($1,$1,'upt',$2) RETURNING id",[code,parent])).rows[0].id);
async function user(name,unit,role,technical=false){
  const row=(await query('INSERT INTO users(nama,email,password_hash,role,is_superadmin) VALUES ($1,$2,$3,$4,$5) RETURNING *',[name,name+'@gi.test',hashPassword('fixture-only'),'admin',technical])).rows[0];
  if(unit) await query('INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,$3)',[row.id,unit,role]);
  return {...row,token:signToken(row)};
}
const admin=await user('admin',units[0],'admin');
const staff=await user('staff',units[0],'staff');
const vendor=await user('vendor',units[0],'vendor');
const central=await user('central',parent,'admin');
const root=await user('root',null,null,true);
const gis=[];
for(const [code,unit,active] of [['ACTIVE-A',units[0],true],['INACTIVE-A',units[0],false],['ACTIVE-B',units[1],true]]) {
  gis.push((await query("INSERT INTO gardu_induk(source_system,source_id,unit_id,nama,latitude,longitude,map_source_url,active) VALUES ('gi-api-test',$1,$2,$1,-6,106,$3,$4) RETURNING *",[code,unit,'https://maps.example/'+code,active])).rows[0]);
}
const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
async function request(path,{actor=admin,unit=units[0],method='GET',body}={}) {
  const headers={'Content-Type':'application/json'};
  if(actor) headers.Authorization='Bearer '+actor.token;
  if(unit!==null) headers['X-Unit-ID']=String(unit);
  const res=await fetch(`http://127.0.0.1:${server.address().port}/api`+path,{headers,method,body:body===undefined?undefined:JSON.stringify(body)});
  const data=res.headers.get('content-type')?.includes('json')?await res.json():await res.text();return {status:res.status,data,headers:res.headers};
}
const payload=(kode,gi=gis[0].id)=>({kode,nama:kode,tipe:'Gardu Induk (GI)',uip:'Manual UIP',kontraktor:'Fixture',lokasis:[{nama:'Manual location',latitude:0,longitude:0,gardu_induk_id:gi}]});
try{
  check(normalizeLokasis([{nama:'Zero',latitude:0,longitude:0,gardu_induk_id:gis[0].id}])[0].gardu_induk_id===gis[0].id,'shared normalizer preserves GI reference');
  check((await request('/gardu-induk',{actor:null})).status===401,'master requires login');
  const own=await request('/gardu-induk');
  check(own.status===200&&own.data.data.length===1&&own.data.data[0].id===gis[0].id,'UPT default active GI');
  check(own.data.data[0].unit_name==='GI-A','friendly UPT name');
  check(own.headers.get('cache-control')==='private, no-store','private master response');
  for(const actor of [staff,vendor]) check((await request('/gardu-induk',{actor})).data.data.length===1,'reference independent project assignment '+actor.nama);
  check((await request('/gardu-induk?include_inactive=1')).data.data.length===2,'inactive list opt-in stays scoped');
  check((await request('/gardu-induk?unit_id='+units[1])).data.data.length===0,'foreign filter cannot broaden scope');
  check((await request('/gardu-induk?search=ACTIVE-B')).data.data.length===0,'search cannot broaden scope');
  check((await request('/gardu-induk/'+gis[2].id)).status===404,'foreign master ID opaque');
  check((await request('/gardu-induk/'+gis[1].id)).data.active===false,'own inactive detail remains available');
  check((await request('/gardu-induk',{unit:null})).data.data.length===0,'missing ordinary context is empty');
  check((await request('/gardu-induk/'+gis[0].id,{unit:null})).status===404,'missing context detail denied');
  check((await request('/gardu-induk?include_inactive=1',{actor:root,unit:null})).data.data.length===3,'technical root no-context reference access');
  check((await request('/gardu-induk?unit_id='+units[1],{actor:root,unit:null})).data.data.length===1,'technical root UPT filter');
  check((await request('/gardu-induk',{actor:central,unit:parent})).data.data.length===2,'parent descendants master');
  check((await request('/gardu-induk',{actor:central,unit:'all'})).data.data.length===2,'all context scoped master');
  check((await request('/projects',{actor:root,unit:null})).data.data.length===0,'root reference access grants no project bypass');
  check((await request('/projects',{actor:root,unit:null,method:'POST',body:payload('NO-ROOT-BYPASS')})).status===403,'root reference access grants no project write bypass');
  check((await request('/projects',{actor:central,unit:parent,method:'POST',body:payload('NO-PARENT-BYPASS')})).status===403,'parent master access grants no project write bypass');
  check((await request('/gardu-induk',{method:'POST',body:{nama:'forbidden'}})).status===404,'no master mutation API');
  for(const value of ['true','0','-1','1.1','9007199254740992']) check((await request('/gardu-induk?unit_id='+value)).status===400,'invalid UPT filter '+value);
  check((await request('/gardu-induk?include_inactive=true')).status===400,'invalid active filter');
  const create=await request('/projects',{method:'POST',body:payload('GI-PROJECT')});
  check(create.status===201,JSON.stringify(create.data));
  const id=create.data.id,site=create.data.lokasis[0];
  check(site.gardu_induk_id===gis[0].id&&site.unit_id===units[0],'location stores canonical GI and server unit');
  check(site.gardu_induk_nama==='ACTIVE-A'&&site.gardu_induk_active===true,'project embeds GI label/status');
  check(site.nama==='Manual location'&&Number(site.latitude)===0&&Number(site.longitude)===0,'GI selection does not overwrite manual name or zero coordinates');
  check(Number(create.data.latitude)===0&&Number(create.data.longitude)===0,'primary coordinate behavior unchanged');
  const multi=payload('GI-MULTI');
  multi.lokasis.push({nama:'Manual second',latitude:null,longitude:null,gardu_induk_id:null});
  const multiple=await request('/projects',{method:'POST',body:multi});
  check(multiple.status===201&&multiple.data.lokasis.length===2,'mixed GI and manual locations supported');
  check(multiple.data.lokasis[1].gardu_induk_id===null&&multiple.data.lokasis[1].latitude===null,'optional reference and missing coordinate remain null');
  const vendorCreated=await request('/projects',{actor:vendor,method:'POST',body:payload('GI-VENDOR')});
  check(vendorCreated.status===201&&vendorCreated.data.lokasis[0].gardu_induk_id===gis[0].id,'vendor can select own UPT reference on project creation');
  check((await query('SELECT 1 FROM vendor_project_assignments WHERE project_id=$1 AND user_id=$2',[vendorCreated.data.id,vendor.id])).rows.length===1,'GI vendor project retains automatic assignment');
  const forged=payload('GI-FORGED-UNIT');forged.lokasis[0].unit_id=units[1];
  check((await request('/projects',{method:'POST',body:forged})).data.lokasis[0].unit_id===units[0],'nested client unit ignored');
  for(const gi of [gis[1].id,gis[2].id,999999]) {
    const r=await request('/projects',{method:'POST',body:payload('GI-BAD-'+gi,gi)});
    check(r.status===404,'new inactive/foreign/missing GI rejected');
    check((await query('SELECT 1 FROM projects WHERE kode=$1',['GI-BAD-'+gi])).rows.length===0,'invalid GI creation rolls back');
  }
  for(const gi of [true,false,0,-1,1.5,'01','1e0',[],{},'9007199254740992']) {
    check((await request('/projects',{method:'POST',body:payload('GI-BAD-ID',gi)})).status===400,'malformed GI ID rejected '+JSON.stringify(gi));
  }
  const before=(await request('/projects/'+id)).data;
  check((await request('/projects/'+id,{method:'PUT',body:{nama:'SHOULD ROLLBACK',lokasis:payload('unused',gis[2].id).lokasis}})).status===404,'cross-UPT update rejected');
  const after=(await request('/projects/'+id)).data;
  check(after.nama===before.nama&&after.lokasis[0].gardu_induk_id===before.lokasis[0].gardu_induk_id,'invalid update preserves project and all locations');
  check((await request('/projects/'+id,{method:'PUT',body:{lokasis:after.lokasis}})).data.lokasis[0].gardu_induk_id===gis[0].id,'delete/insert roundtrip retains GI');
  await query('UPDATE gardu_induk SET active=false WHERE id=$1',[gis[0].id]);
  const inactive=(await request('/projects/'+id)).data;
  check(inactive.lokasis[0].gardu_induk_active===false&&inactive.lokasis[0].gardu_induk_nama==='ACTIVE-A','inactive reference remains visible on project');
  check((await request('/projects/'+id,{method:'PUT',body:{nama:'Retained inactive',lokasis:inactive.lokasis}})).status===200,'existing inactive GI can be retained');
  check((await request('/projects/'+id,{method:'PUT',body:{lokasis:payload('unused',gis[1].id).lokasis}})).status===404,'different inactive GI cannot be selected');
  const remove=await request('/projects/'+id,{method:'PUT',body:{lokasis:payload('unused',null).lokasis}});
  check(remove.status===200&&remove.data.lokasis[0].gardu_induk_id===null,'manual location can unlink GI');
  check((await request('/projects/'+id,{method:'PUT',body:{lokasis:payload('unused',gis[0].id).lokasis}})).status===404,'unlinked inactive GI cannot be reselected');
  check((await request('/projects/'+id,{actor:vendor})).status===404,'reference read does not expose unassigned project');
  await assert.rejects(query('INSERT INTO lokasis(project_id,unit_id,nama,gardu_induk_id) VALUES ($1,$2,$3,$4)',[id,units[0],'Cross GI',gis[2].id]),e=>e.code==='23503');checks++;
  await assert.rejects(query('INSERT INTO lokasis(project_id,unit_id,nama) VALUES ($1,$2,$3)',[id,units[1],'Cross unit']),e=>e.code==='23503');checks++;
  console.log(`GI API: ${checks} checks passed`);
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
process.exit(0);
