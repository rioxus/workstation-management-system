-- Workstation Allotment Tracker Database Schema
-- Run this in Supabase SQL Editor

-- ===============================================
-- STEP 1: Drop existing tables (clean slate)
-- ===============================================
DROP TABLE IF EXISTS ai_analytics CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS equipment_inventory CASCADE;
DROP TABLE IF EXISTS workstation_requests CASCADE;
DROP TABLE IF EXISTS workstations CASCADE;
DROP TABLE IF EXISTS labs CASCADE;
DROP TABLE IF EXISTS floors CASCADE;
DROP TABLE IF EXISTS offices CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- Drop existing views
DROP VIEW IF EXISTS division_summary CASCADE;
DROP VIEW IF EXISTS workstation_summary CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS generate_workstations() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ===============================================
-- STEP 2: Create Tables
-- ===============================================

-- Create Users/Employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Technical', 'Employee')),
  division TEXT,
  shift TEXT CHECK (shift IN ('Morning', 'Afternoon', 'Night')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Offices table
CREATE TABLE offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_name TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Floors table
CREATE TABLE floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id) ON DELETE CASCADE,
  floor_name TEXT NOT NULL,
  total_capacity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(office_id, floor_name)
);

-- Create Labs/Divisions table
CREATE TABLE labs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID REFERENCES floors(id) ON DELETE CASCADE,
  lab_name TEXT NOT NULL,
  division TEXT NOT NULL,
  total_workstations INTEGER NOT NULL DEFAULT 0,
  assigned INTEGER NOT NULL DEFAULT 0,
  in_use INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_assigned_not_exceed_total CHECK (assigned <= total_workstations),
  CONSTRAINT check_in_use_not_exceed_assigned CHECK (in_use <= assigned)
);

-- Create Workstations table
CREATE TABLE workstations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id UUID REFERENCES labs(id) ON DELETE CASCADE,
  workstation_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_date TIMESTAMP WITH TIME ZONE,
  shift TEXT CHECK (shift IN ('Morning', 'Afternoon', 'Night')),
  has_pc BOOLEAN DEFAULT false,
  has_monitor BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Workstation Requests table
CREATE TABLE workstation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,
  requestor_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  requestor_name TEXT NOT NULL,
  requestor_employee_id TEXT NOT NULL,
  division TEXT NOT NULL,
  shift TEXT NOT NULL,
  num_workstations INTEGER NOT NULL,
  office_id UUID REFERENCES offices(id),
  floor_id UUID REFERENCES floors(id),
  location TEXT NOT NULL,
  floor_name TEXT NOT NULL,
  requires_pc BOOLEAN DEFAULT false,
  requires_monitor BOOLEAN DEFAULT false,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'in_progress')),
  admin_notes TEXT,
  technical_notes TEXT,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Equipment Inventory table
CREATE TABLE equipment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('Desktop', 'Monitor', 'Laptop', 'Keyboard', 'Mouse', 'Headset', 'Docking Station', 'Router', 'Other')),
  location_type TEXT NOT NULL CHECK (location_type IN ('Office', 'WFH')),
  office_id UUID REFERENCES offices(id),
  floor_id UUID REFERENCES floors(id),
  location TEXT NOT NULL,
  total_assigned INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  in_maintenance INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  request_id UUID REFERENCES workstation_requests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI Analytics table for trend tracking
CREATE TABLE ai_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id UUID REFERENCES offices(id),
  division TEXT,
  analysis_date DATE NOT NULL,
  total_requests INTEGER DEFAULT 0,
  approved_requests INTEGER DEFAULT 0,
  peak_demand_shift TEXT,
  utilization_trend NUMERIC(5,2),
  predicted_demand INTEGER,
  insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===============================================
-- STEP 3: Insert Sample Data
-- ===============================================

-- Insert sample offices
INSERT INTO offices (office_name, city, address) VALUES
  ('Commerce House', 'Mumbai', 'CH Office Address'),
  ('Gurukul', 'Mumbai', 'Gurukul Office Address'),
  ('Cochin', 'Cochin', 'Cochin Office Address'),
  ('Chennai', 'Chennai', 'Chennai Office Address')
ON CONFLICT (office_name) DO NOTHING;

-- Insert Commerce House floors
INSERT INTO floors (office_id, floor_name, total_capacity)
SELECT o.id, '9th Floor', 0 FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT (office_id, floor_name) DO NOTHING;

INSERT INTO floors (office_id, floor_name, total_capacity)
SELECT o.id, '5th Floor', 0 FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT (office_id, floor_name) DO NOTHING;

INSERT INTO floors (office_id, floor_name, total_capacity)
SELECT o.id, '4th Floor', 0 FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT (office_id, floor_name) DO NOTHING;

