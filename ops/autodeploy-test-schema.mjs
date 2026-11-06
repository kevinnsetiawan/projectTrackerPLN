import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const source = fs.readFileSync(path.resolve('deploy/protrack-autodeploy.sh'), 'utf8');
const match = source.match(/docker exec deploy-app-1 node --input-type=module -e '\n([\s\S]*?)\n'\s*\n?docker stop protrack-maintenance/);
assert(match, 'schema gate source not found');
const gate = match[1].replace('./server/_lib/db.js', pathToFileURL(path.resolve('server/_lib/db.js')).href);
const dbUrl = JSON.stringify(pathToFileURL(path.resolve('server/_lib/db.js')).href);
const run = (prefix = '') => spawnSync(process.execPath, ['--input-type=module'], { input: `${prefix}${gate}`, encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_ENV: 'test', DB_DRIVER: 'pglite', SEED_DEMO: '0', DATABASE_URL: '' } });
const valid = run();
assert.equal(valid.status, 0, `valid role constraints rejected: ${valid.stderr}`);
const legacy = run(`import { query as prepare } from ${dbUrl}; await prepare("SELECT 1"); await prepare("ALTER TABLE users DROP CONSTRAINT users_role_check"); await prepare("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('vendor','dalkon','enjin','staff','admin'))");\n`);
assert.notEqual(legacy.status, 0, 'legacy role constraint accepted');
assert.match(legacy.stderr, /Schema role\/jabatan verification failed/);
console.log('autodeploy schema gate: positive and negative catalog checks passed');
