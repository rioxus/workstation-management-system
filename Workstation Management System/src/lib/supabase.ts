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

// Type definitions for database tables
export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Technical' | 'Employee';
  division?: string;
  shift?: 'Morning' | 'Afternoon' | 'Night';
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: string;
  office_name: string;
  city: string;
  address?: string;
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
  shift?: 'Morning' | 'Afternoon' | 'Night';
  has_pc: boolean;
  has_monitor: boolean;
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
  shift: string;
  num_workstations: number;
  office_id?: string;
  floor_id?: string;
  location: string;
  floor_name: string;
  requires_pc: boolean;
  requires_monitor: boolean;
  justification?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'in_progress';
  admin_notes?: string;
  technical_notes?: string;
  approved_by?: string;
  approved_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentInventory {
  id: string;
  equipment_type: string;
  location_type: 'Office' | 'WFH';
  office_id?: string;
  floor_id?: string;
  location: string;
  total_assigned: number;
  active_users: number;
  in_maintenance: number;
  available: number;
  last_updated: string;
  created_at: string;
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

export interface SeatBooking {
  id: string;
  request_id: string;
  lab_id: string;
  lab_name: string;
  floor_id: string;
  seat_number: number;
  requestor_id: string;
  requestor_name?: string;
  division?: string;
  shift?: string;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected';
  booking_date: string;
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
    
    assignWorkstation: async (id: string, employeeId: string, shift: string) => {
      const { data, error } = await supabase
        .from('workstations')
        .update({
          status: 'occupied',
          assigned_to: employeeId,
          assigned_date: new Date().toISOString(),
          shift: shift
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
          assigned_date: null,
          shift: null
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

  // Equipment functions
  equipment: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .order('equipment_type');
      if (error) throw error;
      return data as EquipmentInventory[];
    },
    
    getByLocation: async (locationType: 'Office' | 'WFH') => {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*')
        .eq('location_type', locationType);
      if (error) throw error;
      return data as EquipmentInventory[];
    },
    
    update: async (id: string, updates: Partial<EquipmentInventory>) => {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .update({ ...updates, last_updated: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as EquipmentInventory;
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