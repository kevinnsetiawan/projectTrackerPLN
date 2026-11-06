import { Router } from 'express';
import { query } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { projectScope, agendaScope, getCapabilities } from '../_lib/scope.js';
import { attachClient, clientCount } from '../_lib/events.js';
import { asyncHandler } from '../_lib/http.js';

const router = Router();
const PROJECT_TABLES = ['milestones', 's_curves', 'kendalas', 'dokumentasis',
  'termin_bayars', 's_curve_documents', 'boqs', 'boq_groups', 'approval_drawings',
  'instruksi_kerja', 'amandements'];

router.get('/events/stream', requireAuth, asyncHandler(async (req, res) => {
  const topics = String(req.query.topics || '').split(',').map(s => s.trim()).filter(Boolean);
  attachClient(req, res, req.user, topics.length ? new Set(topics) : null);
}));

router.get('/events/peers', requireAuth, (req, res) => {
  res.json({ peers: clientCount(req) });
});

// Revision queries use the predicates of their corresponding REST endpoints.
// No cache or pending promise is shared between permission contexts.
router.get('/events/rev', requireAuth, asyncHandler(async (req, res) => {
  const capabilities = getCapabilities(req);
  const scope = projectScope(req, 'p', 1, 'projects_read');
  const agenda = agendaScope(req, 'a');
  const manageUsers = getCapabilities(req).user_manage;
  const localAdmin = manageUsers && !req.user.is_superadmin && req.context.mode === 'unit' && req.context.unit.kind === 'upt';
  const userPredicate = !manageUsers ? 'u.id=$1' : localAdmin
    ? 'EXISTS (SELECT 1 FROM unit_memberships m WHERE m.user_id=u.id AND m.unit_id=$1)'
    : 'TRUE';
  const userParams = !manageUsers ? [req.user.id] : localAdmin ? [req.context.unit_id] : [];
  const jobs = [];
  if (capabilities.projects_read) {
    jobs.push(['projects', `SELECT COUNT(*)::int AS c,MAX(p.updated_at) AS u FROM projects p WHERE ${scope.sql}`, scope.params]);
  }
  if (capabilities.projects_read) {
    for (const t of PROJECT_TABLES.filter((name) => !['kendalas', 'approval_drawings', 'instruksi_kerja'].includes(name))) {
      jobs.push([t, `SELECT COUNT(*)::int AS c,MAX(c.updated_at) AS u FROM ${t} c JOIN projects p ON p.id=c.project_id WHERE ${scope.sql}`, scope.params]);
    }
  }
  if (capabilities.kendala_read) jobs.push(['kendalas', `SELECT COUNT(*)::int AS c,MAX(c.updated_at) AS u FROM kendalas c JOIN projects p ON p.id=c.project_id WHERE ${projectScope(req, 'p', 1, 'kendala_read').sql}`, projectScope(req, 'p', 1, 'kendala_read').params]);
  if (capabilities.drawings_read) jobs.push(['approval_drawings', `SELECT COUNT(*)::int AS c,MAX(c.updated_at) AS u FROM approval_drawings c JOIN projects p ON p.id=c.project_id WHERE ${projectScope(req, 'p', 1, 'drawings_read').sql}`, projectScope(req, 'p', 1, 'drawings_read').params]);
  if (capabilities.instruksi_read) jobs.push(['instruksi_kerja', `SELECT COUNT(*)::int AS c,MAX(c.updated_at) AS u FROM instruksi_kerja c JOIN projects p ON p.id=c.project_id WHERE ${projectScope(req, 'p', 1, 'instruksi_read').sql}`, projectScope(req, 'p', 1, 'instruksi_read').params]);
  if (capabilities.instruksi_read) jobs.push(['ik_approvals', `SELECT COUNT(*)::int AS c,MAX(c.updated_at) AS u FROM ik_approvals c JOIN instruksi_kerja i ON i.id=c.instruksi_id JOIN projects p ON p.id=i.project_id WHERE ${projectScope(req, 'p', 1, 'instruksi_read').sql}`, projectScope(req, 'p', 1, 'instruksi_read').params]);
  if (capabilities.agenda_read) jobs.push(['agendas', `SELECT COUNT(*)::int AS c,MAX(a.updated_at) AS u FROM agendas a WHERE ${agenda.sql}`, agenda.params]);
  jobs.push(['users', `SELECT COUNT(*)::int AS c,MAX(u.updated_at) AS u,COALESCE(SUM(u.auth_version),0)::text AS version FROM users u WHERE ${userPredicate}`, userParams]);
  const tables = {};
  await Promise.all(jobs.map(async ([name, sql, params]) => {
    const r = (await query(sql, params)).rows[0];
    tables[name] = `${r.c}:${r.u ? new Date(r.u).getTime() : 0}${r.version === undefined ? '' : ':' + r.version}`;
  }));
  tables.policy = Object.entries(req.securityPolicies?.revisions || {}).map(([kind, revision]) => `${kind}:${revision}`).join(',');
  res.json({ tables, peers: clientCount(req) });
}));

export default router;
