/*
# Create schedule_assignments table

## Purpose
Allows the General Manager to assign shifts to crew members and attach
per-shift comments. Crew members see their assigned shifts and comments,
and receive a push notification when a comment is added or updated.

## New Tables

### schedule_assignments
- id: uuid primary key
- manager_id: uuid FK -> managers.id (which crew member is assigned)
- assignment_date: date (the calendar day of this assignment)
- shift_type: text (morning/afternoon/night/long_morning/long_night/custom/none)
- shift_start: text (HH:MM, for custom shifts)
- shift_end: text (HH:MM, for custom shifts)
- day_status: text (none/day_off/vacation/sick/training/office)
- comment: text (GM's note visible to the crew member)
- created_by: uuid FK -> managers.id (the GM who created it)
- created_at: timestamp
- updated_at: timestamp
- UNIQUE constraint on (manager_id, assignment_date) so one assignment per person per day

## Security
- RLS enabled, TO anon, authenticated (no-auth shared-data app, same as all other tables)
- Full CRUD allowed for anon+authenticated
*/

CREATE TABLE IF NOT EXISTS schedule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  assignment_date date NOT NULL,
  shift_type text NOT NULL DEFAULT 'none' CHECK (shift_type IN ('none','morning','afternoon','night','long_morning','long_night','custom')),
  shift_start text,
  shift_end text,
  day_status text NOT NULL DEFAULT 'none' CHECK (day_status IN ('none','day_off','vacation','sick','training','office')),
  comment text,
  created_by uuid REFERENCES managers(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (manager_id, assignment_date)
);

ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_schedule_assignments" ON schedule_assignments;
CREATE POLICY "anon_select_schedule_assignments" ON schedule_assignments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_schedule_assignments" ON schedule_assignments;
CREATE POLICY "anon_insert_schedule_assignments" ON schedule_assignments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_schedule_assignments" ON schedule_assignments;
CREATE POLICY "anon_update_schedule_assignments" ON schedule_assignments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_schedule_assignments" ON schedule_assignments;
CREATE POLICY "anon_delete_schedule_assignments" ON schedule_assignments FOR DELETE
  TO anon, authenticated USING (true);

-- Enable realtime for schedule_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'schedule_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE schedule_assignments;
  END IF;
END $$;
