-- Sample Employee Data for Workstation Allotment Tracker
-- Run this AFTER running supabase-schema.sql

-- This adds sample employees, requests, and equipment data to make the system more realistic

-- =====================================================
-- SAMPLE EMPLOYEES
-- =====================================================

-- Additional Admin Users
INSERT INTO employees (employee_id, name, email, role, division, shift) VALUES
('ADMIN002', 'Priya Sharma', 'priya.sharma@company.com', 'Admin', 'Administration', 'Morning'),
('ADMIN003', 'Rahul Verma', 'rahul.verma@company.com', 'Admin', 'Administration', 'Morning')
ON CONFLICT (employee_id) DO NOTHING;

-- Managers from Different Divisions
INSERT INTO employees (employee_id, name, email, role, division, shift) VALUES
('MGR003', 'Amit Kumar', 'amit.kumar@company.com', 'Manager', 'Shared Services GDA', 'Morning'),
('MGR004', 'Sneha Patel', 'sneha.patel@company.com', 'Manager', 'E-com Platforms', 'Morning'),
('MGR005', 'Rajesh Singh', 'rajesh.singh@company.com', 'Manager', 'OCS Supply Chain', 'Morning'),
('MGR006', 'Meera Iyer', 'meera.iyer@company.com', 'Manager', 'Finance', 'Morning'),
('MGR007', 'Vikram Reddy', 'vikram.reddy@company.com', 'Manager', 'HR', 'Morning'),
('MGR008', 'Anita Desai', 'anita.desai@company.com', 'Manager', 'Legal', 'Morning'),
('MGR009', 'Karthik Menon', 'karthik.menon@company.com', 'Manager', 'OCS Tech', 'Morning'),
('MGR010', 'Divya Shah', 'divya.shah@company.com', 'Manager', 'D Com CBO', 'Morning')
ON CONFLICT (employee_id) DO NOTHING;

-- Technical Team Members
INSERT INTO employees (employee_id, name, email, role, division, shift) VALUES
('TECH003', 'Suresh Nair', 'suresh.nair@company.com', 'Technical', 'IT Operations', 'Morning'),
('TECH004', 'Lakshmi Rao', 'lakshmi.rao@company.com', 'Technical', 'IT Operations', 'Afternoon'),
('TECH005', 'Manoj Gupta', 'manoj.gupta@company.com', 'Technical', 'IT Operations', 'Night'),
('TECH006', 'Pooja Kapoor', 'pooja.kapoor@company.com', 'Technical', 'IT Operations', 'Morning'),
('TECH007', 'Arjun Joshi', 'arjun.joshi@company.com', 'Technical', 'IT Operations', 'Afternoon')
ON CONFLICT (employee_id) DO NOTHING;

-- Regular Employees across divisions
INSERT INTO employees (employee_id, name, email, role, division, shift) VALUES
('EMP101', 'Ravi Krishna', 'ravi.krishna@company.com', 'Employee', 'IT Operations', 'Morning'),
('EMP102', 'Sunita Mehta', 'sunita.mehta@company.com', 'Employee', 'Finance', 'Morning'),
('EMP103', 'Harish Chand', 'harish.chand@company.com', 'Employee', 'Shared Services GDA', 'Afternoon'),
('EMP104', 'Kavita Agarwal', 'kavita.agarwal@company.com', 'Employee', 'E-com Platforms', 'Morning'),
('EMP105', 'Sanjay Pillai', 'sanjay.pillai@company.com', 'Employee', 'OCS Supply Chain', 'Morning'),
('EMP106', 'Nisha Bansal', 'nisha.bansal@company.com', 'Employee', 'OCS Tech', 'Night'),
('EMP107', 'Deepak Malhotra', 'deepak.malhotra@company.com', 'Employee', 'Legal', 'Morning'),
('EMP108', 'Rekha Saxena', 'rekha.saxena@company.com', 'Employee', 'HR', 'Morning'),
('EMP109', 'Anil Jain', 'anil.jain@company.com', 'Employee', 'D Com CBO', 'Afternoon'),
('EMP110', 'Geeta Krishnan', 'geeta.krishnan@company.com', 'Employee', 'Finance', 'Morning')
ON CONFLICT (employee_id) DO NOTHING;

-- =====================================================
-- SAMPLE WORKSTATION REQUESTS
-- =====================================================

