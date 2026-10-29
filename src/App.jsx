import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { getUser, can, ROLE_HOME } from './auth.js';

// Halaman berat (chart, leaflet, parser Excel) dimuat sesuai kebutuhan supaya
// bundle awal kecil dan halaman pertama terbuka lebih cepat di jaringan lambat.
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ProjectsIndex = lazy(() => import('./pages/ProjectsIndex.jsx'));
const ProjectShow = lazy(() => import('./pages/ProjectShow.jsx'));
const ProjectForm = lazy(() => import('./pages/ProjectForm.jsx'));
const ProgressForm = lazy(() => import('./pages/ProgressForm.jsx'));
const KendalaIndex = lazy(() => import('./pages/KendalaIndex.jsx'));
const AgendaIndex = lazy(() => import('./pages/AgendaIndex.jsx'));
const GisPage = lazy(() => import('./pages/GisPage.jsx'));
const ReportsIndex = lazy(() => import('./pages/ReportsIndex.jsx'));
const ReportsPrint = lazy(() => import('./pages/ReportsPrint.jsx'));
const ApprovalDrawingsIndex = lazy(() => import('./pages/ApprovalDrawingsIndex.jsx'));
const InstruksiKerjaIndex = lazy(() => import('./pages/InstruksiKerjaIndex.jsx'));
const Users = lazy(() => import('./pages/Users.jsx'));

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
  if (!can('admin')) return <Navigate to="/" replace />;
  return children;
}

// Role dengan halaman khusus (staff → /agenda) tidak boleh membuka halaman lain.
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsIndex />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/projects/:id" element={<ProjectShow />} />
          <Route path="/projects/:id/edit" element={<ProjectForm />} />
          <Route path="/projects/:id/progress" element={<ProgressForm />} />
          <Route path="/drawings" element={<ApprovalDrawingsIndex />} />
          <Route path="/instruksi" element={<InstruksiKerjaIndex />} />
          <Route path="/kendala" element={<KendalaIndex />} />
          <Route path="/agenda" element={<AgendaIndex />} />
          <Route path="/gis" element={<GisPage />} />
          <Route path="/reports" element={<ReportsIndex />} />
          <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
          <Route path="*" element={<Dashboard />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
