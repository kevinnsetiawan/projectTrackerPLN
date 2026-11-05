import { query, withTransaction } from './db.js';

export const ACTIONS_BY_ROLE = {
  vendor: ['read','project_write','progress','kendala_create','drawing_upload','ik_write'],
  dalkon: ['read','project_write','project_delete','progress','agenda_write','kendala_create','kendala_delete','drawing_dalkon','ik_write','ik_ultg','termin_write','amandemen_write'],
  enjin: ['read','kendala_write','drawing_enjin','ik_upt'],
  staff: ['read'],
  admin: ['read','project_write','project_delete','progress','agenda_write','kendala_create','kendala_write','kendala_delete','drawing_upload','drawing_delete','ik_write','termin_write','amandemen_write','user_manage','security_matrix'],
};
const actions = ACTIONS_BY_ROLE;
const error = (message, status = 403) => Object.assign(new Error(message), { status });
export { withTransaction };
export function canInUnit(req, unit, action) {
  if (!unit || !req.context || req.context.mode !== 'unit') return false;
  const membership = req.memberships.find(m => Number(m.unit_id) === Number(unit.id));
  if (!membership) return false;
  if (unit.kind === 'unit_induk') return action === 'read' || (membership.role === 'admin' && ['ik_induk','unit_manage','membership_manage','security_matrix','user_manage','agenda_write'].includes(action));
  return (actions[membership.role] || []).includes(action);
}
export function getCapabilities(req) {
  const names = [...new Set(Object.values(actions).flat().concat(['ik_induk','unit_manage','membership_manage','security_matrix']))];
  const central = req.user?.is_superadmin || (req.context?.mode==='unit' && req.context.unit.kind==='unit_induk' && req.context.role==='admin') || (req.context?.mode==='all' && req.memberships?.some(m=>m.unit.kind==='unit_induk' && m.role==='admin'));
  return Object.fromEntries(names.map(a => [a, canInUnit(req, req.context?.unit, a) || (req.context?.mode==='all' && a==='read') || (central && ['user_manage','unit_manage','membership_manage','security_matrix'].includes(a))]));
}
export function requireCapability(action) {
  return (req,res,next) => getCapabilities(req)[action] ? next() : res.status(403).json({error:'Akses ditolak.'});
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
  const memberships = (await q(`SELECT m.unit_id,m.role,u.id,u.code,u.name,u.kind,u.parent_id,u.active FROM unit_memberships m JOIN units u ON u.id=m.unit_id WHERE m.user_id=$1 AND m.active=true AND u.active=true AND NOT (u.kind='unit_induk' AND m.role='vendor')`, [user.id])).rows.map(r => ({unit_id:r.unit_id,role:r.role,unit:{id:r.id,code:r.code,name:r.name,kind:r.kind,parent_id:r.parent_id,active:r.active}}));
  return {user:{...user,sub:user.id}, memberships};
}
export async function resolveScope(req, q = query) {
  const header = req.headers?.['x-unit-id'];
  const param = req.query?.unit;
  if (header && param && String(header) !== String(param)) throw error('Konteks unit bertentangan.',400);
  const selected = header || param;
  if (!selected) return {mode:'none',unit_id:null,unit:null,role:null};
  if (selected === 'all') {
    if (!req.memberships.some(m => m.unit.kind === 'unit_induk')) throw error('Akses ditolak.');
    return {mode:'all',unit_id:null,unit:null,role:null};
  }
  const member = req.memberships.find(m => String(m.unit_id) === String(selected));
  if (!member) throw error('Akses unit ditolak.');
  return {mode:'unit',unit_id:member.unit_id,unit:member.unit,role:member.role};
}
export async function refreshIdentity(req, q = query) {
  const identity = await loadIdentity(req.tokenPayload, q);
  if (!identity) throw error('Sesi tidak berlaku.',401);
  Object.assign(req, identity);
  req.context = await resolveScope(req,q);
  req.user.role = req.context.role;
  return identity;
}
export function projectScope(req, alias='p', start=1) {
  if (req.context?.mode === 'all') {
    const parents = req.memberships.filter(m=>m.unit.kind==='unit_induk').map(m=>m.unit_id);
    return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id = ANY($${start}::int[]) AND active=true)`,params:[parents]};
  }
  if (req.context?.mode !== 'unit') return {sql:'FALSE',params:[]};
  const {unit,role} = req.context;
  if (unit.kind === 'unit_induk') return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id=$${start} AND active=true)`,params:[unit.id]};
  if (role === 'vendor') return {sql:`${alias}.unit_id=$${start} AND EXISTS (SELECT 1 FROM vendor_project_assignments vpa WHERE vpa.project_id=${alias}.id AND vpa.unit_id=${alias}.unit_id AND vpa.user_id=$${start+1})`,params:[unit.id,req.user.id]};
  return {sql:`${alias}.unit_id=$${start}`,params:[unit.id]};
}
export async function assertProject(req,id,action='read',db=query) {
  const scope = projectScope(req,'p',2);
  const {rows} = await db(`SELECT p.* FROM projects p WHERE p.id=$1 AND (${scope.sql})`,[id,...scope.params]);
  if (!rows.length) throw error('Proyek tidak ditemukan.',404);
  if (action !== 'read') {
    if (req.context?.unit?.kind === 'unit_induk') {
      if (action !== 'ik_induk' || req.context.role !== 'admin') throw error('Akses ditolak.');
    } else if (!canInUnit(req,req.context?.unit,action)) throw error('Akses ditolak.');
  }
  return rows[0];
}
const childTables = new Set(['lokasis','milestones','s_curves','kendalas','dokumentasis','termin_bayars','s_curve_documents','boqs','boq_groups','approval_drawings','instruksi_kerja','amandements']);
export async function assertChild(req,table,id,action='read') {
  if (table === 'ik_approvals') {
    const {rows} = await query('SELECT a.*, i.project_id, p.unit_id FROM ik_approvals a JOIN instruksi_kerja i ON i.id=a.instruksi_id JOIN projects p ON p.id=i.project_id WHERE a.id=$1',[id]);
    if (!rows.length) throw error('Data tidak ditemukan.',404);
    await assertProject(req,rows[0].project_id,action);
    return rows[0];
  }
  if (!childTables.has(table)) throw error('Tabel tidak valid.',400);
  const {rows} = await query(`SELECT c.*, p.unit_id FROM ${table} c JOIN projects p ON p.id=c.project_id WHERE c.id=$1`,[id]);
  if (!rows.length) throw error('Data tidak ditemukan.',404);
  await assertProject(req,rows[0].project_id,action);
  return rows[0];
}
export function agendaScope(req,alias='a',start=1) {
  if (req.context?.mode === 'all') return {sql:`${alias}.unit_id IN (SELECT id FROM units WHERE parent_id = ANY($${start}::int[]) AND active=true)`,params:[req.memberships.filter(m=>m.unit.kind==='unit_induk').map(m=>m.unit_id)]};
  if (req.context?.mode !== 'unit') return {sql:'FALSE',params:[]};
  if (req.context.unit.kind === 'unit_induk') return {sql:`(${alias}.unit_id=$${start} OR ${alias}.unit_id IN (SELECT id FROM units WHERE parent_id=$${start} AND active=true))`,params:[req.context.unit_id]};
  if (req.context.role === 'vendor') return {sql:`${alias}.unit_id=$${start} AND ${alias}.project_id IN (SELECT project_id FROM vendor_project_assignments WHERE user_id=$${start+1} AND unit_id=$${start})`,params:[req.context.unit_id,req.user.id]};
  return {sql:`${alias}.unit_id=$${start}`,params:[req.context.unit_id]};
}
export async function assertAgenda(req,id,action='read') {
  const scope=agendaScope(req,'a',2); const {rows}=await query(`SELECT a.* FROM agendas a WHERE a.id=$1 AND (${scope.sql})`,[id,...scope.params]);
  if (!rows.length) throw error('Agenda tidak ditemukan.',404);
  if (action !== 'read' && (Number(rows[0].unit_id)!==Number(req.context.unit_id) || !canInUnit(req,req.context.unit,action))) throw error('Akses ditolak.');
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
    if (event.topic === 'users') return req.context.mode === 'unit' && Number(req.context.unit_id) === Number(event.unit_id) && canInUnit(req,req.context.unit,'user_manage');
    if (event.project_id) {
      try { await assertProject(req,event.project_id); return true; }
      catch {
        if (event.action !== 'delete' || !event.unit_id) return false;
        if (req.context.mode==='unit' && Number(req.context.unit_id)===Number(event.unit_id)) return req.context.role!=='vendor' || (event.audience_vendor_ids || []).map(Number).includes(Number(req.user.id));
        const parents=req.context.mode==='all' ? req.memberships.filter(m=>m.unit.kind==='unit_induk').map(m=>m.unit_id) : req.context.unit?.kind==='unit_induk' ? [req.context.unit_id] : [];
        if (!parents.length) return false;
        return (await query('SELECT 1 FROM units WHERE id=$1 AND parent_id = ANY($2::int[]) AND active=true',[event.unit_id,parents])).rows.length>0;
      }
    }
    if (!event.unit_id) return false;
    if (req.context.role === 'vendor') return false;
    const scope=agendaScope(req,'a',1);
    return (await query(`SELECT 1 FROM agendas a WHERE a.unit_id=$${scope.params.length+1} AND (${scope.sql}) LIMIT 1`,[...scope.params,event.unit_id])).rows.length>0 || (req.context.mode==='unit' && Number(req.context.unit_id)===Number(event.unit_id) && req.context.role!=='vendor');
  } catch { return false; }
}
