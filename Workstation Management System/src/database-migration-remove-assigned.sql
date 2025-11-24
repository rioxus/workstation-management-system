-- Migration: Remove 'assigned' column and related constraints
-- This migration removes the 'assigned' field which is no longer used in the application
-- The new logic uses: Total Workstations - Sum(In Use across divisions) = Available

-- Step 1: Drop the check constraint that validates in_use <= assigned
ALTER TABLE labs DROP CONSTRAINT IF EXISTS check_in_use_not_exceed_assigned;

-- Step 2: Drop the assigned column (optional - you can keep it if you want historical data)
-- Uncomment the line below if you want to completely remove the column:
-- ALTER TABLE labs DROP COLUMN IF EXISTS assigned;

-- Step 3: Set assigned to totalWorkstations for all existing records (if keeping the column)
-- This ensures backward compatibility if the column is retained
UPDATE labs SET assigned = total_workstations WHERE assigned IS NULL OR assigned = 0;

-- Step 4: Add a new constraint to validate in_use doesn't exceed total_workstations
ALTER TABLE labs ADD CONSTRAINT check_in_use_not_exceed_total 
  CHECK (in_use <= total_workstations);

-- Verification queries (run these to check the migration):
-- SELECT id, lab_name, division, total_workstations, assigned, in_use FROM labs LIMIT 10;
-- SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'labs';
