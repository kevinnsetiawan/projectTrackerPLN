import { Router } from 'express';
import { query } from '../_lib/db.js';
import {
  hashPassword, verifyPassword, signToken, publicUser, requireAuth,
} from '../_lib/auth.js';
import { asyncHandler, err } from '../_lib/http.js';
import { isLimited, registerHit } from '../_lib/rateLimit.js';
import { getCapabilities } from '../_lib/scope.js';

const router = Router();

// Anti-brute-force registration limit: 10 per IP / hour.
const REGISTER_WINDOW = 60 * 60 * 1000;
const REGISTER_MAX = 10;

export function registrationOpen() {
  const flag = String(process.env.REGISTRATION_OPEN || '').trim().toLowerCase();
  if (flag === '0' || flag === 'false') return false;
  if (flag === '1' || flag === 'true') return true;
  return false;
}

router.get('/config', (req, res) => {
  res.json({ registrationOpen: registrationOpen() });
});

router.post('/register', asyncHandler(async (req, res) => {
  if (!registrationOpen()) throw err('Pendaftaran akun ditutup. Hubungi administrator.', 403);
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
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const row = rows[0];
  if (!row || !row.active || !verifyPassword(password, row.password_hash)) {
    throw err('Email atau password salah', 401);
  }
  const user = publicUser(row);
  res.json({ token: signToken(user), user });
}));

router.get('/me', requireAuth, (req, res) => {
  const selectableUnits = req.selectable_units || [];
  res.json({ user: req.user, memberships:req.memberships, selectable_units:selectableUnits, context:req.context, capabilities:getCapabilities(req), setupRequired:selectableUnits.length === 0 });
});

export default router;
