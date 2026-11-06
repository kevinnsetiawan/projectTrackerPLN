import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'test';
process.env.SEED_DEMO = '0';
if (process.env.UNIT_TEST_PG_URL) {
  process.env.DB_DRIVER = 'pg';
  process.env.DATABASE_URL = process.env.UNIT_TEST_PG_URL;
  process.env.PG_POOL_MAX = '5';
} else {
  process.env.DB_DRIVER = 'pglite';
  delete process.env.DATABASE_URL;
}

const { query } = await import('./server/_lib/db.js');
const { hashPassword, signToken } = await import('./server/_lib/auth.js');
const { ensureRoleSchema } = await import('./server/_lib/schema.js');
const { ACTIONS_BY_ROLE, getCapabilities, loadIdentity } = await import('./server/_lib/scope.js');
const { ikLevelForRole } = await import('./server/_lib/business.js');
const { provisionUnitUsers } = await import('./server/scripts/provision-unit-users.js');
const { default: app } = await import('./api/index.js');

let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks += 1; };
const parent = (await query("INSERT INTO units(code,name,kind) VALUES ('UIT-JOB','UIT Job Roles','unit_induk') RETURNING id")).rows[0].id;
const upt = (await query("INSERT INTO units(code,name,kind,parent_id) VALUES ('UPT-SBYA','UPT Surabaya','upt',$1) RETURNING id", [parent])).rows[0].id;
const other = (await query("INSERT INTO units(code,name,kind,parent_id) VALUES ('UPT-OTHER','UPT Other','upt',$1) RETURNING id", [parent])).rows[0].id;
const inactiveUnit = (await query("INSERT INTO units(code,name,kind,parent_id,active) VALUES ('UPT-INACTIVE','UPT Inactive','upt',$1,false) RETURNING id", [parent])).rows[0].id;

const actor = (await query("INSERT INTO users(nama,email,password_hash,role,is_superadmin) VALUES ('Root Job','root-job@test.local',$1,'admin',true) RETURNING *", [hashPassword('root-password')])).rows[0];
const multi = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Multi Job','multi-job@test.local',$1,'staff') RETURNING *", [hashPassword('multi-password')])).rows[0];
await query("INSERT INTO unit_memberships(user_id,unit_id,role,jabatan) VALUES ($1,$2,'staff','Jabatan A'),($1,$3,'logistik','Jabatan B')", [multi.id, upt, other]);
let asman;
let logistik;
let dalkon;
let enjin;
let parentAdmin;
let otherAdmin;
const legacyUser = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Legacy Job','legacy-job@test.local',$1,'staff') RETURNING id", [hashPassword('legacy-password')])).rows[0];
await query("INSERT INTO unit_memberships(user_id,unit_id,role,jabatan,active) VALUES ($1,$2,'staff','Legacy Jabatan',true)", [legacyUser.id, upt]);

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
const actorToken = signToken(actor);
async function request(path, token = actorToken, unit = upt, method = 'GET', body) {
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  if (unit !== null) headers['X-Unit-ID'] = String(unit);
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
}
const projectPayload = code => ({ kode: code, nama: code, tipe: 'Gardu Induk (GI)', uip: 'UIP', lokasi: code, kontraktor: 'Test', lokasis: [{ nama: code, latitude: -6, longitude: 106 }], nilai_kontrak: 1000, target_cod: '2027-01-01' });

