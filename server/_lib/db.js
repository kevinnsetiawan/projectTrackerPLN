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

function getDriver() {
  if (!driverInit) {
    driver = process.env.DB_DRIVER || (process.env.DATABASE_URL ? 'pg' : 'pglite');
    explicitDriver = Boolean(process.env.DB_DRIVER);
    driverInit = true;
  }
  return driver;
}

// Driver postgres dipakai? Ekspor helper supaya modul lain (mis. events.js)
// tidak perlu membaca process.env sendiri.
export function isPg() {
  return getDriver() !== 'pglite';
}

function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
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

// Lazy-load PGlite so it is never bundled into the Vercel (production) function.
async function getPGlite() {
  if (!gliteP) {
    const { PGlite } = await import('@electric-sql/pglite');
    const glite = new PGlite();
    const { DDL } = await import('./schema.js');
    for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
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
    gliteP = glite;
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
