const TOKEN_KEY = 'pln_protrack_token';
const USER_KEY = 'pln_protrack_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const ROLE_LABELS = { vendor: 'Vendor', dalkon: 'Dalkon', enjin: 'Engineering', staff: 'Staff', admin: 'Admin' };

export const ROLE_FULL_LABELS = {
  vendor: 'Vendor / Kontraktor',
  dalkon: 'Dalkon (Pengawas)',
  enjin: 'Engineering',
  staff: 'Staff (Agenda)',
  admin: 'Administrator',
};

// Halaman yang boleh dibuka tiap role. Role dengan daftar khusus hanya bisa
// mengakses halaman tersebut saja. Staff sengaja tidak dibatasi: semua menu
// tampil (read-only) karena tombol aksi dijaga `can(...)` dan API mutasi
// dijaga `requireRole(...)` di server.
export const ROLE_HOME = {};

// Nav item yang boleh dilihat role tertentu. Bila sebuah role punya daftar
// eksplisit di sini, role tersebut HANYA melihat nav item tersebut — semua
// menu lain disembunyikan (bukan sekadar tidak bisa diklik). Kosong berarti
// semua role memakai filter default (hanya `adminOnly` yang disembunyikan).
export const ROLE_NAV = {};

export function homePathFor(user = getUser()) {
  if (!user) return '/login';
  return ROLE_HOME[user.role] || '/';
}

export function can(...roles) {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.role);
}