// PostgreSQL schema for PLN Pro-Track.

export const DDL = `
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL,
  tegangan TEXT NOT NULL DEFAULT '150 kV',
  uip TEXT NOT NULL,
  upp TEXT,
  lokasi TEXT NOT NULL,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  kontraktor TEXT NOT NULL,
  nomor_kontrak TEXT,
  nilai_kontrak NUMERIC(16,2) NOT NULL DEFAULT 0,
  tgl_mulai DATE,
  target_cod DATE,
  status TEXT NOT NULL DEFAULT 'In Progress',
  progres_rencana NUMERIC(5,2) NOT NULL DEFAULT 0,
  progres_realisasi NUMERIC(5,2) NOT NULL DEFAULT 0,
  deviasi NUMERIC(5,2) NOT NULL DEFAULT 0,
  penyerapan_anggaran NUMERIC(5,2) NOT NULL DEFAULT 0,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  bobot NUMERIC(5,2) NOT NULL DEFAULT 0,
  rencana NUMERIC(5,2) NOT NULL DEFAULT 0,
  realisasi NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  urutan INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS s_curves (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  minggu TEXT NOT NULL,
  rencana NUMERIC(5,2) NOT NULL DEFAULT 0,
  realisasi NUMERIC(5,2),
  urutan INTEGER NOT NULL DEFAULT 0,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kendalas (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kode_kendala TEXT,
  kategori TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  dampak TEXT,
  tindakan_mitigasi TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  tgl_lapor DATE,
  tgl_selesai DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dokumentasis (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  tahap TEXT,
  foto TEXT NOT NULL,
  tgl DATE,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_scurves_project ON s_curves(project_id, urutan);
CREATE INDEX IF NOT EXISTS idx_kendalas_project ON kendalas(project_id);
CREATE INDEX IF NOT EXISTS idx_dokumentasis_project ON dokumentasis(project_id);
`;