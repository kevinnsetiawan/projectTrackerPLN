import { Router } from 'express';
import { query } from '../_lib/db.js';
import {
  hashPassword, verifyPassword, signToken, publicUser, requireAuth,
} from '../_lib/auth.js';
import { asyncHandler, err } from '../_lib/http.js';
import { isLimited, registerHit, clearHits } from '../_lib/rateLimit.js';

const router = Router();

// Anti brute-force: 10 gagal per IP+email / 15 menit, 40 gagal per IP / 15 menit
// (mencegah spray lintas email), 10 pendaftaran per IP / jam.
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 10;
const LOGIN_IP_MAX_FAILS = 40;
const REGISTER_WINDOW = 60 * 60 * 1000;
const REGISTER_MAX = 10;

router.post('/register', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const nama = String(b.nama || '').trim();
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = 'vendor'; // public registration is vendor-only; other roles via admin /api/users
  if (!nama || !email || !password) throw err('Nama, email, dan password wajib diisi');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw err('Format email tidak valid');
  if (password.length < 6) throw err('Password minimal 6 karakter');
  const regKey = `register:${req.ip}`;
  if (isLimited(regKey, REGISTER_MAX, REGISTER_WINDOW)) {
    throw err('Terlalu banyak pendaftaran dari jaringan ini. Coba lagi nanti.', 429);
  }
  registerHit(regKey, REGISTER_MAX, REGISTER_WINDOW);
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
  const emailKey = `login:${req.ip}:${email}`;
  const ipKey = `login-ip:${req.ip}`;
  if (isLimited(emailKey, LOGIN_MAX_FAILS, LOGIN_WINDOW) || isLimited(ipKey, LOGIN_IP_MAX_FAILS, LOGIN_WINDOW)) {
    throw err('Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.', 429);
  }
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_hash)) {
    registerHit(emailKey, LOGIN_MAX_FAILS, LOGIN_WINDOW);
    registerHit(ipKey, LOGIN_IP_MAX_FAILS, LOGIN_WINDOW);
    throw err('Email atau password salah', 401);
  }
  clearHits(emailKey);
  const user = publicUser(row);
  res.json({ token: signToken(user), user });
}));

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
