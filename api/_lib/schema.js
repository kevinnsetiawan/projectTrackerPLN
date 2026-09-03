// PostgreSQL schema for PLN Pro-Track.

export const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendor' CHECK (role IN ('vendor','dalkon','enjin','admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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
  boq_image TEXT,
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

CREATE TABLE IF NOT EXISTS termin_bayars (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  nominal NUMERIC(16,2) NOT NULL DEFAULT 0,
  bobot NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Belum Bayar',
  tgl_bayar DATE,
  urutan INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boqs (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uraian TEXT NOT NULL,
  satuan TEXT,
  volume NUMERIC(16,2),
  harga_satuan NUMERIC(16,2),
  total NUMERIC(16,2),
  foto_vendor TEXT,
  foto_dalkon TEXT,
  urutan INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_drawings (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  nomor_drawing TEXT,
  kategori TEXT DEFAULT 'Sipil & Konstruksi',
  file_vendor TEXT NOT NULL,
  tgl_upload_vendor DATE DEFAULT CURRENT_DATE,
  hardfile_vendor BOOLEAN DEFAULT false,
  tgl_hardfile_vendor DATE,
  nodin_kons BOOLEAN DEFAULT false,
  nomor_nodin TEXT,
  tgl_nodin DATE,
  hardfile_ke_enjin BOOLEAN DEFAULT false,
  tgl_hardfile_ke_enjin DATE,
  enjin_review_status TEXT DEFAULT 'Pending',
  tgl_enjin_review DATE,
  status_approval TEXT DEFAULT 'Menunggu Hardfile',
  catatan_enjin TEXT,
  file_enjin TEXT,
  tgl_approval_enjin DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_scurves_project ON s_curves(project_id, urutan);
CREATE INDEX IF NOT EXISTS idx_kendalas_project ON kendalas(project_id);
CREATE INDEX IF NOT EXISTS idx_dokumentasis_project ON dokumentasis(project_id);
CREATE INDEX IF NOT EXISTS idx_termin_bayars_project ON termin_bayars(project_id);
CREATE INDEX IF NOT EXISTS idx_boqs_project ON boqs(project_id, urutan);
CREATE INDEX IF NOT EXISTS idx_approval_drawings_project ON approval_drawings(project_id);
`;