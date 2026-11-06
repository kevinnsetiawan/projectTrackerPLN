import assert from 'node:assert/strict';
import http from 'node:http';
process.env.NODE_ENV='test'; process.env.SEED_DEMO='1';
if (process.env.UNIT_TEST_PG_URL) {
  process.env.DB_DRIVER='pg'; process.env.DATABASE_URL=process.env.UNIT_TEST_PG_URL;
} else {
  process.env.DB_DRIVER='pglite'; delete process.env.DATABASE_URL;
}
const {query}=await import('./server/_lib/db.js');
const {signToken,verifyToken}=await import('./server/_lib/auth.js');
const {loadIdentity,loadSecurityPolicies,projectScope,assertProject,getCapabilities}=await import('./server/_lib/scope.js');
const app=(await import('./api/index.js')).default;
const server=http.createServer(app); await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/api`;
const call=(path,token,unit,options={})=>fetch(base+path,{...options,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(unit?{'X-Unit-ID':String(unit)}:{}),...(options.headers||{})}});
try {
  const vendor=(await query("SELECT * FROM users WHERE role='vendor' LIMIT 1")).rows[0];
  const token=signToken(vendor); const payload=verifyToken(token);
  assert.equal((await call('/projects')).status,401);
  assert.equal((await call('/auth/me',token,2)).status,200);
  assert.equal((await call('/auth/me?unit=3',token,2)).status,400);
  assert.equal((await call('/auth/me',token,3)).status,403);
  const identity=await loadIdentity(payload); const req={...identity,securityPolicies:await loadSecurityPolicies(),context:{mode:'unit',unit_id:2,unit:identity.memberships[0].unit,role:'vendor'}};
  assert.equal((await assertProject(req,1)).unit_id,2);
  const own=projectScope(req); assert.match(own.sql,/vendor_project_assignments/);
  assert.equal(getCapabilities(req).kendala_create,true);
  assert.equal(getCapabilities(req).kendala_write,false);
  await query('DELETE FROM vendor_project_assignments WHERE project_id=1 AND user_id=$1',[vendor.id]);
  await assert.rejects(()=>assertProject(req,1),e=>e.status===404);
  await query('UPDATE users SET auth_version=auth_version+1 WHERE id=$1',[vendor.id]);
  assert.equal((await call('/auth/me',token,2)).status,401);
  assert.equal(await loadIdentity({...payload,exp:1}),null);
  const admin=(await query("SELECT * FROM users WHERE role='admin' LIMIT 1")).rows[0];
  const adminToken=signToken(admin);
  const json={ 'Content-Type':'application/json' };
  const put=(path,token,unit,body)=>call(path,token,unit,{method:'PUT',headers:json,body:JSON.stringify(body)});
  assert.equal((await put(`/users/${vendor.id}`,adminToken,2,{password:'newpassword'})).status,200);
  await query("INSERT INTO unit_memberships (user_id,unit_id,role) VALUES ($1,3,'vendor')",[vendor.id]);
  assert.equal((await put(`/users/${vendor.id}`,adminToken,2,{password:'newpassword'})).status,403);
  assert.equal((await put(`/users/${vendor.id}/memberships/3`,adminToken,2,{role:'staff'})).status,403);
  await query('UPDATE users SET is_superadmin=true WHERE id=$1',[admin.id]);
  const rootToken=signToken(admin);
  const me=await (await call('/auth/me',rootToken)).json();
  assert.equal(me.capabilities.user_manage,true);
  assert.equal(me.capabilities.project_write,false);
  assert.equal((await put(`/users/${admin.id}`,rootToken,null,{active:false})).status,400);
  assert.equal((await put(`/users/${vendor.id}/memberships/1`,rootToken,null,{role:'vendor'})).status,400);
  console.log('Unit foundation checks passed');
} finally { server.closeAllConnections(); server.close(); if (process.env.UNIT_TEST_PG_URL) await (await import('./server/_lib/db.js')).getPool().end(); }
