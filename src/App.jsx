import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectsIndex from './pages/ProjectsIndex.jsx';
import ProjectShow from './pages/ProjectShow.jsx';
import ProjectForm from './pages/ProjectForm.jsx';
import ProgressForm from './pages/ProgressForm.jsx';
import KendalaIndex from './pages/KendalaIndex.jsx';
import GisPage from './pages/GisPage.jsx';
import ReportsIndex from './pages/ReportsIndex.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { getUser } from './auth.js';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getUser()) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsIndex />} />
        <Route path="/projects/new" element={<ProjectForm />} />
        <Route path="/projects/:id" element={<ProjectShow />} />
        <Route path="/projects/:id/edit" element={<ProjectForm />} />
        <Route path="/projects/:id/progress" element={<ProgressForm />} />
        <Route path="/kendala" element={<KendalaIndex />} />
        <Route path="/gis" element={<GisPage />} />
        <Route path="/reports" element={<ReportsIndex />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}