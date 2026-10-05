// Client-side live hub: satu koneksi SSE untuk seluruh aplikasi.
//
// Halaman cukup memakai hook:
//   useLive(['agenda'], () => reload())      → panggil saat ada agenda berubah
//   useLive('*', () => reload())             → panggil untuk semua perubahan
//
// Payload event hanya berisi { topic, project_id, action } — bukan data. Klien
// melakukan refresh lewat REST API biasa sehingga RBAC tetap di satu tempat.
//
// Jaring pengaman: bila stream SSE belum tersambung / terputus, client
// membandingkan "rev" tiap tabel lewat /api/events/rev (payload kecil) dan
// tetap merefresh halaman yang relevan.

import { useEffect, useRef, useState } from 'react';
import { getToken } from './auth.js';

export const TOPIC = {
  ANY: '*',
  PROJECTS: 'projects',
  PROGRESS: 'progress',
  MILESTONES: 'milestones',
  KURVA: 'kurva',
  TERMINS: 'termins',
  KENDALA: 'kendala',
  DOKUMENTASI: 'dokumentasi',
  DRAWING: 'drawing',
  BOQ: 'boq',
  INSTRUKSI: 'instruksi',
  AMANDEMEN: 'amandemen',
  AGENDA: 'agenda',
  USERS: 'users',
};

// Tabel DB → topic aplikasi (dipakai saat diff rev sebagai fallback).
const TABLE_TOPIC = {
  projects: TOPIC.PROJECTS,
  lokasis: TOPIC.PROJECTS,
  milestones: TOPIC.MILESTONES,
  s_curves: TOPIC.KURVA,
  s_curve_documents: TOPIC.KURVA,
  termin_bayars: TOPIC.TERMINS,
  kendalas: TOPIC.KENDALA,
  dokumentasis: TOPIC.DOKUMENTASI,
  approval_drawings: TOPIC.DRAWING,
  boqs: TOPIC.BOQ,
  boq_groups: TOPIC.BOQ,
  instruksi_kerja: TOPIC.INSTRUKSI,
  amandements: TOPIC.AMANDEMEN,
  agendas: TOPIC.AGENDA,
  users: TOPIC.USERS,
};

const FALLBACK_MS = 10000;
const COALESCE_MS = 300;

const listeners = new Set();
const statusSubs = new Set();
const queued = new Map();

let source = null;
let status = 'idle';
let lastTables = null;
let fallbackTimer = null;
let reconnectTimer = null;

export function liveStatus() {
  return status;
}

function setStatus(next) {
  if (status === next) return;
  status = next;
  for (const fn of statusSubs) fn(next);
}

function onStatusChange(fn) {
  statusSubs.add(fn);
  return () => statusSubs.delete(fn);
}

// Event dari server digabung per topic supaya beberapa perubahan beruntun
// (mis. progres + termin) tidak memicu refresh berulang-ulang.
function queue(topic, meta) {
  const existing = queued.get(topic);
  if (existing) {
    existing.meta = meta;
    return;
  }
  const entry = { meta, timer: null };
  entry.timer = setTimeout(() => {
    queued.delete(topic);
    dispatch(topic, entry.meta);
  }, COALESCE_MS);
  queued.set(topic, entry);
}

function dispatch(topic, meta) {
  for (const l of [...listeners]) {
    if (l.topics && !l.topics.has(TOPIC.ANY) && !l.topics.has(topic)) continue;
    try {
      l.fn({ topic, fallback: false, ...meta });
    } catch (e) {
      console.error('live handler gagal', e);
    }
  }
}

function stopQueued() {
  for (const entry of queued.values()) clearTimeout(entry.timer);
  queued.clear();
}

function closeSource() {
  if (source) {
    try {
      source.close();
    } catch {
      /* sudah tertutup */
    }
    source = null;
  }
}

function connect() {
  if (source || typeof EventSource === 'undefined') return;
  const token = getToken();
  if (!token) return;
  const es = new EventSource(`/api/events/stream?token=${encodeURIComponent(token)}`);
  source = es;
  setStatus('connecting');

  es.addEventListener('open', () => {
    setStatus('live');
    checkRev();
  });
  es.addEventListener('change', (e) => {
    let payload = {};
    try {
      payload = JSON.parse(e.data);
    } catch {
      return;
    }
    if (!payload || !payload.topic || payload.topic === 'connected') return;
    queue(payload.topic, payload);
  });
  es.addEventListener('error', () => {
    if (es.readyState === EventSource.CONNECTING) {
      setStatus('connecting');
      return;
    }
    // CLOSED: EventSource berhenti mencoba. Mulai ulang sendiri.
    closeSource();
    setStatus('offline');
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  if (reconnectTimer || !listeners.size) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 3000);
}

function startFallback() {
  if (fallbackTimer) return;
  fallbackTimer = setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    checkRev();
  }, FALLBACK_MS);
}

function stopFallback() {
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

// Bandingkan rev tiap tabel dengan versi terakhir; dispatch topic yang berubah.
// Dipakai saat stream terputus maupun saat SSE baru tersambung (catch-up).
async function checkRev() {
  if (!getToken()) return;
  try {
    const res = await fetch('/api/events/rev', {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || !data.tables) return;
    const prev = lastTables;
    lastTables = data.tables;
    if (!prev) return;
    const changed = new Set();
    for (const [table, hash] of Object.entries(data.tables)) {
      if (prev[table] === undefined || prev[table] === hash) continue;
      changed.add(TABLE_TOPIC[table] || table);
    }
    if (!changed.size) return;
    for (const topic of changed) queue(topic, { fallback: status !== 'live' });
  } catch {
    /* jaringan putus sebentar, coba lagi pada tick berikutnya */
  }
}

export function disconnectLive() {
  stopQueued();
  closeSource();
  stopFallback();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  lastTables = null;
  listeners.clear();
  setStatus('idle');
}

let windowBound = false;

function bindWindow() {
  if (windowBound || typeof window === 'undefined') return;
  windowBound = true;
  // Refresh saat tab/browser kembali aktif (jaring pengaman tambahan).
  window.addEventListener('focus', () => {
    if (listeners.size) checkRev();
  });
  document.addEventListener('visibilitychange', () => {
    if (listeners.size && document.visibilityState === 'visible') checkRev();
  });
}

function subscribe(topics, fn) {
  const list = Array.isArray(topics) ? topics : [topics];
  const entry = {
    topics: new Set(list.filter(Boolean).map(String)),
    fn,
  };
  listeners.add(entry);
  bindWindow();
  connect();
  startFallback();
  return () => {
    listeners.delete(entry);
    if (!listeners.size) {
      stopQueued();
      closeSource();
      stopFallback();
    }
  };
}

/**
 * Hook realtime.
 * @param {string|string[]} topics  topik yang didengarkan ('*' = semua)
 * @param {(evt: {topic: string, project_id: number|null, action: string|null, fallback: boolean}) => void} onChange
 */
export function useLive(topics, onChange) {
  const key = Array.isArray(topics) ? topics.join(',') : String(topics);
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => subscribe(key.split(','), (evt) => ref.current(evt)), [key]);
}

export function useLiveStatus() {
  const [s, setS] = useState(status);
  useEffect(() => onStatusChange(setS), []);
  return s;
}