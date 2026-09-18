import express from 'express';
import cors from 'cors';

import authRouter from '../server/routes/auth.js';
import dashboardRouter from '../server/routes/dashboard.js';
import projectsRouter from '../server/routes/projects.js';
import kendalaRouter from '../server/routes/kendala.js';
import reportsRouter from '../server/routes/reports.js';
import drawingsRouter from '../server/routes/drawings.js';
import gisRouter from '../server/routes/gis.js';
import agendaRouter from '../server/routes/agenda.js';
import usersRouter from '../server/routes/users.js';

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
app.use('/api', usersRouter);

// ---------- error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

export default app;
