// Realtime event hub — Server-Sent Events (SSE).
//
// Pola: route mutasi memanggil broadcast(TOPIC.X, { project_id }) setelah data
// berubah. Setiap klien yang terhubung ke GET /api/events/stream menerima event
// "change" berisi { topic, project_id } — TANPA data payload. Klien lalu
// me-refresh lewat endpoint REST biasa, sehingga RBAC tetap berlaku di satu
// tempat dan tidak ada data sensitif yang bocor lewat stream.
//
// Cross-instance: bila driver = pg, broadcast() juga mengirim pg_notify sehingga
// instance server lain (Vercel multi-instance / banyak worker) meneruskan event
// ke kliennya masing-masing. Broadcast lokal di-skip untuk event yang datang
// dari instance sendiri lewat payload `origin`.

import { connectDirectClient, getPool, isPg, supportsListen, query } from './db.js';
import { canEvent, refreshIdentity } from './scope.js';

export const TOPIC = {
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

const CHANNEL = 'protrack_events';
const HEARTBEAT_MS = 25000;

const INSTANCE_ID = Math.random().toString(36).slice(2);

const clients = new Set();
let listenerStarted = false;
let listenDisabled = false;
let seq = 0;

function send(client, payload) {
  try {
    const safe = { ...payload, seq: ++client.seq };
    client.res.write(`id: ${safe.seq}\nevent: change\ndata: ${JSON.stringify(safe)}\n\n`);
  } catch {
    removeClient(client);
  }
}

async function deliver(topic, meta = {}, fromRemote = false) {
  const payload = {
    topic,
    project_id: meta.project_id ?? meta.projectId ?? null,
    action: meta.action || null,
    actor: meta.actor || null,
    at: Date.now(),
    remote: Boolean(fromRemote),
  };
  for (const client of [...clients]) {
    if (client.topics && !client.topics.has(topic)) continue;
    try {
      await refreshIdentity(client.req);
      if (await canEvent(client.req, { ...meta, topic })) send(client, payload);
    } catch {
      removeClient(client);
    }
  }
}

function removeClient(client) {
  if (!clients.has(client)) return;
  clients.delete(client);
  clearInterval(client.heartbeat);
  try {
    client.res.end();
  } catch {
    /* socket sudah tertutup */
  }
}

export function clientCount(req) {
  if (!req?.user) return 0;
  return [...clients].filter(c => c.user.id === req.user.id).length;
}

// Dipanggil sekali saat klien pertama kali tersambung.
export function attachClient(req, res, user, topics) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'private, no-store, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
  if (req.socket) {
    req.socket.setTimeout(0);
    req.socket.setNoDelay(true);
    req.socket.setKeepAlive(true);
  }
  res.write('retry: 3000\n\n');

  const client = { req, res, user, seq: 0, topics: topics && topics.size ? topics : null };
  client.heartbeat = setInterval(async () => {
    try {
      await refreshIdentity(req);
      res.write(': ping\n\n');
    } catch {
      removeClient(client);
    }
  }, HEARTBEAT_MS);
  if (typeof client.heartbeat.unref === 'function') client.heartbeat.unref();
  clients.add(client);

  // Event pertama: konfirmasi koneksi + jumlah klien realtime.
  send(client, { topic: 'connected', project_id: null, action: null, at: Date.now(), peers: clientCount(req), remote: false });

  const close = () => removeClient(client);
  req.on('close', close);
  req.on('error', close);
  res.on('error', close);
  ensurePgListener();
  return client;
}

// Kirim perubahan ke semua klien realtime + diteruskan ke instance lain (pg).
export async function broadcast(topic, meta = {}) {
  // Derive the owning unit from the resource; deletion callers preserve it.
  if (meta.project_id && !meta.unit_id) {
    meta = { ...meta, unit_id: (await query('SELECT unit_id FROM projects WHERE id=$1', [meta.project_id])).rows[0]?.unit_id };
  }
  await deliver(topic, meta, false);
  if (!isPg()) return;
  try {
    const payload = JSON.stringify({
      origin: INSTANCE_ID,
      seq: (seq += 1),
      topic,
      project_id: meta.project_id ?? meta.projectId ?? null,
      unit_id: meta.unit_id ?? null,
      audience_vendor_ids: meta.audience_vendor_ids,
      actor: meta.actor || null,
      action: meta.action || null,
      at: Date.now(),
    });
    await getPool().query('SELECT pg_notify($1, $2)', [CHANNEL, payload]);
  } catch (e) {
    console.error('broadcast pg_notify gagal:', e.message);
  }
}

async function ensurePgListener() {
  if (listenerStarted || !isPg()) return;
  if (!supportsListen()) {
    // Pooler mode transaksi tidak mendukung LISTEN/NOTIFY. Jangan buang slot
    // pooler untuk langganan yang tidak akan pernah menerima event: realtime
    // antar-instance dimatikan, klien tetap menyegarkan lewat
    // GET /api/events/rev (jaring pengaman polling) dan broadcast lokal tetap jalan.
    if (!listenDisabled) {
      listenDisabled = true;
      console.log('LISTEN dilewati: mode pooler transaksi (pgbouncer/port 6543) tidak mendukung LISTEN/NOTIFY.');
    }
    return;
  }
  listenerStarted = true;
  try {
    // Koneksi KHUSUS di luar pool: listener ditahan permanen, jangan sampai
    // menghabiskan slot pg.Pool (dulu menyebabkan "timeout exceeded when trying
    // to connect" pada seluruh request lain saat PG_POOL_MAX kecil).
    const client = await connectDirectClient();
    client.on('notification', (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      try {
        const data = JSON.parse(msg.payload);
        if (data.origin === INSTANCE_ID) return;
        deliver(data.topic, { project_id: data.project_id, unit_id: data.unit_id, audience_vendor_ids: data.audience_vendor_ids, action: data.action, actor: data.actor }, true).catch(() => {});
      } catch {
        /* payload rusak, abaikan */
      }
    });
    client.on('error', () => {
      listenerStarted = false;
    });
    await client.query(`LISTEN ${CHANNEL}`);
  } catch (e) {
    listenerStarted = false;
    console.error('LISTEN protrack_events gagal:', e.message);
  }
}
