import React, { useEffect, useMemo, useState } from 'react';
import { getAuthState, canAction, ROLE_FULL_LABELS } from '../auth.js';
import { getSecurityMatrix, updateSecurityMatrix } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, PageHeader } from '../components/ui.jsx';
import { TOPIC, useLive } from '../events.js';

const GROUP_LABELS = { read: 'Baca', operational: 'Operasional', approval: 'Approval', iam: 'Pengelolaan akses' };
const roleLabel = role => ROLE_FULL_LABELS[role] || role;
export function matrixDiff(base, draft, roles = Object.keys(base || {})) {
  return roles.flatMap(role => {
    const before = new Set(base?.[role] || []); const after = new Set(draft?.[role] || []);
    return [...[...after].filter(action => !before.has(action)).map(action => ({ role, action, kind: 'ditambahkan' })), ...[...before].filter(action => !after.has(action)).map(action => ({ role, action, kind: 'dihapus' }))];
  });
}

export function MatrixTable({ kind, rules, groups, labels, roleNames, current, locked, toggle }) {
  return <div className="overflow-x-auto max-h-[65vh]"><table className="min-w-max w-full text-sm text-left"><thead className="bg-slate-100"><tr><th scope="col" className="sticky top-0 left-0 z-20 bg-slate-100 p-4">Izin</th>{roleNames.map(role => <th scope="col" className="sticky top-0 z-10 bg-slate-100 p-4 min-w-40" key={role}>{roleLabel(role)}</th>)}</tr></thead><tbody>{Object.entries(groups).map(([group, groupActions]) => <React.Fragment key={group}><tr><th colSpan={roleNames.length + 1} className="p-3 text-xs uppercase tracking-wide text-slate-600 bg-slate-50">{GROUP_LABELS[group] || group}</th></tr>{groupActions.map(action => <tr className="border-t border-slate-200 hover:bg-slate-50/70 transition-colors" key={action}><th scope="row" className="sticky left-0 z-10 bg-white p-3 font-medium">{labels[action] || action}</th>{roleNames.map(role => { const cell = locked(role, action); const disabled = Boolean(cell) || !rules.can_edit; const checked = (current[role] || []).includes(action); const inputId = `matrix-${kind}-${role}-${action}`; return <td className="p-3 text-center" key={role}><label htmlFor={inputId} className="inline-flex min-h-11 items-center justify-center gap-2"><input id={inputId} type="checkbox" aria-label={`${roleLabel(role)} ${labels[action] || action}`} checked={checked} disabled={disabled} onChange={() => toggle(role, action)} />{disabled && <span className="text-2xs text-slate-500" title={cell?.reason || (rules.can_edit ? 'Izin ini dikunci oleh aturan keamanan.' : 'Hanya superadmin yang dapat mengubah policy.')}>{cell?.reason || (rules.can_edit ? 'Terkunci' : 'Baca saja')}</span>}</label></td>; })}</tr>)}</React.Fragment>)}</tbody></table></div>;
}

