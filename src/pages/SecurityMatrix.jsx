import React, { useEffect, useState } from 'react';
import { getAuthState, canAction, ROLE_FULL_LABELS } from '../auth.js';
import { getSecurityMatrix } from '../api.js';
import { setPageTitle } from '../components/Layout.jsx';
import { Card, PageHeader } from '../components/ui.jsx';

const RULES = [
  ['Vendor UPT', 'Proyek yang ditugaskan; proyek baru otomatis ditugaskan kepada pembuatnya.', 'Input proyek, progres, dokumen, dan pengajuan IK sesuai penugasan.'],
  ['Dalkon UPT', 'Data unit aktif.', 'Pengawasan proyek, agenda UPT, verifikasi drawing, approval IK ULTG.'],
  ['Engineering UPT', 'Data unit aktif.', 'Kendala, review drawing Engineering, approval IK UPT.'],
  ['Staff UPT', 'Data unit aktif.', 'Baca seluruh menu bisnis.'],
  ['Admin UPT', 'Data dan pengguna unit aktif.', 'Kelola pengguna non-admin unit sendiri; tidak menetapkan admin, akses lintas unit, atau melewati tahap approval.'],
  ['Unit Induk', 'Monitoring UPT di bawah Unit Induk; agenda internal milik Unit Induk.', 'Admin menyetujui tahap IK Unit Induk dan mengelola agenda internal; tidak mengubah proyek UPT.'],
  ['Admin pusat teknis', 'Master organisasi, akun, dan keanggotaan.', 'Tidak memperoleh akses bisnis atau bypass approval tanpa keanggotaan unit.'],
];

export default function SecurityMatrix() {
  const [rules, setRules] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setPageTitle('Security Matrix'); if (canAction('security_matrix')) getSecurityMatrix().then(setRules).catch((e) => setError(e.message)); }, []);
  const auth = getAuthState();
  if (!canAction('security_matrix')) return <p role="alert">Akses Security Matrix tidak tersedia.</p>;
  return <div className="space-y-5"><PageHeader title="Security Matrix" subtitle="Aturan akses tetap. Otorisasi diputuskan server berdasarkan keanggotaan, unit aktif, dan penugasan proyek." />
    {error && <p role="alert" className="bg-red-50 p-4 text-red-700 rounded-lg">{error}</p>}
    {rules?.matrix && <Card className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr><th scope="col" className="p-4">Jenis unit</th><th scope="col" className="p-4">Peran</th><th scope="col" className="p-4">Capability server</th></tr></thead><tbody>{Object.entries(rules.matrix).flatMap(([kind, roles]) => Object.entries(roles).map(([role, actions]) => <tr className="border-t border-slate-200" key={`${kind}-${role}`}><td className="p-4">{kind === 'upt' ? 'UPT' : 'Unit Induk'}</td><th scope="row" className="p-4 text-pln-navy">{ROLE_FULL_LABELS[role] || role}</th><td className="p-4"><div className="flex flex-wrap gap-2">{actions.map((action) => <code className="px-2 py-1 bg-slate-100 rounded text-xs" key={action}>{action}</code>)}</div></td></tr>))}</tbody></table></Card>}
    <Card className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr><th scope="col" className="p-4">Peran</th><th scope="col" className="p-4">Cakupan</th><th scope="col" className="p-4">Kewenangan</th></tr></thead><tbody>{RULES.map(([role, scope, actions]) => <tr key={role} className="border-t border-slate-200"><th scope="row" className="p-4 text-pln-navy">{role}</th><td className="p-4">{scope}</td><td className="p-4">{actions}</td></tr>)}</tbody></table></Card>
    <Card className="p-5"><h3 className="font-bold text-pln-navy">Capability konteks aktif</h3><p className="text-sm text-slate-600 mt-1">{auth?.context?.unit?.name || (auth?.context?.mode === 'all' ? 'Monitoring seluruh UPT' : 'Belum memilih unit')}</p><div className="flex flex-wrap gap-2 mt-4">{Object.entries(auth?.capabilities || {}).filter(([, allowed]) => allowed === true).map(([key]) => <code key={key} className="px-2 py-1 bg-slate-100 rounded text-xs">{key}</code>)}</div><p className="mt-4 text-xs text-slate-500">Perubahan role atau penugasan memerlukan login ulang. Reset password akun multi-unit hanya oleh admin pusat.</p></Card>
  </div>;
}