-- Pending Requests
INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  created_at
)
SELECT 
  'REQ-001',
  e.id,
  'Amit Kumar',
  'MGR003',
  'Shared Services GDA',
  'Morning',
  5,
  'Commerce House',
  '9th Floor',
  true,
  true,
  'New team members joining next week. Need 5 workstations with full equipment setup.',
  'pending',
  NOW() - INTERVAL '2 days'
FROM employees e WHERE e.employee_id = 'MGR003'
ON CONFLICT (request_number) DO NOTHING;

INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  created_at
)
SELECT 
  'REQ-002',
  e.id,
  'Rajesh Singh',
  'MGR005',
  'OCS Supply Chain',
  'Afternoon',
  8,
  'Gurukul',
  '5th Floor',
  true,
  true,
  'Expanding supply chain operations team. Need 8 workstations for afternoon shift.',
  'pending',
  NOW() - INTERVAL '1 day'
FROM employees e WHERE e.employee_id = 'MGR005'
ON CONFLICT (request_number) DO NOTHING;

INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  created_at
)
SELECT 
  'REQ-003',
  e.id,
  'Sneha Patel',
  'MGR004',
  'E-com Platforms',
  'Morning',
  3,
  'Commerce House',
  '5th Floor',
  false,
  true,
  'Additional monitors needed for existing workstations. Team size remaining same.',
  'pending',
  NOW() - INTERVAL '3 hours'
FROM employees e WHERE e.employee_id = 'MGR004'
ON CONFLICT (request_number) DO NOTHING;

-- Approved Requests
INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  admin_notes,
  approved_by,
  approved_at,
  created_at
)
SELECT 
  'REQ-004',
  e.id,
  'Meera Iyer',
  'MGR006',
  'Finance',
  'Morning',
  10,
  'Commerce House',
  '5th Floor',
  true,
  true,
  'Quarter-end processing team expansion. Critical for closing activities.',
  'approved',
  'Approved. High priority due to quarter-end requirements.',
  (SELECT id FROM employees WHERE employee_id = 'ADMIN001'),
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '1 day'
FROM employees e WHERE e.employee_id = 'MGR006'
ON CONFLICT (request_number) DO NOTHING;

INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  admin_notes,
  approved_by,
  approved_at,
  created_at
)
SELECT 
  'REQ-005',
  e.id,
  'Karthik Menon',
  'MGR009',
  'OCS Tech',
  'Night',
  6,
  'Gurukul',
  '5th Floor',
  true,
  true,
  'Night shift support team for 24x7 operations coverage.',
  'approved',
  'Approved for immediate setup. Technical team to prioritize.',
  (SELECT id FROM employees WHERE employee_id = 'ADMIN001'),
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '2 days'
FROM employees e WHERE e.employee_id = 'MGR009'
ON CONFLICT (request_number) DO NOTHING;

-- Rejected Request
INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  admin_notes,
  created_at
)
SELECT 
  'REQ-006',
  e.id,
  'Vikram Reddy',
  'MGR007',
  'HR',
  'Morning',
  15,
  'Commerce House',
  '4th Floor',
  true,
  true,
  'Recruitment drive - temporary staff for 2 months.',
  'rejected',
  'Rejected: Insufficient space on 4th floor. Please submit request for alternative floor or consider hot-desking solution.',
  NOW() - INTERVAL '3 days'
FROM employees e WHERE e.employee_id = 'MGR007'
ON CONFLICT (request_number) DO NOTHING;

-- Completed Request
INSERT INTO workstation_requests (
  request_number,
  requestor_id,
  requestor_name,
  requestor_employee_id,
  division,
  shift,
  num_workstations,
  location,
  floor_name,
  requires_pc,
  requires_monitor,
  justification,
  status,
  admin_notes,
  technical_notes,
  approved_by,
  approved_at,
  completed_at,
  created_at
)
SELECT 
  'REQ-007',
  e.id,
  'Divya Shah',
  'MGR010',
  'D Com CBO',
  'Afternoon',
  4,
  'Gurukul',
  '5th Floor',
  true,
  true,
  'New product launch team workstations.',
  'completed',
  'Approved for immediate setup.',
  'Setup completed. All workstations configured with required software and equipment.',
  (SELECT id FROM employees WHERE employee_id = 'ADMIN001'),
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '7 days'
FROM employees e WHERE e.employee_id = 'MGR010'
ON CONFLICT (request_number) DO NOTHING;

