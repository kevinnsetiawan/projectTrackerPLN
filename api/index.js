import express from 'express';
import cors from 'cors';

import authRouter from '../server/routes/auth.js';
import dashboardRouter from '../server/routes/dashboard.js';
import projectsRouter from '../server/routes/projects.js';
import kendalaRouter from '../server/routes/kendala.js';
import reportsRouter from '../server/routes/reports.js';
import drawingsRouter from '../server/routes/drawings.js';
import gisRouter from '../server/routes/gis.js';
import agendaRouter from '../server/routes/agenda.js';
import usersRouter from '../server/routes/users.js';
import eventsRouter from '../server/routes/events.js';
import { requireAuth, verifyToken } from '../server/_lib/auth.js';

const app = express();
app.disable('x-powered-by');
// nginx/proxy berjalan di mesin yang sama -> percayai X-Forwarded-For dari loopback
// supaya req.ip (dipakai rate limiter) berisi IP klien asli, bukan 127.0.0.1.
app.set('trust proxy', 'loopback');

// CORS: default same-origin saja (dev lewat proxy Vite, produksi lewat nginx).
// Bila frontend di-host terpisah, daftarkan origin-nya: CORS_ORIGIN=https://a.com,https://b.com
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
if (corsOrigins.length) app.use(cors({ origin: corsOrigins }));

app.use(express.json({ limit: '15mb' }));

// Header keamanan dasar (tanpa dependensi).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Endpoint baca wajib login saat mode publik (default: aktif di NODE_ENV=production,
// matikan dengan READ_AUTH=0). SPA selalu mengirim Authorization, kecuali unduhan
// anchor (export CSV/Excel) yang membawa ?token=. /api/auth & /api/events dilewatkan
// (login/register publik; SSE sudah punya aut sendiri via ?token=).
const readAuthEnv = (process.env.READ_AUTH || '').trim().toLowerCase();
const readAuth = readAuthEnv
  ? (readAuthEnv === '1' || readAuthEnv === 'true')
  : process.env.NODE_ENV === 'production';
if (readAuth) {
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/auth') || req.path.startsWith('/events')) return next();
    if (!req.headers.authorization && req.query.token) {
      const user = verifyToken(String(req.query.token));
      if (user) { req.user = user; next(); return; }
    }
    requireAuth(req, res, next);
  });
}

// Mount routers (in order of specificity).
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', projectsRouter);
app.use('/api', kendalaRouter);
app.use('/api', drawingsRouter);
app.use('/api', reportsRouter);
app.use('/api', gisRouter);
app.use('/api', agendaRouter);
app.use('/api', usersRouter);
app.use('/api', eventsRouter);

// ---------- error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
