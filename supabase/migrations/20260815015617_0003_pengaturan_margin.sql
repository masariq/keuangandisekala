/*
# Margin Settings Table

## Overview
Creates a `pengaturan_margin` table so each user can customize their margin
thresholds and waste percentage. These settings drive the HPP calculator's
price recommendations and margin health indicators across the app.

## New Table: pengaturan_margin
- id (uuid PK)
- user_id (uuid, defaults to auth.uid(), owner-scoped, UNIQUE — one row per user)
- margin_kompetitif (numeric, default 28) — competitive margin %
- margin_standar (numeric, default 40) — standard margin %
- margin_premium (numeric, default 55) — premium margin %
- margin_minimum_warning (numeric, default 20) — below this %, show red/yellow alert
- persen_waste_default (numeric, default 10) — average flower waste %, added to HPP
- created_at (timestamptz)
- updated_at (timestamptz)

## Security
- RLS enabled on pengaturan_margin.
- 4 owner-scoped CRUD policies (TO authenticated, auth.uid() = user_id).
*/

CREATE TABLE IF NOT EXISTS pengaturan_margin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  margin_kompetitif numeric NOT NULL DEFAULT 28,
  margin_standar numeric NOT NULL DEFAULT 40,
  margin_premium numeric NOT NULL DEFAULT 55,
  margin_minimum_warning numeric NOT NULL DEFAULT 20,
  persen_waste_default numeric NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pengaturan_margin ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "select_own_pengaturan" ON pengaturan_margin FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "insert_own_pengaturan" ON pengaturan_margin FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "update_own_pengaturan" ON pengaturan_margin FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_pengaturan" ON pengaturan_margin;
CREATE POLICY "delete_own_pengaturan" ON pengaturan_margin FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
