import { Pool } from 'pg';

// Dual-driver database layer.
// - Default tanpa konfigurasi: in-memory PGlite — no external DB needed (demo).
// - DB_DRIVER=pglite: in-memory PGlite (local dev/tests).
// - DB_DRIVER=pg atau DB_DRIVER=postgres: PostgreSQL via DATABASE_URL.
// - DATABASE_URL saja (tanpa DB_DRIVER): PostgreSQL — driver pg dipilih otomatis
//   supaya connection string yang sudah di-set tidak diam-diam diabaikan.
//
// Both expose: query(text, params) -> Promise<{ rows }>

let pgPool;
let gliteP;
let driverInit = false;
let driver;
let explicitDriver = false;
let pgBootstrapped = null;

function pgUrl() {
  return (process.env.DATABASE_URL || '').trim();
}

function getDriver() {
  if (!driverInit) {
    const want = (process.env.DB_DRIVER || '').trim().toLowerCase();
    if (want === 'pglite') {
      driver = 'pglite';
    } else if (want) {
      // pg / postgres / nilai lain dipaksa ke Postgres, tapi tetap butuh URL.
      // Kalau DATABASE_URL kosong, jangan sampai seluruh API 500.
      driver = pgUrl() ? 'pg' : 'pglite';
      if (driver === 'pglite') console.warn('DB_DRIVER=pg diabaikan: DATABASE_URL kosong, memakai PGlite in-memory.');
    } else {
      // Tanpa DB_DRIVER: pakai Postgres bila DATABASE_URL benar-benar ada,
      // selain itu jatuh ke PGlite in-memory (demo lokal / tanpa konfigurasi).
      driver = pgUrl() ? 'pg' : 'pglite';
    }
    explicitDriver = want === 'pglite' || Boolean(want);
    driverInit = true;
  }
  return driver;
}

// Driver postgres dipakai? Ekspor helper supaya modul lain (mis. events.js)
// tidak perlu membaca process.env sendiri.
export function isPg() {
  return getDriver() !== 'pglite';
}

// SSL Postgres: wajib hanya bila diminta eksplisit — DB_SSL=1/0, atau URL
// membawa sslmode=require|verify-ca|verify-full (Supabase/Vercel/Neon selalu
// menyertakannya). Postgres lokal tanpa SSL tetap bisa konek tanpa perbaikan kode.
function pgSslConfig() {
  const flag = (process.env.DB_SSL || '').trim().toLowerCase();
  if (flag === '1' || flag === 'true') return { rejectUnauthorized: false };
  if (flag === '0' || flag === 'false') return false;
  return /sslmode=(require|verify-ca|verify-full)/i.test(pgUrl()) ? { rejectUnauthorized: false } : false;
}

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: pgSslConfig(),
    });
  }
  return pgPool;
}

// Database Postgres (Vercel/Neon/Supabase/...): pastikan skema + akun demo ada
// pada boot pertama. Tanpa ini, tabel kosong setelah DB baru dibuat. Idempotent
// dan dikunci advisory lock agar dua cold start paralel tidak dobel-seed.
async function ensurePgBootstrap() {
  if (!pgBootstrapped) {
    pgBootstrapped = (async () => {
      const { DDL } = await import('./schema.js');
      const pool = getPgPool();
      const client = await pool.connect();
      try {
        await client.query('SELECT pg_advisory_lock($1)', [72771701]);
        for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
          await client.query(stmt);
        }
        const { rows } = await client.query('SELECT COUNT(*)::int AS cnt FROM projects');
        if (rows[0].cnt === 0) {
          const { autoSeed } = await import('./seedRunner.js');
          await autoSeed(client);
        }
      } finally {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [72771701]);
        } catch {
          /* koneksi sudah tertutup */
        }
        client.release();
      }
    })().catch((e) => {
      pgBootstrapped = null; // biar dicoba lagi pada request berikutnya
      throw e;
    });
  }
  return pgBootstrapped;
}

