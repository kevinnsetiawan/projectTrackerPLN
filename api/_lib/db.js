import { Pool } from 'pg';

// Dual-driver database layer.
// - Production (Vercel): PostgreSQL via DATABASE_URL (pg Pool).
// - Local/dev/test: in-memory PGlite (no server needed) when DB_DRIVER=pglite.
//
// Both expose: query(text, params) -> Promise<{ rows }>

let pgPool;
let gliteP;
let driverInit = false;
let driver;

function getDriver() {
  if (!driverInit) {
    driver = process.env.DB_DRIVER;
    driverInit = true;
  }
  return driver;
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

// Lazy-load PGlite so it is never bundled into the Vercel (production) function.
async function getPGlite() {
  if (!gliteP) {
    const { PGlite } = await import('@electric-sql/pglite');
    const glite = new PGlite();
    const { DDL } = await import('./schema.js');
    for (const stmt of DDL.split(';').map((s) => s.trim()).filter(Boolean)) {
      await glite.query(stmt);
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
  return getPgPool().query(text, params);
}