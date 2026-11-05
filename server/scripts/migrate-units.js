// Explicit local/operator migration. Never purge or infer ownership from legacy labels.
import 'dotenv/config';
import { query, withTransaction } from '../_lib/db.js';

const args = new Set(process.argv.slice(2));
if (args.has('--promote-verified-root')) {
  await withTransaction(async q => {
    const {rows}=await q('SELECT id, is_superadmin FROM users WHERE lower(email)=$1 FOR UPDATE',['dilankanjut@gmail.com']);
    if (rows.length!==1) throw new Error('Identitas root terverifikasi tidak ditemukan secara unik.');
    if (!rows[0].is_superadmin) {
      await q('UPDATE users SET is_superadmin=true,auth_version=auth_version+1 WHERE id=$1',[rows[0].id]);
      await q("INSERT INTO audit_logs (actor_id,action,target_type,target_id) VALUES ($1,'promote_verified_root','user',$2)",[rows[0].id,String(rows[0].id)]);
    }
  });
}
if (args.has('--enforce-not-null')) {
  await withTransaction(async q => {
    const {rows}=await q('SELECT (SELECT count(*) FROM projects WHERE unit_id IS NULL)::int AS projects, (SELECT count(*) FROM agendas WHERE unit_id IS NULL)::int AS agendas');
    if (rows[0].projects || rows[0].agendas) throw new Error('Data tanpa unit masih ada; selesaikan migrasi yang disetujui sebelum mengunci NOT NULL.');
    await q('ALTER TABLE projects ALTER COLUMN unit_id SET NOT NULL');
    await q('ALTER TABLE agendas ALTER COLUMN unit_id SET NOT NULL');
    await q('ALTER TABLE agendas VALIDATE CONSTRAINT agendas_project_unit_fk');
    await q('ALTER TABLE vendor_project_assignments VALIDATE CONSTRAINT vendor_assignment_project_unit_fk');
    await q('ALTER TABLE boqs VALIDATE CONSTRAINT boqs_group_project_fk');
    await q('ALTER TABLE boqs VALIDATE CONSTRAINT boqs_milestone_project_fk');
    await q('ALTER TABLE vendor_project_assignments VALIDATE CONSTRAINT vendor_assignment_membership_fk');
  });
}
const {rows}=await query('SELECT (SELECT count(*) FROM projects WHERE unit_id IS NULL)::int AS unmapped_projects, (SELECT count(*) FROM agendas WHERE unit_id IS NULL)::int AS unmapped_agendas');
console.log(rows[0]);
