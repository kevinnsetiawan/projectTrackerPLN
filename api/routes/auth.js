import { Router } from 'express';
import { query } from '../_lib/db.js';
import {
  ROLES, hashPassword, verifyPassword, signToken, publicUser, requireAuth,
} from '../_lib/auth.js';
import { asyncHandler, err } from '../_lib/http.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const nama = String(b.nama || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = ROLES.includes(b.role) ? b.role : 'vendor';
  if (!nama || !email || !password) throw err('Nama, email, dan password wajib diisi');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err('Format email tidak valid');
  if (password.length < 6) throw err('Password minimal 6 karakter');
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw err('Email sudah terdaftar', 409);
  const { rows } = await query(
    'INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING *',
    [nama, email, hashPassword(password), role]
  );
  const user = publicUser(rows[0]);
  res.status(201).json({ token: signToken(user), user });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!email || !password) throw err('Email dan password wajib diisi');
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) throw err('Email atau password salah', 401);
  const user = publicUser(row);
  res.json({ token: signToken(user), user });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
