/*
# Flower Shop Management — Full Schema

## Overview
Creates the complete database schema for an all-in-one flower shop management app.
The app has sign-in (Supabase email/password auth), so all tables are owner-scoped
to the authenticated user via `user_id` with `auth.uid()` defaults and RLS policies.

## Tables

### bahan_baku (raw materials)
- id (uuid PK)
- nama (text) — e.g. "Mawar Merah"
- satuan (text) — tangkai/meter/pcs
- harga_beli_per_satuan (numeric) — latest purchase price
- stok_saat_ini (numeric) — current stock
- stok_minimum (numeric) — low-stock threshold
- updated_at (timestamptz)

### produk (products)
- id (uuid PK)
- nama_produk (text)
- harga_jual (numeric) — selling price
- kategori (text)
- foto_url (text)

### resep_produk (bill of materials: product <-> material)
- id (uuid PK)
- produk_id (uuid FK produk)
- bahan_baku_id (uuid FK bahan_baku)
- jumlah_dibutuhkan (numeric)

### biaya_tetap (fixed monthly costs)
- id (uuid PK)
- nama_biaya (text)
- jumlah_per_bulan (numeric)
- tanggal_mulai (date)
- aktif (boolean)

### biaya_variabel_lain (other variable costs)
- id (uuid PK)
- nama (text)
- jumlah (numeric)
- tanggal (date)

### biaya_investasi (capital expenditure / assets)
- id (uuid PK)
- nama_aset (text)
- nilai (numeric)
- tanggal_beli (date)
- estimasi_umur_pakai_bulan (numeric) — useful life in months

### transaksi (transactions: income & expense)
- id (uuid PK)
- tanggal (date)
- jenis (text) — 'masuk' (income) | 'keluar' (expense)
- kategori (text)
- jumlah (numeric)
- keterangan (text)
- produk_id (uuid FK produk, nullable)
- qty (numeric, nullable)

### todo (daily tasks)
- id (uuid PK)
- tanggal (date)
- deskripsi (text)
- status (text) — 'belum' | 'selesai'
- prioritas (text) — 'rendah' | 'sedang' | 'tinggi'
- berulang (boolean) — recurring task

### daftar_belanja (shopping list for restock)
- id (uuid PK)
- bahan_baku_id (uuid FK bahan_baku)
- jumlah_dibutuhkan (numeric)
- status (text) — 'belum' | 'sudah'
- tanggal (date)

## Security
- RLS enabled on every table.
- 4 policies (select/insert/update/delete) per table, scoped TO authenticated
  with ownership check on user_id. Child tables (resep_produk, daftar_belanja,
  transaksi with produk) are scoped through ownership via user_id column directly.
- All owner columns default to auth.uid() so inserts omitting user_id succeed.
*/

-- ============================================================
-- bahan_baku
-- ============================================================
CREATE TABLE IF NOT EXISTS bahan_baku (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama text NOT NULL,
  satuan text NOT NULL DEFAULT 'pcs',
  harga_beli_per_satuan numeric NOT NULL DEFAULT 0,
  stok_saat_ini numeric NOT NULL DEFAULT 0,
  stok_minimum numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bahan_baku ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_bahan_baku" ON bahan_baku;
CREATE POLICY "select_own_bahan_baku" ON bahan_baku FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bahan_baku" ON bahan_baku;
CREATE POLICY "insert_own_bahan_baku" ON bahan_baku FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_bahan_baku" ON bahan_baku;
CREATE POLICY "update_own_bahan_baku" ON bahan_baku FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bahan_baku" ON bahan_baku;
CREATE POLICY "delete_own_bahan_baku" ON bahan_baku FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- produk
-- ============================================================
CREATE TABLE IF NOT EXISTS produk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_produk text NOT NULL,
  harga_jual numeric NOT NULL DEFAULT 0,
  kategori text NOT NULL DEFAULT 'Lainnya',
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE produk ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_produk" ON produk;
CREATE POLICY "select_own_produk" ON produk FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_produk" ON produk;
CREATE POLICY "insert_own_produk" ON produk FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_produk" ON produk;
CREATE POLICY "update_own_produk" ON produk FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_produk" ON produk;
CREATE POLICY "delete_own_produk" ON produk FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- resep_produk (bill of materials)
-- ============================================================
CREATE TABLE IF NOT EXISTS resep_produk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  produk_id uuid NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  bahan_baku_id uuid NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
  jumlah_dibutuhkan numeric NOT NULL DEFAULT 1
);
ALTER TABLE resep_produk ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_resep" ON resep_produk;
CREATE POLICY "select_own_resep" ON resep_produk FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_resep" ON resep_produk;
CREATE POLICY "insert_own_resep" ON resep_produk FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_resep" ON resep_produk;
CREATE POLICY "update_own_resep" ON resep_produk FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_resep" ON resep_produk;
CREATE POLICY "delete_own_resep" ON resep_produk FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- biaya_tetap (fixed monthly costs)
-- ============================================================
CREATE TABLE IF NOT EXISTS biaya_tetap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_biaya text NOT NULL,
  jumlah_per_bulan numeric NOT NULL DEFAULT 0,
  tanggal_mulai date,
  aktif boolean NOT NULL DEFAULT true
);
ALTER TABLE biaya_tetap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "select_own_biaya_tetap" ON biaya_tetap FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "insert_own_biaya_tetap" ON biaya_tetap FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "update_own_biaya_tetap" ON biaya_tetap FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "delete_own_biaya_tetap" ON biaya_tetap FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- biaya_variabel_lain (other variable costs)
-- ============================================================
CREATE TABLE IF NOT EXISTS biaya_variabel_lain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama text NOT NULL,
  jumlah numeric NOT NULL DEFAULT 0,
  tanggal date NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE biaya_variabel_lain ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "select_own_biaya_variabel" ON biaya_variabel_lain FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "insert_own_biaya_variabel" ON biaya_variabel_lain FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "update_own_biaya_variabel" ON biaya_variabel_lain FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "delete_own_biaya_variabel" ON biaya_variabel_lain FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- biaya_investasi (capital expenditure)
