export const STATUS_BADGE = {
  'In Progress': 'bg-cyan-100 text-cyan-800 border-cyan-300',
  'BAST 1': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'BAST 2': 'bg-teal-100 text-teal-800 border-teal-300',
  BASTB: 'bg-amber-100 text-amber-800 border-amber-300',
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
    case 'BAST 1':
    case 'BAST 2': return 'bg-emerald-500';
    case 'BASTB': return 'bg-amber-500';
    default: return 'bg-cyan-500';
  }
}

export function deriveKategori(progres, tglSelesaiGaransi, barangDicek) {
  if (Number(progres || 0) >= 100) {
    if (tglSelesaiGaransi && new Date(tglSelesaiGaransi) <= new Date()) return 'BAST 2';
    return 'BAST 1';
  }
  return barangDicek ? 'BASTB' : 'In Progress';
}

export function nocaps(s) {
  return String(s || '').toLowerCase();
}

function smoothstep(f) {
  const x = Math.min(1, Math.max(0, f));
  return x * x * (3 - 2 * x);
}

function monthCount(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const a = new Date(`${startIso}T00:00:00`);
  const b = new Date(`${endIso}T00:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
  return Math.max(1, Math.round((b - a) / (30 * 24 * 3600 * 1000)));
}

// Mirror dari api/_lib/business.js#defaultSCurvePoints untuk pratinjau rincian
// baseline per bulan pada form proyek. Menghasilkan daftar bulan + rencana (%)
// yang naik monoton dan mencapai 100% tepat di Target COD.
export function buildMonthlyBaseline(tglMulai, targetCod, rencana, realisasi = 0) {
  rencana = Math.min(100, Math.max(0, Number(rencana) || 0));
  realisasi = Math.min(100, Math.max(0, Number(realisasi) || 0));
  const now = new Date();
  const n = monthCount(tglMulai, targetCod) || 12;
  const anchor = tglMulai ? new Date(`${tglMulai}T00:00:00`) : now;

  let cur = tglMulai ? Math.round((now - anchor) / (30 * 24 * 3600 * 1000)) : 5;
  cur = Math.min(n - 1, Math.max(0, cur));

  const base = (i) => (n > 1
    ? Math.round(100 * (0.5 + 0.5 * Math.tanh(((i / (n - 1)) * 2 - 1) * 2.5)) * 10) / 10
    : 0);

  const values = Array.from({ length: n }, (_, i) => {
    if (i === cur) return rencana;
    if (i < cur) return Math.min(base(i), rencana);
    const f = (i - cur) / Math.max(1, n - 1 - cur);
    return Math.round((rencana + (100 - rencana) * smoothstep(f)) * 10) / 10;
  });

  for (let i = 1; i < n; i++) {
    if (values[i] < values[i - 1]) values[i] = values[i - 1];
  }

  return values.map((v, i) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1);
    const bulan = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      bulan,
      minggu: `B-${i + 1} (${d.toLocaleString('id-ID', { month: 'short', year: '2-digit' })})`,
      rencana: v,
      realisasi: i === cur ? realisasi : null,
    };
  });
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
  if (status === 'BAST 1' || status === 'BAST 2') {
    return {
      text: 'Pekerjaan selesai 100%',
      shortText: 'Pekerjaan Selesai',
      badgeText: status === 'BAST 2' ? 'BAST 2' : 'BAST 1',
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