-- =====================================================
-- ADDITIONAL EQUIPMENT INVENTORY
-- =====================================================

-- Commerce House Equipment
INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Desktop',
  'Office',
  o.id,
  'Commerce House - 5th Floor',
  57,
  45,
  3,
  9,
  NOW()
FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Monitor',
  'Office',
  o.id,
  'Commerce House - 5th Floor',
  70,
  56,
  2,
  12,
  NOW()
FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Desktop',
  'Office',
  o.id,
  'Commerce House - 4th Floor',
  15,
  12,
  1,
  2,
  NOW()
FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Monitor',
  'Office',
  o.id,
  'Commerce House - 4th Floor',
  18,
  13,
  0,
  5,
  NOW()
FROM offices o WHERE o.office_name = 'Commerce House'
ON CONFLICT DO NOTHING;

-- Gurukul Equipment
INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Desktop',
  'Office',
  o.id,
  'Gurukul - 5th Floor',
  101,
  88,
  4,
  9,
  NOW()
FROM offices o WHERE o.office_name = 'Gurukul'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Monitor',
  'Office',
  o.id,
  'Gurukul - 5th Floor',
  120,
  95,
  5,
  20,
  NOW()
FROM offices o WHERE o.office_name = 'Gurukul'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Keyboard',
  'Office',
  o.id,
  'Gurukul - 5th Floor',
  105,
  90,
  2,
  13,
  NOW()
FROM offices o WHERE o.office_name = 'Gurukul'
ON CONFLICT DO NOTHING;

INSERT INTO equipment_inventory (equipment_type, location_type, office_id, location, total_assigned, active_users, in_maintenance, available, last_updated)
SELECT 
  'Mouse',
  'Office',
  o.id,
  'Gurukul - 5th Floor',
  105,
  92,
  1,
  12,
  NOW()
FROM offices o WHERE o.office_name = 'Gurukul'
ON CONFLICT DO NOTHING;

-- WFH Equipment
INSERT INTO equipment_inventory (equipment_type, location_type, location, total_assigned, active_users, in_maintenance, available, last_updated) VALUES
('Laptop', 'WFH', 'Work From Home', 85, 78, 3, 4, NOW()),
('Monitor', 'WFH', 'Work From Home', 60, 55, 2, 3, NOW()),
('Keyboard', 'WFH', 'Work From Home', 70, 65, 1, 4, NOW()),
('Mouse', 'WFH', 'Work From Home', 70, 66, 0, 4, NOW()),
('Headset', 'WFH', 'Work From Home', 80, 72, 2, 6, NOW()),
('Docking Station', 'WFH', 'Work From Home', 50, 45, 1, 4, NOW()),
('Router', 'WFH', 'Work From Home', 25, 23, 0, 2, NOW())
ON CONFLICT DO NOTHING;

-- =====================================================
-- ASSIGN SOME WORKSTATIONS TO EMPLOYEES
-- =====================================================

-- Assign workstations in IT Operations (Commerce House 9th Floor)
WITH it_ops_lab AS (
  SELECT l.id as lab_id FROM labs l
  JOIN floors f ON l.floor_id = f.id
  JOIN offices o ON f.office_id = o.id
  WHERE o.office_name = 'Commerce House' 
    AND f.floor_name = '9th Floor'
    AND l.division = 'IT Operations'
  LIMIT 1
),
it_employees AS (
  SELECT id, shift FROM employees 
  WHERE division = 'IT Operations' 
    AND role IN ('Employee', 'Technical')
  LIMIT 15
)
UPDATE workstations w
SET 
  status = 'occupied',
  assigned_to = e.id,
  assigned_date = NOW() - INTERVAL '30 days',
  shift = e.shift
FROM it_employees e, it_ops_lab l
WHERE w.lab_id = l.lab_id
  AND w.id IN (
    SELECT id FROM workstations 
    WHERE lab_id = l.lab_id 
    ORDER BY workstation_number 
    LIMIT 15
  );

