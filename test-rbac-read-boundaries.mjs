import assert from 'node:assert/strict';
import http from 'node:http';

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
const { DEFAULT_POLICY_MATRICES } = await import('./server/_lib/policy.js');
const { validatePolicyMatrix } = await import('./server/_lib/policy.js');
const { default: app } = await import('./api/index.js');

let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks += 1; };

const parent = (await query("INSERT INTO units(code,name,kind) VALUES ('UIT-RBAC-READ','UIT RBAC Read','unit_induk') RETURNING id")).rows[0].id;
const upt = (await query("INSERT INTO units(code,name,kind,parent_id) VALUES ('UPT-RBAC-READ','UPT RBAC Read','upt',$1) RETURNING id", [parent])).rows[0].id;
const user = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Read Boundary','read-boundary@test.local',$1,'staff') RETURNING *", [hashPassword('read-boundary-password')])).rows[0];
await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'staff')", [user.id, upt]);

const matrix = JSON.parse(JSON.stringify(DEFAULT_POLICY_MATRICES.upt));
matrix.staff = ['read', 'agenda_read'];
await query('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=revision+1,updated_at=now() WHERE unit_kind=$2', [JSON.stringify(matrix), 'upt']);

const server = http.createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
const token = signToken(user);
async function request(path, authToken = token, unit = upt, method = 'GET', body) {
  const headers = { Authorization: `Bearer ${authToken}`, 'X-Unit-ID': String(unit), 'Content-Type': 'application/json' };
  const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.text() };
}

