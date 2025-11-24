import { supabase } from './supabase';

export interface WorkstationRegistry {
  id: string;
  asset_id: string;
  floor_number: number;
  floor_name: string;
  workstation_number: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'offline';
  assigned_to?: string;
  assigned_employee_id?: string;
  division?: string;
  shift?: string;
  has_pc: boolean;
  has_monitor: boolean;
  has_keyboard: boolean;
  has_mouse: boolean;
  ip_address?: string;
  location_details?: string;
  notes?: string;
  assigned_date?: string;
  last_updated: string;
  created_at: string;
}

export interface FloorSummary {
  floor_number: number;
  floor_name: string;
  total_workstations: number;
  available: number;
  occupied: number;
  maintenance: number;
  reserved: number;
  offline: number;
  workstations_with_pc: number;
  workstations_with_monitor: number;
}

export const workstationRegistryService = {
  // Get all workstations
  async getAllWorkstations(): Promise<WorkstationRegistry[]> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .select('*')
      .order('floor_number', { ascending: false })
      .order('workstation_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get workstations by floor
  async getWorkstationsByFloor(floorNumber: number): Promise<WorkstationRegistry[]> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .select('*')
      .eq('floor_number', floorNumber)
      .order('workstation_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get workstation by asset ID
  async getWorkstationByAssetId(assetId: string): Promise<WorkstationRegistry | null> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .select('*')
      .eq('asset_id', assetId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  // Get floor summary
  async getFloorSummary(): Promise<FloorSummary[]> {
    const { data, error } = await supabase
      .from('workstation_floor_summary')
      .select('*')
      .order('floor_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Create workstation (single)
  async createWorkstation(workstation: Partial<WorkstationRegistry>): Promise<WorkstationRegistry> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .insert(workstation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Create workstations in bulk (for adding ranges)
  async createWorkstationRange(
    floorNumber: number,
    floorName: string,
    startNumber: number,
    endNumber: number,
    defaults?: Partial<WorkstationRegistry>
  ): Promise<WorkstationRegistry[]> {
    const workstations = [];
    
    for (let i = startNumber; i <= endNumber; i++) {
      const wsNumber = String(i).padStart(3, '0');
      const assetId = `Admin/WS/F-${floorNumber}/${wsNumber}`;
      
      workstations.push({
        asset_id: assetId,
        floor_number: floorNumber,
        floor_name: floorName,
        workstation_number: wsNumber,
        status: 'available',
        has_pc: true,
        has_monitor: true,
        has_keyboard: true,
        has_mouse: true,
        ...defaults,
      });
    }

    const { data, error } = await supabase
      .from('workstation_registry')
      .insert(workstations)
      .select();

    if (error) throw error;
    return data || [];
  },

  // Update workstation
  async updateWorkstation(
    assetId: string,
    updates: Partial<WorkstationRegistry>
  ): Promise<WorkstationRegistry> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .update(updates)
      .eq('asset_id', assetId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Bulk update workstations by range
  async updateWorkstationRange(
    floorNumber: number,
    startNumber: number,
    endNumber: number,
    updates: Partial<WorkstationRegistry>
  ): Promise<WorkstationRegistry[]> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .update(updates)
      .eq('floor_number', floorNumber)
      .gte('workstation_number', String(startNumber).padStart(3, '0'))
      .lte('workstation_number', String(endNumber).padStart(3, '0'))
      .select();

    if (error) throw error;
    return data || [];
  },

  // Delete workstation
  async deleteWorkstation(assetId: string): Promise<void> {
    const { error } = await supabase
      .from('workstation_registry')
      .delete()
      .eq('asset_id', assetId);

    if (error) throw error;
  },

  // Delete workstation range
  async deleteWorkstationRange(
    floorNumber: number,
    startNumber: number,
    endNumber: number
  ): Promise<void> {
    const { error } = await supabase
      .from('workstation_registry')
      .delete()
      .eq('floor_number', floorNumber)
      .gte('workstation_number', String(startNumber).padStart(3, '0'))
      .lte('workstation_number', String(endNumber).padStart(3, '0'));

    if (error) throw error;
  },

  // Get available workstations on a floor
  async getAvailableWorkstations(floorNumber: number): Promise<WorkstationRegistry[]> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .select('*')
      .eq('floor_number', floorNumber)
      .eq('status', 'available')
      .order('workstation_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Search workstations
  async searchWorkstations(query: string): Promise<WorkstationRegistry[]> {
    const { data, error } = await supabase
      .from('workstation_registry')
      .select('*')
      .or(`asset_id.ilike.%${query}%,assigned_to.ilike.%${query}%,division.ilike.%${query}%`)
      .order('floor_number', { ascending: false })
      .order('workstation_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get statistics
  async getStatistics() {
    const workstations = await this.getAllWorkstations();
    const floorSummary = await this.getFloorSummary();

    return {
      total: workstations.length,
      available: workstations.filter(ws => ws.status === 'available').length,
      occupied: workstations.filter(ws => ws.status === 'occupied').length,
      maintenance: workstations.filter(ws => ws.status === 'maintenance').length,
      reserved: workstations.filter(ws => ws.status === 'reserved').length,
      offline: workstations.filter(ws => ws.status === 'offline').length,
      floors: floorSummary.length,
      utilizationRate: workstations.length > 0 
        ? (workstations.filter(ws => ws.status === 'occupied').length / workstations.length) * 100 
        : 0,
      floorSummary,
    };
  },
};
