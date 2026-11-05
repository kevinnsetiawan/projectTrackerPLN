#!/bin/sh
set -eu
docker exec -i deploy-db-1 sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT 'users' AS entity,count(*) FROM users UNION ALL
SELECT 'active_root',count(*) FROM users WHERE lower(email)='dilankanjut@gmail.com' AND is_superadmin AND active UNION ALL
SELECT 'units',count(*) FROM units UNION ALL SELECT 'memberships',count(*) FROM unit_memberships UNION ALL
SELECT 'projects',count(*) FROM projects UNION ALL SELECT 'agendas',count(*) FROM agendas UNION ALL
SELECT 'business_children', (SELECT count(*) FROM lokasis)+(SELECT count(*) FROM milestones)+(SELECT count(*) FROM s_curves)+(SELECT count(*) FROM kendalas)+(SELECT count(*) FROM dokumentasis)+(SELECT count(*) FROM termin_bayars)+(SELECT count(*) FROM s_curve_documents)+(SELECT count(*) FROM boqs)+(SELECT count(*) FROM boq_groups)+(SELECT count(*) FROM approval_drawings)+(SELECT count(*) FROM instruksi_kerja)+(SELECT count(*) FROM ik_approvals)+(SELECT count(*) FROM amandements);
SELECT table_name,column_name,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('projects','agendas') AND column_name='unit_id' ORDER BY table_name;
SELECT conname,convalidated FROM pg_constraint WHERE conname IN ('agendas_project_unit_fk','vendor_assignment_project_unit_fk','boqs_group_project_fk','boqs_milestone_project_fk','vendor_assignment_membership_fk') ORDER BY conname;
SQL
stat -c 'Environment permission %a owner %U' /opt/protrack/.env