-- Insert Gurukul floors
INSERT INTO floors (office_id, floor_name, total_capacity)
SELECT o.id, '5th Floor', 0 FROM offices o WHERE o.office_name = 'Gurukul'
ON CONFLICT (office_id, floor_name) DO NOTHING;

-- Insert Commerce House 9th Floor Labs (from your image data)
WITH ch_9th AS (
  SELECT f.id as floor_id FROM floors f 
  JOIN offices o ON f.office_id = o.id 
  WHERE o.office_name = 'Commerce House' AND f.floor_name = '9th Floor'
)
INSERT INTO labs (floor_id, lab_name, division, total_workstations)
SELECT floor_id, 'Shared Services GDA', 'Shared Services GDA', 81 FROM ch_9th
UNION ALL
SELECT floor_id, 'E-Com Supply & Customer E', 'E-Com Supply & Customer E', 12 FROM ch_9th
UNION ALL
SELECT floor_id, 'IT Operations', 'IT Operations', 27 FROM ch_9th
ON CONFLICT DO NOTHING;

-- Insert Commerce House 5th Floor Labs
WITH ch_5th AS (
  SELECT f.id as floor_id FROM floors f 
  JOIN offices o ON f.office_id = o.id 
  WHERE o.office_name = 'Commerce House' AND f.floor_name = '5th Floor'
)
INSERT INTO labs (floor_id, lab_name, division, total_workstations)
SELECT floor_id, 'E-com Platforms', 'E-com Platforms', 12 FROM ch_5th
UNION ALL
SELECT floor_id, 'Finance', 'Finance', 45 FROM ch_5th
ON CONFLICT DO NOTHING;

-- Insert Commerce House 4th Floor Labs
WITH ch_4th AS (
  SELECT f.id as floor_id FROM floors f 
  JOIN offices o ON f.office_id = o.id 
  WHERE o.office_name = 'Commerce House' AND f.floor_name = '4th Floor'
)
INSERT INTO labs (floor_id, lab_name, division, total_workstations)
SELECT floor_id, 'HR', 'HR', 3 FROM ch_4th
UNION ALL
SELECT floor_id, 'Legal', 'Legal', 8 FROM ch_4th
UNION ALL
SELECT floor_id, 'Ecom Vendor Team', 'Ecom Vendor Team', 2 FROM ch_4th
ON CONFLICT DO NOTHING;

-- Insert Gurukul 5th Floor Labs (from your image data)
WITH gk_5th AS (
  SELECT f.id as floor_id FROM floors f 
  JOIN offices o ON f.office_id = o.id 
  WHERE o.office_name = 'Gurukul' AND f.floor_name = '5th Floor'
)
INSERT INTO labs (floor_id, lab_name, division, total_workstations)
SELECT floor_id, 'OCS Supply Chain 5th', 'OCS Supply Chain', 48 FROM gk_5th
UNION ALL
SELECT floor_id, 'D Com CBO', 'D Com CBO', 24 FROM gk_5th
UNION ALL
SELECT floor_id, 'OCS Tech', 'OCS Tech', 17 FROM gk_5th
UNION ALL
SELECT floor_id, 'OCS Customer Ex 5th', 'OCS Customer Ex', 12 FROM gk_5th
ON CONFLICT DO NOTHING;

-- Update floor capacities based on labs
UPDATE floors f
SET total_capacity = (
  SELECT COALESCE(SUM(l.total_workstations), 0)
  FROM labs l
  WHERE l.floor_id = f.id
);

-- ===============================================
-- STEP 4: Create Functions and Triggers
-- ===============================================

-- Create function to auto-generate workstations when lab is created/updated
CREATE OR REPLACE FUNCTION generate_workstations()
RETURNS TRIGGER AS $$
DECLARE
  i INTEGER;
  current_count INTEGER;
BEGIN
  -- Count existing workstations
  SELECT COUNT(*) INTO current_count
  FROM workstations
  WHERE lab_id = NEW.id;

  -- If total_workstations increased, add new workstations
  IF NEW.total_workstations > current_count THEN
    FOR i IN (current_count + 1)..NEW.total_workstations LOOP
      INSERT INTO workstations (lab_id, workstation_number, status)
      VALUES (NEW.id, 'WS-' || LPAD(i::TEXT, 3, '0'), 'available');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating workstations
