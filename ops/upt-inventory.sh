#!/bin/sh
set -eu
docker exec -i deploy-db-1 sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT 'users' AS entity, count(*) FROM users
UNION ALL SELECT 'verified_root', count(*) FROM users WHERE lower(email)='dilankanjut@gmail.com'
UNION ALL SELECT 'projects', count(*) FROM projects
UNION ALL SELECT 'agendas', count(*) FROM agendas;
SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT 'lokasis' AS entity, count(*) FROM lokasis UNION ALL
SELECT 'milestones', count(*) FROM milestones UNION ALL
SELECT 's_curves', count(*) FROM s_curves UNION ALL
SELECT 'kendalas', count(*) FROM kendalas UNION ALL
SELECT 'dokumentasis', count(*) FROM dokumentasis UNION ALL
SELECT 'termin_bayars', count(*) FROM termin_bayars UNION ALL
SELECT 's_curve_documents', count(*) FROM s_curve_documents UNION ALL
SELECT 'boqs', count(*) FROM boqs UNION ALL
SELECT 'boq_groups', count(*) FROM boq_groups UNION ALL
SELECT 'approval_drawings', count(*) FROM approval_drawings UNION ALL
SELECT 'instruksi_kerja', count(*) FROM instruksi_kerja UNION ALL
SELECT 'ik_approvals', count(*) FROM ik_approvals UNION ALL
SELECT 'amandements', count(*) FROM amandements;
SQL
docker inspect deploy-db-1 --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}DB volume: {{.Name}}{{end}}{{end}}'
sed -n '/^SEED_DEMO=/p' /opt/protrack/.env
