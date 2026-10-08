// Persistensi driver PGlite di Vercel (serverless tanpa database eksternal).
//
// PGlite berjalan in-memory, jadi data hilang tiap kali instance baru dibuat.
// Modul ini menyimpan snapshot data directory (tar.gz) ke Vercel Blob: saat cold
// start snapshot diunduh lalu di-restore, setiap mutasi memicu upload ulang
// dengan debounce.
//
// Batasan yang perlu diketahui:
// - Restore menambah latency cold start, proporsional terhadap ukuran data.
// - Last-write-wins antar instance: sebelum upload, revision di cek terhadap
//   manifest. Bila remote sudah berubah, instance ini melepas upload agar
//   perubahan orang lain tidak tertimpa.
// - Setiap upload mengunggah ulang seluruh snapshot, jadi paling cocok untuk tim
//   kecil, bukan pemakaian concurrent tinggi.
//
// Aktif hanya bila BLOB_READ_WRITE_TOKEN tersedia DAN driver pg tidak dipakai.

import { head, put } from '@vercel/blob';

const SNAPSHOT_PATH = 'pln-protrack-db.tar.gz';
const MANIFEST_PATH = 'pln-protrack-db-manifest.json';
const MAX_SNAPSHOT_BYTES = 100 * 1024 * 1024;

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function authHeaders() {
  return { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` };
}

function putOptions(extra) {
  return { token: process.env.BLOB_READ_WRITE_TOKEN, ...extra };
}

// Coba akses privat lebih dulu (paling aman). Blob store lama bisa jadi hanya
// mengizinkan akses publik.
async function putCompat(pathname, body, options) {
  try {
    return await put(pathname, body, putOptions({ ...options, access: 'private' }));
  } catch (e) {
    if (!/access/i.test(String(e && e.message))) throw e;
    return await put(pathname, body, putOptions({ ...options, access: 'public' }));
  }
}

export async function readManifest() {
  try {
    const meta = await head(MANIFEST_PATH, putOptions());
    const res = await fetch(meta.url, { headers: authHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    return json && typeof json.revision === 'number' ? json : null;
  } catch {
    return null; // belum pernah ada snapshot
  }
}

export async function downloadSnapshot() {
  try {
    const meta = await head(SNAPSHOT_PATH, putOptions());
    if (meta.size > MAX_SNAPSHOT_BYTES) {
      console.warn(`Snapshot di Blob terlalu besar (${meta.size} byte), dilewati.`);
      return null;
    }
    const res = await fetch(meta.url, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

export async function uploadSnapshot(blob, revision) {
  const res = await putCompat(SNAPSHOT_PATH, blob, {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/gzip',
  });
  await putCompat(MANIFEST_PATH, JSON.stringify({
    revision,
    uploadedAt: new Date().toISOString(),
    bytes: blob.size ?? null,
  }), {
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
  return res.url;
}

export const paths = { snapshot: SNAPSHOT_PATH, manifest: MANIFEST_PATH };
