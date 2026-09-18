import { Router } from 'express';
import { query } from '../_lib/db.js';
import { hashPassword, ROLES, requireAuth, requireRole, publicUser } from '../_lib/auth.js';
import { asyncHandler, err } from '../_lib/http.js';

const router = Router();

// List all users (admin only)
router.get('/users', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, nama, email, role, created_at FROM users ORDER BY id ASC');
  res.json({ data: rows, roles: ROLES, labels: { vendor: 'Vendor / Kontraktor', dalkon: 'Dalkon (Pengawas)', enjin: 'Engineering', admin: 'Administrator' } });
}));

// Create user (admin only)
router.post('/users', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const nama = String(b.nama || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = String(b.role || 'vendor').trim();
  if (!nama) throw err('Nama wajib diisi');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err('Email tidak valid');
  if (password.length < 6) throw err('Password minimal 6 karakter');
  if (!ROLES.includes(role)) throw err('Role tidak valid');

  const dup = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (dup.rows.length) throw err('Email sudah terdaftar');

  const { rows } = await query(
    'INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id, nama, email, role, created_at',
    [nama, email, hashPassword(password), role]
  );
  res.status(201).json(rows[0]);
}));

// Update user (nama, email, role, optional password reset)
router.put('/users/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!rows.length) throw err('User tidak ditemukan', 404);
  const target = rows[0];

  const b = req.body || {};
  const nama = String(b.nama || target.nama).trim();
  const email = String(b.email || target.email).trim().toLowerCase();
  const role = String(b.role || target.role).trim();
  const password = b.password ? String(b.password) : null;

  if (!nama) throw err('Nama wajib diisi');
  if (!ROLES.includes(role)) throw err('Role tidak valid');
  if (password && password.length < 6) throw err('Password minimal 6 karakter');

  if (email !== target.email) {
    const dup = await query('SELECT id FROM users WHERE email = $1 AND id <> $2', [email, target.id]);
    if (dup.rows.length) throw err('Email sudah digunakan user lain');
  }

  const otherAdmins = await query(
    "SELECT COUNT(*)::int AS c FROM users WHERE role='admin' AND id <> $1",
    [target.id]
  );
  if (target.role === 'admin' && role !== 'admin' && otherAdmins.rows[0].c === 0) {
    throw err('Tidak dapat menurunkan admin terakhir');
  }

  const { rows: updated } = await query(
    `UPDATE users SET nama=$1, email=$2, role=$3, password_hash=COALESCE($4, password_hash), updated_at=now()
     WHERE id=$5 RETURNING id, nama, email, role, created_at`,
    [nama, email, role, password ? hashPassword(password) : null, target.id]
  );
  res.json(updated[0]);
}));

// Delete user (admin only; protect self + last admin)
router.delete('/users/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  if (Number(req.params.id) === req.user.sub) throw err('Tidak dapat menghapus akun sendiri');

  const { rows } = await query('SELECT role FROM users WHERE id = $1', [req.params.id]);
  if (!rows.length) throw err('User tidak ditemukan', 404);

  if (rows[0].role === 'admin') {
    const otherAdmins = await query("SELECT COUNT(*)::int AS c FROM users WHERE role='admin' AND id <> $1", [req.params.id]);
    if (otherAdmins.rows[0].c === 0) throw err('Tidak dapat menghapus admin terakhir');
  }

  await query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
}));

export default router;