-- Assign workstations in Finance (Commerce House 5th Floor)
WITH finance_lab AS (
  SELECT l.id as lab_id FROM labs l
  JOIN floors f ON l.floor_id = f.id
  JOIN offices o ON f.office_id = o.id
  WHERE o.office_name = 'Commerce House' 
    AND f.floor_name = '5th Floor'
    AND l.division = 'Finance'
  LIMIT 1
),
finance_employees AS (
  SELECT id, shift FROM employees 
  WHERE division = 'Finance'
  LIMIT 10
)
UPDATE workstations w
SET 
  status = 'occupied',
  assigned_to = e.id,
  assigned_date = NOW() - INTERVAL '45 days',
  shift = e.shift
FROM finance_employees e, finance_lab l
WHERE w.lab_id = l.lab_id
  AND w.id IN (
    SELECT id FROM workstations 
    WHERE lab_id = l.lab_id 
    ORDER BY workstation_number 
    LIMIT 10
  );

-- =====================================================
-- CREATE SOME NOTIFICATIONS
-- =====================================================

-- Notifications for pending requests (to admins)
INSERT INTO notifications (employee_id, request_id, title, message, type, is_read)
SELECT 
  e.id,
  r.id,
  'New Workstation Request',
  'New request from ' || r.requestor_name || ' for ' || r.num_workstations || ' workstations',
  'info',
  false
FROM employees e
CROSS JOIN workstation_requests r
WHERE e.role = 'Admin'
  AND r.status = 'pending'
  AND r.request_number IN ('REQ-001', 'REQ-002', 'REQ-003')
ON CONFLICT DO NOTHING;

-- Notifications for approved requests (to requestors)
INSERT INTO notifications (employee_id, request_id, title, message, type, is_read)
SELECT 
  r.requestor_id,
  r.id,
  'Request Approved',
  'Your workstation request ' || r.request_number || ' has been approved!',
  'success',
  false
FROM workstation_requests r
WHERE r.status = 'approved'
  AND r.request_number IN ('REQ-004', 'REQ-005')
ON CONFLICT DO NOTHING;

-- Notifications for approved requests (to technical team)
INSERT INTO notifications (employee_id, request_id, title, message, type, is_read)
SELECT 
  e.id,
  r.id,
  'New Setup Required',
  'Request ' || r.request_number || ' approved. Setup ' || r.num_workstations || ' workstations on ' || r.floor_name,
  'info',
  false
FROM employees e
CROSS JOIN workstation_requests r
WHERE e.role = 'Technical'
  AND r.status = 'approved'
  AND r.request_number IN ('REQ-004', 'REQ-005')
ON CONFLICT DO NOTHING;

-- Notification for rejected request
INSERT INTO notifications (employee_id, request_id, title, message, type, is_read)
SELECT 
  r.requestor_id,
  r.id,
  'Request Rejected',
  'Your workstation request ' || r.request_number || ' has been rejected. Please check admin notes.',
  'error',
  false
FROM workstation_requests r
WHERE r.status = 'rejected'
  AND r.request_number = 'REQ-006'
ON CONFLICT DO NOTHING;

-- =====================================================
-- SUMMARY
-- =====================================================

-- Display summary of inserted data
SELECT 
  'Employees Created' as item,
  COUNT(*) as count
FROM employees
UNION ALL
SELECT 
  'Workstation Requests Created',
  COUNT(*)
FROM workstation_requests
UNION ALL
SELECT 
  'Equipment Items Tracked',
  COUNT(*)
FROM equipment_inventory
UNION ALL
SELECT 
  'Workstations Assigned',
  COUNT(*)
FROM workstations
WHERE status = 'occupied'
UNION ALL
SELECT 
  'Notifications Created',
  COUNT(*)
FROM notifications;

-- Display workstation utilization
SELECT 
  o.office_name,
  f.floor_name,
  COUNT(*) as total_workstations,
  SUM(CASE WHEN w.status = 'occupied' THEN 1 ELSE 0 END) as occupied,
  SUM(CASE WHEN w.status = 'available' THEN 1 ELSE 0 END) as available,
  ROUND(
    (SUM(CASE WHEN w.status = 'occupied' THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100,
    2
  ) as utilization_percent
FROM workstations w
JOIN labs l ON w.lab_id = l.id
JOIN floors f ON l.floor_id = f.id
JOIN offices o ON f.office_id = o.id
GROUP BY o.office_name, f.floor_name
ORDER BY o.office_name, f.floor_name;