DROP TRIGGER IF EXISTS trigger_generate_workstations ON labs;
CREATE TRIGGER trigger_generate_workstations
AFTER INSERT OR UPDATE OF total_workstations ON labs
FOR EACH ROW
EXECUTE FUNCTION generate_workstations();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_labs_updated_at ON labs;
CREATE TRIGGER update_labs_updated_at BEFORE UPDATE ON labs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workstations_updated_at ON workstations;
CREATE TRIGGER update_workstations_updated_at BEFORE UPDATE ON workstations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_requests_updated_at ON workstation_requests;
CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON workstation_requests
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- STEP 5: Configure Row Level Security
-- ===============================================

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users - adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON offices FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON floors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON labs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON workstations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON workstation_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON equipment_inventory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON notifications FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON ai_analytics FOR ALL USING (auth.role() = 'authenticated');

-- For public access during development (REMOVE IN PRODUCTION)
CREATE POLICY "Enable read access for all users" ON employees FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON offices FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON floors FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON labs FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON workstations FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON workstation_requests FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON equipment_inventory FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON notifications FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON ai_analytics FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON offices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON floors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON labs FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON workstations FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON workstation_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON equipment_inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON ai_analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON employees FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON offices FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON floors FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON labs FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON workstations FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON workstation_requests FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON equipment_inventory FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON ai_analytics FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON employees FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON offices FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON floors FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON labs FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON workstations FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON workstation_requests FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON equipment_inventory FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON notifications FOR DELETE USING (true);
CREATE POLICY "Enable delete for all users" ON ai_analytics FOR DELETE USING (true);

-- ===============================================
-- STEP 6: Insert Sample Users
-- ===============================================

-- Insert sample admin user
INSERT INTO employees (employee_id, name, email, role, division, shift)
VALUES ('ADMIN001', 'System Admin', 'admin@company.com', 'Admin', 'IT Operations', 'Morning')
ON CONFLICT (employee_id) DO NOTHING;

-- Insert sample managers
INSERT INTO employees (employee_id, name, email, role, division, shift)
VALUES 
  ('MGR001', 'John Manager', 'john.manager@company.com', 'Manager', 'IT Operations', 'Morning'),
  ('MGR002', 'Sarah Manager', 'sarah.manager@company.com', 'Manager', 'Finance', 'Morning')
ON CONFLICT (employee_id) DO NOTHING;

-- Insert sample technical team
INSERT INTO employees (employee_id, name, email, role, division, shift)
VALUES 
  ('TECH001', 'Mike Technical', 'mike.tech@company.com', 'Technical', 'IT Operations', 'Morning'),
  ('TECH002', 'Lisa Technical', 'lisa.tech@company.com', 'Technical', 'IT Operations', 'Afternoon')
ON CONFLICT (employee_id) DO NOTHING;

-- Insert sample equipment inventory
INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available)
SELECT 
  'Desktop',
  'Office',
  o.id,
  'Commerce House - 9th Floor',
  120,
  95,
  5,
  20
FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available)
SELECT 
  'Monitor',
  'Office',
  o.id,
  'Commerce House - 9th Floor',
  150,
  120,
  8,
  22
FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT DO NOTHING;

-- ===============================================
-- STEP 7: Create Views for Easy Data Access
-- ===============================================

-- Create views for easier data access
CREATE OR REPLACE VIEW workstation_summary AS
SELECT 
  o.office_name,
  f.floor_name,
  l.lab_name,
  l.division,
  l.total_workstations,
  COUNT(CASE WHEN w.status = 'occupied' THEN 1 END) as occupied,
  COUNT(CASE WHEN w.status = 'available' THEN 1 END) as available,
  COUNT(CASE WHEN w.status = 'maintenance' THEN 1 END) as maintenance,
  COUNT(CASE WHEN w.status = 'reserved' THEN 1 END) as reserved
FROM offices o
JOIN floors f ON f.office_id = o.id
JOIN labs l ON l.floor_id = f.id
LEFT JOIN workstations w ON w.lab_id = l.id
GROUP BY o.office_name, f.floor_name, l.lab_name, l.division, l.total_workstations
ORDER BY o.office_name, f.floor_name, l.lab_name;

-- Create view for division summary
CREATE OR REPLACE VIEW division_summary AS
SELECT 
  l.division,
  o.office_name,
  f.floor_name,
  SUM(l.total_workstations) as total_assigned,
  COUNT(CASE WHEN w.status = 'occupied' THEN 1 END) as in_use,
  COUNT(CASE WHEN w.status = 'available' THEN 1 END) as available
FROM labs l
JOIN floors f ON l.floor_id = f.id
JOIN offices o ON f.office_id = o.id
LEFT JOIN workstations w ON w.lab_id = l.id
GROUP BY l.division, o.office_name, f.floor_name
ORDER BY l.division, o.office_name, f.floor_name;

-- ===============================================
-- Schema Setup Complete!
-- ===============================================
-- All tables, data, functions, triggers, and views have been created.
-- Your Workstation Allotment Tracker database is ready to use.
