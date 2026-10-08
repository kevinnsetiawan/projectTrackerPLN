// Buat/perbarui akun admin di database produksi.
// Pemakaian:
//   npm run db:create-admin -- admin@domain.com "KataSandiKuat" "Nama Admin"
// Berguna bila SEED_DEMO=0 (database kosong, tanpa akun demo).
import 'dotenv/config';
import { query } from '../_lib/db.js';
import { hashPassword } from '../_lib/auth.js';

const [email, password, nama = 'Administrator'] = process.argv.slice(2);

async function main() {
  if (!email || !password) {
    console.error('Pemakaian: npm run db:create-admin -- <email> <password> [nama]');
    process.exit(1);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Format email tidak valid.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password minimal 8 karakter untuk akun admin.');
    process.exit(1);
  }

  const existing = await query('SELECT id, role FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    await query('UPDATE users SET password_hash=$1, role=$2 WHERE id=$3', [
      hashPassword(password), 'admin', existing.rows[0].id,
    ]);
    console.log(`Password akun admin ${email} diperbarui.`);
  } else {
    await query(
      'INSERT INTO users (nama, email, password_hash, role) VALUES ($1,$2,$3,$4)',
      [nama, email.toLowerCase(), hashPassword(password), 'admin']
    );
    console.log(`Akun admin ${email} dibuat.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Gagal:', e.message);
    process.exit(1);
  });
