const TOKEN_KEY = 'pln_protrack_token';
const USER_KEY = 'pln_protrack_user';
const UNIT_KEY = 'pln_protrack_unit';
let currentAuth = null;

export function getUnitId() { return sessionStorage.getItem(UNIT_KEY) || ''; }
export function setUnitId(value) {
  if (value) sessionStorage.setItem(UNIT_KEY, String(value));
  else sessionStorage.removeItem(UNIT_KEY);
  currentAuth = null;
}
export function getAuthState() { return currentAuth; }
export function setAuthState(data) {
  currentAuth = data;
  if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  window.dispatchEvent(new Event('pln-auth-change'));
}
export function canAction(action) { return currentAuth?.capabilities?.[action] === true; }

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const user = currentAuth?.user || JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return user ? { ...user, role: currentAuth?.context?.role || null } : null;
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  setUnitId('');
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  setUnitId('');
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export const ROLE_LABELS = { vendor: 'Vendor', dalkon: 'Dalkon', enjin: 'Engineering', asman: 'Asman Konstruksi / Direksi Pekerjaan', logistik: 'Team Leader Logistik', staff: 'Staff', admin: 'Admin' };

export const ROLE_FULL_LABELS = {
  vendor: 'Vendor / Kontraktor',
  dalkon: 'Dalkon (Pengawas)',
  enjin: 'Engineering',
  asman: 'Asman Konstruksi / Direksi Pekerjaan',
  logistik: 'Team Leader Logistik',
  staff: 'Staff (Baca Saja)',
  admin: 'Administrator',
};

// Halaman pertama setelah login / saat aplikasi dibuka.
export const DEFAULT_HOME = '/agenda';

// Halaman yang boleh dibuka tiap role. Role dengan daftar khusus hanya bisa
// mengakses halaman tersebut saja.
export const ROLE_HOME = {};

// Menu bisnis tersedia untuk seluruh peran; tombol mengikuti capability server.
export const ROLE_NAV = {};

export function homePathFor(user = getUser()) {
  if (!user) return '/login';
  return user.is_superadmin ? '/organization' : ROLE_HOME[user.role] || DEFAULT_HOME;
}

export function can(...roles) {
  const user = getUser();
  if (!user) return false;
  return roles.includes(user.role);
}
