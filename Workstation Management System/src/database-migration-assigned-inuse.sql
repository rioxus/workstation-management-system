-- Migration to add 'assigned' and 'in_use' columns to labs table
-- Run this SQL in your Supabase SQL Editor to enable the new functionality

-- Step 1: Add the new columns
ALTER TABLE labs 
ADD COLUMN IF NOT EXISTS assigned INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS in_use INTEGER NOT NULL DEFAULT 0;

-- Step 2: Add check constraints to ensure data integrity (optional but recommended)
-- If you get an error here, you can skip this step and the app will still work
DO $ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_assigned_not_exceed_total'
  ) THEN
    ALTER TABLE labs 
    ADD CONSTRAINT check_assigned_not_exceed_total 
    CHECK (assigned <= total_workstations);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_in_use_not_exceed_assigned'
  ) THEN
    ALTER TABLE labs 
    ADD CONSTRAINT check_in_use_not_exceed_assigned 
    CHECK (in_use <= assigned);
  END IF;
END $;

-- Step 3: Verification query - run this to check the migration was successful
SELECT 
  lab_name,
  division,
  total_workstations,
  assigned,
  in_use,
  (total_workstations - in_use) as currently_available
FROM labs
ORDER BY lab_name;
