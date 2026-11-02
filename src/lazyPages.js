// Satu sumber daftar chunk halaman (dipakai React.lazy di App.jsx sekaligus
// untuk prefetch saat kursor/fokus berhenti di menu). Dengan prefetch, pindah
// menu tidak lagi menunggu unduhan + parse chunk halaman: saat NavLink di-hover
// chunk mulai diunduh, jadi klik berikutnya hampir instan.
export const pageLoaders = {
  dashboard: () => import('./pages/Dashboard.jsx'),
  projects: () => import('./pages/ProjectsIndex.jsx'),
  projectShow: () => import('./pages/ProjectShow.jsx'),
  projectForm: () => import('./pages/ProjectForm.jsx'),
  progressForm: () => import('./pages/ProgressForm.jsx'),
  kendala: () => import('./pages/KendalaIndex.jsx'),
  agenda: () => import('./pages/AgendaIndex.jsx'),
  gis: () => import('./pages/GisPage.jsx'),
  reports: () => import('./pages/ReportsIndex.jsx'),
  reportsPrint: () => import('./pages/ReportsPrint.jsx'),
  drawings: () => import('./pages/ApprovalDrawingsIndex.jsx'),
  instruksi: () => import('./pages/InstruksiKerjaIndex.jsx'),
  users: () => import('./pages/Users.jsx'),
};

const ROUTE_PAGE = [
  [/^\/dashboard$/, 'dashboard'],
  [/^\/projects$/, 'projects'],
  [/^\/projects\/new$/, 'projectForm'],
  [/^\/projects\/\d+\/edit$/, 'projectForm'],
  [/^\/projects\/\d+\/progress$/, 'progressForm'],
  [/^\/projects\/\d+$/, 'projectShow'],
  [/^\/drawings$/, 'drawings'],
  [/^\/instruksi$/, 'instruksi'],
  [/^\/kendala$/, 'kendala'],
  [/^\/agenda$/, 'agenda'],
  [/^\/gis$/, 'gis'],
  [/^\/reports$/, 'reports'],
  [/^\/reports\/print$/, 'reportsPrint'],
  [/^\/users$/, 'users'],
];

// Modul yang sudah/pernah diminta. Dynamic import sudah di-cache browser, jadi
// penanda ini hanya mencegah pemanggilan berulang saat kursor bolak-balik.
const warmed = new Set();

export function preloadPage(key) {
  const load = pageLoaders[key];
  if (!load || warmed.has(key)) return;
  warmed.add(key);
  // Gagal prefetch bukan masalah: lazy() akan mengunduh ulang saat navigasi.
  load().catch(() => warmed.delete(key));
}

export function preloadPath(pathname) {
  if (!pathname) return;
  for (const [re, key] of ROUTE_PAGE) {
    if (re.test(pathname)) {
      preloadPage(key);
      return;
    }
  }
}
