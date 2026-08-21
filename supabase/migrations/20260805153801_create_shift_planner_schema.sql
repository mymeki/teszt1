/*
# Shift Planner Schema

Creates the complete data model for the restaurant manager shift planning application.

## New Tables

### managers
- id: uuid primary key
- name: text (display name, e.g. "Mateo", "Arnold")
- role: text ('manager' or 'general_manager')
- color: text (hex color for avatar/display)
- sort_order: int (display order on selection screen)
- created_at: timestamp

### shift_requests
- id: uuid primary key
- manager_id: uuid FK -> managers.id
- request_date: date (the calendar day this request is for)
- day_status: text (none/day_off/vacation/sick/training/office)
- shift_type: text (morning/afternoon/night/long_morning/long_night/custom/none)
- shift_start: text (HH:MM, for custom shifts)
- shift_end: text (HH:MM, for custom shifts)
- priority: text (preferred/strong/cannot_other)
- notes: text
- created_at: timestamp
- updated_at: timestamp

### activity_log
- id: uuid primary key
- manager_id: uuid FK -> managers.id
- manager_name: text (denormalized for display)
- action: text (description of change)
- request_date: date (which date was changed)
- created_at: timestamp

## Security
- RLS enabled on all tables
- All policies use TO anon, authenticated (no-auth app, data is shared)
*/

-- managers table
CREATE TABLE IF NOT EXISTS managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'general_manager')),
  color text NOT NULL DEFAULT '#6B7280',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_managers" ON managers;
CREATE POLICY "anon_select_managers" ON managers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_managers" ON managers;
CREATE POLICY "anon_insert_managers" ON managers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_managers" ON managers;
CREATE POLICY "anon_update_managers" ON managers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_managers" ON managers;
CREATE POLICY "anon_delete_managers" ON managers FOR DELETE TO anon, authenticated USING (true);

-- shift_requests table
CREATE TABLE IF NOT EXISTS shift_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  request_date date NOT NULL,
  day_status text NOT NULL DEFAULT 'none' CHECK (day_status IN ('none','day_off','vacation','sick','training','office')),
  shift_type text NOT NULL DEFAULT 'none' CHECK (shift_type IN ('none','morning','afternoon','night','long_morning','long_night','custom')),
  shift_start text,
  shift_end text,
  priority text NOT NULL DEFAULT 'preferred' CHECK (priority IN ('preferred','strong','cannot_other')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (manager_id, request_date)
);

ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_shift_requests" ON shift_requests;
CREATE POLICY "anon_select_shift_requests" ON shift_requests FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_shift_requests" ON shift_requests;
CREATE POLICY "anon_insert_shift_requests" ON shift_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_shift_requests" ON shift_requests;
CREATE POLICY "anon_update_shift_requests" ON shift_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_shift_requests" ON shift_requests;
CREATE POLICY "anon_delete_shift_requests" ON shift_requests FOR DELETE TO anon, authenticated USING (true);

-- activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES managers(id) ON DELETE SET NULL,
  manager_name text NOT NULL,
  action text NOT NULL,
  request_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity_log" ON activity_log;
CREATE POLICY "anon_select_activity_log" ON activity_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity_log" ON activity_log;
CREATE POLICY "anon_insert_activity_log" ON activity_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity_log" ON activity_log;
CREATE POLICY "anon_update_activity_log" ON activity_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity_log" ON activity_log;
CREATE POLICY "anon_delete_activity_log" ON activity_log FOR DELETE TO anon, authenticated USING (true);

-- Seed default managers
INSERT INTO managers (name, role, color, sort_order) VALUES
  ('Mateo', 'manager', '#0EA5E9', 1),
  ('Arnold', 'manager', '#10B981', 2),
  ('Sándor', 'manager', '#F59E0B', 3),
  ('Dóra', 'manager', '#EC4899', 4),
  ('Gyöngyi', 'manager', '#8B5CF6', 5),
  ('Renáta', 'manager', '#EF4444', 6),
  ('Anett', 'manager', '#06B6D4', 7),
  ('Zita', 'manager', '#84CC16', 8),
  ('Főmenedzser', 'general_manager', '#1E293B', 99)
ON CONFLICT DO NOTHING;
