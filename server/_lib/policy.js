export const ROLE_KEYS = ['vendor', 'dalkon', 'enjin', 'asman', 'logistik', 'staff', 'admin'];

export const MODULE_READ_ACTIONS = [
  'agenda_read', 'dashboard_read', 'projects_read', 'drawings_read', 'instruksi_read',
  'gis_read', 'gardu_induk_read', 'kendala_read', 'reports_read', 'reports_export',
];
export const IAM_ACTIONS = ['user_manage', 'unit_manage', 'membership_manage', 'security_matrix'];
export const OPERATIONAL_ACTIONS = [
  'project_write', 'project_delete', 'progress', 'agenda_write', 'kendala_create', 'kendala_write',
  'kendala_delete', 'drawing_upload', 'drawing_delete', 'drawing_dalkon', 'drawing_enjin', 'ik_write',
  'ik_ultg', 'ik_upt', 'ik_induk', 'termin_write', 'amandemen_write',
];
export const ACTION_CATALOG = ['read', ...MODULE_READ_ACTIONS, ...OPERATIONAL_ACTIONS, ...IAM_ACTIONS];
export const ACTION_LABELS = {
  read: 'Baca (kompatibilitas)', agenda_read: 'Agenda', dashboard_read: 'Dashboard', projects_read: 'Proyek', drawings_read: 'Drawing',
  instruksi_read: 'Instruksi Kerja', gis_read: 'GIS', gardu_induk_read: 'Gardu Induk', kendala_read: 'Kendala', reports_read: 'Laporan', reports_export: 'Export Laporan',
  project_write: 'Tulis Proyek', project_delete: 'Hapus Proyek', progress: 'Progres', agenda_write: 'Tulis Agenda', kendala_create: 'Buat Kendala', kendala_write: 'Tulis Kendala', kendala_delete: 'Hapus Kendala',
  drawing_upload: 'Upload Drawing', drawing_delete: 'Hapus Drawing', drawing_dalkon: 'Approval Drawing Dalkon', drawing_enjin: 'Approval Drawing Engineering', ik_write: 'Tulis IK', ik_ultg: 'Approval IK ULTG', ik_upt: 'Approval IK UPT', ik_induk: 'Approval IK Unit Induk',
  termin_write: 'Tulis Termin', amandemen_write: 'Tulis Amandemen', user_manage: 'Kelola Pengguna', unit_manage: 'Kelola Unit', membership_manage: 'Kelola Keanggotaan', security_matrix: 'Security Matrix',
};
export const POLICY_GROUPS = {
  read: ['read', ...MODULE_READ_ACTIONS],
  operational: OPERATIONAL_ACTIONS.filter(a => !['ik_ultg', 'ik_upt', 'ik_induk', 'drawing_dalkon', 'drawing_enjin'].includes(a)),
  approval: ['ik_ultg', 'ik_upt', 'ik_induk', 'drawing_dalkon', 'drawing_enjin'],
  iam: IAM_ACTIONS,
};

const UPT_BASE = {
  vendor: ['read', 'project_write', 'progress', 'kendala_create', 'drawing_upload', 'ik_write'],
  dalkon: ['read', 'project_write', 'project_delete', 'progress', 'agenda_write', 'kendala_create', 'kendala_delete', 'drawing_dalkon', 'ik_write', 'ik_ultg', 'termin_write', 'amandemen_write'],
  enjin: ['read', 'kendala_write', 'drawing_enjin', 'ik_upt'],
  asman: ['read', 'project_write', 'project_delete', 'progress', 'agenda_write', 'kendala_create', 'kendala_write', 'kendala_delete', 'drawing_upload', 'drawing_delete', 'ik_write', 'ik_upt', 'termin_write', 'amandemen_write'],
  logistik: ['read', 'agenda_write'],
  staff: ['read'],
  admin: ['read', 'project_write', 'project_delete', 'progress', 'agenda_write', 'kendala_create', 'kendala_write', 'kendala_delete', 'drawing_upload', 'drawing_delete', 'ik_write', 'termin_write', 'amandemen_write', 'user_manage', 'security_matrix'],
};
const INDUK_BASE = {
  vendor: [],
  dalkon: ['read'],
  enjin: ['read'],
  asman: ['read'],
  logistik: ['read'],
  staff: ['read'],
  admin: ['read', 'agenda_write', 'ik_induk', ...IAM_ACTIONS],
};

function withReadActions(actions) {
  return actions.includes('read') ? [...new Set([...actions, ...MODULE_READ_ACTIONS, 'reports_export'])] : [];
}

export const DEFAULT_POLICY_MATRICES = Object.freeze({
  upt: Object.freeze(Object.fromEntries(ROLE_KEYS.map(role => [role, Object.freeze(withReadActions(UPT_BASE[role]))]))),
  unit_induk: Object.freeze(Object.fromEntries(ROLE_KEYS.map(role => [role, Object.freeze(role === 'vendor' ? [] : withReadActions(INDUK_BASE[role]))]))),
});

export const POLICY_CATALOG = Object.freeze({
  roles: ROLE_KEYS,
  actions: ACTION_CATALOG,
  labels: ACTION_LABELS,
  editable_actions: [...MODULE_READ_ACTIONS, ...OPERATIONAL_ACTIONS],
  groups: POLICY_GROUPS,
  module_read_actions: MODULE_READ_ACTIONS,
  iam_actions: IAM_ACTIONS,
  unit_kinds: ['upt', 'unit_induk'],
});

