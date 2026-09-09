import express from 'express';
import cors from 'cors';

import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import projectsRouter from './routes/projects.js';
import kendalaRouter from './routes/kendala.js';
import reportsRouter from './routes/reports.js';
import drawingsRouter from './routes/drawings.js';
import gisRouter from './routes/gis.js';
import agendaRouter from './routes/agenda.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Mount routers (in order of specificity).
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api', projectsRouter);
app.use('/api', kendalaRouter);
app.use('/api', drawingsRouter);
app.use('/api', reportsRouter);
app.use('/api', gisRouter);
app.use('/api', agendaRouter);

// ---------- error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
