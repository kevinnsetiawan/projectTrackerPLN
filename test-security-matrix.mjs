import assert from 'node:assert/strict';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.SEED_DEMO = '0';
if (process.env.UNIT_TEST_PG_URL) { process.env.DB_DRIVER = 'pg'; process.env.DATABASE_URL = process.env.UNIT_TEST_PG_URL; process.env.PG_POOL_MAX = '5'; }
else { process.env.DB_DRIVER = 'pglite'; delete process.env.DATABASE_URL; }

const { query, withTransaction } = await import('./server/_lib/db.js');
const { DDL, ensureUnitConstraints } = await import('./server/_lib/schema.js');
const { hashPassword, signToken } = await import('./server/_lib/auth.js');
const { default: app } = await import('./api/index.js');

let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks += 1; };
const parent = (await query("INSERT INTO units(code,name,kind) VALUES ('UIT-POLICY','UIT Policy','unit_induk') RETURNING id")).rows[0].id;
const upt = (await query("INSERT INTO units(code,name,kind,parent_id) VALUES ('UPT-POLICY','UPT Policy','upt',$1) RETURNING id", [parent])).rows[0].id;
const root = (await query("INSERT INTO users(nama,email,password_hash,role,is_superadmin) VALUES ('Policy Root','policy-root@test.local',$1,'admin',true) RETURNING *", [hashPassword('policy-root-password')])).rows[0];
const central = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Policy Central','policy-central@test.local',$1,'admin') RETURNING *", [hashPassword('policy-central-password')])).rows[0];
const staff = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Policy Staff','policy-staff@test.local',$1,'staff') RETURNING *", [hashPassword('policy-staff-password')])).rows[0];
const dalkon = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Policy Dalkon','policy-dalkon@test.local',$1,'dalkon') RETURNING *", [hashPassword('policy-dalkon-password')])).rows[0];
const inactiveRoot = (await query("INSERT INTO users(nama,email,password_hash,role,is_superadmin,active) VALUES ('Inactive Root','inactive-policy-root@test.local',$1,'admin',true,false) RETURNING *", [hashPassword('inactive-root-password')])).rows[0];
await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'admin'),($3,$4,'staff'),($5,$4,'dalkon')", [central.id, parent, staff.id, upt, dalkon.id]);

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
async function request(path, user, unit = null, method = 'GET', body) {
  const headers = { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' };
  if (unit !== null) headers['X-Unit-ID'] = String(unit);
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
}
root.token = signToken(root); central.token = signToken(central); staff.token = signToken(staff); dalkon.token = signToken(dalkon); inactiveRoot.token = signToken(inactiveRoot);

try {
  const initial = await request('/security-matrix', root);
  check(initial.status === 200 && initial.body.matrix.upt && initial.body.revisions.upt >= 1 && initial.body.catalog.groups.approval.includes('ik_upt'), 'matrix contract exposes policies and catalog');
  check(initial.body.catalog.labels.projects_read && Array.isArray(initial.body.locked_cells) && initial.body.can_edit === true, 'matrix contract exposes labels, locked cells, and editability');
  check((await request('/security-matrix', central, parent)).status === 200 && (await request('/security-matrix', central, parent)).body.can_edit === false, 'central admin can view but cannot edit');
  check((await request('/security-matrix/upt', central, parent, 'PUT', { revision: initial.body.revisions.upt, matrix: initial.body.matrix.upt })).status === 403, 'non-root cannot edit policy');

  const changed = structuredClone(initial.body.matrix.upt);
  changed.staff = [...changed.staff, 'agenda_write'];
  const staffBefore = (await query('SELECT auth_version FROM users WHERE id=$1', [staff.id])).rows[0].auth_version;
  const dalkonBefore = (await query('SELECT auth_version FROM users WHERE id=$1', [dalkon.id])).rows[0].auth_version;
  const saved = await request('/security-matrix/upt', root, null, 'PUT', { revision: initial.body.revisions.upt, matrix: changed });
  check(saved.status === 200 && saved.body.revisions.upt === initial.body.revisions.upt + 1 && saved.body.matrix.upt.staff.includes('agenda_write'), 'superadmin saves full matrix with CAS revision');
  check((await query('SELECT auth_version FROM users WHERE id=$1', [staff.id])).rows[0].auth_version === staffBefore + 1, 'affected active membership sessions revoked');
  check((await query('SELECT auth_version FROM users WHERE id=$1', [dalkon.id])).rows[0].auth_version === dalkonBefore, 'unaffected roles keep auth version');
  const oldStaff = await request('/auth/me', staff, upt);
  check(oldStaff.status === 401, 'old affected token is revoked on next request');
  staff.token = signToken((await query('SELECT * FROM users WHERE id=$1', [staff.id])).rows[0]);
  check((await request('/auth/me', staff, upt)).body.capabilities.agenda_write === true, 'new login receives edited capability');
  const audit = (await query("SELECT details FROM audit_logs WHERE action='security_matrix_update' AND target_id='upt' ORDER BY id DESC LIMIT 1")).rows[0];
  check(audit && audit.details.includes('agenda_write') && !audit.details.includes('password'), 'policy audit records safe diff');
  check((await request('/security-matrix/upt', root, null, 'PUT', { revision: initial.body.revisions.upt, matrix: changed })).status === 409, 'stale revision is rejected');

  const iam = structuredClone(saved.body.matrix.upt); iam.admin = iam.admin.filter(action => action !== 'security_matrix');
  check((await request('/security-matrix/upt', root, null, 'PUT', { revision: saved.body.revisions.upt, matrix: iam })).status === 400, 'IAM cells are locked');
  const badStage = structuredClone(saved.body.matrix.upt); badStage.dalkon = badStage.dalkon.filter(action => action !== 'ik_ultg');
  check((await request('/security-matrix/upt', root, null, 'PUT', { revision: saved.body.revisions.upt, matrix: badStage })).status === 400, 'IK stage minimum is enforced');
  const badDependency = structuredClone(saved.body.matrix.upt); badDependency.admin = badDependency.admin.filter(action => action !== 'projects_read');
  check((await request('/security-matrix/upt', root, null, 'PUT', { revision: saved.body.revisions.upt, matrix: badDependency })).status === 400, 'write capability requires module read');
  const unknownAction = structuredClone(saved.body.matrix.upt); unknownAction.staff = [...unknownAction.staff, 'not_an_action'];
  const unknownRole = { ...structuredClone(saved.body.matrix.upt), ghost: [] };
  const duplicate = structuredClone(saved.body.matrix.upt); duplicate.staff = [...duplicate.staff, 'agenda_read'];
  const missingRole = structuredClone(saved.body.matrix.upt); delete missingRole.vendor;
  const twoStages = structuredClone(saved.body.matrix.upt); twoStages.admin = [...twoStages.admin, 'ik_ultg', 'ik_upt'];
  for (const [matrix, label] of [[unknownAction, 'unknown action'], [unknownRole, 'unknown role'], [duplicate, 'duplicate action'], [missingRole, 'missing role'], [twoStages, 'two IK stages']]) check((await request('/security-matrix/upt', root, null, 'PUT', { revision: saved.body.revisions.upt, matrix })).status === 400, `${label} rejected`);
  check((await request('/security-matrix/upt', inactiveRoot, null, 'PUT', { revision: saved.body.revisions.upt, matrix: changed })).status === 401, 'inactive root cannot edit policy');
  check((await request('/security-matrix/upt', central, null, 'PUT', { revision: saved.body.revisions.upt, matrix: changed })).status === 403, 'forged superadmin body cannot edit policy');
  const afterInvalid = await request('/security-matrix', root);
  check(afterInvalid.body.revisions.upt === saved.body.revisions.upt && (await query('SELECT auth_version FROM users WHERE id=$1', [staff.id])).rows[0].auth_version === staffBefore + 1, 'invalid update leaves revision and auth versions unchanged');

  const induk = structuredClone(afterInvalid.body.matrix.unit_induk);
  induk.admin = induk.admin.filter(action => action !== 'ik_induk');
  induk.asman = [...induk.asman, 'ik_induk'];
  const moved = await request('/security-matrix/unit_induk', root, null, 'PUT', { revision: afterInvalid.body.revisions.unit_induk, matrix: induk });
  check(moved.status === 200 && moved.body.matrix.unit_induk.asman.includes('ik_induk'), 'Unit Induk stage 3 can move to another active role');

  const policiesBeforeBootstrap = (await query('SELECT unit_kind,revision,matrix FROM security_matrix_policies ORDER BY unit_kind')).rows;
  const versionsBeforeBootstrap = (await query('SELECT id,auth_version FROM users WHERE id = ANY($1::int[]) ORDER BY id', [[staff.id, dalkon.id]])).rows;
  await withTransaction(async q => {
    for (const statement of DDL.split(';').map(value => value.trim()).filter(Boolean)) await q(statement);
    await ensureUnitConstraints(q);
  });
  const policiesAfterBootstrap = (await query('SELECT unit_kind,revision,matrix FROM security_matrix_policies ORDER BY unit_kind')).rows;
  const versionsAfterBootstrap = (await query('SELECT id,auth_version FROM users WHERE id = ANY($1::int[]) ORDER BY id', [[staff.id, dalkon.id]])).rows;
  check(JSON.stringify(policiesAfterBootstrap) === JSON.stringify(policiesBeforeBootstrap), 'bootstrap migration preserves edited policy and revision');
  check(JSON.stringify(versionsAfterBootstrap) === JSON.stringify(versionsBeforeBootstrap), 'bootstrap migration does not revoke sessions');
  console.log(`Security matrix checks passed (${checks})`);
} finally {
  server.closeAllConnections();
  server.close();
  if (process.env.UNIT_TEST_PG_URL) await (await import('./server/_lib/db.js')).getPool().end();
}
