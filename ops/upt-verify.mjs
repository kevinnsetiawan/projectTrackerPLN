import assert from 'node:assert/strict';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const credentials = JSON.parse(input);
const base = process.env.VERIFY_BASE || 'http://127.0.0.1:4000';
async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  let body;
  try { body = await response.json(); } catch { body = null; }
  return { status: response.status, body };
}
const anonymous = await request('/api/projects');
assert.equal(anonymous.status, 401);
const signup = await request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
assert.equal(signup.status, 403);
const login = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(credentials) });
assert.equal(login.status, 200, 'root login failed');
const headers = { Authorization: `Bearer ${login.body.token}` };
const me = await request('/api/auth/me', { headers });
assert.equal(me.status, 200);
assert.equal(me.body.user.is_superadmin, true);
assert.equal(me.body.setupRequired, true);
assert.equal(me.body.memberships.length, 0);
for (const capability of ['unit_manage', 'membership_manage', 'user_manage', 'security_matrix']) assert.equal(me.body.capabilities[capability], true, capability);
assert.equal(me.body.capabilities.read, false);
const units = await request('/api/units', { headers });
assert.equal(units.status, 200);
assert.deepEqual(units.body.data, []);
const users = await request('/api/users', { headers });
assert.equal(users.status, 200);
assert.equal(users.body.data.length, 1);
assert.equal((await request('/api/security-matrix', { headers })).status, 200);
const noUnit = await request('/api/projects', { headers });
assert.ok(noUnit.status === 403 || (noUnit.status === 200 && Array.isArray(noUnit.body.data) && noUnit.body.data.length === 0));
const wrongUnit = await request('/api/projects', { headers: { ...headers, 'X-Unit-Id': '999999' } });
assert.equal(wrongUnit.status, 403);
console.log('Auth, root setup, empty units, control permissions and unit isolation verified');