// --- Snapshot PGlite <-> Vercel Blob -----------------------------------------
// PGlite in-memory hilang tiap cold start. Bila BLOB_READ_WRITE_TOKEN tersedia,
// snapshot data directory disimpan ke Blob dan di-restore saat boot.
let snapshotDirty = false;
let snapshotTimer = null;
let snapshotRevision = 0;
let snapshotUploading = false;

function snapshotEnabled() {
  if (getDriver() !== 'pglite') return false;
  if (explicitDriver) return false; // dev/test lokal: jangan sentuh Blob
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function markDirty() {
  if (!snapshotEnabled()) return;
  snapshotDirty = true;
  if (snapshotTimer) return;
  snapshotTimer = setTimeout(() => {
    snapshotTimer = null;
    persistSnapshot().catch((e) => console.warn('Upload snapshot gagal:', e.message));
  }, 5000);
  if (typeof snapshotTimer.unref === 'function') snapshotTimer.unref();
}

async function persistSnapshot() {
  if (!snapshotDirty || snapshotUploading || !gliteP) return;
  const store = await import('./blobStore.js');
  // Last-write-wins guard: jangan timpa snapshot yang sudah ditulis instance lain.
  const remote = await store.readManifest();
  if (remote && remote.revision !== snapshotRevision) {
    snapshotDirty = false;
    console.warn('Snapshot dilewati: ada instance lain yang menulis lebih dulu.');
    return;
  }
  snapshotUploading = true;
  try {
    const blob = await gliteP.dumpDataDir('gzip');
    snapshotRevision += 1;
    await store.uploadSnapshot(blob, snapshotRevision);
    snapshotDirty = false;
  } finally {
    snapshotUploading = false;
  }
}

// Statement yang mengubah data memicu upload snapshot.
function isMutation(sql) {
  return /^\s*(insert|update|delete|truncate|create|drop|alter)\b/i.test(sql);
}

// Lazy-load PGlite so it is never bundled into the Vercel (production) function.
async function getPGlite() {
  if (!gliteP) {
    const { PGlite } = await import('@electric-sql/pglite');
    const { DDL } = await import('./schema.js');
    const stmts = DDL.split(';').map((s) => s.trim()).filter(Boolean);
    const blob = snapshotEnabled() ? await import('./blobStore.js') : null;

    let glite = null;
    if (blob) {
      const store = await import('./blobStore.js');
      const manifest = await store.readManifest();
      snapshotRevision = manifest ? manifest.revision : 0;
      const snapshot = await store.downloadSnapshot();
      if (snapshot) {
        try {
          glite = await PGlite.create(undefined, { loadDataDir: snapshot });
          console.log('PGlite dipulihkan dari snapshot Vercel Blob.');
        } catch (e) {
          console.warn('Restore snapshot gagal, membuat database baru:', e.message);
          glite = null;
        }
      }
    }

    if (!glite) {
      glite = new PGlite();
      for (const stmt of stmts) {
        await glite.query(stmt);
      }
      // Auto-seed on cold start only for the default (zero-config) driver,
      // i.e. Vercel. When DB_DRIVER is set explicitly (local dev/tests), the
      // caller's own seeder runs instead.
      if (!explicitDriver) {
        const { rows } = await glite.query('SELECT COUNT(*)::int AS cnt FROM projects');
        if (rows[0].cnt === 0) {
          const { autoSeed } = await import('./seedRunner.js');
          await autoSeed(glite);
        }
      }
      markDirty(); // database baru harus tersimpan ke Blob
    }

    const raw = glite;
    gliteP = {
      raw,
      async query(text, params) {
        const res = await raw.query(text, params);
        if (isMutation(text)) markDirty();
        return res;
      },
    };
  }
  return gliteP;
}

export function getPool() {
  if (getDriver() === 'pglite') {
    return { query: async (text, params) => (await getPGlite()).query(text, params) };
  }
  return getPgPool();
}

export async function query(text, params) {
  if (getDriver() === 'pglite') {
    return (await getPGlite()).query(text, params);
  }
  await ensurePgBootstrap();
  return getPgPool().query(text, params);
}
