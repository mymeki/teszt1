/*
# Create push_subscriptions table for Web Push notifications

1. New Tables
- `push_subscriptions`
  - `id` (uuid, primary key)
  - `manager_id` (uuid, references managers.id) — which manager this subscription belongs to
  - `endpoint` (text, not null) — the push service endpoint URL (unique per subscription)
  - `p256dh` (text, not null) — ECDH public key for content encryption
  - `auth` (text, not null) — authentication secret for content encryption
  - `created_at` (timestamptz) — when the subscription was created
  - `updated_at` (timestamptz) — when the subscription was last updated

2. Security
- Enable RLS on `push_subscriptions`.
- Allow anon + authenticated CRUD since this is a single-tenant app with no sign-in screen.
  The app uses localStorage-based session management (manager selection), not Supabase Auth.

3. Notes
- A manager can have multiple subscriptions (e.g. if they install the app on multiple devices).
- The `endpoint` column has a unique constraint so re-subscribing updates the existing row
  rather than creating duplicates.
- The edge function reads from this table to send Web Push messages to all relevant devices.
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES managers(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_push_subscriptions" ON push_subscriptions;
CREATE POLICY "anon_select_push_subscriptions" ON push_subscriptions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_push_subscriptions" ON push_subscriptions;
CREATE POLICY "anon_insert_push_subscriptions" ON push_subscriptions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_push_subscriptions" ON push_subscriptions;
CREATE POLICY "anon_update_push_subscriptions" ON push_subscriptions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_push_subscriptions" ON push_subscriptions;
CREATE POLICY "anon_delete_push_subscriptions" ON push_subscriptions FOR DELETE
  TO anon, authenticated USING (true);
