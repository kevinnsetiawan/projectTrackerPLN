import assert from 'node:assert/strict';
import http from 'node:http';
import { registrationOpen } from './server/routes/auth.js';

const original = { node: process.env.NODE_ENV, flag: process.env.REGISTRATION_OPEN };
try {
  delete process.env.REGISTRATION_OPEN;
  for (const environment of ['production','development','test']) {
    process.env.NODE_ENV = environment;
    assert.equal(registrationOpen(), false, environment+' must default closed');
  }
  process.env.REGISTRATION_OPEN = '0';
  assert.equal(registrationOpen(), false);
  process.env.REGISTRATION_OPEN = '1';
  assert.equal(registrationOpen(), true);
  process.env.REGISTRATION_OPEN = 'unexpected';
  assert.equal(registrationOpen(), false);

  process.env.NODE_ENV = 'production';
  delete process.env.REGISTRATION_OPEN;
  const { default: app } = await import('./api/index.js');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    for (const environment of ['production','development','test']) {
      process.env.NODE_ENV = environment;
      const configRes = await fetch(`http://127.0.0.1:${port}/api/auth/config`);
      assert.equal(configRes.status, 200);
      assert.deepEqual(await configRes.json(), {registrationOpen:false});
      const registerRes = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nama: 'Test', email: 'test@example.com', password: 'secret123' }),
      });
      assert.equal(registerRes.status, 403, environment+' default registration must reject HTTP');
    }
    process.env.REGISTRATION_OPEN = '1';
    const enabled = await fetch(`http://127.0.0.1:${port}/api/auth/config`);
    assert.deepEqual(await enabled.json(),{registrationOpen:true});
    const invalid = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method:'POST',headers:{'content-type':'application/json'},body:'{}',
    });
    assert.equal(invalid.status,400,'explicit opt-in reaches input validation without creating a user');
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  console.log('auth registration config: ok');
} finally {
  if (original.node === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = original.node;
  if (original.flag === undefined) delete process.env.REGISTRATION_OPEN;
  else process.env.REGISTRATION_OPEN = original.flag;
}
