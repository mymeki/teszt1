/*
# Add positions, chat, and deadlines

1. Changes to existing tables
- `managers` table: add `position` column (text, NOT NULL, default 'shift_leader')
  Values: 'shift_leader' (Műszakvezető), 'crew_trainer' (Tréner), 'guest_experience' (Vendégélmény Manager), 'general_manager' (Főmenedzser)
  This separates managers into three tiers + GM.

2. New Tables
- `chat_messages` — chat messages between managers within the same position tier
  - id (uuid, primary key)
  - position (text) — which tier's chat room ('shift_leader', 'crew_trainer', 'guest_experience', 'all')
  - manager_id (uuid, FK to managers)
  - manager_name (text)
  - message (text)
  - created_at (timestamptz)

- `push_messages` — push messages sent by GM to selected managers
  - id (uuid, primary key)
  - sender_id (uuid, FK to managers)
  - sender_name (text)
  - recipient_id (uuid, nullable — null means broadcast to a group)
  - recipient_position (text, nullable — used when recipient_id is null)
  - title (text)
  - message (text)
  - read (boolean, default false)
  - created_at (timestamptz)

- `weekly_deadlines` — deadlines for submitting shift requests per week
  - id (uuid, primary key)
  - position (text) — which tier the deadline applies to (or 'all')
  - week_start (date) — Monday of the week
  - deadline (timestamptz) — when requests close
  - closed (boolean, default false) — manual close override
  - created_at (timestamptz)

3. Security
- Enable RLS on all new tables.
- Allow anon + authenticated CRUD on all tables (no-auth app, shared data model).
- Existing managers table policies already allow anon CRUD.

4. Important notes
- The `position` column on `managers` replaces the old `role` column for tier separation.
  The `role` column ('manager' | 'general_manager') is kept for backward compatibility but
  the app will use `position` going forward.
- Sándor (general_manager) gets position = 'general_manager'.
- All existing managers get position = 'shift_leader' by default; will be updated in data migration.
*/

-- Add position column to managers
ALTER TABLE managers ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT 'shift_leader';

-- Add constraint for valid position values
DO $$ BEGIN
  ALTER TABLE managers ADD CONSTRAINT managers_position_check
  CHECK (position = ANY (ARRAY['shift_leader', 'crew_trainer', 'guest_experience', 'general_manager']));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update existing managers: Sándor is GM, rest get shift_leader default (will be adjusted per-user later)
UPDATE managers SET position = 'general_manager' WHERE role = 'general_manager';

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL DEFAULT 'all',
  manager_id uuid REFERENCES managers(id) ON DELETE CASCADE,
  manager_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chat" ON chat_messages;
CREATE POLICY "anon_select_chat" ON chat_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chat" ON chat_messages;
CREATE POLICY "anon_insert_chat" ON chat_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chat" ON chat_messages;
CREATE POLICY "anon_delete_chat" ON chat_messages FOR DELETE
  TO anon, authenticated USING (true);

-- Push messages table
CREATE TABLE IF NOT EXISTS push_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES managers(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  recipient_id uuid REFERENCES managers(id) ON DELETE CASCADE,
  recipient_position text,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE push_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_push" ON push_messages;
CREATE POLICY "anon_select_push" ON push_messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_push" ON push_messages;
CREATE POLICY "anon_insert_push" ON push_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_push" ON push_messages;
CREATE POLICY "anon_update_push" ON push_messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_push" ON push_messages;
CREATE POLICY "anon_delete_push" ON push_messages FOR DELETE
  TO anon, authenticated USING (true);

-- Weekly deadlines table
CREATE TABLE IF NOT EXISTS weekly_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL DEFAULT 'all',
  week_start date NOT NULL,
  deadline timestamptz NOT NULL,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_deadlines" ON weekly_deadlines;
CREATE POLICY "anon_select_deadlines" ON weekly_deadlines FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_deadlines" ON weekly_deadlines;
CREATE POLICY "anon_insert_deadlines" ON weekly_deadlines FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_deadlines" ON weekly_deadlines;
CREATE POLICY "anon_update_deadlines" ON weekly_deadlines FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_deadlines" ON weekly_deadlines;
CREATE POLICY "anon_delete_deadlines" ON weekly_deadlines FOR DELETE
  TO anon, authenticated USING (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_position ON chat_messages(position);
CREATE INDEX IF NOT EXISTS idx_push_messages_recipient ON push_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_weekly_deadlines_week ON weekly_deadlines(week_start);
