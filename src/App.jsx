import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { getUser, canAction, ROLE_HOME, DEFAULT_HOME } from './auth.js';
import { pageLoaders } from './lazyPages.js';

// Halaman berat (chart, leaflet, parser Excel) dimuat sesuai kebutuhan supaya
// bundle awal kecil dan halaman pertama terbuka lebih cepat di jaringan lambat.
const Dashboard = lazy(pageLoaders.dashboard);
const ProjectsIndex = lazy(pageLoaders.projects);
const ProjectShow = lazy(pageLoaders.projectShow);
const ProjectForm = lazy(pageLoaders.projectForm);
const ProgressForm = lazy(pageLoaders.progressForm);
const KendalaIndex = lazy(pageLoaders.kendala);
const AgendaIndex = lazy(pageLoaders.agenda);
const GisPage = lazy(pageLoaders.gis);
const ReportsIndex = lazy(pageLoaders.reports);
const ReportsPrint = lazy(pageLoaders.reportsPrint);
const ApprovalDrawingsIndex = lazy(pageLoaders.drawings);
const InstruksiKerjaIndex = lazy(pageLoaders.instruksi);
const Users = lazy(pageLoaders.users);
const Organization = lazy(pageLoaders.organization);
const SecurityMatrix = lazy(pageLoaders.securityMatrix);

function LoadingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-pln-200 border-t-pln-600" />
      <span className="sr-only">Memuat halaman…</span>
    </div>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getUser()) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function RequireAdmin({ children }) {
  if (!canAction('user_manage') && !canAction('membership_manage')) return <Navigate to="/" replace />;
  return children;
}
function RequireAction({ action, children }) {
  return canAction(action) ? children : <p role="alert" className="p-4 bg-amber-50 text-amber-800 rounded-lg">Akses tindakan ini tidak tersedia pada unit aktif.</p>;
}

// Role dengan halaman khusus (lihat ROLE_HOME) tidak boleh membuka halaman lain.
// Saat ini kosong, jadi semua role boleh membuka halaman mana pun.
function RequireRoleHome({ children }) {
  const location = useLocation();
  const user = getUser();
  if (!user) return children;
  const allowed = ROLE_HOME[user.role];
  if (allowed && location.pathname !== allowed) return <Navigate to={allowed} replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reports/print" element={<RequireAuth><RequireRoleHome><ReportsPrint /></RequireRoleHome></RequireAuth>} />
        <Route element={<RequireAuth><RequireRoleHome><Layout /></RequireRoleHome></RequireAuth>}>
          {/* Halaman awal aplikasi: Agenda & Rekap. Dashboard KPI tetap ada di /dashboard. */}
          <Route path="/" element={<Navigate to={DEFAULT_HOME} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsIndex />} />
          <Route path="/projects/new" element={<RequireAction action="project_write"><ProjectForm /></RequireAction>} />
          <Route path="/projects/:id" element={<ProjectShow />} />
          <Route path="/projects/:id/edit" element={<RequireAction action="project_write"><ProjectForm /></RequireAction>} />
          <Route path="/projects/:id/progress" element={<RequireAction action="progress"><ProgressForm /></RequireAction>} />
          <Route path="/drawings" element={<ApprovalDrawingsIndex />} />
          <Route path="/instruksi" element={<InstruksiKerjaIndex />} />
          <Route path="/kendala" element={<KendalaIndex />} />
          <Route path="/agenda" element={<AgendaIndex />} />
          <Route path="/gis" element={<GisPage />} />
          <Route path="/reports" element={<ReportsIndex />} />
          <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="/organization" element={<Organization />} />
          <Route path="/security-matrix" element={<SecurityMatrix />} />
          <Route path="*" element={<Navigate to={DEFAULT_HOME} replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
