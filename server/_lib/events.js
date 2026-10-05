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

import { getPool } from './db.js';

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
let seq = 0;

function send(client, payload) {
  try {
    client.res.write(`id: ${payload.seq}\nevent: change\ndata: ${JSON.stringify(payload)}\n\n`);
  } catch {
    removeClient(client);
  }
}

function deliver(topic, meta = {}, fromRemote = false) {
  const payload = {
    seq: (seq += 1),
    topic,
    project_id: meta.project_id ?? meta.projectId ?? null,
    action: meta.action || null,
    actor: meta.actor || null,
    at: Date.now(),
    remote: Boolean(fromRemote),
  };
  for (const client of [...clients]) {
    if (client.topics && !client.topics.has(topic)) continue;
    send(client, payload);
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

export function clientCount() {
  return clients.size;
}

// Dipanggil sekali saat klien pertama kali tersambung.
export function attachClient(req, res, user, topics) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
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

  const client = { res, user, topics: topics && topics.size ? topics : null };
  client.heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      removeClient(client);
    }
  }, HEARTBEAT_MS);
  if (typeof client.heartbeat.unref === 'function') client.heartbeat.unref();
  clients.add(client);

  // Event pertama: konfirmasi koneksi + jumlah klien realtime.
  send(client, { seq: (seq += 1), topic: 'connected', project_id: null, action: null, at: Date.now(), peers: clients.size, remote: false });

  const close = () => removeClient(client);
  req.on('close', close);
  req.on('error', close);
  res.on('error', close);
  ensurePgListener();
  return client;
}

// Kirim perubahan ke semua klien realtime + diteruskan ke instance lain (pg).
export async function broadcast(topic, meta = {}) {
  deliver(topic, meta, false);
  if (process.env.DB_DRIVER !== 'pg') return;
  try {
    const payload = JSON.stringify({
      origin: INSTANCE_ID,
      seq: (seq += 1),
      topic,
      project_id: meta.project_id ?? meta.projectId ?? null,
      action: meta.action || null,
      at: Date.now(),
    });
    await getPool().query('SELECT pg_notify($1, $2)', [CHANNEL, payload]);
  } catch (e) {
    console.error('broadcast pg_notify gagal:', e.message);
  }
}

async function ensurePgListener() {
  if (listenerStarted || process.env.DB_DRIVER !== 'pg') return;
  listenerStarted = true;
  try {
    const client = await getPool().connect();
    client.on('notification', (msg) => {
      if (msg.channel !== CHANNEL || !msg.payload) return;
      try {
        const data = JSON.parse(msg.payload);
        if (data.origin === INSTANCE_ID) return;
        deliver(data.topic, { project_id: data.project_id, action: data.action }, true);
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