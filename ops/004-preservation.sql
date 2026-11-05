WITH protected AS (
  SELECT 'users' AS tab,to_jsonb(t) AS row FROM users t
  UNION ALL SELECT 'units-local',to_jsonb(t)-'source_system'-'source_id'-'source_snapshot' FROM units t WHERE to_jsonb(t)->>'source_system' IS NULL
  UNION ALL SELECT 'memberships',to_jsonb(t) FROM unit_memberships t
  UNION ALL SELECT 'vendor-assignments',to_jsonb(t) FROM vendor_project_assignments t
  UNION ALL SELECT 'projects',to_jsonb(t) FROM projects t
  UNION ALL SELECT 'lokasis',to_jsonb(t)-'unit_id'-'gardu_induk_id' FROM lokasis t
  UNION ALL SELECT 'agendas',to_jsonb(t) FROM agendas t
  UNION ALL SELECT 'audit-logs',to_jsonb(t) FROM audit_logs t
  UNION ALL SELECT 'milestones',to_jsonb(t) FROM milestones t
  UNION ALL SELECT 's-curves',to_jsonb(t) FROM s_curves t
  UNION ALL SELECT 'kendalas',to_jsonb(t) FROM kendalas t
  UNION ALL SELECT 'dokumentasis',to_jsonb(t) FROM dokumentasis t
  UNION ALL SELECT 'termins',to_jsonb(t) FROM termin_bayars t
  UNION ALL SELECT 'curve-documents',to_jsonb(t) FROM s_curve_documents t
  UNION ALL SELECT 'boqs',to_jsonb(t) FROM boqs t
  UNION ALL SELECT 'boq-groups',to_jsonb(t) FROM boq_groups t
  UNION ALL SELECT 'drawings',to_jsonb(t) FROM approval_drawings t
  UNION ALL SELECT 'instruksi',to_jsonb(t) FROM instruksi_kerja t
  UNION ALL SELECT 'ik-approvals',to_jsonb(t) FROM ik_approvals t
  UNION ALL SELECT 'amandemen',to_jsonb(t) FROM amandements t
)
SELECT tab,count(*),md5(string_agg(row::text,',' ORDER BY row::text)) FROM protected GROUP BY tab ORDER BY tab;
