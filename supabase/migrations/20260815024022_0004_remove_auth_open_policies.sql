/*
# Remove Auth — Open Access Policies

## Overview
Removes user-scoped RLS policies and replaces with open-access policies
(TO anon, authenticated) since the app no longer has login. All user_id
columns are made nullable with no default.

## Changes
1. Drop NOT NULL and DEFAULT auth.uid() on all user_id columns.
2. Drop UNIQUE constraint on pengaturan_margin.user_id.
3. Replace all owner-scoped RLS policies with open-access policies.
*/

-- Drop NOT NULL and DEFAULT on user_id columns
ALTER TABLE bahan_baku ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bahan_baku ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE produk ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE produk ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE resep_produk ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE resep_produk ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE biaya_tetap ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE biaya_tetap ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE biaya_variabel_lain ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE biaya_variabel_lain ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE biaya_investasi ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE biaya_investasi ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE transaksi ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE transaksi ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE todo ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE todo ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE daftar_belanja ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE daftar_belanja ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE kategori_produk ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE kategori_produk ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE pengaturan_margin ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE pengaturan_margin ALTER COLUMN user_id DROP DEFAULT;

-- Drop UNIQUE constraint on pengaturan_margin.user_id
ALTER TABLE pengaturan_margin DROP CONSTRAINT IF EXISTS pengaturan_margin_user_id_key;

-- ============================================================
-- bahan_baku
-- ============================================================
DROP POLICY IF EXISTS "select_own_bahan_baku" ON bahan_baku;
CREATE POLICY "select_bahan_baku" ON bahan_baku FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_bahan_baku" ON bahan_baku;
CREATE POLICY "insert_bahan_baku" ON bahan_baku FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_bahan_baku" ON bahan_baku;
CREATE POLICY "update_bahan_baku" ON bahan_baku FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_bahan_baku" ON bahan_baku;
CREATE POLICY "delete_bahan_baku" ON bahan_baku FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- produk
-- ============================================================
DROP POLICY IF EXISTS "select_own_produk" ON produk;
CREATE POLICY "select_produk" ON produk FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_produk" ON produk;
CREATE POLICY "insert_produk" ON produk FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_produk" ON produk;
CREATE POLICY "update_produk" ON produk FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_produk" ON produk;
CREATE POLICY "delete_produk" ON produk FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- resep_produk
-- ============================================================
DROP POLICY IF EXISTS "select_own_resep" ON resep_produk;
CREATE POLICY "select_resep" ON resep_produk FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_resep" ON resep_produk;
CREATE POLICY "insert_resep" ON resep_produk FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_resep" ON resep_produk;
CREATE POLICY "update_resep" ON resep_produk FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_resep" ON resep_produk;
CREATE POLICY "delete_resep" ON resep_produk FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- biaya_tetap
-- ============================================================
DROP POLICY IF EXISTS "select_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "select_biaya_tetap" ON biaya_tetap FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "insert_biaya_tetap" ON biaya_tetap FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "update_biaya_tetap" ON biaya_tetap FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_biaya_tetap" ON biaya_tetap;
CREATE POLICY "delete_biaya_tetap" ON biaya_tetap FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- biaya_variabel_lain
-- ============================================================
DROP POLICY IF EXISTS "select_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "select_biaya_variabel" ON biaya_variabel_lain FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "insert_biaya_variabel" ON biaya_variabel_lain FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "update_biaya_variabel" ON biaya_variabel_lain FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_biaya_variabel" ON biaya_variabel_lain;
CREATE POLICY "delete_biaya_variabel" ON biaya_variabel_lain FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- biaya_investasi
-- ============================================================
DROP POLICY IF EXISTS "select_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "select_biaya_investasi" ON biaya_investasi FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "insert_biaya_investasi" ON biaya_investasi FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "update_biaya_investasi" ON biaya_investasi FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_biaya_investasi" ON biaya_investasi;
CREATE POLICY "delete_biaya_investasi" ON biaya_investasi FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- transaksi
-- ============================================================
DROP POLICY IF EXISTS "select_own_transaksi" ON transaksi;
CREATE POLICY "select_transaksi" ON transaksi FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_transaksi" ON transaksi;
CREATE POLICY "insert_transaksi" ON transaksi FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_transaksi" ON transaksi;
CREATE POLICY "update_transaksi" ON transaksi FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_transaksi" ON transaksi;
CREATE POLICY "delete_transaksi" ON transaksi FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- todo
-- ============================================================
DROP POLICY IF EXISTS "select_own_todo" ON todo;
CREATE POLICY "select_todo" ON todo FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_todo" ON todo;
CREATE POLICY "insert_todo" ON todo FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_todo" ON todo;
CREATE POLICY "update_todo" ON todo FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_todo" ON todo;
CREATE POLICY "delete_todo" ON todo FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- daftar_belanja
-- ============================================================
DROP POLICY IF EXISTS "select_own_belanja" ON daftar_belanja;
CREATE POLICY "select_belanja" ON daftar_belanja FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_belanja" ON daftar_belanja;
CREATE POLICY "insert_belanja" ON daftar_belanja FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_belanja" ON daftar_belanja;
CREATE POLICY "update_belanja" ON daftar_belanja FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_belanja" ON daftar_belanja;
CREATE POLICY "delete_belanja" ON daftar_belanja FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- kategori_produk
-- ============================================================
DROP POLICY IF EXISTS "select_own_kategori" ON kategori_produk;
CREATE POLICY "select_kategori" ON kategori_produk FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_kategori" ON kategori_produk;
CREATE POLICY "insert_kategori" ON kategori_produk FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_kategori" ON kategori_produk;
CREATE POLICY "update_kategori" ON kategori_produk FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_kategori" ON kategori_produk;
CREATE POLICY "delete_kategori" ON kategori_produk FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- pengaturan_margin
-- ============================================================
DROP POLICY IF EXISTS "select_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "select_pengaturan" ON pengaturan_margin FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "insert_pengaturan" ON pengaturan_margin FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "update_pengaturan" ON pengaturan_margin FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "delete_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "delete_pengaturan" ON pengaturan_margin FOR DELETE TO anon, authenticated USING (true);
