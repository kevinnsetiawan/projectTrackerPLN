import 'dotenv/config';
import http from 'http';
import app from '../api/index.js';

if (!process.env.JWT_SECRET) {
  console.warn('[keamanan] JWT_SECRET belum di-set — memakai kunci default HANYA untuk development.');
}
if (process.env.NODE_ENV === 'production' && !process.env.DEMO_ADMIN_PASS && (process.env.SEED_DEMO || '') !== '0') {
  console.warn('[keamanan] DEMO_ADMIN_PASS belum di-set — database baru tidak akan punya akun awal. '
    + 'Isi DEMO_ADMIN_PASS atau jalankan: npm run db:create-admin -- <email> <password>');
}
if (process.env.NODE_ENV === 'production' && !process.env.READ_AUTH) {
  console.log('[mode] READ_AUTH default aktif di produksi: endpoint baca API wajib login.');
}

const port = process.env.PORT || 4000;
http.createServer(app).listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
