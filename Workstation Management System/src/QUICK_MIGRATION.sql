-- Quick Migration: Add assigned and in_use columns to labs table
-- Copy and paste this entire file into Supabase SQL Editor and click "Run"

ALTER TABLE labs 
ADD COLUMN IF NOT EXISTS assigned INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS in_use INTEGER NOT NULL DEFAULT 0;

-- That's it! Refresh your application to use the new fields.