-- ============================================================
CREATE TABLE IF NOT EXISTS biaya_investasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_aset text NOT NULL,
  nilai numeric NOT NULL DEFAULT 0,
  tanggal_beli date,
  estimasi_umur_pakai_bulan numeric NOT NULL DEFAULT 12
);
ALTER TABLE biaya_investasi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "select_own_biaya_investasi" ON biaya_investasi FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "insert_own_biaya_investasi" ON biaya_investasi FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "update_own_biaya_investasi" ON biaya_investasi FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "delete_own_biaya_investasi" ON biaya_investasi FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- transaksi (transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS transaksi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  jenis text NOT NULL DEFAULT 'masuk',
  kategori text NOT NULL DEFAULT 'Penjualan',
  jumlah numeric NOT NULL DEFAULT 0,
  keterangan text,
  produk_id uuid REFERENCES produk(id) ON DELETE SET NULL,
  qty numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_transaksi" ON transaksi;
CREATE POLICY "select_own_transaksi" ON transaksi FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_transaksi" ON transaksi;
CREATE POLICY "insert_own_transaksi" ON transaksi FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_transaksi" ON transaksi;
CREATE POLICY "update_own_transaksi" ON transaksi FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_transaksi" ON transaksi;
CREATE POLICY "delete_own_transaksi" ON transaksi FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- todo (daily tasks)
-- ============================================================
CREATE TABLE IF NOT EXISTS todo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  deskripsi text NOT NULL,
  status text NOT NULL DEFAULT 'belum',
  prioritas text NOT NULL DEFAULT 'sedang',
  berulang boolean NOT NULL DEFAULT false
);
ALTER TABLE todo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_todo" ON todo;
CREATE POLICY "select_own_todo" ON todo FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_todo" ON todo;
CREATE POLICY "insert_own_todo" ON todo FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_todo" ON todo;
CREATE POLICY "update_own_todo" ON todo FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_todo" ON todo;
CREATE POLICY "delete_own_todo" ON todo FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- daftar_belanja (shopping list)
-- ============================================================
CREATE TABLE IF NOT EXISTS daftar_belanja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  bahan_baku_id uuid NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
  jumlah_dibutuhkan numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'belum',
  tanggal date NOT NULL DEFAULT CURRENT_DATE
);
ALTER TABLE daftar_belanja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_belanja" ON daftar_belanja;
CREATE POLICY "select_own_belanja" ON daftar_belanja FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_belanja" ON daftar_belanja;
CREATE POLICY "insert_own_belanja" ON daftar_belanja FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_belanja" ON daftar_belanja;
CREATE POLICY "update_own_belanja" ON daftar_belanja FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_belanja" ON daftar_belanja;
CREATE POLICY "delete_own_belanja" ON daftar_belanja FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bahan_baku_user ON bahan_baku(user_id);
CREATE INDEX IF NOT EXISTS idx_produk_user ON produk(user_id);
CREATE INDEX IF NOT EXISTS idx_resep_produk_user ON resep_produk(user_id);
CREATE INDEX IF NOT EXISTS idx_resep_produk_produk ON resep_produk(produk_id);
CREATE INDEX IF NOT EXISTS idx_biaya_tetap_user ON biaya_tetap(user_id);
CREATE INDEX IF NOT EXISTS idx_biaya_variabel_user ON biaya_variabel_lain(user_id);
CREATE INDEX IF NOT EXISTS idx_biaya_investasi_user ON biaya_investasi(user_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_user ON transaksi(user_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_todo_user ON todo(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_tanggal ON todo(tanggal);
CREATE INDEX IF NOT EXISTS idx_belanja_user ON daftar_belanja(user_id);

-- ============================================================
-- updated_at trigger for bahan_baku
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bahan_baku_updated ON bahan_baku;
CREATE TRIGGER trg_bahan_baku_updated
  BEFORE UPDATE ON bahan_baku
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();