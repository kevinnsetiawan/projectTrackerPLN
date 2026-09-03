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
  if (Math.abs(n) >= 1e9) {
    const m = n / 1e9;
    return 'Rp ' + m.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M';
  }
  if (Math.abs(n) >= 1e6) {
    const j = n / 1e6;
    return 'Rp ' + j.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Jt';
  }
  return 'Rp ' + n.toLocaleString('id-ID');
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

export function calcContractDuration(tglMulai, targetCod) {
  if (!tglMulai || !targetCod) return null;
  const start = new Date(tglMulai);
  const end = new Date(targetCod);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  const now = new Date();
  const totalMs = end - start;
  const totalDays = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)));

  const elapsedMs = now - start;
  const elapsedDays = Math.ceil(elapsedMs / (1000 * 60 * 60 * 24));

  const remainingMs = end - now;
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  const timeProgressPct = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    totalDays,
    elapsedDays: Math.max(0, elapsedDays),
    remainingDays,
    timeProgressPct,
    isOverdue: remainingDays < 0,
    isExpiringSoon: remainingDays >= 0 && remainingDays <= 30,
  };
}

export function formatSisaKontrak(tglMulai, targetCod, status) {
  if (status === 'COD / Energized') {
    return {
      text: 'COD Complete (Energized)',
      shortText: 'COD Selesai',
      badgeText: 'Telah COD',
      daysText: '0 Hari',
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      timeProgressPct: 100,
      cls: 'text-emerald-700 bg-emerald-50 border-emerald-300',
      statusType: 'completed',
    };
  }

  const calc = calcContractDuration(tglMulai, targetCod);
  if (!calc) {
    return {
      text: 'Jadwal belum diatur',
      shortText: 'Belum diatur',
      badgeText: 'Belum Diatur',
      daysText: '-',
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: null,
      timeProgressPct: 0,
      cls: 'text-slate-600 bg-slate-50 border-slate-200',
      statusType: 'unknown',
    };
  }

  const { totalDays, elapsedDays, remainingDays, timeProgressPct, isOverdue, isExpiringSoon } = calc;

  if (isOverdue) {
    const overdueDays = Math.abs(remainingDays);
    return {
      text: `Terlewat ${overdueDays} hari dari target COD`,
      shortText: `Overdue ${overdueDays} Hari`,
      badgeText: `Overdue ${overdueDays}H`,
      daysText: `-${overdueDays} Hari`,
      totalDays,
      elapsedDays,
      remainingDays,
      timeProgressPct,
      cls: 'text-red-700 bg-red-50 border-red-300 font-bold',
      statusType: 'overdue',
    };
  }

  if (isExpiringSoon) {
    return {
      text: `Sisa ${remainingDays} hari (${timeProgressPct}% waktu berlalu)`,
      shortText: `Sisa ${remainingDays} Hari (Kritis)`,
      badgeText: `Sisa ${remainingDays}H`,
      daysText: `${remainingDays} Hari`,
      totalDays,
      elapsedDays,
      remainingDays,
      timeProgressPct,
      cls: 'text-amber-700 bg-amber-50 border-amber-300 font-semibold',
      statusType: 'warning',
    };
  }

  return {
    text: `Sisa ${remainingDays} hari (${timeProgressPct}% waktu berlalu)`,
    shortText: `Sisa ${remainingDays} Hari`,
    badgeText: `Sisa ${remainingDays}H`,
    daysText: `${remainingDays} Hari`,
    totalDays,
    elapsedDays,
    remainingDays,
    timeProgressPct,
    cls: 'text-cyan-800 bg-cyan-50 border-cyan-300',
    statusType: 'normal',
  };
}