export default function SecurityMatrix() {
  const [rules, setRules] = useState(null); const [error, setError] = useState(''); const [kind, setKind] = useState('upt');
  const [draft, setDraft] = useState(null); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false); const auth = getAuthState();
  useEffect(() => { setPageTitle('Security Matrix'); if (!canAction('security_matrix')) return; getSecurityMatrix().then(next => { setRules(next); setKind(next.matrix?.upt ? 'upt' : 'unit_induk'); }).catch(e => setError(e.message)); }, []);
  const catalog = rules?.catalog || {}; const actionNames = catalog.actions || []; const labels = catalog.labels || {};
  const roleNames = rules?.roles || Object.keys(rules?.matrix?.[kind] || {}); const current = draft || rules?.matrix?.[kind] || {};
  const groups = useMemo(() => Object.fromEntries(Object.entries(catalog.groups || {}).map(([group, names]) => [group, (names || []).filter(action => action !== 'read' && actionNames.includes(action))])), [catalog.groups, actionNames.join('|')]);
  const changes = useMemo(() => matrixDiff(rules?.matrix?.[kind] || {}, current, roleNames), [rules, kind, current, roleNames.join('|')]);
  const locked = (role, action) => (rules?.locked_cells || []).find(cell => cell.kind === kind && cell.role === role && cell.action === action);
  function beginKind(next) { if (dirty && !window.confirm('Buang perubahan yang belum disimpan?')) return; setKind(next); setDraft(null); setDirty(false); setError(''); }
  function toggle(role, action) { setDraft(old => { const base = old || rules.matrix[kind]; const next = { ...base, [role]: [...(base[role] || [])] }; next[role] = next[role].includes(action) ? next[role].filter(item => item !== action) : [...next[role], action]; return next; }); setDirty(true); }
  async function save() { if (!changes.length || !window.confirm(`Simpan ${changes.length} perubahan untuk seluruh ${kind === 'upt' ? 'UPT' : 'Unit Induk'}?`)) return; setSaving(true); setError(''); try { const next = await updateSecurityMatrix(kind, { revision: rules.revisions?.[kind], matrix: current }); setRules(next); setDraft(null); setDirty(false); } catch (e) { setError(e.status === 409 ? 'Matriks berubah. Muat ulang sebelum menyimpan.' : e.message); } finally { setSaving(false); } }
  function reload() { getSecurityMatrix().then(next => { setRules(next); setDraft(null); setDirty(false); setError(''); }).catch(e => setError(e.message)); }
  useLive(TOPIC.POLICY, () => { if (!dirty) reload(); });
  if (!canAction('security_matrix')) return <p role="alert">Akses Security Matrix tidak tersedia.</p>;
  return <div className="space-y-5"><PageHeader title="Security Matrix" subtitle="Policy akses per jenis unit. Perubahan berlaku global pada role di jenis unit terpilih." />
    {error && <p role="alert" className="bg-red-50 p-4 text-red-700 rounded-lg">{error}{error.includes('berubah') && <button className="ml-3 underline font-bold" onClick={reload}>Muat ulang</button>}</p>}
    {rules?.matrix && <Card className="overflow-hidden"><div className="flex flex-wrap gap-2 p-4 border-b border-slate-200 items-center">{['upt', 'unit_induk'].map(value => <button key={value} className={`min-h-11 px-4 rounded-lg border text-sm transition ${kind === value ? 'bg-pln-blue text-white border-pln-blue font-bold shadow-sm' : 'bg-white text-slate-600 border-slate-300 font-medium hover:bg-slate-50'}`} aria-pressed={kind === value} onClick={() => beginKind(value)}>{value === 'upt' ? 'UPT' : 'Unit Induk'}</button>)}<span className="ml-auto text-xs text-slate-500">Revisi {rules.revisions?.[kind] || 0}{dirty ? ' · Belum disimpan' : ''}</span></div>
      <MatrixTable kind={kind} rules={rules} groups={groups} labels={labels} roleNames={roleNames} current={current} locked={locked} toggle={toggle} />
      {rules.can_edit && <div className="p-4 border-t border-slate-200 space-y-3">{dirty && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm"><strong>Ringkasan perubahan global</strong><ul className="mt-1 list-disc pl-5">{changes.slice(0, 12).map(change => <li key={`${change.role}-${change.action}-${change.kind}`}>{roleLabel(change.role)} — {labels[change.action] || change.action} {change.kind}</li>)}{changes.length > 12 && <li>dan {changes.length - 12} perubahan lain</li>}</ul></div>}<div className="flex justify-end gap-2"><button className="btn btn-secondary btn-md min-h-11" disabled={!dirty || saving} onClick={() => { setDraft(null); setDirty(false); }}>Batal</button><button className="btn btn-primary btn-md min-h-11" disabled={!dirty || saving || !changes.length} onClick={save}>{saving ? 'Menyimpan…' : 'Simpan matriks'}</button></div></div>}</Card>}
    <Card className="p-5"><h3 className="font-bold text-pln-navy">Capability konteks aktif</h3><p className="text-sm text-slate-600 mt-1">{auth?.context?.unit?.name || (auth?.context?.mode === 'all' ? 'Monitoring seluruh UPT' : 'Belum memilih unit')}</p><div className="flex flex-wrap gap-2 mt-4">{Object.entries(auth?.capabilities || {}).filter(([, allowed]) => allowed === true).map(([key]) => <code key={key} className="px-2 py-1 bg-slate-100 rounded text-xs">{key}</code>)}</div></Card>
  </div>;
}
