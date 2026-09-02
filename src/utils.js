export const STATUS_BADGE = {
  'COD / Energized': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  Testing: 'bg-amber-100 text-amber-800 border-amber-300',
  Critical: 'bg-red-100 text-red-800 border-red-300',
  Planning: 'bg-slate-100 text-slate-800 border-slate-300',
  'In Progress': 'bg-cyan-100 text-cyan-800 border-cyan-300',
};

export const MILESTONE_STATUS_BADGE = {
  Done: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'In Progress': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Pending: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function statusClass(status) {
  return STATUS_BADGE[status] || STATUS_BADGE['In Progress'];
}

export function formatNilaiKontrak(v) {
  const n = Number(v || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function nilaiMilyar(v) {
  const n = Number(v || 0);
  return 'Rp ' + n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
}

export function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function fmtDateShort(d) {
  if (!d) return '-';
  return String(d).slice(0, 10);
}

export function isoDate(d) {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date)) return null;
  return date.toISOString().slice(0, 10);
}

export function tipeShort(t) {
  if (!t) return '';
  return t.replace('(Transmisi)', '').replace('(Ekstra Tinggi)', '').replace('(Kabel Tanah)', '').trim();
}

export function uipShort(u) {
  if (!u) return '';
  return u.split(' (')[0];
}

export function deviasiLabel(dev) {
  const n = Number(dev || 0);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function deviasiChip(dev) {
  const n = Number(dev || 0);
  if (n < 0) {
    return { label: `${n.toFixed(1)}% (Terlambat)`, cls: 'bg-red-100 text-red-700 border-red-300' };
  }
  return { label: `+${n.toFixed(1)}% (On Track)`, cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' };
}

export function progressColor(status) {
  switch (status) {
    case 'Critical': return 'bg-red-500';
    case 'COD / Energized': return 'bg-emerald-500';
    case 'Testing': return 'bg-amber-500';
    default: return 'bg-cyan-500';
  }
}

export function nocaps(s) {
  return String(s || '').toLowerCase();
}