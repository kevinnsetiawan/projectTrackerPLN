// Operator-controlled unit provisioning. Input is JSON on stdin; credentials
// never belong in source, command arguments, audit details, or output.
import 'dotenv/config';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { withTransaction } from '../_lib/db.js';
import { hashPassword, ROLES } from '../_lib/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 200;
const DEFAULT_COUNT = 10;
const MAX_INPUT_BYTES = 64 * 1024;

const fail = message => { throw new Error(message); };

function positiveInt(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) fail(`${label} tidak valid.`);
  return n;
}

function normalizeJabatan(value, index) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') fail(`Jabatan baris ${index} tidak valid.`);
  const trimmed = value.trim();
  if (trimmed.length > 120) fail(`Jabatan baris ${index} terlalu panjang.`);
  return trimmed || null;
}

function normalizeInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Input provisioning harus berupa objek JSON.');
  const provisionId = String(input.provision_id || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(provisionId)) fail('provision_id tidak valid.');
  const actorId = positiveInt(input.actor_id, 'actor_id');
  const target = input.target;
  if (!target || typeof target !== 'object') fail('Target unit wajib diisi.');
  const targetId = positiveInt(target.id, 'target.id');
  if (String(target.code || '').trim() !== 'UPT-SBYA' || target.kind !== 'upt' || target.active !== true) {
    fail('Target harus UPT-SBYA aktif dengan kind upt.');
  }
  if (!Array.isArray(input.users)) fail('users wajib berupa array.');
  const expectedCount = input.expected_count === undefined ? DEFAULT_COUNT : positiveInt(input.expected_count, 'expected_count');
  if (input.users.length !== expectedCount) fail('Jumlah users tidak sama dengan expected_count.');
  const emails = new Set();
  const users = input.users.map((raw, index) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail(`Record user ${index + 1} tidak valid.`);
    const nama = typeof raw.nama === 'string' ? raw.nama.trim() : '';
    const email = typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '';
    const password = typeof raw.password === 'string' ? raw.password : '';
    const role = typeof raw.role === 'string' ? raw.role.trim() : '';
    const active = raw.active === undefined ? true : raw.active;
    if (!nama || nama.length > MAX_NAME || !EMAIL_RE.test(email) || password.length < 6 || !ROLES.includes(role) || active !== true) {
      fail(`Record user ${index + 1} tidak valid.`);
    }
    if (emails.has(email)) fail(`Email duplikat pada record user ${index + 1}.`);
    emails.add(email);
    return { nama, email, password, role, jabatan: normalizeJabatan(raw.jabatan, index + 1), active };
  });
  return { provisionId, actorId, targetId, targetCode: 'UPT-SBYA', expectedCount, users };
}

function fingerprint(targetId, record) {
  // Password is deliberately excluded: this proves the prior batch identity,
  // not a secret supplied by the operator.
  return crypto.createHash('sha256').update(JSON.stringify({
    target_id: targetId,
    email: record.email,
    nama: record.nama,
    role: record.role,
    jabatan: record.jabatan,
    active: record.active,
  })).digest('hex');
}

function auditDetails(provisionId, digest) {
  return JSON.stringify({ provision_id: provisionId, fingerprint: digest });
}

async function readStdin() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_INPUT_BYTES) fail('Input provisioning terlalu besar.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}

async function inspectBatch(q, plan) {
  const actor = (await q('SELECT id,active,is_superadmin FROM users WHERE id=$1 FOR UPDATE', [plan.actorId])).rows[0];
  if (!actor || !actor.active || !actor.is_superadmin) fail('Actor provisioning bukan superadmin aktif.');
  const target = (await q('SELECT id,code,kind,active FROM units WHERE id=$1 FOR UPDATE', [plan.targetId])).rows[0];
  if (!target || target.id !== plan.targetId || target.code !== plan.targetCode || target.kind !== 'upt' || !target.active) fail('Target unit tidak cocok atau tidak aktif.');

  const records = [];
  for (let index = 0; index < plan.users.length; index += 1) {
    const input = plan.users[index];
    const digest = fingerprint(target.id, input);
    const existing = (await q('SELECT id,nama,email,password_hash,role,active FROM users WHERE lower(email)=$1 FOR UPDATE', [input.email])).rows[0];
    if (!existing) {
      records.push({ index, input, digest, state: 'create' });
      continue;
    }
    const member = (await q('SELECT role,jabatan,active FROM unit_memberships WHERE user_id=$1 AND unit_id=$2 FOR UPDATE', [existing.id, target.id])).rows[0];
    const proof = (await q(`SELECT 1 FROM audit_logs
      WHERE actor_id=$1 AND unit_id=$2 AND action='provision_unit_user'
        AND target_type='user' AND target_id=$3 AND details=$4 LIMIT 1`,
      [actor.id, target.id, String(existing.id), auditDetails(plan.provisionId, digest)])).rows[0];
    const exact = proof && existing.nama === input.nama && existing.email === input.email
      && existing.active === input.active && member?.role === input.role
      && (member.jabatan ?? null) === (input.jabatan ?? null) && member.active === input.active;
    if (!exact) fail(`Konflik pada record user ${index + 1}; tidak ada perubahan.`);
    records.push({ index, input, digest, existing, state: 'noop' });
  }
  return { actor, target, records };
}

export async function provisionUnitUsers(rawInput, { apply = false } = {}) {
  const plan = normalizeInput(rawInput);
  return withTransaction(async q => {
    const inspected = await inspectBatch(q, plan);
    const created = [];
    const noop = [];
    for (const item of inspected.records) {
      if (item.state === 'noop') {
        noop.push(item.index + 1);
        continue;
      }
      if (!apply) {
        created.push(item.index + 1);
        continue;
      }
      const input = item.input;
      const user = (await q(`INSERT INTO users (nama,email,password_hash,role,active)
        VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [input.nama, input.email, hashPassword(input.password), input.role, input.active])).rows[0];
      await q(`INSERT INTO unit_memberships (user_id,unit_id,role,jabatan,active)
        VALUES ($1,$2,$3,$4,$5)`, [user.id, inspected.target.id, input.role, input.jabatan, input.active]);
      await q(`INSERT INTO audit_logs (actor_id,unit_id,action,target_type,target_id,details)
        VALUES ($1,$2,'provision_unit_user','user',$3,$4)`,
        [inspected.actor.id, inspected.target.id, String(user.id), auditDetails(plan.provisionId, item.digest)]);
      created.push(item.index + 1);
    }
    return { mode: apply ? 'apply' : 'dry-run', target: inspected.target.code, expected_count: plan.expectedCount, created, noop };
  });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help') || args.has('-h')) {
    console.log('Baca JSON dari stdin; default dry-run. Gunakan --apply untuk menulis satu batch atomik.');
    return;
  }
  if ([...args].some(arg => !['--apply', '--dry-run'].includes(arg))) fail('Flag tidak dikenal.');
  if (args.has('--apply') && args.has('--dry-run')) fail('Pilih --apply atau --dry-run.');
  const raw = await readStdin();
  let input;
  try { input = JSON.parse(raw.toString('utf8')); } catch { fail('Input JSON tidak valid.'); }
  const result = await provisionUnitUsers(input, { apply: args.has('--apply') });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
