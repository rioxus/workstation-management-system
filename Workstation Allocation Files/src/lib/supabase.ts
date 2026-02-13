import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Get Supabase credentials from Figma Make or environment variables
const getSupabaseUrl = (): string => {
  // First try to get from Figma Make's auto-generated file
  if (projectId) {
    return `https://${projectId}.supabase.co`;
  }
  
  // Fallback to environment variables
  try {
    return (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
  } catch (error) {
    return '';
  }
};

const getSupabaseKey = (): string => {
  // First try to get from Figma Make's auto-generated file
  if (publicAnonKey) {
    return publicAnonKey;
  }
  
  // Fallback to environment variables
  try {
    return (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';
  } catch (error) {
    return '';
  }
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseKey();

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export credentials for use in other services (like email service)
export { supabaseUrl, supabaseAnonKey };

// Type definitions for database tables
export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Technical' | 'Employee';
  division?: string; // For managers with multiple divisions, use comma-separated values (e.g., "Innovation Labs, HR Division")
  password?: string; // Admin-assigned password for user authentication
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: string;
  office_name: string;
  city: string;
  created_at: string;
}

export interface Floor {
  id: string;
  office_id: string;
  floor_name: string;
  total_capacity: number;
  created_at: string;
}

export interface Lab {
  id: string;
  floor_id: string;
  lab_name: string;
  division: string;
  total_workstations: number;
  assigned?: number;
  in_use?: number;
  asset_id_range?: string; // Asset ID range for this lab/division
  created_at: string;
  updated_at: string;
}

export interface Workstation {
  id: string;
  lab_id: string;
  workstation_number: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  assigned_to?: string;
  assigned_date?: string;
  asset_id?: string; // Asset ID for the workstation
  created_at: string;
  updated_at: string;
}

export interface WorkstationRequest {
  id: string;
  request_number: string;
  requestor_id: string;
  requestor_name: string;
  requestor_employee_id: string;
  division: string;
  num_workstations: number;
  location: string;
  floor_name: string;
  justification?: string;
  remarks?: string; // Manager's remarks/comments
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'in_progress' | 'partially_allocated';
  admin_notes?: string;
  approved_by?: string;
  approved_at?: string;
  requested_allocation_date?: string; // Requested allocation date field
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  employee_id: string;
  request_id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface FloorAssetRange {
  id: string;
  floor_id: string;
  office_id: string;
  formatted_range: string; // e.g., "Admin/WS/F-9/001 to Admin/WS/F-9/195"
  floor_number: string;
  created_at: string;
  updated_at: string;
}

export interface LabAssetRange {
  id: string;
  floor_range_id: string; // References floor_asset_ranges
  lab_id: string; // References labs
  formatted_range: string;
  created_at: string;
  updated_at: string;
}

export interface DivisionAssetAssignment {
  id: string;
  lab_range_id: string; // References lab_asset_ranges
  division: string;
  asset_ids: string; // Comma-separated: "001,002,003,010-015"
  formatted_ids?: string; // Display format: "Admin/WS/F-9/001, ..."
  asset_count: number; // Number of assets assigned
  created_at: string;
  updated_at: string;
}

export interface SeatBooking {
  id: string;
  request_id: string;
  lab_id: string;
  lab_name: string;
  floor_id: string;
  seat_number: number;
  asset_id?: string; // CRITICAL: Asset ID assigned to this specific seat (maintains seat position)
  requestor_id: string;
  requestor_name?: string;
  division?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Division {
  id: string;
  division_name: string;
  is_active: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

// Database API functions
export const db = {
  // Employee functions
  employees: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Employee[];
    },
    
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Employee;
    },
    
    getByEmployeeId: async (employeeId: string) => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('employee_id', employeeId)
        .single();
      if (error) throw error;
      return data as Employee;
    },
    
    create: async (employee: Partial<Employee>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert(employee)
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    
    update: async (id: string, updates: Partial<Employee>) => {
      const { data, error } = await supabase
        .from('employees')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Employee;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Office functions
  offices: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('*')
        .order('office_name');
      if (error) throw error;
      return data as Office[];
    }
  },

  // Floor functions
  floors: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('floors')
        .select('*, offices(*)')
        .order('floor_name');
      if (error) throw error;
      return data;
    },
    
    getByOffice: async (officeId: string) => {
      const { data, error } = await supabase
        .from('floors')
        .select('*')
        .eq('office_id', officeId)
        .order('floor_name');
      if (error) throw error;
      return data as Floor[];
    }
  },

  // Lab functions
  labs: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('labs')
        .select('*, floors(*, offices(*))');
      if (error) throw error;
      return data;
    },
    
    getByFloor: async (floorId: string) => {
      const { data, error } = await supabase
        .from('labs')
        .select('*')
        .eq('floor_id', floorId);
      if (error) throw error;
      return data as Lab[];
    },
    
    create: async (lab: Partial<Lab>) => {
      const { data, error } = await supabase
        .from('labs')
        .insert(lab)
        .select()
        .single();
      if (error) throw error;
      return data as Lab;
    },
    
    update: async (id: string, updates: Partial<Lab>) => {
      const { data, error } = await supabase
        .from('labs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Lab;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('labs')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Workstation functions
  workstations: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('workstations')
        .select('*, labs(*, floors(*, offices(*)))');
      if (error) throw error;
      return data;
    },
    
    getByLab: async (labId: string) => {
      const { data, error } = await supabase
        .from('workstations')
        .select('*')
        .eq('lab_id', labId);
      if (error) throw error;
      return data as Workstation[];
    },
    
    getAvailable: async () => {
      const { data, error } = await supabase
        .from('workstations')
        .select('*, labs(*, floors(*, offices(*)))')
        .eq('status', 'available');
      if (error) throw error;
      return data;
    },
    
    assignWorkstation: async (id: string, employeeId: string) => {
      const { data, error } = await supabase
        .from('workstations')
        .update({
          status: 'occupied',
          assigned_to: employeeId,
          assigned_date: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Workstation;
    },
    
    releaseWorkstation: async (id: string) => {
      const { data, error } = await supabase
        .from('workstations')
        .update({
          status: 'available',
          assigned_to: null,
          assigned_date: null
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Workstation;
    },
    
    updateStatus: async (id: string, status: Workstation['status']) => {
      const { data, error } = await supabase
        .from('workstations')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Workstation;
    }
  },

  // Request functions
  requests: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('workstation_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkstationRequest[];
    },
    
    getByStatus: async (status: WorkstationRequest['status']) => {
      const { data, error } = await supabase
        .from('workstation_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkstationRequest[];
    },
    
    getByRequestor: async (requestorId: string) => {
      const { data, error } = await supabase
        .from('workstation_requests')
        .select('*')
        .eq('requestor_id', requestorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WorkstationRequest[];
    },
    
    create: async (request: Partial<WorkstationRequest>) => {
      // Generate unique request number with timestamp and random component
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
      const requestNumber = `REQ-${timestamp}-${random}`;
      
      const { data, error } = await supabase
        .from('workstation_requests')
        .insert({ ...request, request_number: requestNumber })
        .select()
        .single();
      if (error) throw error;
      return data as WorkstationRequest;
    },
    
    update: async (id: string, updates: Partial<WorkstationRequest>) => {
      const { data, error } = await supabase
        .from('workstation_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkstationRequest;
    },
    
    approve: async (id: string, approvedBy: string, notes?: string) => {
      const { data, error } = await supabase
        .from('workstation_requests')
        .update({
          status: 'approved',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
          admin_notes: notes
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkstationRequest;
    },
    
    reject: async (id: string, notes: string) => {
      const { data, error } = await supabase
        .from('workstation_requests')
        .update({
          status: 'rejected',
          admin_notes: notes
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as WorkstationRequest;
    }
  },

  // Notification functions
  notifications: {
    getByEmployee: async (employeeId: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Notification[];
    },
    
    create: async (notification: Partial<Notification>) => {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();
      if (error) throw error;
      return data as Notification;
    },
    
    markAsRead: async (id: string) => {
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Notification;
    }
  },

  // Seat Booking functions
  seatBookings: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SeatBooking[];
    },
    
    getByStatus: async (status: SeatBooking['status']) => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SeatBooking[];
    },
    
    getByRequestor: async (requestorId: string) => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .select('*')
        .eq('requestor_id', requestorId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SeatBooking[];
    },
    
    create: async (booking: Partial<SeatBooking>) => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .insert(booking)
        .select()
        .single();
      if (error) throw error;
      return data as SeatBooking;
    },
    
    update: async (id: string, updates: Partial<SeatBooking>) => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SeatBooking;
    },
    
    approve: async (id: string, approvedBy: string, notes?: string) => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .update({
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SeatBooking;
    },
    
    reject: async (id: string, notes: string) => {
      const { data, error } = await supabase
        .from('seat_bookings')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SeatBooking;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('seat_bookings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Floor Asset Ranges functions
  floorAssetRanges: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('floor_asset_ranges')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FloorAssetRange[];
    },
    
    getByFloor: async (floorId: string) => {
      const { data, error } = await supabase
        .from('floor_asset_ranges')
        .select('*')
        .eq('floor_id', floorId)
        .single();
      if (error) throw error;
      return data as FloorAssetRange;
    },
    
    create: async (range: Partial<FloorAssetRange>) => {
      const { data, error } = await supabase
        .from('floor_asset_ranges')
        .insert(range)
        .select()
        .single();
      if (error) throw error;
      return data as FloorAssetRange;
    },
    
    update: async (id: string, updates: Partial<FloorAssetRange>) => {
      const { data, error } = await supabase
        .from('floor_asset_ranges')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as FloorAssetRange;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('floor_asset_ranges')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Lab Asset Ranges functions
  labAssetRanges: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('lab_asset_ranges')
        .select(`
          *,
          labs!inner(
            id,
            lab_name,
            floor_id
          ),
          floor_asset_ranges!inner(
            floor_number,
            floors!inner(
              id,
              floor_name,
              office_id,
              offices(
                office_name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[]; // Returns joined data with lab and floor info
    },
    
    getAllSimple: async () => {
      const { data, error } = await supabase
        .from('lab_asset_ranges')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LabAssetRange[]; // Returns simple data without joins
    },
    
    getByFloorRange: async (floorRangeId: string) => {
      const { data, error } = await supabase
        .from('lab_asset_ranges')
        .select('*')
        .eq('floor_range_id', floorRangeId);
      if (error) throw error;
      return data as LabAssetRange[];
    },
    
    create: async (range: Partial<LabAssetRange>) => {
      const { data, error } = await supabase
        .from('lab_asset_ranges')
        .insert(range)
        .select()
        .single();
      if (error) throw error;
      return data as LabAssetRange;
    },
    
    update: async (id: string, updates: Partial<LabAssetRange>) => {
      const { data, error } = await supabase
        .from('lab_asset_ranges')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LabAssetRange;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('lab_asset_ranges')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Division Asset Assignment functions
  divisionAssetAssignments: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('division_asset_assignments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DivisionAssetAssignment[];
    },
    
    getByLabRange: async (labRangeId: string) => {
      const { data, error } = await supabase
        .from('division_asset_assignments')
        .select('*')
        .eq('lab_range_id', labRangeId);
      if (error) throw error;
      return data as DivisionAssetAssignment[];
    },
    
    create: async (assignment: Partial<DivisionAssetAssignment>) => {
      const { data, error } = await supabase
        .from('division_asset_assignments')
        .insert(assignment)
        .select()
        .single();
      if (error) throw error;
      return data as DivisionAssetAssignment;
    },
    
    update: async (id: string, updates: Partial<DivisionAssetAssignment>) => {
      const { data, error } = await supabase
        .from('division_asset_assignments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as DivisionAssetAssignment;
    },
    
    delete: async (id: string) => {
      const { error } = await supabase
        .from('division_asset_assignments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Division functions
  divisions: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Division[];
    },
    
    getAllIncludingInactive: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Division[];
    },
    
    getById: async (id: string) => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Division;
    },
    
    create: async (division: Partial<Division>) => {
      // Get the max display_order to append new division at the end
      const { data: maxOrderData } = await supabase
        .from('divisions')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1)
        .single();
      
      const nextOrder = (maxOrderData?.display_order || 0) + 1;
      
      const { data, error } = await supabase
        .from('divisions')
        .insert({ 
          ...division, 
          display_order: division.display_order || nextOrder,
          is_active: division.is_active !== undefined ? division.is_active : true
        })
        .select()
        .single();
      if (error) throw error;
      return data as Division;
    },
    
    update: async (id: string, updates: Partial<Division>) => {
      const { data, error } = await supabase
        .from('divisions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Division;
    },
    
    delete: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('divisions')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    
    hardDelete: async (id: string) => {
      // Actual deletion from database
      const { error } = await supabase
        .from('divisions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    // Check if division has workstations allocated in lab_allocations table
    checkWorkstationUsage: async (divisionName: string) => {
      const { data, error } = await supabase
        .from('labs')
        .select('id, lab_name, division, in_use, floors!inner(floor_name, offices!inner(office_name))')
        .eq('division', divisionName);
      
      if (error) throw error;
      
      return {
        hasWorkstations: (data?.length || 0) > 0,
        workstationCount: data?.reduce((sum, record) => sum + (record.in_use || 0), 0) || 0,
        labCount: data?.length || 0,
        labs: data || []
      };
    },

    // Cascade delete division - removes from divisions table, lab_allocations, and employee credentials
    cascadeDelete: async (divisionId: string, divisionName: string) => {
      try {
        // Step 1: Delete all labs records for this division
        const { error: labError } = await supabase
          .from('labs')
          .delete()
          .eq('division', divisionName);
        
        if (labError) {
          console.error('Error deleting lab allocations:', labError);
          throw new Error(`Failed to delete workstation allocations: ${labError.message}`);
        }

        // Step 2: Remove division from all employee credentials
        // Get all employees that have this division
        const { data: employees, error: fetchError } = await supabase
          .from('employees')
          .select('id, division')
          .like('division', `%${divisionName}%`);
        
        if (fetchError) {
          console.error('Error fetching employees:', fetchError);
          throw new Error(`Failed to fetch employees: ${fetchError.message}`);
        }

        // Update each employee to remove the division
        if (employees && employees.length > 0) {
          for (const employee of employees) {
            if (!employee.division) continue;
            
            // Parse comma-separated divisions
            const divisions = employee.division.split(',').map(d => d.trim());
            // Remove the deleted division
            const updatedDivisions = divisions.filter(d => d !== divisionName);
            
            // Update employee with remaining divisions (or null if no divisions left)
            const newDivisionValue = updatedDivisions.length > 0 
              ? updatedDivisions.join(', ') 
              : null;
            
            const { error: updateError } = await supabase
              .from('employees')
              .update({ division: newDivisionValue })
              .eq('id', employee.id);
            
            if (updateError) {
              console.error(`Error updating employee ${employee.id}:`, updateError);
              throw new Error(`Failed to update employee credentials: ${updateError.message}`);
            }
          }
        }

        // Step 3: Delete the division itself
        const { error: divisionError } = await supabase
          .from('divisions')
          .delete()
          .eq('id', divisionId);
        
        if (divisionError) {
          console.error('Error deleting division:', divisionError);
          throw new Error(`Failed to delete division: ${divisionError.message}`);
        }

        return {
          success: true,
          deletedLabs: labError ? 0 : (employees?.length || 0),
          updatedEmployees: employees?.length || 0
        };
      } catch (error) {
        console.error('Cascade delete error:', error);
        throw error;
      }
    }
  },

  // Views
  views: {
    workstationSummary: async () => {
      const { data, error } = await supabase
        .from('workstation_summary')
        .select('*');
      if (error) throw error;
      return data;
    },
    
    divisionSummary: async () => {
      const { data, error } = await supabase
        .from('division_summary')
        .select('*');
      if (error) throw error;
      return data;
    }
  },

  // Admin utilities - Data cleanup functions
  admin: {
    // Clean all test/dummy data - WARNING: This will delete ALL requests, seat bookings, and related notifications
    cleanAllTestData: async () => {
      try {
        console.log('🧹 Starting complete data cleanup...');
        
        // Get all IDs first to ensure we have something to delete
        console.log('📋 Fetching all records...');
        const { data: allSeatBookings, error: sbError } = await supabase
          .from('seat_bookings')
          .select('id');
        
        if (sbError) {
          console.error('❌ Error fetching seat bookings:', sbError);
          throw sbError;
        }
        
        const { data: allNotifications, error: notifError } = await supabase
          .from('notifications')
          .select('id');
        
        if (notifError) {
          console.error('❌ Error fetching notifications:', notifError);
          throw notifError;
        }
        
        const { data: allRequests, error: reqError } = await supabase
          .from('workstation_requests')
          .select('id');
        
        if (reqError) {
          console.error('❌ Error fetching workstation_requests:', reqError);
          throw reqError;
        }
        
        console.log('📊 Found data to delete:', {
          seatBookings: allSeatBookings?.length || 0,
          notifications: allNotifications?.length || 0,
          requests: allRequests?.length || 0
        });
        
        // Delete all seat bookings first (due to foreign key constraints)
        if (allSeatBookings && allSeatBookings.length > 0) {
          console.log(`🗑️ Deleting ${allSeatBookings.length} seat bookings...`);
          const { error: seatBookingsError } = await supabase
            .from('seat_bookings')
            .delete()
            .in('id', allSeatBookings.map(b => b.id));
          
          if (seatBookingsError) {
            console.error('❌ Error deleting seat bookings:', seatBookingsError);
            throw seatBookingsError;
          }
          console.log(`✅ Deleted ${allSeatBookings.length} seat bookings`);
        } else {
          console.log('ℹ️ No seat bookings to delete');
        }
        
        // Delete all notifications
        if (allNotifications && allNotifications.length > 0) {
          console.log(`🗑️ Deleting ${allNotifications.length} notifications...`);
          const { error: notificationsError } = await supabase
            .from('notifications')
            .delete()
            .in('id', allNotifications.map(n => n.id));
          
          if (notificationsError) {
            console.error('❌ Error deleting notifications:', notificationsError);
            throw notificationsError;
          }
          console.log(`✅ Deleted ${allNotifications.length} notifications`);
        } else {
          console.log('ℹ️ No notifications to delete');
        }
        
        // Delete all requests
        if (allRequests && allRequests.length > 0) {
          console.log(`🗑️ Deleting ${allRequests.length} workstation requests...`);
          const { error: requestsError } = await supabase
            .from('workstation_requests')
            .delete()
            .in('id', allRequests.map(r => r.id));
          
          if (requestsError) {
            console.error('❌ Error deleting workstation_requests:', requestsError);
            throw requestsError;
          }
          console.log(`✅ Deleted ${allRequests.length} requests`);
        } else {
          console.log('ℹ️ No requests to delete');
        }
        
        // NOTE: We do NOT delete or modify division records in labs table
        // Those are pre-existing data that should be preserved
        console.log('ℹ️ Preserving pre-existing division allocation data in labs table');
        
        console.log('🎉 All test data cleaned successfully!');
        return { success: true, message: 'All test data has been removed successfully' };
      } catch (error) {
        console.error('💥 Error during data cleanup:', error);
        throw error;
      }
    },
    
    // Clean only rejected/cancelled requests and their data
    cleanRejectedData: async () => {
      try {
        console.log('Cleaning rejected data...');
        
        // Get all rejected requests
        const { data: rejectedRequests, error: fetchError } = await supabase
          .from('workstation_requests')
          .select('id')
          .in('status', ['rejected', 'cancelled']);
        
        if (fetchError) throw fetchError;
        
        if (rejectedRequests && rejectedRequests.length > 0) {
          const requestIds = rejectedRequests.map(r => r.id);
          
          // Delete seat bookings for rejected requests
          const { error: seatBookingsError } = await supabase
            .from('seat_bookings')
            .delete()
            .in('request_id', requestIds);
          
          if (seatBookingsError) throw seatBookingsError;
          console.log(`✓ Deleted seat bookings for ${requestIds.length} rejected requests`);
          
          // Delete notifications for rejected requests
          const { error: notificationsError } = await supabase
            .from('notifications')
            .delete()
            .in('request_id', requestIds);
          
          if (notificationsError) throw notificationsError;
          console.log(`✓ Deleted notifications for ${requestIds.length} rejected requests`);
          
          // Delete the rejected requests
          const { error: requestsError } = await supabase
            .from('workstation_requests')
            .delete()
            .in('id', requestIds);
          
          if (requestsError) throw requestsError;
          console.log(`✓ Deleted ${requestIds.length} rejected requests`);
        }
        
        console.log('✅ Rejected data cleaned successfully!');
        return { success: true, message: 'Rejected data has been removed successfully' };
      } catch (error) {
        console.error('Error during rejected data cleanup:', error);
        throw error;
      }
    }
  }
};