// Validasi lampiran yang disimpan sebagai data-URL di kolom TEXT.
//
// Tujuan utama: mencegah stored XSS. Sebelum modul ini ada, server menerima
// data-URL apa pun (termasuk `data:text/html` atau `data:image/svg+xml`) lalu
// menyajikannya kembali dengan Content-Type aslinya secara `inline`. Berkas
// seperti itu dieksekusi browser di origin aplikasi dan bisa mencuri token.
//
// Modul ini sengaja tidak mengimpor db/http supaya bisa diuji sebagai fungsi
// murni (lihat test-local.mjs).

export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB, sama dengan guard frontend

// Tipe yang boleh disimpan. SVG sengaja TIDAK ada di daftar: SVG dapat memuat
// <script> dan dieksekusi saat dibuka langsung. `text/html` juga tidak ada.
export const SAFE_FILE_TYPES = new Set([
  // Gambar raster (bukan SVG).
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'image/heic',
  'image/heif',
  // Dokumen yang dipakai UI (drawing, IK, dokumentasi, kurva S, amandemen).
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/x-msexcel',
  // Browser yang tidak mengenali tipe berkas (mis. .xlsx di sebagian sistem)
  // mengirim octet-stream. Tetap aman karena sendStoredFile selalu menyajikan
  // tipe ini sebagai attachment + CSP sandbox, bukan inline.
  'application/octet-stream',
]);

const fail = (message, status = 422) => Object.assign(new Error(message), { status });

export function isSafeFileType(type) {
  return SAFE_FILE_TYPES.has(String(type || '').toLowerCase().split(';')[0].trim());
}

// Ubah data-URL ("data:mime;base64,..." atau "data:mime;charset=...;base64,...")
// menjadi buffer. URL eksternal tidak cocok dengan pola ini dan ditangani
// terpisah oleh sendStoredFile().
export function parseDataUrl(value) {
  const m = /^data:([^,]*),([\s\S]*)$/i.exec(value || '');
  if (!m) return null;
  const meta = m[1] || '';
  const isBase64 = /(?:^|;)base64(?:;|$)/i.test(meta);
  const type = (meta.split(';')[0] || '').trim() || 'application/octet-stream';
  try {
    const buf = isBase64
      ? Buffer.from(m[2], 'base64')
      : Buffer.from(decodeURIComponent(m[2]), 'utf8');
    return { type, buf };
  } catch {
    return null;
  }
}

/**
 * Validasi nilai lampiran yang dikirim klien.
 *
 * - `null` / `undefined` / `''` -> `null` (caller menentukan wajib/tidak).
 * - `'__existing__'` -> diteruskan apa adanya (sentinel "pertahankan berkas lama").
 * - data-URL -> wajib base64, MIME di SAFE_FILE_TYPES, ukuran <= maxBytes;
 *   dikembalikan dalam bentuk ternormalisasi.
 * - URL http(s) -> hanya bila `allowExternal` (default false, karena endpoint
 *   file me-redirect ke URL tersebut / berisiko open redirect).
 * - nilai lain -> 422.
 *
 * Ukuran diperiksa dari panjang base64 sebelum buffer dibuat agar payload raksasa
 * tidak sempat dialokasikan.
 */
export function validateStoredFile(value, {
  label = 'Berkas',
  maxBytes = MAX_FILE_BYTES,
  allowExternal = false,
} = {}) {
  if (value === undefined || value === null || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw === '__existing__') return raw;

  if (/^https?:\/\//i.test(raw)) {
    if (!allowExternal) {
      throw fail(`${label}: tautan eksternal tidak diizinkan. Unggah berkas langsung.`);
    }
    return raw;
  }

  if (!/^data:/i.test(raw)) {
    throw fail(`${label}: format berkas tidak dikenali.`);
  }

  const m = /^data:([^,]*),([\s\S]*)$/i.exec(raw);
  const meta = m ? (m[1] || '') : '';
  if (!m || !/(?:^|;)base64(?:;|$)/i.test(meta)) {
    throw fail(`${label}: hanya data-URL base64 yang didukung.`);
  }

  const type = (meta.split(';')[0] || '').trim().toLowerCase();
  if (!isSafeFileType(type)) {
    throw fail(`${label}: tipe berkas ${type || 'tidak dikenal'} tidak diizinkan.`);
  }

  const payload = m[2].replace(/\s+/g, '');
  if (!payload || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
    throw fail(`${label}: isi berkas bukan base64 yang valid.`);
  }

  // Perkiraan ukuran biner dari panjang base64 (tanpa perlu decode).
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  const estimatedBytes = Math.floor((payload.length * 3) / 4) - padding;
  if (estimatedBytes > maxBytes) {
    const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    throw fail(`${label}: ukuran melebihi batas ${mb} MB.`, 413);
  }

  const buf = Buffer.from(payload, 'base64');
  if (!buf.length) throw fail(`${label}: berkas kosong.`);
  if (buf.length > maxBytes) {
    const mb = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
    throw fail(`${label}: ukuran melebihi batas ${mb} MB.`, 413);
  }

  return `data:${type};base64,${payload}`;
}