try {
  // Re-apply the compatibility path after removing the old-schema additions.
  await query('ALTER TABLE unit_memberships DROP CONSTRAINT IF EXISTS unit_memberships_role_check');
  await query('ALTER TABLE unit_memberships DROP CONSTRAINT IF EXISTS unit_memberships_jabatan_length_ck');
  await query('ALTER TABLE unit_memberships DROP COLUMN IF EXISTS jabatan');
  await query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
  const legacyBefore = (await query('SELECT role,active FROM unit_memberships WHERE user_id=$1 AND unit_id=$2', [legacyUser.id, upt])).rows[0];
  await ensureRoleSchema((text, params) => query(text, params));
  await ensureRoleSchema((text, params) => query(text, params));
  await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Role Check','role-check@test.local',$1,'asman')", [hashPassword('role-check')]);
  await query("UPDATE unit_memberships SET jabatan=CASE unit_id WHEN $2 THEN 'Jabatan A' WHEN $3 THEN 'Jabatan B' END WHERE user_id=$1", [multi.id, upt, other]);
  const legacyAfter = (await query('SELECT role,active,jabatan FROM unit_memberships WHERE user_id=$1 AND unit_id=$2', [legacyUser.id, upt])).rows[0];
  check(legacyAfter.role === legacyBefore.role && legacyAfter.active === legacyBefore.active && legacyAfter.jabatan === null, 'old membership data survives idempotent role migration');
  asman = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Asman HTTP','asman-http@test.local',$1,'asman') RETURNING *", [hashPassword('asman-http-password')])).rows[0];
  logistik = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Logistik HTTP','logistik-http@test.local',$1,'logistik') RETURNING *", [hashPassword('logistik-http-password')])).rows[0];
  dalkon = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Dalkon HTTP','dalkon-http@test.local',$1,'dalkon') RETURNING *", [hashPassword('dalkon-http-password')])).rows[0];
  enjin = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Enjin HTTP','enjin-http@test.local',$1,'enjin') RETURNING *", [hashPassword('enjin-http-password')])).rows[0];
  parentAdmin = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Parent Admin HTTP','parent-admin-http@test.local',$1,'admin') RETURNING *", [hashPassword('parent-admin-http-password')])).rows[0];
  otherAdmin = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Other Admin HTTP','other-admin-http@test.local',$1,'admin') RETURNING *", [hashPassword('other-admin-http-password')])).rows[0];
  await query("INSERT INTO unit_memberships(user_id,unit_id,role,jabatan) VALUES ($1,$7,'asman','Asman'),($2,$7,'logistik','Logistik'),($3,$7,'dalkon','Dalkon'),($4,$7,'enjin','Enjin'),($5,$8,'admin','Admin Induk'),($6,$9,'admin','Admin Other')", [asman.id, logistik.id, dalkon.id, enjin.id, parentAdmin.id, otherAdmin.id, upt, parent, other]);
  check((await query("SELECT 1 FROM pg_constraint WHERE conname='unit_memberships_jabatan_length_ck'")).rows.length === 1, 'role/jabatan migration restores constraints');

  const multiToken = signToken((await query('SELECT * FROM users WHERE id=$1', [multi.id])).rows[0]);
  const multiMe = await request('/auth/me', multiToken, upt);
  check(multiMe.status === 200 && multiMe.body.context.role === 'staff' && multiMe.body.context.jabatan === 'Jabatan A', 'active unit context exposes role and jabatan');
  const otherMe = await request('/auth/me', multiToken, other);
  check(otherMe.status === 200 && otherMe.body.context.role === 'logistik' && otherMe.body.context.jabatan === 'Jabatan B', 'jabatan remains scoped per unit');

  const memberUpdate = await request(`/users/${multi.id}/memberships/${upt}`, actorToken, upt, 'PUT', { role: 'asman', jabatan: '  Asman UPT  ' });
  check(memberUpdate.status === 200, 'asman membership accepted');
  const membership = (await query('SELECT role,jabatan FROM unit_memberships WHERE user_id=$1 AND unit_id=$2', [multi.id, upt])).rows[0];
  check(membership.role === 'asman' && membership.jabatan === 'Asman UPT', 'jabatan trims on write');
  check((await request(`/users/${multi.id}/memberships/${upt}`, actorToken, upt, 'PUT', { role: 'logistik' })).status === 200, 'omitted jabatan update accepted');
  check((await query('SELECT jabatan FROM unit_memberships WHERE user_id=$1 AND unit_id=$2', [multi.id, upt])).rows[0].jabatan === 'Asman UPT', 'omitted jabatan preserves existing value');
  check((await request(`/users/${multi.id}/memberships/${upt}`, actorToken, upt, 'PUT', { role: 'logistik', jabatan: '   ' })).status === 200, 'empty jabatan accepted');
  check((await query('SELECT jabatan FROM unit_memberships WHERE user_id=$1 AND unit_id=$2', [multi.id, upt])).rows[0].jabatan === null, 'empty jabatan normalizes to null');
  check((await query('SELECT jabatan FROM unit_memberships WHERE user_id=$1 AND unit_id=$2', [multi.id, other])).rows[0].jabatan === 'Jabatan B', 'other-unit jabatan remains unchanged');
  check((await request(`/users/${multi.id}/memberships/${upt}`, actorToken, upt, 'PUT', { role: 'logistik', jabatan: 'x'.repeat(121) })).status === 400, 'jabatan length rejected');

  const asmanReq = { user: { ...actor, is_superadmin: false }, memberships: [{ unit_id: upt, role: 'asman', jabatan: 'Asman', unit: { id: upt, kind: 'upt' } }], context: { mode: 'unit', unit_id: upt, unit: { id: upt, kind: 'upt' }, role: 'asman' } };
  const logistikReq = { ...asmanReq, memberships: [{ ...asmanReq.memberships[0], role: 'logistik' }], context: { ...asmanReq.context, role: 'logistik' } };
  check(getCapabilities(asmanReq).project_write && getCapabilities(asmanReq).ik_upt, 'asman business and IK UPT capabilities');
  check(!getCapabilities(asmanReq).user_manage && !getCapabilities(asmanReq).security_matrix && !getCapabilities(asmanReq).drawing_dalkon && !getCapabilities(asmanReq).drawing_enjin && !getCapabilities(asmanReq).ik_ultg && !getCapabilities(asmanReq).ik_induk, 'asman has no control-plane or other approval capabilities');
  check(getCapabilities(logistikReq).read && getCapabilities(logistikReq).agenda_write && !getCapabilities(logistikReq).project_write && !getCapabilities(logistikReq).ik_upt, 'logistik is agenda-only for writes');
  check(ikLevelForRole('asman') === 2 && ikLevelForRole('enjin') === 2 && ikLevelForRole('dalkon') === 1 && ikLevelForRole('admin') === 3, 'IK remains three levels with asman at UPT level');
  check(ACTIONS_BY_ROLE.dalkon.includes('ik_ultg') && !ACTIONS_BY_ROLE.dalkon.includes('ik_upt'), 'Dalkon capability semantics unchanged');

  const asmanToken = signToken(asman);
  const logistikToken = signToken(logistik);
  const dalkonToken = signToken(dalkon);
  const enjinToken = signToken(enjin);
  const parentAdminToken = signToken(parentAdmin);
  const otherAdminToken = signToken(otherAdmin);
  const asmanProject = await request('/projects', asmanToken, upt, 'POST', projectPayload('ASMAN_HTTP_PROJECT'));
  check(asmanProject.status === 201, 'asman can create project in assigned UPT');
  check((await request(`/projects/${asmanProject.body.id}`, asmanToken, upt, 'PUT', { nama: 'ASMAN_HTTP_PROJECT_EDITED' })).status === 200, 'asman can edit own UPT project');
  check((await request('/users', asmanToken, upt)).status === 403 && (await request('/security-matrix', asmanToken, upt)).status === 403, 'asman cannot access control plane');
  const otherProject = await request('/projects', otherAdminToken, other, 'POST', projectPayload('OTHER_HTTP_PROJECT'));
  check(otherProject.status === 201, 'foreign project fixture created');
  check((await request(`/projects/${otherProject.body.id}`, asmanToken, upt)).status === 404, 'asman foreign project id stays opaque');
  check((await request(`/projects/${otherProject.body.id}`, asmanToken, other)).status === 403, 'asman conflicting unit header denied');
  const logistikAgenda = await request('/agenda', logistikToken, upt, 'POST', { judul: 'LOGISTIK HTTP AGENDA', tgl_rapat: '2026-11-06' });
  check(logistikAgenda.status === 201, 'logistik can create own-unit agenda');
  check((await request(`/agendas/${logistikAgenda.body.id}`, logistikToken, upt, 'PUT', { judul: 'LOGISTIK HTTP AGENDA EDITED' })).status === 200, 'logistik can update own-unit agenda');
  check((await request(`/agendas/${logistikAgenda.body.id}`, logistikToken, upt, 'DELETE')).status === 200, 'logistik can delete own-unit agenda');
  check((await request(`/projects/${asmanProject.body.id}`, logistikToken, upt, 'PUT', { nama: 'LOGISTIK PROJECT DENIED' })).status === 403, 'logistik cannot edit project');
  check((await request(`/projects/${asmanProject.body.id}/progress`, logistikToken, upt, 'POST', { progres_rencana: 1, progres_realisasi: 1 })).status === 403, 'logistik cannot mutate progress');
  check((await request(`/projects/${asmanProject.body.id}/drawings`, logistikToken, upt, 'POST', { judul: 'DENIED', file_vendor: 'data:text/plain;base64,eA==' })).status === 403, 'logistik cannot upload drawing');
  check((await request(`/projects/${asmanProject.body.id}/instruksi`, logistikToken, upt, 'POST', { judul: 'DENIED', file: 'data:text/plain;base64,eA==' })).status === 403, 'logistik cannot create IK');
  const ikAsman = await request(`/projects/${asmanProject.body.id}/instruksi`, asmanToken, upt, 'POST', { judul: 'IK ASMAN CHAIN', file: 'data:text/plain;base64,eA==' });
  check(ikAsman.status === 201, 'asman can create IK');
  check((await request(`/instruksi/${ikAsman.body.id}/approve`, asmanToken, upt, 'PATCH', { level: 2, keputusan: 'Approved' })).status === 409, 'asman cannot approve UPT before Dalkon');
  check((await request(`/instruksi/${ikAsman.body.id}/approve`, asmanToken, upt, 'PATCH', { level: 1, keputusan: 'Approved' })).status === 403, 'asman cannot spoof Dalkon level');
  check((await request(`/instruksi/${ikAsman.body.id}/approve`, asmanToken, upt, 'PATCH', { level: 3, keputusan: 'Approved' })).status === 403, 'asman cannot spoof Unit Induk level');
  check((await request(`/instruksi/${ikAsman.body.id}/approve`, dalkonToken, upt, 'PATCH', { level: 1, keputusan: 'Approved' })).status === 200, 'Dalkon approves first IK stage');
  check((await request(`/instruksi/${ikAsman.body.id}/approve`, asmanToken, upt, 'PATCH', { level: 2, keputusan: 'Approved' })).status === 200, 'asman approves UPT IK stage');
  check((await request(`/instruksi/${ikAsman.body.id}/approve`, parentAdminToken, parent, 'PATCH', { level: 3, keputusan: 'Approved' })).status === 200, 'Unit Induk final approval remains available');
  check((await query('SELECT COUNT(*)::int AS count FROM ik_approvals WHERE instruksi_id=$1 AND putaran=1', [ikAsman.body.id])).rows[0].count === 3, 'asman chain retains three approval rows');
  const ikEnjin = await request(`/projects/${asmanProject.body.id}/instruksi`, asmanToken, upt, 'POST', { judul: 'IK ENJIN CHAIN', file: 'data:text/plain;base64,eA==' });
  check((await request(`/instruksi/${ikEnjin.body.id}/approve`, dalkonToken, upt, 'PATCH', { level: 1, keputusan: 'Approved' })).status === 200, 'Dalkon starts Enjin IK chain');
  check((await request(`/instruksi/${ikEnjin.body.id}/approve`, enjinToken, upt, 'PATCH', { level: 2, keputusan: 'Approved' })).status === 200, 'Enjin remains authorized at UPT stage');
  check((await request(`/instruksi/${ikEnjin.body.id}/approve`, asmanToken, upt, 'PATCH', { level: 2, keputusan: 'Approved' })).status === 409, 'competing UPT approval after level 2 is rejected');
  check((await request(`/instruksi/${ikEnjin.body.id}/approve`, parentAdminToken, parent, 'PATCH', { level: 3, keputusan: 'Approved' })).status === 200, 'Enjin chain final stage remains Unit Induk');

  const selectedUsers = await request('/users', actorToken, upt);
  const selectedRow = selectedUsers.body.data.find(row => row.id === multi.id);
  check(selectedUsers.status === 200 && selectedRow?.role === 'logistik' && selectedRow?.jabatan === null, 'control users list uses selected-unit role/jabatan');
  const noneUsers = await request('/users', actorToken, null);
  const noneRow = noneUsers.body.data.find(row => row.id === multi.id);
  check(noneUsers.status === 200 && noneRow?.role === null && noneRow?.jabatan === null, 'none context does not invent global role/jabatan');

  const users = Array.from({ length: 10 }, (_, index) => ({
    nama: `Provision Job ${index + 1}`,
    email: `provision-job-${index + 1}@test.local`,
    password: `secure-test-password-${index + 1}`,
    role: index % 2 ? 'logistik' : 'asman',
    jabatan: index % 2 ? 'Logistik' : 'Asman',
  }));
  const manifest = { provision_id: 'job-role-test-001', actor_id: actor.id, target: { id: upt, code: 'UPT-SBYA', kind: 'upt', active: true }, expected_count: 10, users };
  const before = (await query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count;
  const dry = await provisionUnitUsers(manifest);
  check(dry.mode === 'dry-run' && dry.created.length === 10 && (await query('SELECT COUNT(*)::int AS count FROM users')).rows[0].count === before, 'dry-run makes no writes');
  const applied = await provisionUnitUsers(manifest, { apply: true });
  check(applied.created.length === 10 && applied.noop.length === 0, 'apply creates ten users atomically');
  const first = (await query('SELECT id,password_hash FROM users WHERE email=$1', [users[0].email])).rows[0];
  const originalHash = first.password_hash;
  const rerun = await provisionUnitUsers(manifest, { apply: true });
  check(rerun.created.length === 0 && rerun.noop.length === 10, 'exact rerun is a no-op');
  check((await query('SELECT password_hash FROM users WHERE id=$1', [first.id])).rows[0].password_hash === originalHash, 'rerun does not reset password hash');
  const audit = (await query("SELECT details FROM audit_logs WHERE action='provision_unit_user' AND target_id=$1", [first.id])).rows[0].details;
  check(audit.includes('job-role-test-001') && !audit.includes(users[0].password) && !audit.includes(users[0].email), 'audit stores only nonsecret batch proof');

  await assert.rejects(() => provisionUnitUsers({ ...manifest, users: users.map((user, index) => index === 0 ? { ...user, jabatan: 'Conflict' } : user) }, { apply: true }), /Konflik/);
  check((await query('SELECT COUNT(*)::int AS count FROM users WHERE email LIKE $1', ['provision-job-%@test.local'])).rows[0].count === 10, 'conflict aborts without partial writes');
  const outsider = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Unknown','unknown-provision@test.local',$1,'staff') RETURNING id,password_hash", [hashPassword('keep-password')])).rows[0];
  const two = { provision_id: 'job-role-test-002', actor_id: actor.id, target: manifest.target, expected_count: 2, users: [users[0], { nama: 'New After Conflict', email: 'new-after-conflict@test.local', password: 'secure-new-password', role: 'asman' }] };
  await assert.rejects(() => provisionUnitUsers({ ...two, users: [{ ...two.users[0], email: 'unknown-provision@test.local' }, two.users[1]] }, { apply: true }), /Konflik/);
  check((await query('SELECT COUNT(*)::int AS count FROM users WHERE email=$1', ['new-after-conflict@test.local'])).rows[0].count === 0, 'unknown existing account blocks attachment atomically');
  check((await query('SELECT password_hash FROM users WHERE id=$1', [outsider.id])).rows[0].password_hash === outsider.password_hash, 'unknown account password remains unchanged');
  await assert.rejects(() => provisionUnitUsers({ ...manifest, actor_id: multi.id }), /bukan superadmin/);
  await assert.rejects(() => provisionUnitUsers({ ...manifest, expected_count: 2, users: [{ ...users[0], email: 'duplicate@test.local' }, { ...users[1], email: 'duplicate@test.local' }] }), /Email duplikat/);
  await assert.rejects(() => provisionUnitUsers({ ...manifest, target: { ...manifest.target, code: 'UPT-OTHER' } }), /Target harus/);
  await assert.rejects(() => provisionUnitUsers({ ...manifest, target: { id: inactiveUnit, code: 'UPT-SBYA', kind: 'upt', active: true } }), /Target unit/);
  const inactiveActor = (await query("INSERT INTO users(nama,email,password_hash,role,is_superadmin,active) VALUES ('Inactive Actor','inactive-actor@test.local',$1,'admin',true,false) RETURNING id", [hashPassword('inactive-actor-password')])).rows[0];
  await assert.rejects(() => provisionUnitUsers({ ...manifest, actor_id: inactiveActor.id }), /bukan superadmin/);
  const inactiveExisting = (await query("INSERT INTO users(nama,email,password_hash,role,active) VALUES ('Inactive Existing','inactive-existing@test.local',$1,'asman',false) RETURNING id", [hashPassword('inactive-existing-password')])).rows[0];
  await assert.rejects(() => provisionUnitUsers({ ...manifest, expected_count: 1, users: [{ ...users[0], email: 'inactive-existing@test.local' }] }), /Konflik/);
  const cliScript = fileURLToPath(new URL('./server/scripts/provision-unit-users.js', import.meta.url));
  const malformedSecret = 'MALFORMED_SECRET_DO_NOT_ECHO';
  const badJson = spawnSync(process.execPath, [cliScript, '--dry-run'], { input: `{"password":"${malformedSecret}"`, encoding: 'utf8' });
  const badOutput = `${badJson.stdout}${badJson.stderr}`;
  check(badJson.status !== 0 && !badOutput.includes(malformedSecret) && badOutput.includes('Input JSON tidak valid'), 'malformed stdin is rejected without echoing secrets');
  const oversized = spawnSync(process.execPath, [cliScript, '--dry-run'], { input: 'x'.repeat(65537), encoding: 'utf8' });
  check(oversized.status !== 0 && `${oversized.stdout}${oversized.stderr}`.includes('Input provisioning terlalu besar'), 'oversized stdin is rejected before parsing');
  console.log(`Unit job-role checks passed (${checks})`);
} finally {
  server.closeAllConnections();
  server.close();
  if (process.env.UNIT_TEST_PG_URL) await (await import('./server/_lib/db.js')).getPool().end();
}
