import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProjectsIndex from './pages/ProjectsIndex.jsx';
import ProjectShow from './pages/ProjectShow.jsx';
import ProjectForm from './pages/ProjectForm.jsx';
import ProgressForm from './pages/ProgressForm.jsx';
import KendalaIndex from './pages/KendalaIndex.jsx';
import GisPage from './pages/GisPage.jsx';
import ReportsIndex from './pages/ReportsIndex.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
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