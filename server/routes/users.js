import { Router } from 'express';
import { query, withTransaction } from '../_lib/db.js';
import { hashPassword, ROLES, ROLE_LABELS } from '../_lib/auth.js';
import { asyncHandler, err } from '../_lib/http.js';
import { assertProject, getCapabilities, refreshIdentity, requireCapability } from '../_lib/scope.js';
import { broadcast, TOPIC } from '../_lib/events.js';
import { ACTION_CATALOG, ACTION_LABELS, POLICY_CATALOG, POLICY_GROUPS, lockedCells, validatePolicyMatrix } from '../_lib/policy.js';

const router=Router();
const control = req => req.user.is_superadmin || (req.context.mode==='unit' && req.context.unit.kind==='unit_induk' && req.context.role==='admin') || (req.context.mode==='all' && req.memberships.some(m=>m.unit.kind==='unit_induk' && m.role==='admin'));
const unitAdmin = req => req.context.mode==='unit' && req.context.unit.kind==='upt' && req.context.role==='admin';
const needControl = req => { if (!control(req)) throw err('Akses ditolak',403); };
const audit = (q,req,action,type,id) => q('INSERT INTO audit_logs (actor_id,unit_id,action,target_type,target_id) VALUES ($1,$2,$3,$4,$5)',[req.user.id,req.context.unit_id,action,type,String(id)]);
const policyReason = action => ['user_manage','unit_manage','membership_manage','security_matrix','read'].includes(action) ? 'Capability IAM atau kompatibilitas dikunci.' : 'Batas jenjang dan jenis unit dikunci.';
function policyPayload(rows, req) {
  const matrix = Object.fromEntries(rows.map(row => [row.unit_kind, row.matrix]));
  const revisions = Object.fromEntries(rows.map(row => [row.unit_kind, Number(row.revision)]));
  const locked_cells = rows.flatMap(row => lockedCells(row.unit_kind).map(cell => { const [role, action] = cell.split(':'); return { kind: row.unit_kind, role, action, reason: policyReason(action) }; }));
  return { roles: ROLES, labels: ROLE_LABELS, capabilities: getCapabilities(req), matrix, revisions, can_edit: Boolean(req.user?.is_superadmin), metadata: { unit_kinds: POLICY_CATALOG.unit_kinds, module_read_actions: POLICY_CATALOG.module_read_actions, editable_actions: POLICY_CATALOG.editable_actions }, catalog: { actions: ACTION_CATALOG, groups: POLICY_GROUPS, labels: ACTION_LABELS }, locked_cells };
}
function parseJabatan(body) {
  if (!Object.prototype.hasOwnProperty.call(body || {}, 'jabatan')) return { provided: false, value: null };
  if (body.jabatan !== null && typeof body.jabatan !== 'string') throw err('Jabatan tidak valid');
  const value = body.jabatan === null ? null : body.jabatan.trim();
  if (value && value.length > 120) throw err('Jabatan maksimal 120 karakter');
  return { provided: true, value: value || null };
}

