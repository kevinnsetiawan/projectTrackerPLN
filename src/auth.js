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

// Halaman pertama setelah login / saat aplikasi dibuka.
export const DEFAULT_HOME = '/agenda';

// Halaman yang boleh dibuka tiap role. Role dengan daftar khusus hanya bisa
// mengakses halaman tersebut saja.
export const ROLE_HOME = {};

// Nav item yang boleh dilihat role tertentu.
// Semua role saat ini hanya melihat menu Agenda & Rekap.
export const ROLE_NAV = {
  vendor: ['/agenda'],
  dalkon: ['/agenda'],
  enjin:  ['/agenda'],
  staff:  ['/agenda'],
  admin:  ['/agenda'],
};

export function homePathFor(user = getUser()) {
  if (!user) return '/login';
  return ROLE_HOME[user.role] || DEFAULT_HOME;
}

export function can(...roles) {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.role);
}
