import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = fs.readFileSync(path.resolve('deploy/protrack-autodeploy.sh'), 'utf8');
const match = source.match(/docker exec deploy-app-1 node --input-type=module -e '\n([\s\S]*?)\n'\s*\n?docker stop protrack-maintenance/);
assert(match, 'schema gate source not found');
const gate = match[1]
  .replace('./server/_lib/db.js', pathToFileURL(path.resolve('server/_lib/db.js')).href)
  .replace('./server/_lib/policy.js', pathToFileURL(path.resolve('server/_lib/policy.js')).href);
const dbUrl = JSON.stringify(pathToFileURL(path.resolve('server/_lib/db.js')).href);
const run = (prefix = '') => spawnSync(process.execPath, ['--input-type=module'], { input: `${prefix}${gate}`, encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_ENV: 'test', DB_DRIVER: 'pglite', SEED_DEMO: '0', DATABASE_URL: '' } });
const fixture = (sql) => run(`console.error("RBAC_FIXTURE_READY"); import { query as prepare } from ${dbUrl}; await prepare("SELECT 1"); await prepare(${JSON.stringify(sql)});\n`);
const fixtureReady = (result) => assert.match(`${result.stdout}\n${result.stderr}`, /RBAC_FIXTURE_READY/);
const valid = run();
assert.equal(valid.status, 0, `valid role constraints rejected: ${valid.stderr}`);
const legacy = run(`import { query as prepare } from ${dbUrl}; await prepare("SELECT 1"); await prepare("ALTER TABLE users DROP CONSTRAINT users_role_check"); await prepare("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('vendor','dalkon','enjin','staff','admin'))");\n`);
assert.notEqual(legacy.status, 0, 'legacy role constraint accepted');
assert.match(legacy.stderr, /Schema role\/jabatan verification failed/);
const missingPolicyTable = fixture('DROP TABLE security_matrix_policies CASCADE');
assert.notEqual(missingPolicyTable.status, 0, 'missing policy table accepted');
fixtureReady(missingPolicyTable);
const missingPolicyRow = fixture("DELETE FROM security_matrix_policies WHERE unit_kind='upt'");
assert.notEqual(missingPolicyRow.status, 0, 'missing policy row accepted');
fixtureReady(missingPolicyRow);
const badPolicyRevision = fixture("ALTER TABLE security_matrix_policies DROP CONSTRAINT IF EXISTS security_matrix_policies_revision_check; UPDATE security_matrix_policies SET revision=0 WHERE unit_kind='upt'");
assert.notEqual(badPolicyRevision.status, 0, 'invalid policy revision accepted');
fixtureReady(badPolicyRevision);
const badPolicyMatrix = fixture("UPDATE security_matrix_policies SET matrix='{}'::jsonb WHERE unit_kind='upt'");
assert.notEqual(badPolicyMatrix.status, 0, 'invalid policy matrix accepted');
fixtureReady(badPolicyMatrix);
console.log('autodeploy schema gate: positive and negative catalog checks passed');