try {
  const me = await request('/auth/me');
  check(me.status === 200 && JSON.parse(me.body).capabilities.agenda_read === true, 'agenda read capability is active');
  check(JSON.parse(me.body).capabilities.projects_read === false, 'projects read capability is denied');

  check((await request('/agenda')).status === 200, 'agenda endpoint remains available');
  check((await request('/dashboard/')).status === 403, 'dashboard endpoint is denied');
  check((await request('/projects')).status === 403, 'projects endpoint is denied');
  check((await request('/drawings')).status === 403, 'drawings endpoint is denied');
  check((await request('/instruksi')).status === 403, 'IK endpoint is denied');
  check((await request('/gis/projects')).status === 403, 'GIS endpoint is denied');
  check((await request('/reports')).status === 403, 'reports endpoint is denied');
  check((await request('/reports?export=1')).status === 403, 'print report export is denied');
  check((await request('/projects/999999')).status === 403, 'direct project detail is denied before lookup');
  check([403, 404].includes((await request('/projects/999999/drawings', token, upt, 'POST')).status), 'direct drawing mutation is denied or opaque');
  check((await request('/projects/options?module=projects')).status === 403, 'project option lookup is denied');
  check((await request('/projects/options?module=agenda')).status === 200, 'agenda option lookup stays scoped');

  const rev = await request('/events/rev');
  const revBody = JSON.parse(rev.body);
  check(rev.status === 200 && !Object.hasOwn(revBody.tables, 'projects'), 'realtime revision omits denied project tables');
  check(Object.hasOwn(revBody.tables, 'agendas'), 'realtime revision keeps allowed agenda table');

  // Multi-parent monitoring: the same user receives different module access
  // from each Unit Induk membership. Project detail and file scopes must use
  // the target parent, not a union of all roles.
  const parentA = (await query("INSERT INTO units(code,name,kind) VALUES ('UIT-RBAC-A','UIT RBAC A','unit_induk') RETURNING id")).rows[0].id;
  const parentB = (await query("INSERT INTO units(code,name,kind) VALUES ('UIT-RBAC-B','UIT RBAC B','unit_induk') RETURNING id")).rows[0].id;
  const uptA = (await query("INSERT INTO units(code,name,kind,parent_id) VALUES ('UPT-RBAC-A','UPT RBAC A','upt',$1) RETURNING id", [parentA])).rows[0].id;
  const uptB = (await query("INSERT INTO units(code,name,kind,parent_id) VALUES ('UPT-RBAC-B','UPT RBAC B','upt',$1) RETURNING id", [parentB])).rows[0].id;
  const multi = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Multi Parent','multi-parent@test.local',$1,'staff') RETURNING *", [hashPassword('multi-parent-password')])).rows[0];
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'asman'),($1,$3,'staff')", [multi.id, parentA, parentB]);
  const project = async (unitId, code) => (await query(`INSERT INTO projects(unit_id,kode,nama,tipe,uip,lokasi,kontraktor) VALUES ($1,$2,$2,'Gardu Induk (GI)','UIP',$2,'Test') RETURNING id`, [unitId, code])).rows[0].id;
  const projectA = await project(uptA, 'RBAC_PARENT_A');
  const projectB = await project(uptB, 'RBAC_PARENT_B');
  const drawingA = (await query("INSERT INTO approval_drawings(project_id,judul,file_vendor) VALUES ($1,'Drawing A','data:text/plain;base64,QQ==') RETURNING id", [projectA])).rows[0].id;
  const drawingB = (await query("INSERT INTO approval_drawings(project_id,judul,file_vendor) VALUES ($1,'Drawing B','data:text/plain;base64,Qg==') RETURNING id", [projectB])).rows[0].id;
  const policyUpt = JSON.parse(JSON.stringify(DEFAULT_POLICY_MATRICES.upt));
  const policyInduk = JSON.parse(JSON.stringify(DEFAULT_POLICY_MATRICES.unit_induk));
  for (const matrix of [policyUpt, policyInduk]) {
    matrix.asman = [...new Set([...matrix.asman, 'projects_read', 'drawings_read', 'reports_read', 'reports_export', 'instruksi_read'])];
    matrix.staff = matrix.staff.filter(action => !['drawings_read', 'reports_export'].includes(action));
    matrix.staff = [...new Set([...matrix.staff, 'projects_read', 'reports_read', 'instruksi_read'])];
  }
  policyUpt.dalkon = policyUpt.dalkon.filter(action => !['drawings_read', 'drawing_dalkon'].includes(action));
  policyInduk.logistik = policyInduk.logistik.filter(action => action !== 'projects_read');
  policyInduk.logistik = [...new Set([...policyInduk.logistik, 'instruksi_read'])];
  policyUpt.asman = policyUpt.asman.filter(action => action !== 'gardu_induk_read');
  validatePolicyMatrix('upt', policyUpt);
  validatePolicyMatrix('unit_induk', policyInduk);
  await query('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=revision+1,updated_at=now() WHERE unit_kind=$2', [JSON.stringify(policyUpt), 'upt']);
  await query('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=revision+1,updated_at=now() WHERE unit_kind=$2', [JSON.stringify(policyInduk), 'unit_induk']);
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'dalkon')", [multi.id, uptA]);
  const multiToken = signToken(multi);
  const projectARead = await request(`/projects/${projectA}`, multiToken, 'all');
  const projectBRead = await request(`/projects/${projectB}`, multiToken, 'all');
  check(projectARead.status === 200 && JSON.parse(projectARead.body).drawings.some(row => row.id === drawingA), 'parent A drawing is visible');
  check(projectBRead.status === 200 && JSON.parse(projectBRead.body).drawings.length === 0, 'parent B drawing is redacted');
  const activeUpt = await request(`/projects/${projectA}`, multiToken, uptA);
  check(activeUpt.status === 200 && JSON.parse(activeUpt.body).drawings.length === 0, 'active UPT membership cannot inherit parent role');
  const activeParent = await request(`/projects/${projectA}`, multiToken, parentA);
  check(activeParent.status === 200 && JSON.parse(activeParent.body).drawings.some(row => row.id === drawingA), 'active parent membership grants parent role only');
  check((await request(`/drawings/${drawingA}/file/vendor`, multiToken, 'all')).status === 200, 'parent A drawing file is visible');
  check((await request(`/drawings/${drawingB}/file/vendor`, multiToken, 'all')).status === 404, 'parent B drawing file is opaque');
  const reportsAll = await request('/reports', multiToken, 'all');
  check(reportsAll.status === 200 && JSON.parse(reportsAll.body).data.length === 2, 'reports read covers both parents');
  const printExport = await request('/reports?export=1', multiToken, 'all');
  check(printExport.status === 200 && JSON.parse(printExport.body).data.every(row => row.id === projectA), 'print export uses export scope per parent');
  check((await request('/reports/export-csv', multiToken, 'all')).status === 200, 'CSV export is available for authorized parent');

  // Control-plane vendor assignment must still honor the target project scope.
  policyInduk.staff = policyInduk.staff.filter(action => action !== 'projects_read');
  validatePolicyMatrix('unit_induk', policyInduk);
  await query('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=revision+1,updated_at=now() WHERE unit_kind=$2', [JSON.stringify(policyInduk), 'unit_induk']);
  const scopedControl = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Scoped Control','scoped-control@test.local',$1,'admin') RETURNING *", [hashPassword('scoped-control-password')])).rows[0];
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'admin')", [scopedControl.id, parentA]);
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'staff')", [scopedControl.id, parentB]);
  const scopedControlToken = signToken(scopedControl);
  check((await request(`/projects/${projectB}/vendors`, scopedControlToken, 'all')).status === 404, 'vendor list hides unreadable parent project');
  check((await request(`/projects/${projectB}/vendors/999999`, scopedControlToken, 'all', 'PUT', { active: true })).status === 404, 'vendor assignment rejects unreadable parent project');

  const projectWriter = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Project Writer','project-writer@test.local',$1,'asman') RETURNING *", [hashPassword('project-writer-password')])).rows[0];
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'asman')", [projectWriter.id, uptA]);
  const gi = (await query("INSERT INTO gardu_induk(source_system,source_id,unit_id,nama,active) VALUES ('test','RBAC-GI',$1,'GI RBAC',true) RETURNING id", [uptA])).rows[0].id;
  const writerToken = signToken(projectWriter);
  check((await request('/gardu-induk/options', writerToken, uptA)).status === 200, 'project writer can use minimal GI options');
  const writerProject = await request('/projects', writerToken, uptA, 'POST', { kode: 'RBAC_WRITER_PROJECT', nama: 'RBAC_WRITER_PROJECT', tipe: 'Gardu Induk (GI)', uip: 'UIP', lokasi: 'Writer', kontraktor: 'Test', lokasis: [{ nama: 'Writer', gardu_induk_id: gi }] });
  check(writerProject.status === 201, 'project writer can create with owned GI without GI menu read');

  const menuUser = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('IK Menu Only','ik-menu-only@test.local',$1,'logistik') RETURNING *", [hashPassword('ik-menu-password')])).rows[0];
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$2,'logistik')", [menuUser.id, parentA]);
  const menuToken = signToken(menuUser);
  const ik = (await query("INSERT INTO instruksi_kerja(project_id,judul,file,status_approval) VALUES ($1,'IK Menu','data:text/plain;base64,SSs=','Menunggu ULTG') RETURNING id", [projectA])).rows[0].id;
  await query("INSERT INTO ik_approvals(instruksi_id,putaran,level,level_nama,peran,status) VALUES ($1,1,1,'ULTG','dalkon','Pending'),($1,1,2,'UPT','enjin','Pending'),($1,1,3,'Unit Induk','admin','Pending')", [ik]);
  check((await request('/instruksi', menuToken, parentA)).status === 200, 'IK-only user can read IK menu');
  check((await request(`/instruksi/${ik}/file`, menuToken, parentA)).status === 200, 'IK-only user can read IK file');
  check((await request('/projects', menuToken, parentA)).status === 403, 'IK-only user cannot read project menu');
  check((await request(`/projects/${projectA}`, menuToken, parentA)).status === 403, 'IK-only user cannot read project detail');
  policyUpt.staff = policyUpt.staff.filter(action => action !== 'instruksi_read');
  await query('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=revision+1,updated_at=now() WHERE unit_kind=$2', [JSON.stringify(policyUpt), 'upt']);
  check([403, 404].includes((await request(`/instruksi/${ik}/file`, token, upt)).status), 'known IK file stays denied for staff without IK read');

  const logApprover = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Dynamic ULTG','dynamic-ultg@test.local',$1,'logistik') RETURNING *", [hashPassword('dynamic-ultg-password')])).rows[0];
  const enjinApprover = (await query("INSERT INTO users(nama,email,password_hash,role) VALUES ('Dynamic UPT','dynamic-upt@test.local',$1,'enjin') RETURNING *", [hashPassword('dynamic-upt-password')])).rows[0];
  await query("INSERT INTO unit_memberships(user_id,unit_id,role) VALUES ($1,$3,'logistik'),($2,$3,'enjin')", [logApprover.id, enjinApprover.id, uptA]);
  const dynamicUpt = JSON.parse(JSON.stringify(policyUpt));
  dynamicUpt.dalkon = dynamicUpt.dalkon.filter(action => action !== 'ik_ultg');
  dynamicUpt.logistik = [...new Set([...dynamicUpt.logistik, 'instruksi_read', 'ik_ultg'])];
  validatePolicyMatrix('upt', dynamicUpt);
  await query('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=revision+1,updated_at=now() WHERE unit_kind=$2', [JSON.stringify(dynamicUpt), 'upt']);
  const dynamicIk = (await query("INSERT INTO instruksi_kerja(project_id,judul,file,status_approval) VALUES ($1,'IK Dynamic','data:text/plain;base64,RFk=','Menunggu ULTG') RETURNING id", [projectA])).rows[0].id;
  await query("INSERT INTO ik_approvals(instruksi_id,putaran,level,level_nama,peran,status) VALUES ($1,1,1,'ULTG','dalkon','Pending'),($1,1,2,'UPT','enjin','Pending'),($1,1,3,'Unit Induk','admin','Pending')", [dynamicIk]);
  const logToken = signToken(logApprover);
  const enjinToken = signToken(enjinApprover);
  check((await request(`/instruksi/${dynamicIk}/approve`, enjinToken, uptA, 'PATCH')).status === 409, 'dynamic UPT approval remains ordered');
  check((await request(`/instruksi/${dynamicIk}/approve`, logToken, uptA, 'PATCH')).status === 200, 'configured Logistik stage one approval succeeds');
  check((await request(`/instruksi/${dynamicIk}/approve`, enjinToken, uptA, 'PATCH')).status === 200, 'configured Enjin stage two approval succeeds');
  check((await query('SELECT COUNT(*)::int AS count FROM ik_approvals WHERE instruksi_id=$1 AND putaran=1', [dynamicIk])).rows[0].count === 3, 'dynamic approval keeps three rows');
  console.log(`RBAC read boundaries: ${checks} checks passed`);
} finally {
  server.closeAllConnections();
  server.close();
  if (process.env.UNIT_TEST_PG_URL) await (await import('./server/_lib/db.js')).getPool().end();
}