router.get('/units',asyncHandler(async(req,res)=>{
  let rows;
  if (control(req)) ({rows}=await query('SELECT * FROM units ORDER BY id'));
  else rows=req.memberships.map(m=>m.unit);
  res.json({data:rows});
}));
router.post('/units',asyncHandler(async(req,res)=>{
  needControl(req); const {code,name,kind,parent_id}=req.body||{};
  if (!String(code||'').trim() || !String(name||'').trim() || !['upt','unit_induk'].includes(kind)) throw err('Data unit tidak valid');
  if (kind==='unit_induk' && parent_id) throw err('Unit Induk tidak memiliki induk');
  if (kind==='upt') { const p=await query("SELECT id FROM units WHERE id=$1 AND kind='unit_induk' AND active=true",[parent_id]); if (!p.rows.length) throw err('Induk tidak valid'); }
  const row=await withTransaction(async q=>{const r=await q('INSERT INTO units (code,name,kind,parent_id) VALUES ($1,$2,$3,$4) RETURNING *',[String(code).trim(),String(name).trim(),kind,parent_id||null]); await audit(q,req,'create','unit',r.rows[0].id); return r.rows[0];}); await broadcast(TOPIC.USERS,{unit_id:row.id,action:'unit_create',actor:req.context.role}); res.status(201).json(row);
}));
router.put('/units/:id',asyncHandler(async(req,res)=>{
  needControl(req); const old=(await query('SELECT * FROM units WHERE id=$1',[req.params.id])).rows[0]; if (!old) throw err('Unit tidak ditemukan',404);
  const {name=old.name,code=old.code,active=old.active,parent_id=old.parent_id}=req.body||{};
  if (!String(name).trim() || !String(code).trim() || typeof active!=='boolean') throw err('Data unit tidak valid');
  if (old.kind==='unit_induk' && parent_id) throw err('Unit Induk tidak memiliki induk');
  if (old.kind==='upt') {const parent=await query("SELECT id FROM units WHERE id=$1 AND kind='unit_induk' AND active=true",[parent_id]); if (!parent.rows.length) throw err('Induk tidak valid');}
  const row=await withTransaction(async q=>{const r=await q('UPDATE units SET name=$1,code=$2,active=$3,parent_id=$4 WHERE id=$5 RETURNING *',[name.trim(),code.trim(),active,parent_id||null,old.id]); await audit(q,req,'update','unit',old.id); return r.rows[0];}); await broadcast(TOPIC.USERS,{unit_id:row.id,action:'unit_update',actor:req.context.role}); res.json(row);
}));
router.get('/security-matrix',asyncHandler(async(req,res)=>{ if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403); const {rows}=await query('SELECT unit_kind,revision,matrix FROM security_matrix_policies ORDER BY unit_kind'); res.json(policyPayload(rows,req)); }));
router.put('/security-matrix/:unitKind',asyncHandler(async(req,res)=>{
  if (!req.user?.is_superadmin) throw err('Hanya superadmin teknis yang dapat mengubah policy.',403);
  const kind=String(req.params.unitKind||''); const revision=Number(req.body?.revision); if (!['upt','unit_induk'].includes(kind) || !Number.isInteger(revision) || revision<1) throw err('Policy atau revision tidak valid');
  let result;
  try {
    result=await withTransaction(async q=>{
      const actor=(await q('SELECT id,active,is_superadmin FROM users WHERE id=$1 FOR UPDATE',[req.user.id])).rows[0]; if (!actor?.active || !actor.is_superadmin) throw err('Sesi superadmin tidak berlaku.',401);
      const current=(await q('SELECT unit_kind,revision,matrix FROM security_matrix_policies WHERE unit_kind=$1 FOR UPDATE',[kind])).rows[0]; if (!current) throw err('Policy tidak ditemukan',404);
      if (Number(current.revision)!==revision) throw err('Revision policy sudah berubah.',409);
      let matrix; try { matrix=validatePolicyMatrix(kind,req.body?.matrix); } catch (e) { throw err(e.message,400); }
      const old=typeof current.matrix==='string'?JSON.parse(current.matrix):current.matrix;
      const changedRoles=ROLES.filter(role=>JSON.stringify([...(old?.[role]||[])].sort())!==JSON.stringify([...(matrix?.[role]||[])].sort()));
      const diff=Object.fromEntries(changedRoles.map(role=>[role,{added:matrix[role].filter(a=>!(old?.[role]||[]).includes(a)),removed:(old?.[role]||[]).filter(a=>!matrix[role].includes(a))}]));
      const nextRevision=revision+1;
      await q('UPDATE security_matrix_policies SET matrix=$1::jsonb,revision=$2,updated_at=now() WHERE unit_kind=$3 AND revision=$4',[JSON.stringify(matrix),nextRevision,kind,revision]);
      if (changedRoles.length) await q('UPDATE users SET auth_version=auth_version+1,updated_at=now() WHERE active=true AND id IN (SELECT DISTINCT m.user_id FROM unit_memberships m JOIN units u ON u.id=m.unit_id WHERE m.active=true AND u.active=true AND u.kind=$1 AND m.role=ANY($2::text[]))',[kind,changedRoles]);
      await q('INSERT INTO audit_logs (actor_id,unit_id,action,target_type,target_id,details) VALUES ($1,NULL,$2,$3,$4,$5)',[req.user.id,'security_matrix_update','security_matrix',kind,JSON.stringify({unit_kind:kind,revision_before:revision,revision_after:nextRevision,changed_roles:changedRoles,diff})]);
      return {kind,revision:nextRevision};
    });
  } catch (e) { throw e; }
  await broadcast(TOPIC.POLICY,{unit_kind:result.kind,action:'policy'});
  const {rows}=await query('SELECT unit_kind,revision,matrix FROM security_matrix_policies ORDER BY unit_kind'); res.json(policyPayload(rows,req));
}));
router.get('/users',asyncHandler(async(req,res)=>{
  if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403);
  let rows;
  if (control(req)) {
    rows = req.context.mode === 'unit'
      ? (await query('SELECT u.id,u.nama,u.email,u.active,u.is_superadmin,u.created_at,m.role,m.jabatan FROM users u LEFT JOIN unit_memberships m ON m.user_id=u.id AND m.unit_id=$1 ORDER BY u.id',[req.context.unit_id])).rows
      : (await query('SELECT id,nama,email,active,is_superadmin,created_at,NULL::text AS role,NULL::text AS jabatan FROM users ORDER BY id')).rows;
  } else {
    rows = (await query('SELECT u.id,u.nama,u.email,u.active,u.is_superadmin,u.created_at,m.role,m.jabatan FROM users u JOIN unit_memberships m ON m.user_id=u.id WHERE m.unit_id=$1 ORDER BY u.id',[req.context.unit_id])).rows;
  }
  const counts = unitAdmin(req) ? (await query('SELECT user_id,COUNT(*)::int AS count FROM unit_memberships GROUP BY user_id')).rows : [];
  const byUser = new Map(counts.map(r=>[r.user_id,r.count]));
  const data = rows.map(row=>{const allowed=control(req) ? (!row.is_superadmin || req.user.is_superadmin) : !row.is_superadmin && row.role!=='admin' && byUser.get(row.id)===1; return {...row,can_update_identity:allowed,can_reset_password:allowed};});
  res.json({data,roles:ROLES,labels:ROLE_LABELS});
}));
router.post('/users',asyncHandler(async(req,res)=>{
  if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403);
  const {nama,email,password,role='vendor'}=req.body||{}; const jabatan=parseJabatan(req.body || {});
  if (!String(nama||'').trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'')) || String(password||'').length<6 || !ROLES.includes(role)) throw err('Data pengguna tidak valid');
  if (unitAdmin(req) && role==='admin') throw err('Admin UPT tidak dapat membuat admin',403);
  const row=await withTransaction(async q=>{const r=await q('INSERT INTO users (nama,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,nama,email,active,is_superadmin',[nama.trim(),email.trim().toLowerCase(),hashPassword(password),role]); if (unitAdmin(req)) await q('INSERT INTO unit_memberships (user_id,unit_id,role,jabatan) VALUES ($1,$2,$3,$4)',[r.rows[0].id,req.context.unit_id,role,jabatan.value]); await audit(q,req,'create','user',r.rows[0].id); return r.rows[0];}); await broadcast(TOPIC.USERS,{unit_id:req.context.unit_id,action:'create',actor:req.context.role}); res.status(201).json(row);
}));
router.get('/users/:id/memberships',asyncHandler(async(req,res)=>{
  if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403);
  const {rows}=await query('SELECT m.*,u.code,u.name,u.kind FROM unit_memberships m JOIN units u ON u.id=m.unit_id WHERE m.user_id=$1'+(unitAdmin(req)?' AND m.unit_id=$2':''),unitAdmin(req)?[req.params.id,req.context.unit_id]:[req.params.id]); res.json({data:rows});
}));
router.put('/users/:id/memberships/:unitId',asyncHandler(async(req,res)=>{
  const central=control(req); if (!central && !(unitAdmin(req) && Number(req.params.unitId)===Number(req.context.unit_id))) throw err('Akses ditolak',403);
  const {role,active=true}=req.body||{}; const jabatan=parseJabatan(req.body || {});
  if (!ROLES.includes(role) || typeof active!=='boolean') throw err('Keanggotaan tidak valid');
  const unit=(await query('SELECT * FROM units WHERE id=$1 AND active=true',[req.params.unitId])).rows[0]; if (!unit || (unit.kind==='unit_induk' && role==='vendor')) throw err('Unit atau peran tidak valid');
  await withTransaction(async q=>{
    await refreshIdentity(req,q);
    const isCentral=control(req);
    if (!isCentral && !(unitAdmin(req) && Number(unit.id)===Number(req.context.unit_id))) throw err('Akses ditolak',403);
    const old=(await q('SELECT role FROM unit_memberships WHERE user_id=$1 AND unit_id=$2 FOR UPDATE',[req.params.id,unit.id])).rows[0];
    if (!isCentral && (!old || role==='admin' || old.role==='admin')) throw err('Akses ditolak',403);
    if (jabatan.provided) await q('INSERT INTO unit_memberships (user_id,unit_id,role,jabatan,active) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id,unit_id) DO UPDATE SET role=EXCLUDED.role,jabatan=EXCLUDED.jabatan,active=EXCLUDED.active',[req.params.id,unit.id,role,jabatan.value,active]);
    else await q('INSERT INTO unit_memberships (user_id,unit_id,role,active) VALUES ($1,$2,$3,$4) ON CONFLICT (user_id,unit_id) DO UPDATE SET role=EXCLUDED.role,active=EXCLUDED.active',[req.params.id,unit.id,role,active]);
    await q('UPDATE users SET auth_version=auth_version+1,updated_at=now() WHERE id=$1',[req.params.id]);
    await audit(q,req,'membership','user',req.params.id);
  });
  await broadcast(TOPIC.USERS,{unit_id:unit.id,action:'membership',actor:req.context.role}); res.json({ok:true});
}));
router.put('/users/:id',asyncHandler(async(req,res)=>{
  if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403); const {nama,active,password}=req.body||{}; if (password && String(password).length<6) throw err('Password minimal 6 karakter'); if (active!==undefined && typeof active!=='boolean') throw err('Status tidak valid');
  const row=await withTransaction(async q=>{
    // Lock the complete root set in a stable order before checking its count.
    // Concurrent deactivations cannot each observe the other root as active.
    if (active===false) await q('SELECT id FROM users WHERE is_superadmin=true ORDER BY id FOR UPDATE');
    await refreshIdentity(req,q);
    if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403);
    const target=(await q('SELECT * FROM users WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if (!target) throw err('User tidak ditemukan',404);
    if (target.is_superadmin && !req.user.is_superadmin) throw err('Akses ditolak',403);
    if (!control(req)) {
      const memberships=(await q('SELECT unit_id,role FROM unit_memberships WHERE user_id=$1',[target.id])).rows;
      if (target.is_superadmin || memberships.length!==1 || Number(memberships[0].unit_id)!==Number(req.context.unit_id) || memberships[0].role==='admin') throw err('Identitas pengguna tidak dapat diubah oleh admin unit ini',403);
    }
    if (target.is_superadmin && active===false) {
      const {rows}=await q('SELECT COUNT(*)::int AS n FROM users WHERE is_superadmin=true AND active=true AND id<>$1',[target.id]);
      if (!rows[0].n) throw err('Superadmin aktif terakhir tidak dapat dinonaktifkan');
    }
    const r=await q('UPDATE users SET nama=$1,active=$2,password_hash=COALESCE($3,password_hash),auth_version=auth_version+1,updated_at=now() WHERE id=$4 RETURNING id,nama,email,active,is_superadmin',[nama?String(nama).trim():target.nama,active??target.active,password?hashPassword(password):null,target.id]);
    await audit(q,req,'update','user',target.id);
    return r.rows[0];
  });
  await broadcast(TOPIC.USERS,{unit_id:req.context.unit_id,action:'update',actor:req.context.role}); res.json(row);
}));
router.get('/projects/:id/vendors',requireCapability('projects_read'),asyncHandler(async(req,res)=>{ if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403); await assertProject(req,req.params.id,'projects_read'); const p=(await query('SELECT id,unit_id FROM projects WHERE id=$1',[req.params.id])).rows[0]; if (!p || (!control(req) && Number(p.unit_id)!==Number(req.context.unit_id))) throw err('Proyek tidak ditemukan',404); const {rows}=await query("SELECT u.id,u.nama,u.email,EXISTS(SELECT 1 FROM vendor_project_assignments v WHERE v.project_id=$1 AND v.user_id=u.id) AS assigned FROM users u JOIN unit_memberships m ON m.user_id=u.id WHERE m.unit_id=$2 AND m.role='vendor' AND m.active=true AND u.active=true ORDER BY u.nama",[p.id,p.unit_id]); res.json({data:rows.filter(r=>r.assigned),candidates:rows}); }));
router.put('/projects/:id/vendors/:userId',requireCapability('projects_read'),asyncHandler(async(req,res)=>{
  if (!control(req) && !unitAdmin(req)) throw err('Akses ditolak',403); await assertProject(req,req.params.id,'projects_read'); const p=(await query('SELECT id,unit_id FROM projects WHERE id=$1',[req.params.id])).rows[0]; if (!p || (!control(req) && p.unit_id!==req.context.unit_id)) throw err('Proyek tidak ditemukan',404);
  const m=(await query("SELECT 1 FROM unit_memberships m JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.unit_id=$2 AND m.role='vendor' AND m.active=true AND u.active=true",[req.params.userId,p.unit_id])).rows[0]; if (!m) throw err('Vendor tidak aktif pada unit proyek');
  await withTransaction(async q=>{ if (req.body?.active===false) await q('DELETE FROM vendor_project_assignments WHERE project_id=$1 AND user_id=$2',[p.id,req.params.userId]); else await q('INSERT INTO vendor_project_assignments (project_id,user_id,unit_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[p.id,req.params.userId,p.unit_id]); await q('UPDATE users SET auth_version=auth_version+1,updated_at=now() WHERE id=$1',[req.params.userId]); await audit(q,req,'vendor_assignment','project',p.id); }); await broadcast(TOPIC.USERS,{unit_id:p.unit_id,action:'vendor_assignment',actor:req.context.role}); res.json({ok:true});
}));
export default router;
