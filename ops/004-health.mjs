// Run only inside the candidate app container. No token or credential is printed.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Client } from 'pg';

const db=new Client({connectionString:process.env.DATABASE_URL});
let root;
try {
  await db.connect();
  const result=await db.query("SELECT id,email,nama,role,auth_version,active,is_superadmin FROM users WHERE lower(email)=$1",['dilankanjut@gmail.com']);
  assert.equal(result.rows.length,1);
  root=result.rows[0];
  assert.equal(root.active,true); assert.equal(root.is_superadmin,true);
} finally { await db.end(); }
assert.ok(process.env.JWT_SECRET);
const encoded=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const head=encoded({alg:'HS256',typ:'JWT'});
const body=encoded({sub:root.id,email:root.email,nama:root.nama,role:root.role,av:root.auth_version,iat:now,exp:now+60});
const signature=crypto.createHmac('sha256',process.env.JWT_SECRET).update(`${head}.${body}`).digest('base64url');
const headers={Authorization:`Bearer ${head}.${body}.${signature}`};
async function call(path,options={}) {
  const response=await fetch(`http://127.0.0.1:4000${path}`,options);
  let data=null; try { data=await response.json(); } catch {}
  return {status:response.status,data};
}
assert.equal((await call('/api/auth/config')).data.registrationOpen,false);
assert.equal((await call('/api/projects')).status,401);
assert.equal((await call('/api/gardu-induk')).status,401);
assert.equal((await call('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
const me=await call('/api/auth/me',{headers});
assert.equal(me.status,200); assert.equal(me.data.user.is_superadmin,true);
for (const capability of ['unit_manage','membership_manage','user_manage','security_matrix']) assert.equal(me.data.capabilities[capability],true);
const units=await call('/api/units',{headers});
assert.equal(units.status,200); assert.equal(units.data.data.filter(row=>row.source_system==='warnoto').length,7);
const gi=await call('/api/gardu-induk?include_inactive=1',{headers});
assert.equal(gi.status,200); assert.equal(gi.data.data.filter(row=>row.source_system==='warnoto').length,189);
const noUnit=await call('/api/projects',{headers});
assert.ok(noUnit.status===403 || (noUnit.status===200 && Array.isArray(noUnit.data.data) && noUnit.data.data.length===0));
assert.equal((await call('/api/projects',{headers:{...headers,'X-Unit-Id':'-1'}})).status,403);
assert.equal((await call('/api/security-matrix',{headers})).status,200);
console.log('Root control, scoped GI and anonymous access checks passed');