export function cloneMatrix(matrix) {
  return Object.fromEntries(ROLE_KEYS.map(role => [role, [...(matrix?.[role] || [])]]));
}

export function lockedCells(unitKind) {
  const cells = [];
  for (const role of ROLE_KEYS) cells.push(`${role}:read`);
  for (const role of ROLE_KEYS) for (const action of IAM_ACTIONS) cells.push(`${role}:${action}`);
  if (unitKind === 'upt') for (const role of ROLE_KEYS) cells.push(`${role}:ik_induk`);
  if (unitKind === 'unit_induk') {
    for (const role of ROLE_KEYS) for (const action of ['ik_ultg', 'ik_upt']) cells.push(`${role}:${action}`);
    for (const role of ROLE_KEYS) for (const action of OPERATIONAL_ACTIONS) {
      if (action !== 'ik_ultg' && action !== 'ik_upt' && action !== 'ik_induk' && action !== 'agenda_write') cells.push(`${role}:${action}`);
    }
  }
  return cells;
}

function sameActions(a, b) {
  return [...a].sort().join('\0') === [...b].sort().join('\0');
}

export function validatePolicyMatrix(unitKind, matrix) {
  if (!['upt', 'unit_induk'].includes(unitKind) || !matrix || typeof matrix !== 'object' || Array.isArray(matrix)) throw new Error('Matriks policy tidak valid.');
  const keys = Object.keys(matrix).sort();
  if (keys.join('\0') !== [...ROLE_KEYS].sort().join('\0')) throw new Error('Matriks harus memuat seluruh peran.');
  const out = {};
  const defaults = DEFAULT_POLICY_MATRICES[unitKind];
  for (const role of ROLE_KEYS) {
    if (!Array.isArray(matrix[role]) || matrix[role].some(action => typeof action !== 'string' || !ACTION_CATALOG.includes(action))) throw new Error('Aksi policy tidak dikenal.');
    const actions = [...new Set(matrix[role])];
    if (actions.length !== matrix[role].length) throw new Error('Aksi policy duplikat.');
    for (const action of IAM_ACTIONS) if (!sameActions(actions.filter(a => a === action), defaults[role].filter(a => a === action))) throw new Error('Capability IAM terkunci.');
    if (unitKind === 'upt' && actions.includes('ik_induk')) throw new Error('UPT tidak dapat memiliki approval Unit Induk.');
    if (unitKind === 'unit_induk') {
      if (role === 'vendor' && actions.length) throw new Error('Vendor tidak berlaku pada Unit Induk.');
      if (actions.some(action => ['ik_ultg', 'ik_upt'].includes(action))) throw new Error('Unit Induk tidak dapat memiliki approval ULTG/UPT.');
      if (actions.some(action => OPERATIONAL_ACTIONS.includes(action) && !['agenda_write', 'ik_induk'].includes(action))) throw new Error('Operasional Unit Induk terkunci.');
    }
    if (defaults[role].includes('read') !== actions.includes('read')) throw new Error('Capability read terkunci.');
    const dependencies = {
      project_write: 'projects_read', project_delete: 'projects_read', progress: 'projects_read', termin_write: 'projects_read', amandemen_write: 'projects_read',
      agenda_write: 'agenda_read', kendala_create: 'kendala_read', kendala_write: 'kendala_read', kendala_delete: 'kendala_read',
      drawing_upload: 'drawings_read', drawing_delete: 'drawings_read', drawing_dalkon: 'drawings_read', drawing_enjin: 'drawings_read',
      ik_write: 'instruksi_read', ik_ultg: 'instruksi_read', ik_upt: 'instruksi_read', ik_induk: 'instruksi_read',
    };
    for (const [action, requiredRead] of Object.entries(dependencies)) {
      if (actions.includes(action) && !actions.includes(requiredRead)) {
        throw new Error(`${ACTION_LABELS[requiredRead] || requiredRead} wajib diaktifkan sebelum ${ACTION_LABELS[action] || action}.`);
      }
    }
    if (actions.includes('reports_export') && !actions.includes('reports_read')) throw new Error('Export Laporan memerlukan akses Laporan.');
    out[role] = actions;
  }
  const stageOne = ROLE_KEYS.filter(role => out[role].includes('ik_ultg'));
  const stageTwo = ROLE_KEYS.filter(role => out[role].includes('ik_upt'));
  const stageThree = ROLE_KEYS.filter(role => out[role].includes('ik_induk'));
  if (unitKind === 'upt' && (!stageOne.length || !stageTwo.length)) throw new Error('UPT memerlukan role approval tahap 1 dan 2.');
  if (unitKind === 'unit_induk' && !stageThree.length) throw new Error('Unit Induk memerlukan role approval tahap 3.');
  for (const role of ROLE_KEYS) if ([out[role].includes('ik_ultg'), out[role].includes('ik_upt'), out[role].includes('ik_induk')].filter(Boolean).length > 1) throw new Error('Satu role hanya boleh memiliki satu tahap IK.');
  return out;
}
