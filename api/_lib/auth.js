// Standalone auth helpers (JWT-style HMAC tokens + scrypt password hashing).
// No extra dependencies: uses Node's built-in crypto.
import crypto from 'node:crypto';

const SECRET = process.env.JWT_SECRET || 'pln-pro-track-dev-secret-2026';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export const ROLES = ['vendor', 'dalkon', 'enjin', 'admin'];
export const ROLE_LABELS = { vendor: 'Vendor / Kontraktor', dalkon: 'Dalkon (Pengawas)', enjin: 'Enjin (Engineering)', admin: 'Administrator' };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  try {
    const test = crypto.scryptSync(String(password), salt, 64).toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(test, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function b64(o) {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}

export function signToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    nama: user.nama,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

export function verifyToken(token) {
  try {
    const [head, body, sig] = String(token || '').split('.');
    if (!head || !body || !sig) return null;
    const expected = crypto.createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// Express middlewares
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ error: 'Login diperlukan.' });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Login diperlukan.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Akses ditolak untuk peran ini.' });
      return;
    }
    next();
  };
}

export function publicUser(row) {
  return { id: row.id, nama: row.nama, email: row.email, role: row.role };
}