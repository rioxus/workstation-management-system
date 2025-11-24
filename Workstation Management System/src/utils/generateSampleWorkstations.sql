-- Sample Workstation Data Generator
-- This script creates sample workstations for testing the Workstation Map feature
-- Run this after setting up your offices, floors, and labs

-- Note: Replace the UUID values with actual IDs from your database

-- Example: Insert sample workstations for Admin department on Floor 5
-- Assuming you have:
-- - An office with ID: 'office-id-here'
-- - A floor with ID: 'floor-5-id-here'
-- - A lab with ID: 'admin-lab-id-here'

-- Generate 20 workstations for Admin department
DO $$
DECLARE
  lab_uuid UUID := 'YOUR-LAB-UUID-HERE'; -- Replace with actual lab ID
  ws_counter INTEGER;
BEGIN
  FOR ws_counter IN 1..20 LOOP
    INSERT INTO workstations (
      lab_id,
      workstation_number,
      status,
      has_pc,
      has_monitor,
      shift
    ) VALUES (
      lab_uuid,
      LPAD(ws_counter::TEXT, 3, '0'), -- Generates 001, 002, 003, etc.
      CASE 
        WHEN ws_counter <= 12 THEN 'active'
        WHEN ws_counter <= 18 THEN 'available'
        ELSE 'maintenance'
      END,
      ws_counter <= 15, -- First 15 have PCs
      ws_counter <= 18, -- First 18 have monitors
      CASE 
        WHEN ws_counter <= 7 THEN 'Morning'
        WHEN ws_counter <= 14 THEN 'Afternoon'
        ELSE 'Night'
      END
    );
  END LOOP;
END $$;

-- Quick script to generate workstations for multiple departments
-- You can modify this template for each of your departments

/*
Example workflow:

1. First, get your lab IDs:
   SELECT id, lab_name, division FROM labs;

2. Then use this template for each lab/department:

INSERT INTO workstations (lab_id, workstation_number, status, has_pc, has_monitor)
SELECT 
  'YOUR-LAB-ID-HERE'::UUID,
  LPAD(generate_series::TEXT, 3, '0'),
  CASE 
    WHEN generate_series % 4 = 0 THEN 'maintenance'
    WHEN generate_series % 3 = 0 THEN 'available'
    ELSE 'active'
  END,
  generate_series % 2 = 0, -- Every other workstation has PC
  true -- All have monitors
FROM generate_series(1, 25); -- Creates 25 workstations

3. Repeat for each department/lab with different workstation counts
*/

-- Helper query to check your current workstation distribution
SELECT 
  l.division as department,
  f.floor_name as floor,
  l.lab_name as lab,
  COUNT(w.id) as total_workstations,
  COUNT(CASE WHEN w.status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN w.status = 'available' THEN 1 END) as available,
  COUNT(CASE WHEN w.status = 'maintenance' THEN 1 END) as maintenance
FROM workstations w
JOIN labs l ON w.lab_id = l.id
JOIN floors f ON l.floor_id = f.id
GROUP BY l.division, f.floor_name, l.lab_name
ORDER BY f.floor_name, l.division;

-- Helper query to see Asset IDs that will be generated
SELECT 
  w.id,
  l.division || '/WS/' || 
    REPLACE(REPLACE(f.floor_name, 'Floor ', 'F-'), ' ', '-') || 
    '/' || w.workstation_number as asset_id,
  w.status,
  w.has_pc,
  w.has_monitor
FROM workstations w
JOIN labs l ON w.lab_id = l.id
JOIN floors f ON l.floor_id = f.id
ORDER BY f.floor_name, l.division, w.workstation_number;
