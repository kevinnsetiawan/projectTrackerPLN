import { query, withTransaction } from './db.js';
import { ACTION_CATALOG, MODULE_READ_ACTIONS, validatePolicyMatrix } from './policy.js';

export const ACTIONS_BY_ROLE = {
  vendor: ['read','project_write','progress','kendala_create','drawing_upload','ik_write'],
  dalkon: ['read','project_write','project_delete','progress','agenda_write','kendala_create','kendala_delete','drawing_dalkon','ik_write','ik_ultg','termin_write','amandemen_write'],
  enjin: ['read','kendala_write','drawing_enjin','ik_upt'],
  asman: ['read','project_write','project_delete','progress','agenda_write','kendala_create','kendala_write','kendala_delete','drawing_upload','drawing_delete','ik_write','ik_upt','termin_write','amandemen_write'],
  logistik: ['read','agenda_write'],
  staff: ['read'],
  admin: ['read','project_write','project_delete','progress','agenda_write','kendala_create','kendala_write','kendala_delete','drawing_upload','drawing_delete','ik_write','termin_write','amandemen_write','user_manage','security_matrix'],
};
const error = (message, status = 403) => Object.assign(new Error(message), { status });
const WRITE_READ_REQUIREMENTS = {
  project_write: 'projects_read', project_delete: 'projects_read', progress: 'projects_read',
  agenda_write: 'agenda_read', kendala_create: 'kendala_read', kendala_write: 'kendala_read', kendala_delete: 'kendala_read',
  drawing_upload: 'drawings_read', drawing_delete: 'drawings_read', drawing_dalkon: 'drawings_read', drawing_enjin: 'drawings_read',
  ik_write: 'instruksi_read', ik_ultg: 'instruksi_read', ik_upt: 'instruksi_read', ik_induk: 'instruksi_read',
  termin_write: 'projects_read', amandemen_write: 'projects_read',
};
export const MODULE_READ = Object.fromEntries(MODULE_READ_ACTIONS.map(action => [action.replace(/_read$/, ''), action]));
export async function loadSecurityPolicies(q = query) {
  const rows = (await q('SELECT unit_kind,revision,matrix FROM security_matrix_policies ORDER BY unit_kind')).rows;
  const result = {};
  for (const row of rows) {
    if (!['upt', 'unit_induk'].includes(row.unit_kind) || !Number.isInteger(Number(row.revision)) || Number(row.revision) < 1) throw error('Policy keamanan tidak valid.', 503);
    try { result[row.unit_kind] = validatePolicyMatrix(row.unit_kind, typeof row.matrix === 'string' ? JSON.parse(row.matrix) : row.matrix); }
    catch { throw error('Policy keamanan tidak valid.', 503); }
  }
  if (!result.upt || !result.unit_induk) throw error('Policy keamanan belum lengkap.', 503);
  return { matrices: result, revisions: Object.fromEntries(rows.map(row => [row.unit_kind, Number(row.revision)])) };
}
function matrixFor(req, unit) {
  const kind = unit?.kind;
  return req.securityPolicies?.matrices?.[kind] || null;
}
function policyAllows(req, unit, action, role = req.context?.role) {
  const matrix = matrixFor(req, unit);
  return Boolean(matrix && role && Array.isArray(matrix[role]) && matrix[role].includes(action));
}
export { withTransaction };
export function canInUnit(req, unit, action) {
  if (!unit || !req.context || req.context.mode !== 'unit') return false;
  const membership = req.memberships.find(m => Number(m.unit_id) === Number(unit.id));
  if (!membership) return false;
  if (unit.kind === 'unit_induk') {
    if (action === 'read' || MODULE_READ_ACTIONS.includes(action) || action === 'reports_export') return policyAllows(req, unit, action);
    if (['unit_manage', 'membership_manage', 'security_matrix', 'user_manage'].includes(action)) return membership.role === 'admin' && policyAllows(req, unit, action);
    return ['ik_induk', 'agenda_write'].includes(action) && policyAllows(req, unit, action);
  }
  return policyAllows(req, unit, action);
}
export function getCapabilities(req) {
  const names = [...new Set(ACTION_CATALOG)];
  const central = req.user?.is_superadmin || (req.context?.mode==='unit' && req.context.unit.kind==='unit_induk' && req.context.role==='admin') || (req.context?.mode==='all' && req.memberships?.some(m=>m.unit.kind==='unit_induk' && m.role==='admin'));
  const monitorRead = req.context?.mode === 'all' || (req.user?.is_superadmin && req.context?.mode === 'unit');
  const monitorAllows = action => {
    if (!monitorRead) return false;
    if (req.user?.is_superadmin) return action === 'read' || MODULE_READ_ACTIONS.includes(action) || action === 'reports_export';
    return (req.memberships || []).filter(m => m.unit?.kind === 'unit_induk').some(m => policyAllows(req, m.unit, action, m.role));
  };
  return Object.fromEntries(names.map(a => [a, canInUnit(req, req.context?.unit, a) || monitorAllows(a) || (central && ['user_manage','unit_manage','membership_manage','security_matrix'].includes(a))]));
}
export function requireCapability(action) {
  return (req,res,next) => {
    const capabilities = getCapabilities(req);
    const requiredRead = WRITE_READ_REQUIREMENTS[action];
    if (capabilities[action] && (!requiredRead || capabilities[requiredRead])) return next();
    return res.status(403).json({error:'Akses ditolak.'});
  };
}
export function requireModuleRead(module) { return requireCapability(MODULE_READ[module] || `${module}_read`); }
export function canReadProjectUnit(req, unitRow, action = 'read') {
  if (req.user?.is_superadmin) return true;
  const readAction = action === 'read' ? 'projects_read' : (action.endsWith('_read') ? action : WRITE_READ_REQUIREMENTS[action] || 'projects_read');
  const targetUnitId = Number(unitRow?.unit_id);
  const targetKind = unitRow?.kind || unitRow?.unit_kind;
  const parentId = Number(unitRow?.parent_id);
  if (!Number.isSafeInteger(targetUnitId) || !targetKind) return false;
  if (req.context?.mode === 'unit') {
    const membership = req.memberships?.find(m => Number(m.unit_id) === Number(req.context.unit_id));
    if (!membership) return false;
    if (targetKind === 'upt' && Number(req.context.unit_id) === targetUnitId) return policyAllows(req, req.context.unit, readAction, membership.role);
    return req.context.unit?.kind === 'unit_induk' && targetKind === 'upt' && parentId === Number(req.context.unit_id) && policyAllows(req, req.context.unit, readAction, membership.role);
  }
  if (req.context?.mode === 'all') {
    if (targetKind !== 'upt') return false;
    return (req.memberships || []).filter(m => m.unit?.kind === 'unit_induk' && Number(m.unit_id) === parentId).some(m => policyAllows(req, m.unit, readAction, m.role));
  }
  return false;
}
export function requireUnitContext(req,res,next) {
  if (!req.context || req.context.mode !== 'unit') return res.status(403).json({error:'Pilih unit terlebih dahulu.'});
  next();
}
export async function loadIdentity(payload, q = query) {
  if (!payload || !Number.isInteger(payload.av) || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now()/1000)) return null;
  const {rows} = await q('SELECT id,nama,email,active,auth_version,is_superadmin FROM users WHERE id=$1', [payload.sub]);
  const user = rows[0];
  if (!user || !user.active || user.auth_version !== payload.av) return null;
  const memberships = (await q(`SELECT m.unit_id,m.role,m.jabatan,u.id,u.code,u.name,u.kind,u.parent_id,u.active FROM unit_memberships m JOIN units u ON u.id=m.unit_id WHERE m.user_id=$1 AND m.active=true AND u.active=true AND NOT (u.kind='unit_induk' AND m.role='vendor')`, [user.id])).rows.map(r => ({unit_id:r.unit_id,role:r.role,jabatan:r.jabatan ?? null,unit:{id:r.id,code:r.code,name:r.name,kind:r.kind,parent_id:r.parent_id,active:r.active}}));
  const selectable_units = user.is_superadmin
    ? (await q(`SELECT id,code,name,kind,parent_id,active FROM units WHERE active=true ORDER BY kind,name,id`)).rows
    : memberships.map(m => m.unit);
  return {user:{...user,sub:user.id}, memberships, selectable_units};
}
export async function resolveScope(req, q = query) {
  const header = req.headers?.['x-unit-id'];
  const param = req.query?.unit;
  if (header && param && String(header) !== String(param)) throw error('Konteks unit bertentangan.',400);
  const selected = header || param;
  if (!selected) return {mode:'none',unit_id:null,unit:null,role:null,jabatan:null};
  if (selected === 'all') {
    if (!req.user?.is_superadmin && !req.memberships.some(m => m.unit.kind === 'unit_induk')) throw error('Akses ditolak.');
    return {mode:'all',unit_id:null,unit:null,role:null,jabatan:null};
  }
  const member = req.memberships.find(m => String(m.unit_id) === String(selected));
  if (member) return {mode:'unit',unit_id:member.unit_id,unit:member.unit,role:member.role,jabatan:member.jabatan ?? null};
  if (req.user?.is_superadmin) {
    const unit = req.selectable_units?.find(u => String(u.id) === String(selected));
    if (unit) return {mode:'unit',unit_id:unit.id,unit,role:null,jabatan:null};
  }
  throw error('Akses unit ditolak.');
}
export async function refreshIdentity(req, q = query) {
  const identity = await loadIdentity(req.tokenPayload, q);
  if (!identity) throw error('Sesi tidak berlaku.',401);
  Object.assign(req, identity);
  req.context = await resolveScope(req,q);
  req.securityPolicies = await loadSecurityPolicies(q);
  req.user.role = req.context.role;
  return identity;
}
export function projectScope(req, alias='p', start=1, readAction='projects_read') {
  if (req.context?.mode === 'all') {
    if (req.user?.is_superadmin) return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE kind='upt' AND active=true)`,params:[]};
    const parents = req.memberships.filter(m=>m.unit.kind==='unit_induk' && policyAllows(req,m.unit,readAction,m.role)).map(m=>m.unit_id);
    return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id = ANY($${start}::int[]) AND active=true)`,params:[parents]};
  }
  if (req.context?.mode !== 'unit') return {sql:'FALSE',params:[]};
  const {unit,role} = req.context;
  if (req.user?.is_superadmin) {
    if (unit.kind === 'unit_induk') return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE kind='upt' AND parent_id=$${start} AND active=true)`,params:[unit.id]};
    return {sql:`${alias}.unit_id=$${start}`,params:[unit.id]};
  }
  if (!policyAllows(req, unit, readAction, role)) return {sql:'FALSE',params:[]};
  if (unit.kind === 'unit_induk') return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id=$${start} AND active=true)`,params:[unit.id]};
  if (role === 'vendor') return {sql:`${alias}.unit_id=$${start} AND EXISTS (SELECT 1 FROM vendor_project_assignments vpa WHERE vpa.project_id=${alias}.id AND vpa.unit_id=${alias}.unit_id AND vpa.user_id=$${start+1})`,params:[unit.id,req.user.id]};
  return {sql:`${alias}.unit_id=$${start}`,params:[unit.id]};
}
// Master GI is reference data: vendor visibility is limited by UPT, not project assignment.
export function giScope(req, alias='g', start=1) {
  // Root may inspect the control-plane GI master before selecting an operational unit.
  if (req.user?.is_superadmin && req.context?.mode === 'none') return {sql:'TRUE',params:[]};
  if (req.context?.mode === 'all') {
    if (req.user?.is_superadmin) return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE kind='upt' AND active=true)`,params:[]};
    const parents=req.memberships.filter(m=>m.unit.kind==='unit_induk' && policyAllows(req,m.unit,'gardu_induk_read',m.role)).map(m=>m.unit_id);
    return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id = ANY($${start}::int[]) AND active=true)`,params:[parents]};
  }
  if (req.context?.mode !== 'unit') return {sql:'FALSE',params:[]};
  if (req.user?.is_superadmin && req.context.unit.kind === 'unit_induk') return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE kind='upt' AND parent_id=$${start} AND active=true)`,params:[req.context.unit_id]};
  if (req.user?.is_superadmin) return {sql:`${alias}.unit_id=$${start}`,params:[req.context.unit_id]};
  if (!policyAllows(req, req.context.unit, 'gardu_induk_read')) return {sql:'FALSE',params:[]};
  if (req.context.unit.kind === 'unit_induk') return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id=$${start} AND active=true)`,params:[req.context.unit_id]};
  return {sql:`${alias}.unit_id=$${start}`,params:[req.context.unit_id]};
}
export async function assertGarduInduk(req, id, {projectUnitId, allowInactiveId} = {}, q=query) {
  const validId=value=>(typeof value==='number' || (typeof value==='string' && /^[1-9]\d*$/.test(value))) && Number.isSafeInteger(Number(value)) && Number(value)>0;
  const giId=Number(id), unitId=Number(projectUnitId);
  if (!validId(id) || !validId(projectUnitId)) throw error('Gardu induk tidak valid.',400);
  const ownProjectWrite = req.context?.mode === 'unit' && req.context.unit?.kind === 'upt'
    && Number(req.context.unit_id) === unitId && canInUnit(req, req.context.unit, 'project_write');
  const scope=ownProjectWrite ? {sql:'TRUE',params:[]} : giScope(req,'g',3);
  const {rows}=await q(`SELECT g.* FROM gardu_induk g WHERE g.id=$1 AND g.unit_id=$2 AND (${scope.sql}) FOR SHARE`,[giId,unitId,...scope.params]);
  const allowed=Array.isArray(allowInactiveId) ? allowInactiveId : allowInactiveId instanceof Set ? [...allowInactiveId] : [allowInactiveId];
  if (!rows.length || (!rows[0].active && !allowed.some(value=>Number(value)===giId))) throw error('Gardu induk tidak ditemukan.',404);
  return rows[0];
}
export async function assertProject(req,id,action='read',db=query) {
  const readAction = action === 'read' ? 'projects_read' : (action.endsWith('_read') ? action : WRITE_READ_REQUIREMENTS[action] || 'projects_read');
  const scope = projectScope(req,'p',2,readAction);
  const {rows} = await db(`SELECT p.* FROM projects p WHERE p.id=$1 AND (${scope.sql})`,[id,...scope.params]);
  if (!rows.length) throw error('Proyek tidak ditemukan.',404);
  if (action !== 'read' && !action.endsWith('_read')) {
    if (req.context?.mode !== 'unit' || !req.context.unit_id) throw error('Akses ditolak.');
    if (req.context.role === 'vendor') {
      const assigned = await db('SELECT 1 FROM vendor_project_assignments WHERE project_id=$1 AND user_id=$2 AND unit_id=$3', [rows[0].id, req.user.id, rows[0].unit_id]);
      if (!assigned.rows.length) throw error('Akses ditolak.');
    }
    if (req.context?.unit?.kind === 'unit_induk') {
      if (action !== 'ik_induk' || !canInUnit(req, req.context.unit, action)) throw error('Akses ditolak.');
    } else if (!canInUnit(req,req.context?.unit,action)) throw error('Akses ditolak.');
  }
  return rows[0];
}
const childTables = new Set(['lokasis','milestones','s_curves','kendalas','dokumentasis','termin_bayars','s_curve_documents','boqs','boq_groups','approval_drawings','instruksi_kerja','amandements']);
export async function assertChild(req,table,id,action='read') {
  const tableRead = {
    instruksi_kerja: 'instruksi_read', ik_approvals: 'instruksi_read', approval_drawings: 'drawings_read',
    kendalas: 'kendala_read', dokumentasis: 'projects_read', s_curve_documents: 'projects_read',
  }[table] || 'projects_read';
  const effectiveAction = action === 'read' ? tableRead : action;
  if (table === 'ik_approvals') {
    const {rows} = await query('SELECT a.*, i.project_id, p.unit_id FROM ik_approvals a JOIN instruksi_kerja i ON i.id=a.instruksi_id JOIN projects p ON p.id=i.project_id WHERE a.id=$1',[id]);
    if (!rows.length) throw error('Data tidak ditemukan.',404);
    await assertProject(req,rows[0].project_id,effectiveAction);
    return rows[0];
  }
  if (!childTables.has(table)) throw error('Tabel tidak valid.',400);
  const {rows} = await query(`SELECT c.*, p.unit_id FROM ${table} c JOIN projects p ON p.id=c.project_id WHERE c.id=$1`,[id]);
  if (!rows.length) throw error('Data tidak ditemukan.',404);
  await assertProject(req,rows[0].project_id,effectiveAction);
  return rows[0];
}
export function agendaScope(req,alias='a',start=1) {
  if (req.context?.mode === 'all') {
    if (req.user?.is_superadmin) return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE active=true)`,params:[]};
    return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id = ANY($${start}::int[]) AND active=true)`,params:[req.memberships.filter(m=>m.unit.kind==='unit_induk' && policyAllows(req,m.unit,'agenda_read',m.role)).map(m=>m.unit_id)]};
  }
  if (req.context?.mode !== 'unit') return {sql:'FALSE',params:[]};
  if (req.user?.is_superadmin) {
    if (req.context.unit.kind === 'unit_induk') return {sql:`(${alias}.unit_id=$${start} OR ${alias}.unit_id IN (SELECT id FROM units WHERE kind='upt' AND parent_id=$${start} AND active=true))`,params:[req.context.unit_id]};
    return {sql:`${alias}.unit_id=$${start}`,params:[req.context.unit_id]};
  }
  if (!policyAllows(req, req.context.unit, 'agenda_read')) return {sql:'FALSE',params:[]};
  if (req.context.unit.kind === 'unit_induk') return {sql:`(${alias}.unit_id=$${start} OR ${alias}.unit_id IN (SELECT id FROM units WHERE parent_id=$${start} AND active=true))`,params:[req.context.unit_id]};
  if (req.context.role === 'vendor') return {sql:`${alias}.unit_id=$${start} AND ${alias}.project_id IN (SELECT project_id FROM vendor_project_assignments WHERE user_id=$${start+1} AND unit_id=$${start})`,params:[req.context.unit_id,req.user.id]};
  return {sql:`${alias}.unit_id=$${start}`,params:[req.context.unit_id]};
}
export async function assertAgenda(req,id,action='read') {
  const scope=agendaScope(req,'a',2); const {rows}=await query(`SELECT a.* FROM agendas a WHERE a.id=$1 AND (${scope.sql})`,[id,...scope.params]);
  if (!rows.length) throw error('Agenda tidak ditemukan.',404);
  if (action !== 'read' && (req.context?.mode !== 'unit' || Number(rows[0].unit_id)!==Number(req.context.unit_id) || !canInUnit(req,req.context.unit,action))) throw error('Akses ditolak.');
  return rows[0];
}
export async function assertPic(req,id,unitId=req.context.unit_id,projectId=null,q=query) {
  if (!id) return;
  const {rows}=await q(`SELECT 1 FROM unit_memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.unit_id=$2 AND m.active=true AND u.active=true AND (m.role <> 'vendor' OR ($3::int IS NOT NULL AND EXISTS (SELECT 1 FROM vendor_project_assignments v WHERE v.project_id=$3 AND v.user_id=m.user_id AND v.unit_id=m.unit_id)))`,[id,unitId,projectId]);
  if (!rows.length) throw error('PIC tidak berada di unit ini.',400);
}
export async function assignVendorToProject(req,pid,q=query) {
  if (req.context.role === 'vendor') await q('INSERT INTO vendor_project_assignments (project_id,user_id,unit_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[pid,req.user.id,req.context.unit_id]);
}
export async function canEvent(req,event) {
  try {
    await refreshIdentity(req);
    if (event.topic === 'policy') {
      if (req.user?.is_superadmin) return true;
      if (req.context.mode === 'all') return req.memberships.some(m => m.unit.kind === event.unit_kind);
      return req.context.mode === 'unit' && req.context.unit?.kind === event.unit_kind;
    }
    if (event.topic === 'users') return req.context.mode === 'unit' && Number(req.context.unit_id) === Number(event.unit_id) && canInUnit(req,req.context.unit,'user_manage');
    const eventReadAction = { projects:'projects_read', progress:'projects_read', milestones:'projects_read', kurva:'projects_read', termins:'projects_read', boq:'projects_read', amandemen:'projects_read', kendala:'kendala_read', dokumentasi:'projects_read', drawing:'drawings_read', instruksi:'instruksi_read' }[event.topic] || 'projects_read';
    if (event.project_id) {
      try { await assertProject(req,event.project_id,eventReadAction); return true; }
      catch {
        if (event.action !== 'delete' || !event.unit_id) return false;
        if (req.user?.is_superadmin) {
          if (req.context.mode === 'all') return (await query('SELECT 1 FROM units WHERE id=$1 AND active=true', [event.unit_id])).rows.length > 0;
          if (req.context.mode === 'unit') {
            if (Number(req.context.unit_id) === Number(event.unit_id)) return true;
            if (req.context.unit?.kind === 'unit_induk') return (await query('SELECT 1 FROM units WHERE id=$1 AND parent_id=$2 AND active=true', [event.unit_id, req.context.unit_id])).rows.length > 0;
          }
          return false;
        }
        if (req.context.mode==='unit' && Number(req.context.unit_id)===Number(event.unit_id)) return canInUnit(req,req.context.unit,eventReadAction) && (req.context.role!=='vendor' || (event.audience_vendor_ids || []).map(Number).includes(Number(req.user.id)));
        const parents=req.context.mode==='all' ? req.memberships.filter(m=>m.unit.kind==='unit_induk' && policyAllows(req,m.unit,eventReadAction,m.role)).map(m=>m.unit_id) : req.context.unit?.kind==='unit_induk' && policyAllows(req,req.context.unit,eventReadAction) ? [req.context.unit_id] : [];
        if (!parents.length) return false;
        return (await query('SELECT 1 FROM units WHERE id=$1 AND parent_id = ANY($2::int[]) AND active=true',[event.unit_id,parents])).rows.length>0;
      }
    }
    if (!event.unit_id) return false;
    if (req.context.role === 'vendor') return false;
    const scope=agendaScope(req,'a',1);
    return (await query(`SELECT 1 FROM agendas a WHERE a.unit_id=$${scope.params.length+1} AND (${scope.sql}) LIMIT 1`,[...scope.params,event.unit_id])).rows.length>0
      || (req.user?.is_superadmin && req.context.mode==='all' && (await query('SELECT 1 FROM units WHERE id=$1 AND active=true',[event.unit_id])).rows.length>0)
      || (req.user?.is_superadmin && req.context.mode==='unit' && req.context.unit?.kind==='unit_induk' && (await query('SELECT 1 FROM units WHERE id=$1 AND parent_id=$2 AND active=true',[event.unit_id,req.context.unit_id])).rows.length>0)
      || (req.context.mode==='unit' && Number(req.context.unit_id)===Number(event.unit_id) && req.context.role!=='vendor');
  } catch { return false; }
}
