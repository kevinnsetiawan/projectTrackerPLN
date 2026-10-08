// Rate limiter in-memory sederhana, cukup untuk satu proses API (local-server
// atau satu instance Vercel). Tidak lintas instance — bila nanti di-scale ke
// banyak proses, ganti dengan penyimpanan bersama (mis. Redis/Postgres).
const buckets = new Map();

function bucketFor(key, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.expiresAt) {
    b = { count: 0, expiresAt: now + windowMs };
    buckets.set(key, b);
  }
  return b;
}

// True bila key sudah mencapai batas dalam jendela waktu.
export function isLimited(key, limit, windowMs) {
  return bucketFor(key, windowMs).count >= limit;
}

// Catat satu percobaan. Mengembalikan true bila batas tercapai oleh hit ini.
export function registerHit(key, limit, windowMs) {
  const b = bucketFor(key, windowMs);
  b.count += 1;
  return b.count >= limit;
}

// Lupakan hit (mis. setelah login berhasil).
export function clearHits(key) {
  buckets.delete(key);
}

// Buang bucket yang kedaluwarsa supaya peta tidak tumbuh tanpa batas.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now >= b.expiresAt) buckets.delete(k);
  }
}, 60 * 1000);
if (typeof sweeper.unref === 'function') sweeper.unref();
