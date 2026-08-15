/*
# Custom Product Categories

## Overview
Adds a new `kategori_produk` table so product categories are managed as data
(not hardcoded in the app). Adds a `kategori_id` FK column to the existing
`produk` table, migrates existing text-based categories into the new table,
and sets up owner-scoped RLS policies.

## New Table: kategori_produk
- id (uuid PK)
- user_id (uuid, defaults to auth.uid(), owner-scoped)
- nama_kategori (text) — e.g. "Buket", "Papan Bunga"
- deskripsi (text, nullable) — optional notes
- urutan_tampil (integer, default 0) — display order in dropdowns
- aktif (boolean, default true) — can be deactivated without deletion
- created_at (timestamptz)

## Modified Table: produk
- New column: kategori_id (uuid, nullable, FK to kategori_produk.id ON DELETE SET NULL)
- The old `kategori` text column is KEPT for backward compatibility and data safety.
  New writes will use kategori_id; the app reads kategori_id first, falls back to kategori text.

## Data Migration
1. Seed default categories for each user based on existing distinct kategori values.
2. Update produk rows to set kategori_id matching their text kategori.

## Security
- RLS enabled on kategori_produk.
- 4 owner-scoped CRUD policies (TO authenticated, auth.uid() = user_id).
*/

-- ============================================================
-- Create kategori_produk table
-- ============================================================
CREATE TABLE IF NOT EXISTS kategori_produk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  nama_kategori text NOT NULL,
  deskripsi text,
  urutan_tampil integer NOT NULL DEFAULT 0,
  aktif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kategori_produk ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_kategori" ON kategori_produk;
CREATE POLICY "select_own_kategori" ON kategori_produk FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_kategori" ON kategori_produk;
CREATE POLICY "insert_own_kategori" ON kategori_produk FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_kategori" ON kategori_produk;
CREATE POLICY "update_own_kategori" ON kategori_produk FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_kategori" ON kategori_produk;
CREATE POLICY "delete_own_kategori" ON kategori_produk FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Add kategori_id column to produk
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'produk' AND column_name = 'kategori_id'
  ) THEN
    ALTER TABLE produk ADD COLUMN kategori_id uuid REFERENCES kategori_produk(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- Migrate existing text categories into kategori_produk
-- For each user, find distinct kategori values in produk,
-- create kategori_produk rows, and link produk.kategori_id.
-- ============================================================
DO $$
DECLARE
  user_rec RECORD;
  kat_rec RECORD;
  new_kat_id uuid;
  urutan int;
BEGIN
  FOR user_rec IN SELECT DISTINCT user_id FROM produk WHERE kategori_id IS NULL LOOP
    urutan := 0;
    FOR kat_rec IN SELECT DISTINCT kategori FROM produk WHERE user_id = user_rec.rec_user_id AND kategori IS NOT NULL AND kategori != '' ORDER BY kategori LOOP
      -- Check if a kategori_produk with this name already exists for this user
      SELECT id INTO new_kat_id FROM kategori_produk WHERE user_id = user_rec.rec_user_id AND nama_kategori = kat_rec.kategori LIMIT 1;
      IF new_kat_id IS NULL THEN
        INSERT INTO kategori_produk (user_id, nama_kategori, urutan_tampil)
        VALUES (user_rec.rec_user_id, kat_rec.kategori, urutan)
        RETURNING id INTO new_kat_id;
        urutan := urutan + 1;
      END IF;
      -- Link produk rows
      UPDATE produk SET kategori_id = new_kat_id
      WHERE user_id = user_rec.rec_user_id AND kategori = kat_rec.kategori AND kategori_id IS NULL;
    END LOOP;
  END LOOP;
END $$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kategori_produk_user ON kategori_produk(user_id);
CREATE INDEX IF NOT EXISTS idx_kategori_produk_urutan ON kategori_produk(urutan_tampil);
CREATE INDEX IF NOT EXISTS idx_produk_kategori_id ON produk(kategori_id);
