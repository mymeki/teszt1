ALTER TABLE schedule_assignments ADD COLUMN IF NOT EXISTS validated boolean NOT NULL DEFAULT false;
