-- Workstation ID Registry Table
-- Stores unique workstation system IDs assigned by Admin to different floors

CREATE TABLE IF NOT EXISTS workstation_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id TEXT UNIQUE NOT NULL, -- Format: Admin/WS/F-5/001
  floor_number INTEGER NOT NULL, -- 5, 4, 9, etc.
  floor_name TEXT NOT NULL, -- Floor 5, Floor 4, Floor 9, etc.
  workstation_number TEXT NOT NULL, -- 001, 002, etc.
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved', 'offline')),
  assigned_to TEXT, -- Employee name or division using this workstation
  assigned_employee_id TEXT, -- Employee ID if assigned
  division TEXT, -- Which division is using this workstation
  shift TEXT CHECK (shift IN ('Morning', 'Afternoon', 'Night', 'Flexible')),
  has_pc BOOLEAN DEFAULT false,
  has_monitor BOOLEAN DEFAULT false,
  has_keyboard BOOLEAN DEFAULT false,
  has_mouse BOOLEAN DEFAULT false,
  ip_address TEXT, -- Network IP if applicable
  location_details TEXT, -- Specific location notes (e.g., "Near Window", "Corner Desk")
  notes TEXT,
  assigned_date TIMESTAMP WITH TIME ZONE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workstation_registry_floor ON workstation_registry(floor_number);
CREATE INDEX IF NOT EXISTS idx_workstation_registry_status ON workstation_registry(status);
CREATE INDEX IF NOT EXISTS idx_workstation_registry_asset_id ON workstation_registry(asset_id);

-- Trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_workstation_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workstation_registry_timestamp
  BEFORE UPDATE ON workstation_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_workstation_registry_timestamp();

-- Insert Floor 5 workstations (Admin/WS/F-5/001 to Admin/WS/F-5/098)
DO $$
DECLARE
  ws_counter INTEGER;
  asset_id_text TEXT;
BEGIN
  FOR ws_counter IN 1..98 LOOP
    asset_id_text := 'Admin/WS/F-5/' || LPAD(ws_counter::TEXT, 3, '0');
    
    INSERT INTO workstation_registry (
      asset_id,
      floor_number,
      floor_name,
      workstation_number,
      status,
      has_pc,
      has_monitor,
      has_keyboard,
      has_mouse
    ) VALUES (
      asset_id_text,
      5,
      'Floor 5',
      LPAD(ws_counter::TEXT, 3, '0'),
      'available', -- Default to available, you can update specific ones
      true, -- Assuming all have PCs
      true, -- Assuming all have monitors
      true,
      true
    )
    ON CONFLICT (asset_id) DO NOTHING; -- Skip if already exists
  END LOOP;
END $$;

-- Helper view: Workstation summary by floor
CREATE OR REPLACE VIEW workstation_floor_summary AS
SELECT 
  floor_number,
  floor_name,
  COUNT(*) as total_workstations,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
  COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
  COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance,
  COUNT(CASE WHEN status = 'reserved' THEN 1 END) as reserved,
  COUNT(CASE WHEN status = 'offline' THEN 1 END) as offline,
  COUNT(CASE WHEN has_pc THEN 1 END) as workstations_with_pc,
  COUNT(CASE WHEN has_monitor THEN 1 END) as workstations_with_monitor
FROM workstation_registry
GROUP BY floor_number, floor_name
ORDER BY floor_number DESC;

-- Helper view: Workstation details with range info
CREATE OR REPLACE VIEW workstation_details AS
SELECT 
  asset_id,
  floor_number,
  floor_name,
  workstation_number,
  status,
  assigned_to,
  assigned_employee_id,
  division,
  shift,
  has_pc,
  has_monitor,
  has_keyboard,
  has_mouse,
  ip_address,
  location_details,
  notes,
  assigned_date,
  last_updated,
  CASE 
    WHEN status = 'occupied' THEN 'In Use'
    WHEN status = 'available' THEN 'Free'
    WHEN status = 'maintenance' THEN 'Under Maintenance'
    WHEN status = 'reserved' THEN 'Reserved'
    WHEN status = 'offline' THEN 'Offline'
  END as status_display
FROM workstation_registry
ORDER BY floor_number DESC, workstation_number;

-- Query to check current Floor 5 workstations
SELECT 
  floor_name,
  MIN(workstation_number) as start_ws,
  MAX(workstation_number) as end_ws,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
  COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied
FROM workstation_registry
WHERE floor_number = 5
GROUP BY floor_name;

-- Sample queries to use:

-- 1. Get all workstations for a specific floor
-- SELECT * FROM workstation_registry WHERE floor_number = 5 ORDER BY workstation_number;

-- 2. Get floor summary
-- SELECT * FROM workstation_floor_summary;

-- 3. Update a workstation status
-- UPDATE workstation_registry 
-- SET status = 'occupied', assigned_to = 'John Doe', assigned_employee_id = 'EMP001', division = 'Engineering'
-- WHERE asset_id = 'Admin/WS/F-5/025';

-- 4. Get available workstations on a floor
-- SELECT asset_id, workstation_number FROM workstation_registry 
-- WHERE floor_number = 5 AND status = 'available' 
-- ORDER BY workstation_number;

-- 5. Bulk update status for a range
-- UPDATE workstation_registry 
-- SET status = 'occupied', division = 'Tech Team'
-- WHERE floor_number = 5 
-- AND workstation_number::INTEGER BETWEEN 1 AND 20;
