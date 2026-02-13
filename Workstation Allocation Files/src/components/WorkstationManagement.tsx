import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Building, Plus, Pencil, Trash2, Save, X, Lock, Info, AlertTriangle } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { db } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

// Helper function to parse Asset ID range strings
// Supports formats like "30-34", "30, 31, 32" or "30-32, 35, 37-40"
const parseAssetIdRangeString = (rangeStr: string): number[] => {
  if (!rangeStr || rangeStr.trim() === '') return [];

  const assetIds: number[] = [];

  // Check if it's the legacy "to" format (e.g., "Admin/WS/F-5/001 to Admin/WS/F-5/098")
  if (rangeStr.toLowerCase().includes(' to ')) {
    const parts = rangeStr.toLowerCase().split(' to ');
    if (parts.length === 2) {
      const startNum = parseInt(parts[0].split('/').pop()?.trim() || '0');
      const endNum = parseInt(parts[1].split('/').pop()?.trim() || '0');
      if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
        for (let i = startNum; i <= endNum; i++) {
          assetIds.push(i);
        }
        return assetIds;
      }
    }
  }

  // Split by commas to handle multiple ranges/individual IDs
  const parts = rangeStr.split(',').map(p => p.trim());

  for (const part of parts) {
    // Extract just the numbers from the end
    // Supports formats like "Admin/WS/F-5/112-123" or "112-123" or "125"
    const numberPart = part.split('/').pop() || part;

    // Check if it's a range with dash (contains '-')
    if (numberPart.includes('-')) {
      const [start, end] = numberPart.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        for (let i = start; i <= end; i++) {
          assetIds.push(i);
        }
      }
    } else {
      // Individual ID
      const num = parseInt(numberPart.trim());
      if (!isNaN(num)) {
        assetIds.push(num);
      }
    }
  }

  return assetIds;
};

interface Lab {
  id: string;
  labName: string;
  division: string;
  office: string;
  floor: string;
  totalWorkstations: number;
  inUse: number;
  available: number;
  floorId: string;
  assetIdRange?: string; // Asset ID range at division level
}

interface LabAllocation {
  id: string;
  floorId: string;
  officeName: string;
  floorName: string;
  labName: string;
  totalWorkstations: number;
  assetIdRange?: string; // Asset ID range predefined during lab creation
}

interface FloorSummary {
  floorId: string;
  floorName: string;
  officeName: string;
  totalWorkstations: number;
  allocatedToLabs: number;
}

interface WorkstationManagementProps {
  onDataChange?: () => void;
}

export function WorkstationManagement({ onDataChange }: WorkstationManagementProps) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labAllocations, setLabAllocations] = useState<LabAllocation[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [seatBookings, setSeatBookings] = useState<any[]>([]); // Add seat bookings state
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [showMigrationWarning, setShowMigrationWarning] = useState(false);
  
  // Floor & Lab allocation states
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  const [editingLabAllocation, setEditingLabAllocation] = useState<LabAllocation | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [floorTotalWorkstations, setFloorTotalWorkstations] = useState<number>(0);
  const [labAllocationName, setLabAllocationName] = useState('');
  const [labAllocationAmount, setLabAllocationAmount] = useState<number>(0);
  const [labAssetIdRange, setLabAssetIdRange] = useState<string>(''); // Asset ID range for lab allocation
  
  // Staged lab allocations for batch creation
  const [stagedLabAllocations, setStagedLabAllocations] = useState<Array<{
    officeName: string;
    floorName: string;
    labName: string;
    totalWorkstations: number;
    assetIdRange: string;
  }>>([]);
  
  // Filter states for Floor & Lab Allocation table
  const [filterOffice, setFilterOffice] = useState<string>('');
  const [filterFloor, setFilterFloor] = useState<string>('');
  
  // Filter states for Workstation Data Management table
  const [filterDataOffice, setFilterDataOffice] = useState<string>('');
  const [filterDataFloor, setFilterDataFloor] = useState<string>('');
  const [filterDataLab, setFilterDataLab] = useState<string>('');
  
  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [labToDelete, setLabToDelete] = useState<LabAllocation | null>(null);
  const [deletionImpact, setDeletionImpact] = useState<{
    divisionsCount: number;
    divisions: Array<{ division: string; inUse: number; assetIds: string }>;
    seatBookingsCount: number;
  }>({ divisionsCount: 0, divisions: [], seatBookingsCount: 0 });
  
  const [formData, setFormData] = useState({
    office: '',
    floorId: '',
    labName: '',
    division: '',
    totalWorkstations: 0,
    inUse: 0,
    assetIdRange: ''
  });

  // Multi-division allocation states
  const [pendingDivisions, setPendingDivisions] = useState<Array<{ division: string; inUse: number; assetIdRange?: string }>>([]);

  // Dynamic divisions list from database
  const [divisions, setDivisions] = useState<string[]>([]);

  // Office and floor mapping (matches database office_name values)
  const officeFloorMapping = {
    'Gurukul': ['5th Floor'],
    'Commerce House': ['9th Floor', '5th Floor', '4th Floor']
  };

  // Helper function to validate and parse simple Asset ID range (e.g., "100-130")
  const parseSimpleAssetIdRange = (rangeStr: string): { isValid: boolean; count: number; start: number; end: number; error?: string } => {
    if (!rangeStr || rangeStr.trim() === '') {
      return { isValid: false, count: 0, start: 0, end: 0, error: 'Asset ID range is required' };
    }

    // Remove any whitespace
    const cleaned = rangeStr.trim();
    
    // Check format: should be "number-number"
    if (!cleaned.includes('-')) {
      return { isValid: false, count: 0, start: 0, end: 0, error: 'Format should be: Start-End (e.g., 100-130)' };
    }

    const parts = cleaned.split('-');
    if (parts.length !== 2) {
      return { isValid: false, count: 0, start: 0, end: 0, error: 'Format should be: Start-End (e.g., 100-130)' };
    }

    const start = parseInt(parts[0].trim());
    const end = parseInt(parts[1].trim());

    if (isNaN(start) || isNaN(end)) {
      return { isValid: false, count: 0, start: 0, end: 0, error: 'Both start and end must be valid numbers' };
    }

    if (start >= end) {
      return { isValid: false, count: 0, start: 0, end: 0, error: 'End number must be greater than start number' };
    }

    const count = end - start + 1;
    return { isValid: true, count, start, end };
  };

  // Helper function to parse asset ID ranges and count workstations
  const parseAssetIdRange = (rangeStr: string): number => {
    if (!rangeStr || rangeStr.trim() === '') return 0;
    
    let count = 0;
    
    // Check if it's the legacy "to" format (e.g., "Admin/WS/F-5/001 to Admin/WS/F-5/098")
    if (rangeStr.toLowerCase().includes(' to ')) {
      const parts = rangeStr.toLowerCase().split(' to ');
      if (parts.length === 2) {
        const startNum = parseInt(parts[0].split('/').pop()?.trim() || '0');
        const endNum = parseInt(parts[1].split('/').pop()?.trim() || '0');
        if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
          return endNum - startNum + 1;
        }
      }
    }
    
    // Split by commas to handle multiple ranges/individual IDs
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      // Extract just the numbers from the end
      // Supports formats like "Admin/WS/F-5/112-123" or "112-123" or "125"
      const numberPart = part.split('/').pop() || part;
      
      // Check if it's a range with dash (contains '-')
      if (numberPart.includes('-')) {
        const [start, end] = numberPart.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          count += (end - start + 1);
        }
      } else {
        // Individual ID
        const num = parseInt(numberPart.trim());
        if (!isNaN(num)) {
          count += 1;
        }
      }
    }
    
    return count;
  };

  // Helper function to format array of IDs as ranges (e.g., [7,8,9,10,11] => "7-11")
  const formatAssetIdsAsRange = (ids: number[]): string => {
    const sorted = ids.sort((a, b) => a - b);
    if (sorted.length === 0) return '';
    if (sorted.length === 1) return sorted[0].toString();
    
    const ranges: string[] = [];
    let rangeStart = sorted[0];
    let rangeEnd = sorted[0];
    
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === rangeEnd + 1) {
        rangeEnd = sorted[i];
      } else {
        ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
    ranges.push(rangeStart === rangeEnd ? `${rangeStart}` : `${rangeStart}-${rangeEnd}`);
    
    return ranges.join(', ');
  };

  // Helper function to extract individual Asset IDs from range string (returns array of numbers)
  const extractAssetIds = (rangeStr: string): number[] => {
    if (!rangeStr || rangeStr.trim() === '') return [];
    
    const ids: number[] = [];
    
    // Check if it's the legacy "to" format
    if (rangeStr.toLowerCase().includes(' to ')) {
      const parts = rangeStr.toLowerCase().split(' to ');
      if (parts.length === 2) {
        const startNum = parseInt(parts[0].split('/').pop()?.trim() || '0');
        const endNum = parseInt(parts[1].split('/').pop()?.trim() || '0');
        if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
          for (let i = startNum; i <= endNum; i++) {
            ids.push(i);
          }
        }
      }
      return [...new Set(ids)].sort((a, b) => a - b);
    }
    
    // Split by commas to handle multiple ranges/individual IDs
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      // Extract just the numbers from the end
      const numberPart = part.split('/').pop() || part;
      
      // Check if it's a range with dash
      if (numberPart.includes('-')) {
        const [start, end] = numberPart.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            ids.push(i);
          }
        }
      } else {
        // Individual ID
        const num = parseInt(numberPart.trim());
        if (!isNaN(num)) {
          ids.push(num);
        }
      }
    }
    
    // Remove duplicates and sort
    return [...new Set(ids)].sort((a, b) => a - b);
  };

  // Helper function to check if Asset IDs are within the lab's assigned range
  const validateAssetIdsWithinLabRange = (assetIdsToCheck: number[], floorId: string, labName: string): { valid: boolean; outOfRangeIds: number[]; labRange: string | null } => {
    const labAllocation = labAllocations.find(
      lab => lab.floorId === floorId && lab.labName === labName
    );
    
    if (!labAllocation?.assetIdRange || labAllocation.assetIdRange.trim() === '') {
      // If no range is configured, we can't validate (but we should warn)
      return { valid: true, outOfRangeIds: [], labRange: null };
    }
    
    // Extract the lab's allowed Asset IDs
    const labAllowedIds = extractAssetIds(labAllocation.assetIdRange);
    
    if (labAllowedIds.length === 0) {
      return { valid: true, outOfRangeIds: [], labRange: labAllocation.assetIdRange };
    }
    
    // Find Asset IDs that are not in the lab's allowed range
    const outOfRangeIds = assetIdsToCheck.filter(id => !labAllowedIds.includes(id));
    
    return {
      valid: outOfRangeIds.length === 0,
      outOfRangeIds,
      labRange: labAllocation.assetIdRange
    };
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [labsData, officesFloorsData, divisionsData, seatBookingsData] = await Promise.all([
        dataService.getLabs(),
        dataService.getOfficesAndFloors(),
        db.divisions.getAll(),
        dataService.getSeatBookings().catch(() => []) // Load seat bookings
      ]);
      
      // Set divisions list from database
      setDivisions(divisionsData.map(d => d.division_name));
      
      // Separate lab allocations (no division) from division assignments (with division)
      const allocations = labsData.filter(lab => !lab.division || lab.division.trim() === '');
      const divisions = labsData.filter(lab => lab.division && lab.division.trim() !== '');
      
      // Calculate available workstations for each division
      const divisionsWithAvailable = divisions.map(division => {
        // Find the lab allocation for this division
        const labAlloc = allocations.find(
          alloc => alloc.floorId === division.floorId && alloc.labName === division.labName
        );
        
        if (!labAlloc) {
          return { ...division, available: 0 };
        }
        
        // Calculate total in use for all divisions in this lab
        const totalInUse = divisions
          .filter(d => d.floorId === division.floorId && d.labName === division.labName)
          .reduce((sum, d) => sum + (d.inUse || 0), 0);
        
        return {
          ...division,
          totalWorkstations: labAlloc.totalWorkstations,
          available: labAlloc.totalWorkstations - totalInUse
        };
      });
      
      setLabs(divisionsWithAvailable);
      setLabAllocations(allocations.map(alloc => ({
        id: alloc.id,
        floorId: alloc.floorId,
        officeName: alloc.office,
        floorName: alloc.floor,
        labName: alloc.labName,
        totalWorkstations: alloc.totalWorkstations,
        assetIdRange: alloc.assetIdRange || '' // Include asset ID range
      })));
      setOffices(officesFloorsData.offices);
      setFloors(officesFloorsData.floors);
      setSeatBookings(seatBookingsData); // Set seat bookings data
      
      setShowMigrationWarning(false);
    } catch (error: any) {
      console.error('Error loading workstation data:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      
      const isMissingColumnError = 
        error?.message?.includes('column') && 
        error?.message?.includes('in_use');
      
      if (isMissingColumnError) {
        setShowMigrationWarning(true);
        toast.error('Database migration required. Please add in_use column.');
      } else {
        toast.error('Failed to load workstation data');
      }
      
      setLabs([]);
      setLabAllocations([]);
      setOffices([]);
      setFloors([]);
    } finally {
      setLoading(false);
    }
  };

  const getFloorSummaries = (): FloorSummary[] => {
    const floorMap = new Map<string, FloorSummary>();
    
    labAllocations.forEach(lab => {
      if (!floorMap.has(lab.floorId)) {
        floorMap.set(lab.floorId, {
          floorId: lab.floorId,
          floorName: lab.floorName,
          officeName: lab.officeName,
          totalWorkstations: 0,
          allocatedToLabs: 0
        });
      }
      
      const summary = floorMap.get(lab.floorId)!;
      summary.allocatedToLabs += lab.totalWorkstations;
    });
    
    return Array.from(floorMap.values());
  };

  const getAvailableWorkstationsForLab = (floorId: string, labName: string): number => {
    // Find the lab allocation
    const labAlloc = labAllocations.find(
      lab => lab.floorId === floorId && lab.labName === labName
    );
    
    if (!labAlloc) return 0;
    
    // Calculate total in use by all divisions in this lab
    const totalInUse = labs
      .filter(lab => lab.floorId === floorId && lab.labName === labName)
      .reduce((sum, lab) => sum + (lab.inUse || 0), 0);
    
    // CRITICAL: Account for pending seat bookings
    // Count unique Asset IDs from pending seat bookings in this lab
    const pendingSeatCount = seatBookings.filter(booking => {
      // Only count pending bookings (not approved or rejected)
      if (booking.status !== 'pending') return false;
      
      // Match by floor_id and lab_name (these are the actual fields in seat_bookings table)
      return booking.floor_id === floorId && booking.lab_name === labName;
    }).length;
    
    console.log(`📊 Available workstations for ${labName}:`, {
      total: labAlloc.totalWorkstations,
      inUse: totalInUse,
      pendingBookings: pendingSeatCount,
      available: labAlloc.totalWorkstations - totalInUse - pendingSeatCount,
      seatBookingsTotal: seatBookings.length,
      pendingInThisLab: seatBookings.filter(b => b.status === 'pending' && b.floor_id === floorId && b.lab_name === labName)
    });
    
    return labAlloc.totalWorkstations - totalInUse - pendingSeatCount;
  };

  const getFloorsForOffice = (officeName: string) => {
    // Filter floors based on officeName property returned from dataService
    return floors.filter(floor => floor.officeName === officeName);
  };

  // Get unique offices from lab allocations
  const getUniqueOffices = () => {
    const officeSet = new Set(labAllocations.map(lab => lab.officeName));
    return Array.from(officeSet).sort();
  };

  // Get unique floors for selected office from lab allocations
  const getUniqueFloorsForOffice = (officeName: string) => {
    const floorSet = new Set(
      labAllocations
        .filter(lab => !officeName || lab.officeName === officeName)
        .map(lab => lab.floorName)
    );
    return Array.from(floorSet).sort();
  };

  // Filter lab allocations based on selected filters
  const getFilteredLabAllocations = () => {
    return labAllocations.filter(lab => {
      const matchesOffice = !filterOffice || lab.officeName === filterOffice;
      const matchesFloor = !filterFloor || lab.floorName === filterFloor;
      return matchesOffice && matchesFloor;
    });
  };

  // Get unique offices from labs (divisions) for Workstation Data Management filter
  const getUniqueOfficesFromLabs = () => {
    const officeSet = new Set(labs.map(lab => lab.office));
    return Array.from(officeSet).sort();
  };

  // Get unique floors from divisions for Workstation Data Management filter
  const getUniqueFloorsFromDivisions = () => {
    // If office is selected, filter by office first
    let filteredLabs = labs;
    if (filterDataOffice && filterDataOffice !== 'all') {
      filteredLabs = labs.filter(lab => lab.office === filterDataOffice);
    }
    
    const floorSet = new Set(filteredLabs.map(lab => lab.floor).filter(f => f && f.trim() !== ''));
    return Array.from(floorSet).sort();
  };

  // Get unique labs from divisions for Workstation Data Management filter
  const getUniqueLabsFromDivisions = () => {
    // If office is selected, filter by office first, then by floor
    let filteredLabs = labs;
    if (filterDataOffice && filterDataOffice !== 'all') {
      filteredLabs = labs.filter(lab => lab.office === filterDataOffice);
    }
    if (filterDataFloor && filterDataFloor !== 'all') {
      filteredLabs = filteredLabs.filter(lab => lab.floor === filterDataFloor);
    }
    
    const labSet = new Set(filteredLabs.map(lab => lab.labName).filter(l => l && l.trim() !== ''));
    return Array.from(labSet).sort();
  };

  // Filter labs based on selected filters for Workstation Data Management table
  const getFilteredLabs = () => {
    return labs.filter(lab => {
      const matchesOffice = !filterDataOffice || filterDataOffice === 'all' || lab.office === filterDataOffice;
      const matchesFloor = !filterDataFloor || filterDataFloor === 'all' || lab.floor === filterDataFloor;
      const matchesLab = !filterDataLab || filterDataLab === 'all' || lab.labName === filterDataLab;
      return matchesOffice && matchesFloor && matchesLab;
    });
  };

  // Add current form data to staged list
  const handleAddToList = () => {
    if (!selectedOffice || !selectedFloor || !labAllocationName || labAllocationAmount <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    // Validate Asset ID range
    if (!labAssetIdRange || labAssetIdRange.trim() === '') {
      toast.error('Please provide Asset ID range (e.g., 100-130)');
      return;
    }

    const rangeValidation = parseSimpleAssetIdRange(labAssetIdRange);
    if (!rangeValidation.isValid) {
      toast.error(rangeValidation.error || 'Invalid Asset ID range format');
      return;
    }

    // Ensure Asset ID count matches Total Workstations
    if (rangeValidation.count !== labAllocationAmount) {
      toast.error(
        `Asset ID range count (${rangeValidation.count}) must match Total Workstations (${labAllocationAmount}). ` +
        `Your range ${labAssetIdRange} contains ${rangeValidation.count} IDs.`
      );
      return;
    }

    // Check if lab name already exists in staged list for same office/floor
    const duplicate = stagedLabAllocations.find(
      lab => lab.officeName === selectedOffice && 
             lab.floorName === selectedFloor && 
             lab.labName.toLowerCase() === labAllocationName.toLowerCase()
    );

    if (duplicate) {
      toast.error('A lab with this name is already in the list for this office/floor');
      return;
    }

    // Add to staged list
    setStagedLabAllocations([...stagedLabAllocations, {
      officeName: selectedOffice,
      floorName: selectedFloor,
      labName: labAllocationName,
      totalWorkstations: labAllocationAmount,
      assetIdRange: labAssetIdRange
    }]);

    // Clear form for next entry
    setLabAllocationName('');
    setLabAllocationAmount(0);
    setLabAssetIdRange('');

    toast.success(`"${labAllocationName}" added to list`);
  };

  // Remove a lab from the staged list
  const handleRemoveFromList = (index: number) => {
    const newList = stagedLabAllocations.filter((_, i) => i !== index);
    setStagedLabAllocations(newList);
    toast.success('Lab removed from list');
  };

  const handleAllocationSubmit = async () => {
    // If editing, use the old single-lab logic
    if (editingLabAllocation) {
      if (!selectedOffice || !selectedFloor || !labAllocationName || labAllocationAmount <= 0) {
        toast.error('Please fill all required fields');
        return;
      }

      // Validate Asset ID range
      if (!labAssetIdRange || labAssetIdRange.trim() === '') {
        toast.error('Please provide Asset ID range (e.g., 100-130)');
        return;
      }

      const rangeValidation = parseSimpleAssetIdRange(labAssetIdRange);
      if (!rangeValidation.isValid) {
        toast.error(rangeValidation.error || 'Invalid Asset ID range format');
        return;
      }

      // Ensure Asset ID count matches Total Workstations
      if (rangeValidation.count !== labAllocationAmount) {
        toast.error(
          `Asset ID range count (${rangeValidation.count}) must match Total Workstations (${labAllocationAmount}). ` +
          `Your range ${labAssetIdRange} contains ${rangeValidation.count} IDs.`
        );
        return;
      }

      try {
        // Update existing lab allocation
        await dataService.updateLab(editingLabAllocation.id, {
          labName: labAllocationName,
          division: '', // Lab allocations don't have divisions
          totalWorkstations: labAllocationAmount,
          inUse: 0,
          assetIdRange: labAssetIdRange // Save Asset ID range
        });
        
        // Update all division records for this lab with new total workstations and asset range
        const divisionsToUpdate = labs.filter(
          lab => lab.floorId === editingLabAllocation.floorId && 
                 lab.labName === editingLabAllocation.labName
        );
        
        for (const division of divisionsToUpdate) {
          await dataService.updateLab(division.id, {
            labName: labAllocationName, // Update lab name if changed
            division: division.division,
            totalWorkstations: labAllocationAmount,
            inUse: division.inUse,
            assetIdRange: labAssetIdRange // Update Asset ID range for all divisions in this lab
          });
        }
        
        // Reload data to refresh everything
        await loadData();
        
        toast.success('Lab allocation updated successfully');
        
        setShowAllocationDialog(false);
        setEditingLabAllocation(null);
        setSelectedOffice('');
        setSelectedFloor('');
        setFloorTotalWorkstations(0);
        setLabAllocationName('');
        setLabAllocationAmount(0);
        setLabAssetIdRange('');
        
        if (onDataChange) onDataChange();
      } catch (error) {
        console.error('Error updating lab allocation:', error);
        toast.error('Failed to update lab allocation');
      }
      return;
    }

    // BATCH CREATION MODE - Create all staged labs + current form (if filled)
    try {
      const labsToCreate = [...stagedLabAllocations];

      // If current form is filled, validate and add it to the batch
      const hasCurrentFormData = selectedOffice && selectedFloor && labAllocationName && labAllocationAmount > 0;
      
      if (hasCurrentFormData) {
        // Validate current form
        if (!labAssetIdRange || labAssetIdRange.trim() === '') {
          toast.error('Please provide Asset ID range for the current lab (e.g., 100-130)');
          return;
        }

        const rangeValidation = parseSimpleAssetIdRange(labAssetIdRange);
        if (!rangeValidation.isValid) {
          toast.error(rangeValidation.error || 'Invalid Asset ID range format for current lab');
          return;
        }

        if (rangeValidation.count !== labAllocationAmount) {
          toast.error(
            `Current lab: Asset ID range count (${rangeValidation.count}) must match Total Workstations (${labAllocationAmount}). ` +
            `Your range ${labAssetIdRange} contains ${rangeValidation.count} IDs.`
          );
          return;
        }

        // Add current form to batch
        labsToCreate.push({
          officeName: selectedOffice,
          floorName: selectedFloor,
          labName: labAllocationName,
          totalWorkstations: labAllocationAmount,
          assetIdRange: labAssetIdRange
        });
      }

      // If no labs to create (neither staged nor current form filled)
      if (labsToCreate.length === 0) {
        toast.error('Please fill the form or add labs to the list before creating');
        return;
      }

      // Create all labs
      let createdCount = 0;
      let errorCount = 0;

      for (const labData of labsToCreate) {
        try {
          // Find or create office and floor
          const office = await dataService.findOrCreateOffice(labData.officeName.trim());
          const floor = await dataService.findOrCreateFloor(office.id, labData.floorName.trim());
          
          // Check if lab name already exists on this floor
          const existingLab = labAllocations.find(
            lab => lab.floorId === floor.id && 
                   lab.labName.toLowerCase() === labData.labName.toLowerCase()
          );

          if (existingLab) {
            toast.error(`Lab "${labData.labName}" already exists on ${labData.floorName}`);
            errorCount++;
            continue;
          }

          // Create new lab allocation
          await dataService.createLab({
            floorId: floor.id,
            labName: labData.labName,
            division: '', // Lab allocations don't have divisions
            totalWorkstations: labData.totalWorkstations,
            inUse: 0,
            assetIdRange: labData.assetIdRange
          });

          createdCount++;
        } catch (error) {
          console.error(`Error creating lab "${labData.labName}":`, error);
          errorCount++;
        }
      }

      // Reload data to refresh everything
      await loadData();
      
      // Show results
      if (createdCount > 0 && errorCount === 0) {
        toast.success(`Successfully created ${createdCount} lab${createdCount > 1 ? 's' : ''}`);
      } else if (createdCount > 0 && errorCount > 0) {
        toast.success(`Created ${createdCount} lab${createdCount > 1 ? 's' : ''}, but ${errorCount} failed`);
      } else {
        toast.error('Failed to create labs');
      }

      // Reset everything
      setShowAllocationDialog(false);
      setEditingLabAllocation(null);
      setSelectedOffice('');
      setSelectedFloor('');
      setFloorTotalWorkstations(0);
      setLabAllocationName('');
      setLabAllocationAmount(0);
      setLabAssetIdRange('');
      setStagedLabAllocations([]);
      
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error in batch lab creation:', error);
      toast.error('Failed to create lab allocations');
    }
  };

  const handleOpenLabAllocationDialog = (allocation?: LabAllocation) => {
    if (allocation) {
      setEditingLabAllocation(allocation);
      setSelectedOffice(allocation.officeName);
      setSelectedFloor(allocation.floorId);
      setLabAllocationName(allocation.labName);
      setLabAllocationAmount(allocation.totalWorkstations);
      
      // Load or auto-generate Asset ID range
      if (allocation.assetIdRange) {
        setLabAssetIdRange(allocation.assetIdRange);
      } else {
        // Auto-generate range for old labs (1-30, 31-60, etc.)
        const existingAllocations = labAllocations.filter(
          lab => lab.id !== allocation.id && lab.assetIdRange
        );
        
        let maxEndId = 0;
        existingAllocations.forEach(lab => {
          const validation = parseSimpleAssetIdRange(lab.assetIdRange || '');
          if (validation.isValid && validation.end > maxEndId) {
            maxEndId = validation.end;
          }
        });
        
        const start = maxEndId + 1;
        const end = start + allocation.totalWorkstations - 1;
        const autoRange = `${start}-${end}`;
        setLabAssetIdRange(autoRange);
        
        toast.info(`Auto-generated Asset ID range: ${autoRange}`, { duration: 4000 });
      }
    } else {
      setEditingLabAllocation(null);
      setSelectedOffice('');
      setSelectedFloor('');
      setFloorTotalWorkstations(0);
      setLabAllocationName('');
      setLabAllocationAmount(0);
      setLabAssetIdRange('');
    }
    setShowAllocationDialog(true);
  };

  const handleDeleteLabAllocation = async (allocationId: string) => {
    const allocation = labAllocations.find(lab => lab.id === allocationId);
    if (!allocation) return;
    
    // Check if there are divisions using this lab
    const divisionsInLab = labs.filter(
      lab => lab.floorId === allocation.floorId && lab.labName === allocation.labName
    );
    
    // Get seat bookings count for this lab
    try {
      const allSeatBookings = await db.seatBookings.getAll();
      const seatBookingsForLab = allSeatBookings.filter(
        booking => booking.lab_name === allocation.labName && 
                   booking.floor_id === allocation.floorId
      );
      
      // Prepare deletion impact data
      setDeletionImpact({
        divisionsCount: divisionsInLab.length,
        divisions: divisionsInLab.map(d => ({
          division: d.division,
          inUse: d.inUse,
          assetIds: d.assetIdRange || 'None'
        })),
        seatBookingsCount: seatBookingsForLab.length
      });
      
      setLabToDelete(allocation);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error fetching deletion impact:', error);
      toast.error('Failed to load deletion information');
    }
  };

  const confirmDeleteLabAllocation = async () => {
    if (!labToDelete) return;
    
    const loadingToast = toast.loading('Deleting lab allocation and related data...');
    
    try {
      // Find divisions to delete
      const divisionsInLab = labs.filter(
        lab => lab.floorId === labToDelete.floorId && lab.labName === labToDelete.labName
      );
      
      // Step 1: Delete all seat bookings for this lab
      const allSeatBookings = await db.seatBookings.getAll();
      const seatBookingsToDelete = allSeatBookings.filter(
        booking => booking.lab_name === labToDelete.labName && 
                   booking.floor_id === labToDelete.floorId
      );
      
      for (const booking of seatBookingsToDelete) {
        await db.seatBookings.update(booking.id, { status: 'rejected' }); // Mark as rejected first
        // Note: We could also hard delete, but marking as rejected maintains audit trail
      }
      
      // Step 2: Delete all associated division records from labs table
      if (divisionsInLab.length > 0) {
        for (const division of divisionsInLab) {
          await dataService.deleteLab(division.id);
        }
      }
      
      // Step 3: Delete the lab allocation itself
      await dataService.deleteLab(labToDelete.id);
      
      // Update local state
      setLabAllocations(prev => prev.filter(lab => lab.id !== labToDelete.id));
      setLabs(prev => prev.filter(
        lab => !(lab.floorId === labToDelete.floorId && lab.labName === labToDelete.labName)
      ));
      
      // Close dialog
      setDeleteDialogOpen(false);
      setLabToDelete(null);
      
      // Show success message
      toast.dismiss(loadingToast);
      toast.success(
        `Lab allocation deleted successfully!\n` +
        `${divisionsInLab.length} division allocation(s) removed\n` +
        `${seatBookingsToDelete.length} seat booking(s) updated\n` +
        `Note: Division entries in Division Management table remain intact.`,
        { duration: 6000 }
      );
      
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error deleting lab allocation:', error);
      toast.dismiss(loadingToast);
      toast.error('Failed to delete lab allocation. Please try again.');
    }
  };

  const handleOpenDialog = (lab?: Lab) => {
    if (lab) {
      setEditingLab(lab);
      
      setFormData({
        office: lab.office,
        floorId: lab.floorId,
        labName: lab.labName,
        division: lab.division,
        totalWorkstations: lab.totalWorkstations,
        inUse: lab.inUse,
        assetIdRange: lab.assetIdRange || ''
      });
    } else {
      setEditingLab(null);
      setFormData({
        office: '',
        floorId: '',
        labName: '',
        division: '',
        totalWorkstations: 0,
        inUse: 0,
        assetIdRange: ''
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingLab(null);
    setFormData({
      office: '',
      floorId: '',
      labName: '',
      division: '',
      totalWorkstations: 0,
      inUse: 0,
      assetIdRange: ''
    });
    setPendingDivisions([]); // Clear pending divisions when dialog closes
  };

  // Add division to pending list
  const handleAddToPendingList = () => {
    if (!formData.division || formData.inUse <= 0) {
      toast.error('Please select a division and enter valid workstations');
      return;
    }
    
    // MANDATORY: Asset ID Range is now required
    if (!formData.assetIdRange || formData.assetIdRange.trim() === '') {
      toast.error('Asset ID Range is mandatory. Please assign Asset IDs to this division.');
      return;
    }

    // Check if division already exists in pending list
    if (pendingDivisions.find(d => d.division === formData.division)) {
      toast.error('This division is already in the list');
      return;
    }

    // Check if division already exists in database for this lab
    const existingDivision = labs.find(
      lab => lab.floorId === formData.floorId && 
             lab.labName === formData.labName && 
             lab.division === formData.division
    );

    if (existingDivision) {
      toast.error('This division already exists in this lab. Please edit it instead.');
      return;
    }

    // Calculate available workstations considering pending divisions
    const availableWorkstations = getAvailableWorkstationsForLab(formData.floorId, formData.labName);
    const pendingTotal = pendingDivisions.reduce((sum, d) => sum + d.inUse, 0);
    const remainingAvailable = availableWorkstations - pendingTotal;

    if (formData.inUse > remainingAvailable) {
      toast.error(`Cannot allocate ${formData.inUse} workstations. Only ${remainingAvailable} remaining.`);
      return;
    }

    // Validation: Asset ID count must match workstations allocated (if asset IDs provided)
    if (formData.assetIdRange && formData.assetIdRange.trim() !== '') {
      const assetIdCount = parseAssetIdRange(formData.assetIdRange);
      if (assetIdCount !== formData.inUse) {
        toast.error(
          `Asset ID count mismatch! You have ${assetIdCount} asset IDs but ${formData.inUse} workstations allocated. The counts must match exactly.`
        );
        return;
      }

      // CRITICAL VALIDATION: Check for Asset ID conflicts in the same lab
      const newAssetIds = extractAssetIds(formData.assetIdRange);
      
      // VALIDATION 1: Check if Asset IDs are within the lab's assigned range
      const rangeValidation = validateAssetIdsWithinLabRange(newAssetIds, formData.floorId, formData.labName);
      if (!rangeValidation.valid) {
        toast.error(
          `❌ Asset IDs Out of Range!\n\n` +
          `The following Asset IDs are outside the lab's assigned range:\n` +
          `${rangeValidation.outOfRangeIds.join(', ')}\n\n` +
          `Lab's Asset ID Range: ${rangeValidation.labRange}\n\n` +
          `Please select Asset IDs within the lab's range.`,
          { duration: 10000 }
        );
        return;
      }
      
      // VALIDATION 2: Check against existing divisions in database
      const otherDivisionsInLab = labs.filter(
        lab => 
          lab.floorId === formData.floorId &&
          lab.labName === formData.labName &&
          lab.division && 
          lab.division.trim() !== '' &&
          lab.assetIdRange && 
          lab.assetIdRange.trim() !== ''
      );

      // Check for overlapping Asset IDs with existing divisions
      const conflicts: { assetId: number; division: string }[] = [];
      for (const otherDivision of otherDivisionsInLab) {
        const otherAssetIds = extractAssetIds(otherDivision.assetIdRange!);
        
        // Find common IDs
        const overlappingIds = newAssetIds.filter(id => otherAssetIds.includes(id));
        
        if (overlappingIds.length > 0) {
          overlappingIds.forEach(id => {
            conflicts.push({ assetId: id, division: otherDivision.division });
          });
        }
      }

      // Check for overlapping Asset IDs with pending divisions
      for (const pendingDiv of pendingDivisions) {
        if (pendingDiv.assetIdRange && pendingDiv.assetIdRange.trim() !== '') {
          const pendingAssetIds = extractAssetIds(pendingDiv.assetIdRange);
          
          // Find common IDs
          const overlappingIds = newAssetIds.filter(id => pendingAssetIds.includes(id));
          
          if (overlappingIds.length > 0) {
            overlappingIds.forEach(id => {
              conflicts.push({ assetId: id, division: pendingDiv.division });
            });
          }
        }
      }

      if (conflicts.length > 0) {
        // Group conflicts by division
        const conflictsByDivision = conflicts.reduce((acc, { assetId, division }) => {
          if (!acc[division]) acc[division] = [];
          acc[division].push(assetId);
          return acc;
        }, {} as Record<string, number[]>);

        // Build concise error message
        const conflictMessages = Object.entries(conflictsByDivision).map(([division, ids]) => {
          return `Asset ID ${formatAssetIdsAsRange(ids)} (already assigned to ${division})`;
        });

        toast.error(
          `Asset ID Conflict Detected in ${formData.labName}! The following ${conflictMessages.join(', ')}. Please remove conflicting IDs or choose different Asset IDs.`,
          { duration: 5000 }
        );
        return;
      }
      
      // VALIDATION 3: Check against pending seat bookings
      const labAlloc = labAllocations.find(
        lab => lab.floorId === formData.floorId && lab.labName === formData.labName
      );
      
      if (labAlloc) {
        const pendingBookingsInLab = seatBookings.filter(booking => {
          if (booking.status !== 'pending') return false;
          // Match by floor_id and lab_name (actual fields in seat_bookings table)
          return booking.floor_id === formData.floorId && booking.lab_name === formData.labName;
        });
        
        // Get Asset IDs from pending bookings (convert string to number for comparison)
        const reservedAssetIds = pendingBookingsInLab
          .map(booking => booking.asset_id ? parseInt(booking.asset_id) : null)
          .filter(id => id !== null && !isNaN(id)) as number[];
        
        // Check if any of the new Asset IDs are already in pending bookings
        const conflictingReservedIds = newAssetIds.filter(id => reservedAssetIds.includes(id));
        
        if (conflictingReservedIds.length > 0) {
          toast.error(
            `❌ Asset IDs Already Reserved!\\n\\n` +
            `The following Asset IDs are currently in pending allocations:\\n` +
            `${formatAssetIdsAsRange(conflictingReservedIds)}\\n\\n` +
            `These seats are temporarily reserved. Please choose different Asset IDs or wait for the pending allocations to be approved/rejected.`,
            { duration: 8000 }
          );
          return;
        }
      }
    }

    // Add to pending list
    setPendingDivisions([...pendingDivisions, { 
      division: formData.division, 
      inUse: formData.inUse,
      assetIdRange: formData.assetIdRange 
    }]);
    
    // Reset division, inUse, and assetIdRange fields for next entry
    setFormData({ ...formData, division: '', inUse: 0, assetIdRange: '' });
    
    toast.success(`${formData.division} added to list`);
  };

  // Remove division from pending list
  const handleRemoveFromPendingList = (divisionName: string) => {
    setPendingDivisions(pendingDivisions.filter(d => d.division !== divisionName));
    toast.success(`${divisionName} removed from list`);
  };

  // Calculate remaining workstations considering pending divisions
  const getRemainingWorkstations = () => {
    if (!formData.floorId || !formData.labName) return 0;
    
    const availableWorkstations = getAvailableWorkstationsForLab(formData.floorId, formData.labName);
    const pendingTotal = pendingDivisions.reduce((sum, d) => sum + d.inUse, 0);
    
    return availableWorkstations - pendingTotal;
  };

  const handleSubmit = async () => {
    try {
      // If editing a single division, use the original single-division flow
      if (editingLab) {
        if (!formData.office || !formData.floorId || !formData.labName || !formData.division) {
          toast.error('Please fill all required fields');
          return;
        }
        
        // MANDATORY: Asset ID Range is now required
        if (!formData.assetIdRange || formData.assetIdRange.trim() === '') {
          toast.error('Asset ID Range is mandatory. Please assign Asset IDs to this division.');
          return;
        }

        // Get the total workstations from lab allocation (if exists)
        const labAllocation = labAllocations.find(
          lab => lab.floorId === formData.floorId && lab.labName === formData.labName
        );
        
        if (!labAllocation) {
          toast.error('Please create a lab allocation first in the Floor & Lab Allocation section');
          return;
        }
        
        const totalWorkstations = labAllocation.totalWorkstations;

        // Calculate available workstations in this lab
        const availableWorkstations = getAvailableWorkstationsForLab(formData.floorId, formData.labName);
        
        // When editing, add back the current division's inUse to available
        const adjustedAvailable = availableWorkstations + editingLab.inUse;

        // Validation: In Use cannot exceed available workstations
        if (formData.inUse > adjustedAvailable) {
          toast.error(
            `Cannot allocate ${formData.inUse} workstations. Only ${adjustedAvailable} workstation(s) available in ${formData.labName}.`
          );
          return;
        }

        // Validation: In Use must be at least 0
        if (formData.inUse < 0) {
          toast.error('Workstations to be allocated cannot be negative');
          return;
        }

        // CRITICAL FIX: Auto-calculate inUseCount from Asset ID count
        // This ensures inUse always matches the number of Asset IDs assigned
        let inUseCount = formData.inUse;
        if (formData.assetIdRange && formData.assetIdRange.trim() !== '') {
          const assetIdCount = parseAssetIdRange(formData.assetIdRange);
          inUseCount = assetIdCount; // Auto-set based on Asset ID count
          console.log(`📊 Auto-calculated inUse for "${formData.division}": ${assetIdCount} (from Asset IDs: ${formData.assetIdRange})`);
        }

        // Validation: Asset ID count must match workstations allocated
        if (formData.assetIdRange && formData.assetIdRange.trim() !== '') {
          const assetIdCount = parseAssetIdRange(formData.assetIdRange);
          if (assetIdCount !== inUseCount) {
            toast.error(
              `Asset ID count mismatch! You have ${assetIdCount} asset IDs but ${inUseCount} workstations allocated. The counts must match exactly.`
            );
            return;
          }

          // CRITICAL VALIDATION: Check for Asset ID conflicts in the same lab
          const newAssetIds = extractAssetIds(formData.assetIdRange);
          
          // VALIDATION 1: Check if Asset IDs are within the lab's assigned range
          const rangeValidation = validateAssetIdsWithinLabRange(newAssetIds, formData.floorId, formData.labName);
          if (!rangeValidation.valid) {
            toast.error(
              `❌ Asset IDs Out of Range!\n\n` +
              `The following Asset IDs are outside the lab's assigned range:\n` +
              `${rangeValidation.outOfRangeIds.join(', ')}\n\n` +
              `Lab's Asset ID Range: ${rangeValidation.labRange}\n\n` +
              `Please select Asset IDs within the lab's range.`,
              { duration: 10000 }
            );
            return;
          }
          
          // VALIDATION 2: Get all other divisions in the same lab (excluding the one being edited)
          const otherDivisionsInLab = labs.filter(
            lab => 
              lab.floorId === formData.floorId &&
              lab.labName === formData.labName &&
              lab.division && 
              lab.division.trim() !== '' &&
              lab.id !== editingLab.id && // Exclude current division
              lab.assetIdRange && 
              lab.assetIdRange.trim() !== ''
          );

          // Check for overlapping Asset IDs
          const conflicts: { assetId: number; division: string }[] = [];
          for (const otherDivision of otherDivisionsInLab) {
            const otherAssetIds = extractAssetIds(otherDivision.assetIdRange!);
            
            // Find common IDs
            const overlappingIds = newAssetIds.filter(id => otherAssetIds.includes(id));
            
            if (overlappingIds.length > 0) {
              overlappingIds.forEach(id => {
                conflicts.push({ assetId: id, division: otherDivision.division! });
              });
            }
          }

          // If conflicts found, show error and prevent save
          if (conflicts.length > 0) {
            const conflictDetails = conflicts
              .slice(0, 10) // Show first 10 conflicts
              .map(c => `Asset ID ${c.assetId} (already assigned to ${c.division})`)
              .join(', ');
            
            const moreConflicts = conflicts.length > 10 ? ` and ${conflicts.length - 10} more...` : '';
            
            toast.error(
              `❌ Asset ID Conflict Detected!\n\n` +
              `The following Asset IDs are already assigned in this lab:\n` +
              `${conflictDetails}${moreConflicts}\n\n` +
              `Please remove conflicting IDs or choose different Asset IDs.`,
              { duration: 10000 }
            );
            return; // STOP - don't save
          }
          
          // VALIDATION 3: Check against pending seat bookings
          const labAlloc = labAllocations.find(
            lab => lab.floorId === formData.floorId && lab.labName === formData.labName
          );
          
          if (labAlloc) {
            const pendingBookingsInLab = seatBookings.filter(booking => {
              if (booking.status !== 'pending') return false;
              // Match by floor_id and lab_name (actual fields in seat_bookings table)
              return booking.floor_id === formData.floorId && booking.lab_name === formData.labName;
            });
            
            // Get Asset IDs from pending bookings (convert string to number for comparison)
            const reservedAssetIds = pendingBookingsInLab
              .map(booking => booking.asset_id ? parseInt(booking.asset_id) : null)
              .filter(id => id !== null && !isNaN(id)) as number[];
            
            // Check if any of the new Asset IDs are already in pending bookings
            const conflictingReservedIds = newAssetIds.filter(id => reservedAssetIds.includes(id));
            
            if (conflictingReservedIds.length > 0) {
              toast.error(
                `❌ Asset IDs Already Reserved!\\n\\n` +
                `The following Asset IDs are currently in pending allocations:\\n` +
                `${formatAssetIdsAsRange(conflictingReservedIds)}\\n\\n` +
                `These seats are temporarily reserved. Please choose different Asset IDs or wait for the pending allocations to be approved/rejected.`,
                { duration: 8000 }
              );
              return; // STOP - don't save
            }
          }
        }

        // Save the current scroll position before any operations
        const scrollPosition = window.scrollY;

        // BUSINESS RULE: Workstation Data is SINGLE SOURCE OF TRUTH for grid rendering
        // However, seat_bookings records are preserved as historical audit trails
        // Grid rendering logic ignores bookings outside Workstation Data range
        if (editingLab && formData.assetIdRange && formData.assetIdRange.trim() !== '') {
          console.log('📝 Updating Workstation Data - Historical seat_bookings preserved for audit trail');
        }
        
        // DISABLED: Cascade delete logic (preserving historical records)
        if (false && editingLab && formData.assetIdRange && formData.assetIdRange.trim() !== '') {
          console.log('🧹 CASCADE UPDATE: Checking for orphaned bookings...');
          
          // Parse the NEW Asset ID range
          const newAssetIds = parseAssetIdRangeString(formData.assetIdRange);
          console.log(`  ✅ New Asset IDs for "${formData.division}":`, newAssetIds);
          
          // Get all approved bookings for this division in this lab
          const allBookings = await db.seatBookings.getAll();
          const divisionBookings = allBookings.filter(
            b => b.division === formData.division && 
                 b.lab_name === formData.labName && 
                 b.status === 'approved'
          );
          
          console.log(`  📋 Found ${divisionBookings.length} approved bookings for "${formData.division}"`);
          
          // Find bookings with Asset IDs that fall OUTSIDE the new range
          const orphanedBookings = divisionBookings.filter(booking => {
            const assetId = booking.asset_id ? parseInt(booking.asset_id.toString()) : null;
            if (!assetId) return false;
            
            const isOutsideRange = !newAssetIds.includes(assetId);
            if (isOutsideRange) {
              console.log(`  🚫 Orphaned: Asset ID ${assetId} at position ${booking.seat_number}`);
            }
            return isOutsideRange;
          });
          
          // Delete orphaned bookings
          if (orphanedBookings.length > 0) {
            console.log(`  🗑️ DELETING ${orphanedBookings.length} orphaned booking(s)...`);
            
            for (const booking of orphanedBookings) {
              await db.seatBookings.delete(booking.id);
              console.log(`    ✅ Deleted booking at Asset ID ${booking.asset_id}`);
            }
            
            toast.success(
              `Division updated successfully!\n${orphanedBookings.length} approved booking(s) removed (fell outside new Asset ID range)`,
              { duration: 5000 }
            );
          } else {
            console.log(`  ✅ No orphaned bookings found`);
          }
        }

        await dataService.updateLab(editingLab.id, {
          labName: formData.labName,
          division: formData.division,
          totalWorkstations: totalWorkstations,
          inUse: inUseCount, // CRITICAL: Use auto-calculated value from Asset ID count
          assetIdRange: formData.assetIdRange
        });
        
        if (!formData.assetIdRange || formData.assetIdRange.trim() === '') {
          toast.success('Division updated successfully');
        }

        handleCloseDialog();
        await loadData();
        
        // Force a complete data refresh to ensure grid updates
        if (onDataChange) {
          console.log('📡 Triggering onDataChange to refresh Dashboard...');
          await onDataChange();
          console.log('✅ onDataChange complete - Dashboard should reload');
        }
        
        // Restore scroll position after data loads
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'instant' });
        });
      } else {
        // Multi-division creation flow
        
        // Check if we have pending divisions OR current form data
        const hasCurrentFormData = formData.division && formData.inUse > 0;
        const hasPendingDivisions = pendingDivisions.length > 0;

        if (!hasCurrentFormData && !hasPendingDivisions) {
          toast.error('Please add at least one division');
          return;
        }

        if (!formData.office || !formData.floorId || !formData.labName) {
          toast.error('Please select office, floor, and lab');
          return;
        }

        // Get the total workstations from lab allocation
        const labAllocation = labAllocations.find(
          lab => lab.floorId === formData.floorId && lab.labName === formData.labName
        );
        
        if (!labAllocation) {
          toast.error('Please create a lab allocation first in the Floor & Lab Allocation section');
          return;
        }
        
        const totalWorkstations = labAllocation.totalWorkstations;

        // Create an array of all divisions to create (pending + current if filled)
        const divisionsToCreate = [...pendingDivisions];
        if (hasCurrentFormData) {
          // Check if current division is already in pending list
          if (pendingDivisions.find(d => d.division === formData.division)) {
            toast.error('Current division is already in the pending list');
            return;
          }
          
          // Validation: Asset ID count must match workstations allocated (if asset IDs provided)
          let calculatedInUse = formData.inUse;
          if (formData.assetIdRange && formData.assetIdRange.trim() !== '') {
            const assetIdCount = parseAssetIdRange(formData.assetIdRange);
            calculatedInUse = assetIdCount; // Auto-calculate from Asset ID count
            if (assetIdCount !== formData.inUse) {
              console.log(`📊 Auto-adjusting inUse from ${formData.inUse} to ${assetIdCount} to match Asset ID count`);
            }
          }
          
          divisionsToCreate.push({ 
            division: formData.division, 
            inUse: calculatedInUse, // Use auto-calculated value
            assetIdRange: formData.assetIdRange 
          });
        }

        // CRITICAL VALIDATION: Check for Asset ID conflicts across all divisions being created
        // Get all existing divisions in the same lab with asset IDs
        const existingDivisionsInLab = labs.filter(
          lab => 
            lab.floorId === formData.floorId &&
            lab.labName === formData.labName &&
            lab.division && 
            lab.division.trim() !== '' &&
            lab.assetIdRange && 
            lab.assetIdRange.trim() !== ''
        );

        // MANDATORY: All divisions must have Asset ID Range assigned
        for (const newDivision of divisionsToCreate) {
          if (!newDivision.assetIdRange || newDivision.assetIdRange.trim() === '') {
            toast.error(
              `❌ Asset ID Range is mandatory!\n\nDivision "${newDivision.division}" does not have Asset IDs assigned.\n\nPlease assign Asset IDs to all divisions before saving.`,
              { duration: 8000 }
            );
            return; // STOP - don't save any divisions
          }
        }
        
        // Check each division being created for conflicts
        for (const newDivision of divisionsToCreate) {

          const newAssetIds = extractAssetIds(newDivision.assetIdRange);
          
          // VALIDATION 1: Check if Asset IDs are within the lab's assigned range
          const rangeValidation = validateAssetIdsWithinLabRange(newAssetIds, formData.floorId, formData.labName);
          if (!rangeValidation.valid) {
            toast.error(
              `❌ Asset IDs Out of Range for ${newDivision.division}!\n\n` +
              `The following Asset IDs are outside the lab's assigned range:\n` +
              `${rangeValidation.outOfRangeIds.join(', ')}\n\n` +
              `Lab's Asset ID Range: ${rangeValidation.labRange}\n\n` +
              `Please select Asset IDs within the lab's range.`,
              { duration: 10000 }
            );
            return;
          }

          // VALIDATION 2: Check against existing divisions
          const conflicts: { assetId: number; division: string }[] = [];
          for (const existingDivision of existingDivisionsInLab) {
            const existingAssetIds = extractAssetIds(existingDivision.assetIdRange!);
            
            // Find common IDs
            const overlappingIds = newAssetIds.filter(id => existingAssetIds.includes(id));
            
            if (overlappingIds.length > 0) {
              overlappingIds.forEach(id => {
                conflicts.push({ assetId: id, division: existingDivision.division! });
              });
            }
          }

          // Also check against other divisions being created in the same batch
          for (const otherNewDivision of divisionsToCreate) {
            if (otherNewDivision.division === newDivision.division) continue; // Skip self
            if (!otherNewDivision.assetIdRange || otherNewDivision.assetIdRange.trim() === '') continue;

            const otherAssetIds = extractAssetIds(otherNewDivision.assetIdRange);
            const overlappingIds = newAssetIds.filter(id => otherAssetIds.includes(id));

            if (overlappingIds.length > 0) {
              overlappingIds.forEach(id => {
                conflicts.push({ assetId: id, division: otherNewDivision.division });
              });
            }
          }

          // If conflicts found, show error and prevent save
          if (conflicts.length > 0) {
            const conflictDetails = conflicts
              .slice(0, 10)
              .map(c => `Asset ID ${c.assetId} (already assigned to ${c.division})`)
              .join(', ');
            
            const moreConflicts = conflicts.length > 10 ? ` and ${conflicts.length - 10} more...` : '';
            
            toast.error(
              `❌ Asset ID Conflict Detected in ${newDivision.division}!\n\n` +
              `The following Asset IDs are already assigned in this lab:\n` +
              `${conflictDetails}${moreConflicts}\n\n` +
              `Please remove conflicting IDs or choose different Asset IDs.`,
              { duration: 10000 }
            );
            return; // STOP - don't save any divisions
          }
          
          // VALIDATION 3: Check against pending seat bookings
          const labAlloc = labAllocations.find(
            lab => lab.floorId === formData.floorId && lab.labName === formData.labName
          );
          
          if (labAlloc) {
            const pendingBookingsInLab = seatBookings.filter(booking => {
              if (booking.status !== 'pending') return false;
              // Match by floor_id and lab_name (actual fields in seat_bookings table)
              return booking.floor_id === formData.floorId && booking.lab_name === formData.labName;
            });
            
            // Get Asset IDs from pending bookings (convert string to number for comparison)
            const reservedAssetIds = pendingBookingsInLab
              .map(booking => booking.asset_id ? parseInt(booking.asset_id) : null)
              .filter(id => id !== null && !isNaN(id)) as number[];
            
            // Check if any of the new Asset IDs are already in pending bookings
            const conflictingReservedIds = newAssetIds.filter(id => reservedAssetIds.includes(id));
            
            if (conflictingReservedIds.length > 0) {
              toast.error(
                `❌ Asset IDs Already Reserved in ${newDivision.division}!\\n\\n` +
                `The following Asset IDs are currently in pending allocations:\\n` +
                `${formatAssetIdsAsRange(conflictingReservedIds)}\\n\\n` +
                `These seats are temporarily reserved. Please choose different Asset IDs or wait for the pending allocations to be approved/rejected.`,
                { duration: 10000 }
              );
              return; // STOP - don't save any divisions
            }
          }
        }

        // Validate total doesn't exceed available
        const totalToAllocate = divisionsToCreate.reduce((sum, d) => sum + d.inUse, 0);
        const availableWorkstations = getAvailableWorkstationsForLab(formData.floorId, formData.labName);

        if (totalToAllocate > availableWorkstations) {
          toast.error(
            `Cannot allocate ${totalToAllocate} workstations. Only ${availableWorkstations} available in ${formData.labName}.`
          );
          return;
        }

        // Save the current scroll position before any operations
        const scrollPosition = window.scrollY;

        // Create all divisions
        for (const divisionEntry of divisionsToCreate) {
          await dataService.createLab({
            floorId: formData.floorId,
            labName: formData.labName,
            division: divisionEntry.division,
            totalWorkstations: totalWorkstations,
            inUse: divisionEntry.inUse,
            assetIdRange: divisionEntry.assetIdRange || ''
          });
        }

        toast.success(
          divisionsToCreate.length === 1 
            ? 'Division created successfully'
            : `${divisionsToCreate.length} divisions created successfully`
        );

        handleCloseDialog();
        await loadData();
        
        // Restore scroll position after data loads
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'instant' });
        });
        
        if (onDataChange) {
          onDataChange();
        }
      }
    } catch (error) {
      console.error('Error saving lab:', error);
      toast.error('Failed to save division(s)');
    }
  };

  const handleDelete = async (labId: string) => {
    if (!confirm('Are you sure you want to delete this division? All associated workstations and seat bookings will be removed.')) {
      return;
    }

    try {
      // CRITICAL FIX: Cascade delete seat bookings before deleting division
      // Find the division record to get lab/floor info
      const divisionToDelete = labs.find(lab => lab.id === labId);
      
      // Start cascade delete operation
      
      if (divisionToDelete) {
        // Step 1: Delete all seat bookings for this division
        const allSeatBookings = await db.seatBookings.getAll();
        console.log(`📊 Total seat bookings in database: ${allSeatBookings.length}`);
        console.log('All seat bookings:', allSeatBookings);
        console.log('Division to delete details:', {
          labName: divisionToDelete.labName,
          floorId: divisionToDelete.floorId,
          division: divisionToDelete.division
        });
        
        // COMPREHENSIVE FILTER: Try multiple strategies to catch all related bookings
        // Strategy 1: Exact match on all three fields
        // Strategy 2: Match by lab_id if available (since divisions in same lab should be related)
        // Strategy 3: Looser match for debugging - just lab_name and floor_id
        const seatBookingsToDelete = allSeatBookings.filter(
          booking => {
            // Try exact match first
            const labNameMatch = booking.lab_name === divisionToDelete.labName;
            const floorIdMatch = booking.floor_id === divisionToDelete.floorId;
            const divisionMatch = booking.division === divisionToDelete.division;
            
            // Also try lab_id match if both have it
            const labIdMatch = booking.lab_id && divisionToDelete.id ? 
              booking.lab_id === divisionToDelete.id : false;
            
            console.log(`Checking booking ${booking.id}:`, {
              booking_status: booking.status,
              labNameMatch,
              floorIdMatch,
              divisionMatch,
              labIdMatch,
              booking_lab_name: booking.lab_name,
              division_lab_name: divisionToDelete.labName,
              booking_floor_id: booking.floor_id,
              division_floor_id: divisionToDelete.floorId,
              booking_division: booking.division,
              division_division: divisionToDelete.division,
              booking_lab_id: booking.lab_id,
              division_id: divisionToDelete.id
            });
            
            // Match if ALL three fields match
            return labNameMatch && floorIdMatch && divisionMatch;
          }
        );
        
        console.log(`🎯 Found ${seatBookingsToDelete.length} seat bookings to delete for division "${divisionToDelete.division}"`);
        console.log('Seat bookings to delete:', seatBookingsToDelete);
        
        // Silently handle the case where there are no bookings to delete (this is normal)
        if (seatBookingsToDelete.length === 0) {
          console.log(`ℹ️ No seat bookings found for division "${divisionToDelete.division}" - this is normal if workstations were allocated directly via Workstation Data tab.`);
        }
        
        for (const booking of seatBookingsToDelete) {
          console.log(`Deleting booking ${booking.id} (division: ${booking.division}, lab: ${booking.lab_name}, seat: ${booking.seat_number})...`);
          await db.seatBookings.delete(booking.id); // Hard delete to clean up orphaned records
          console.log(`✅ Deleted booking ${booking.id}`);
        }
        
        console.log(`✨ Deleted ${seatBookingsToDelete.length} seat bookings successfully`);
      }
      
      // Step 2: Delete the division record from labs table
      console.log('Deleting division from labs table...');
      await dataService.deleteLab(labId);
      console.log('✅ Division deleted from labs table');
      
      toast.success('Division deleted successfully');
      loadData();
      
      if (onDataChange) {
        console.log('Calling onDataChange to refresh parent components...');
        onDataChange();
      }
      
      console.log('🎉 DELETE OPERATION COMPLETED');
    } catch (error) {
      console.error('❌ Error deleting division:', error);
      toast.error('Failed to delete division');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Floor Allocation Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-purple-500" />
              <CardTitle>Floor & Lab Allocation Management</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 transition-colors">
                    <Info className="w-4 h-4 text-slate-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-900">How to Use:</h4>
                    <ol className="text-sm text-purple-800 space-y-1 list-decimal list-inside">
                      <li>Click "Add Lab Allocation" to create a lab and assign its total workstation capacity</li>
                      <li>Enter office name (e.g., Gurukul, Commerce House, Cochin, Chennai)</li>
                      <li>Enter floor name (e.g., 9th Floor, 5th Floor, 4th Floor)</li>
                      <li>Enter lab name (e.g., Aero 1, Aero 2, Support, CEO Office)</li>
                      <li>Set total workstations for the lab (this is the total capacity assigned to this specific lab)</li>
                      <li>Click Edit to modify allocations or Delete to remove a lab</li>
                      <li>Use the Workstation Data Management section below to assign divisions within labs</li>
                    </ol>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button 
              onClick={() => handleOpenLabAllocationDialog()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Lab Allocation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Floor Summary - Moved to top */}
          {labAllocations.length > 0 && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3">Floor Summary</h4>
              <div className="space-y-2">
                {getFloorSummaries().map(summary => (
                  <div key={summary.floorId} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">
                      {summary.officeName} - {summary.floorName}
                    </span>
                    <span className="text-blue-600">
                      {summary.allocatedToLabs} workstations allocated across {labAllocations.filter(l => l.floorId === summary.floorId).length} labs
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          {labAllocations.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-office" className="text-sm mb-1.5 block">Filter by Office</Label>
                <Select value={filterOffice} onValueChange={setFilterOffice}>
                  <SelectTrigger id="filter-office">
                    <SelectValue placeholder="All Offices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {getUniqueOffices().map(office => (
                      <SelectItem key={office} value={office}>
                        {office}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-floor" className="text-sm mb-1.5 block">Filter by Floor</Label>
                <Select 
                  value={filterFloor} 
                  onValueChange={setFilterFloor}
                  disabled={!filterOffice || filterOffice === 'all'}
                >
                  <SelectTrigger id="filter-floor">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {getUniqueFloorsForOffice(filterOffice).map(floor => (
                      <SelectItem key={floor} value={floor}>
                        {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterOffice || filterFloor) && (
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterOffice('');
                      setFilterFloor('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Lab Name</TableHead>
                  <TableHead className="text-right">Total Workstations</TableHead>
                  <TableHead className="text-right">Asset ID Range</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labAllocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500">
                      No lab allocations set. Click "Add Lab Allocation" to get started.
                    </TableCell>
                  </TableRow>
                ) : getFilteredLabAllocations().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500">
                      No lab allocations match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...getFilteredLabAllocations()].reverse().map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell>{lab.officeName}</TableCell>
                      <TableCell>{lab.floorName}</TableCell>
                      <TableCell className="font-medium">{lab.labName}</TableCell>
                      <TableCell className="text-right">
                        <span className="text-purple-600">{lab.totalWorkstations}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {lab.assetIdRange ? (
                          <span className="text-blue-600 font-mono text-sm">{lab.assetIdRange}</span>
                        ) : (
                          <span className="text-slate-400 text-sm italic">Not set</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenLabAllocationDialog(lab)}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteLabAllocation(lab.id)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Workstation Data Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-500" />
              <CardTitle>Workstation Data Management</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 transition-colors">
                    <Info className="w-4 h-4 text-slate-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">Important Notes:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Total Workstations is locked and comes from the Floor & Lab Allocation section above</li>
                      <li>Use this section to define divisions within labs and track workstation usage</li>
                      <li>Select the Division from the predefined list and specify how many workstations are allocated</li>
                      <li>Currently Available is automatically calculated as: Total Workstations - Sum(In Use for all divisions in lab)</li>
                      <li>When adding a new division to a lab, you can only use the remaining available workstations</li>
                      <li>Changes are reflected immediately in the dashboard and reports</li>
                    </ul>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Division to Lab
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showMigrationWarning && (
            <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-300">
              <h4 className="font-medium text-amber-900 mb-2">⚠️ Database Migration Required</h4>
              <p className="text-sm text-amber-800 mb-3">
                The "In Use" field requires a database column. Please run the migration SQL.
              </p>
              <div className="bg-white p-3 rounded border border-amber-200 mb-3">
                <code className="text-xs text-slate-700">
                  ALTER TABLE labs ADD COLUMN IF NOT EXISTS in_use INTEGER NOT NULL DEFAULT 0;
                </code>
              </div>
              <p className="text-xs text-amber-700">
                Copy this SQL and run it in Supabase SQL Editor.
              </p>
            </div>
          )}

          {/* Filters for Workstation Data Management */}
          {labs.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-data-office" className="text-sm mb-1.5 block">Filter by Office</Label>
                <Select value={filterDataOffice} onValueChange={(value) => {
                  setFilterDataOffice(value);
                  setFilterDataFloor('');
                  setFilterDataLab('');
                }}>
                  <SelectTrigger id="filter-data-office">
                    <SelectValue placeholder="All Offices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Offices</SelectItem>
                    {getUniqueOfficesFromLabs().map(office => (
                      <SelectItem key={office} value={office}>
                        {office}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-data-floor" className="text-sm mb-1.5 block">Filter by Floor</Label>
                <Select 
                  value={filterDataFloor} 
                  onValueChange={(value) => {
                    setFilterDataFloor(value);
                    setFilterDataLab('');
                  }}
                  disabled={!filterDataOffice || filterDataOffice === 'all'}
                >
                  <SelectTrigger id="filter-data-floor">
                    <SelectValue placeholder="All Floors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {getUniqueFloorsFromDivisions().map(floor => (
                      <SelectItem key={floor} value={floor}>
                        {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="filter-data-lab" className="text-sm mb-1.5 block">Filter by Lab</Label>
                <Select 
                  value={filterDataLab} 
                  onValueChange={setFilterDataLab}
                  disabled={!filterDataFloor || filterDataFloor === 'all'}
                >
                  <SelectTrigger id="filter-data-lab">
                    <SelectValue placeholder="All Labs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labs</SelectItem>
                    {getUniqueLabsFromDivisions().map(lab => (
                      <SelectItem key={lab} value={lab}>
                        {lab}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterDataOffice || filterDataFloor || filterDataLab) && (
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilterDataOffice('');
                      setFilterDataFloor('');
                      setFilterDataLab('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Lab Name</TableHead>
                  <TableHead className="text-right">Total Workstations</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Asset ID Range</TableHead>
                  <TableHead className="text-right">In Use</TableHead>
                  <TableHead className="text-right">Currently Available</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500">
                      No divisions found. Allocate workstations to labs above, then click "Add Division to Lab" to get started.
                    </TableCell>
                  </TableRow>
                ) : getFilteredLabs().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500">
                      No divisions match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...getFilteredLabs()].reverse().map((lab) => (
                    <TableRow key={lab.id}>
                      <TableCell>{lab.office}</TableCell>
                      <TableCell>{lab.floor}</TableCell>
                      <TableCell>{lab.labName}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-700">{lab.totalWorkstations}</span>
                          <Lock className="w-3 h-3 text-slate-400" />
                        </div>
                      </TableCell>
                      <TableCell>{lab.division}</TableCell>
                      <TableCell>
                        {lab.assetIdRange ? (
                          <div className="max-w-xs space-y-1">
                            <span className="text-slate-700 font-mono text-sm break-words block">{lab.assetIdRange}</span>
                            {(() => {
                              const parsedCount = parseAssetIdRange(lab.assetIdRange);
                              const matches = parsedCount === lab.inUse;
                              if (parsedCount > 0) {
                                return (
                                  <span className={`text-xs ${matches ? 'text-green-600' : 'text-amber-600'}`}>
                                    {matches ? '✓' : '⚠'} {parsedCount} ID{parsedCount !== 1 ? 's' : ''}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-green-600">{lab.inUse}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={lab.available < 0 ? "text-red-600" : "text-blue-600"}>{lab.available}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDialog(lab)}
                            className="flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(lab.id)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Lab Allocation Dialog */}
      <Dialog open={showAllocationDialog} onOpenChange={setShowAllocationDialog}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingLabAllocation ? 'Edit Lab Allocation' : 'Add Lab Allocation'}</DialogTitle>
            <DialogDescription>
              {editingLabAllocation ? 'Update the lab allocation details.' : 'Allocate workstations to a lab within a floor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <Label htmlFor="alloc-office">Office Name *</Label>
              <Input
                id="alloc-office"
                value={selectedOffice}
                onChange={(e) => {
                  setSelectedOffice(e.target.value);
                  setSelectedFloor(''); // Reset floor when office changes
                }}
                disabled={!!editingLabAllocation}
                placeholder="e.g., Gurukul, Commerce House, Cochin, Chennai"
              />
              {editingLabAllocation && (
                <p className="text-xs text-slate-500 mt-1">Office cannot be changed for existing allocations</p>
              )}
            </div>

            <div>
              <Label htmlFor="alloc-floor">Floor Name *</Label>
              <Input
                id="alloc-floor"
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                disabled={!!editingLabAllocation}
                placeholder="e.g., 9th Floor, 5th Floor, 4th Floor"
              />
              {editingLabAllocation && (
                <p className="text-xs text-slate-500 mt-1">Floor cannot be changed for existing allocations</p>
              )}
            </div>

            <div>
              <Label htmlFor="lab-name">Lab Name *</Label>
              <Input
                id="lab-name"
                value={labAllocationName}
                onChange={(e) => setLabAllocationName(e.target.value)}
                placeholder="e.g., Aero 1, Aero 2, Support, CEO Office"
              />
            </div>

            <div>
              <Label htmlFor="lab-allocation">Total Workstations *</Label>
              <Input
                id="lab-allocation"
                type="number"
                min="1"
                value={labAllocationAmount || ''}
                onChange={(e) => setLabAllocationAmount(parseInt(e.target.value) || 0)}
                placeholder="e.g., 88"
              />
              <p className="text-xs text-slate-500 mt-1">
                Total workstation capacity for this lab
              </p>
            </div>

            <div>
              <Label htmlFor="asset-id-range">Asset ID Range *</Label>
              <Input
                id="asset-id-range"
                value={labAssetIdRange}
                onChange={(e) => setLabAssetIdRange(e.target.value)}
                placeholder="e.g., 100-130"
              />
              <p className="text-xs text-slate-500 mt-1">
                {(() => {
                  const validation = parseSimpleAssetIdRange(labAssetIdRange);
                  if (!labAssetIdRange) {
                    return 'Enter Asset ID range in format: Start-End (e.g., 100-130)';
                  } else if (!validation.isValid) {
                    return <span className="text-red-600">{validation.error}</span>;
                  } else if (labAllocationAmount && validation.count !== labAllocationAmount) {
                    return (
                      <span className="text-amber-600">
                        ⚠️ Range contains {validation.count} IDs but Total Workstations is {labAllocationAmount}
                      </span>
                    );
                  } else {
                    return (
                      <span className="text-green-600">
                        ✓ Valid range: {validation.count} Asset IDs ({validation.start} to {validation.end})
                      </span>
                    );
                  }
                })()}
              </p>
            </div>

            {/* Staged Labs List - Only show in create mode */}
            {!editingLabAllocation && stagedLabAllocations.length > 0 && (
              <div className="mt-6 pt-4 border-t">
                <Label className="text-sm font-semibold text-slate-700">
                  Labs to Create ({stagedLabAllocations.length})
                </Label>
                <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                  {stagedLabAllocations.map((lab, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{lab.labName}</div>
                        <div className="text-xs text-slate-500">
                          {lab.officeName} → {lab.floorName} • {lab.totalWorkstations} workstations • Asset IDs: {lab.assetIdRange}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromList(index)}
                        className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setShowAllocationDialog(false);
              setEditingLabAllocation(null);
              setSelectedOffice('');
              setSelectedFloor('');
              setLabAllocationName('');
              setLabAllocationAmount(0);
              setLabAssetIdRange('');
              setStagedLabAllocations([]);
            }}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            
            <div className="flex gap-2">
              {/* Add to List button - Only show in create mode */}
              {!editingLabAllocation && (
                <Button variant="outline" onClick={handleAddToList}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add to List
                </Button>
              )}
              
              <Button onClick={handleAllocationSubmit}>
                <Save className="w-4 h-4 mr-2" />
                {editingLabAllocation 
                  ? 'Update' 
                  : stagedLabAllocations.length > 0 
                    ? `Create ${stagedLabAllocations.length + (selectedOffice && selectedFloor && labAllocationName ? 1 : 0)} Lab${stagedLabAllocations.length + (selectedOffice && selectedFloor && labAllocationName ? 1 : 0) > 1 ? 's' : ''}`
                    : 'Create'
                }
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Division Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingLab ? 'Edit Division' : 'Add Division to Lab'}
            </DialogTitle>
            <DialogDescription>
              {editingLab 
                ? 'Update the division details and usage information.'
                : 'Assign a division within a lab and track workstation assignment & usage.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <Label htmlFor="division-office">Office *</Label>
              <Select
                value={formData.office}
                onValueChange={(value) => {
                  setFormData({ ...formData, office: value, floorId: '', labName: '' });
                }}
                disabled={!!editingLab}
              >
                <SelectTrigger id="division-office">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {getUniqueOffices().map((office) => (
                    <SelectItem key={office} value={office}>
                      {office}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingLab ? (
                <p className="text-xs text-slate-500 mt-1">Office cannot be changed for existing divisions</p>
              ) : getUniqueOffices().length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">No offices available. Please create a lab allocation first.</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="division-floor">Floor Location *</Label>
              <Select
                value={formData.floorId}
                onValueChange={(value) => {
                  setFormData({ ...formData, floorId: value, labName: '' });
                }}
                disabled={!!editingLab || !formData.office}
              >
                <SelectTrigger id="division-floor">
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {formData.office && labAllocations
                    .filter(lab => lab.officeName === formData.office)
                    .reduce((uniqueFloors: any[], lab) => {
                      // Only add if not already in the array
                      if (!uniqueFloors.find(f => f.floorId === lab.floorId)) {
                        uniqueFloors.push({
                          floorId: lab.floorId,
                          floorName: lab.floorName
                        });
                      }
                      return uniqueFloors;
                    }, [])
                    .map((floor) => {
                      const floorLabCount = labAllocations.filter(l => l.floorId === floor.floorId).length;
                      return (
                        <SelectItem key={floor.floorId} value={floor.floorId}>
                          {floor.floorName}
                          {floorLabCount > 0 && ` (${floorLabCount} lab${floorLabCount > 1 ? 's' : ''})`}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {editingLab ? (
                <p className="text-xs text-slate-500 mt-1">Floor cannot be changed for existing divisions</p>
              ) : !formData.office ? (
                <p className="text-xs text-slate-500 mt-1">Please select an office first</p>
              ) : labAllocations.filter(lab => lab.officeName === formData.office).length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">No floors available for this office. Please create a lab allocation first.</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="division-lab">Lab Name *</Label>
              <Select
                value={formData.labName}
                onValueChange={(value) => {
                  const labAllocation = labAllocations.find(
                    l => l.floorId === formData.floorId && l.labName === value
                  );
                  setFormData({ 
                    ...formData, 
                    labName: value,
                    totalWorkstations: labAllocation?.totalWorkstations || 0
                  });
                }}
                disabled={!!editingLab || !formData.floorId}
              >
                <SelectTrigger id="division-lab">
                  <SelectValue placeholder="Select lab" />
                </SelectTrigger>
                <SelectContent>
                  {formData.floorId && labAllocations
                    .filter(lab => lab.floorId === formData.floorId && lab.labName && lab.labName.trim() !== '')
                    .map((lab) => {
                      const available = getAvailableWorkstationsForLab(lab.floorId, lab.labName);
                      return (
                        <SelectItem key={lab.id} value={lab.labName}>
                          {lab.labName} (Available: {available})
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
              {editingLab ? (
                <p className="text-xs text-slate-500 mt-1">Lab cannot be changed for existing divisions</p>
              ) : !formData.floorId ? (
                <p className="text-xs text-slate-500 mt-1">Please select a floor first</p>
              ) : labAllocations.filter(l => l.floorId === formData.floorId).length === 0 ? (
                <p className="text-xs text-amber-600 mt-1">No labs on this floor. Create a lab allocation first.</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="division-name">Division *</Label>
              <Select
                value={formData.division}
                onValueChange={(value) => setFormData({ ...formData, division: value })}
                disabled={!!editingLab}
              >
                <SelectTrigger id="division-name">
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingLab ? (
                <p className="text-xs text-slate-500 mt-1">Division cannot be changed for existing entries</p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Select the department or division within the lab
                </p>
              )}
            </div>

            {formData.floorId && formData.labName && !editingLab && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-900 mb-1">
                  <strong>Available in {formData.labName}:</strong>
                </p>
                <div className="text-xl text-purple-700">
                  {getRemainingWorkstations()} workstation(s)
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  {pendingDivisions.length > 0 
                    ? `Remaining after ${pendingDivisions.length} pending division(s)`
                    : 'This is the remaining capacity after other divisions in this lab'
                  }
                </p>
                {pendingDivisions.length > 0 && (
                  <p className="text-xs text-purple-700 mt-1">
                    Pending allocation: {pendingDivisions.reduce((sum, d) => sum + d.inUse, 0)} workstations
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="division-inUse">Workstations to be Allocated *</Label>
              <Input
                id="division-inUse"
                type="number"
                min="0"
                value={formData.inUse}
                onChange={(e) => setFormData({ ...formData, inUse: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 19"
              />
              <p className="text-xs text-slate-500 mt-1">
                Number of workstations to allocate to this division
              </p>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Label htmlFor="division-assetIdRange">Asset ID Range *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button 
                      type="button"
                      className="inline-flex items-center justify-center h-4 w-4 rounded-md hover:bg-slate-100 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      <h4 className="font-medium text-slate-900">Supported Formats</h4>
                      <div className="text-sm text-slate-700 space-y-2">
                        <div>
                          <p className="font-medium text-slate-800 mb-1">1. Ranges with dash (-)</p>
                          <p className="font-mono text-xs bg-slate-50 p-2 rounded border">Admin/WS/F-5/112-123</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 mb-1">2. Individual IDs</p>
                          <p className="font-mono text-xs bg-slate-50 p-2 rounded border">Admin/WS/F-5/125, Admin/WS/F-5/126</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 mb-1">3. Combined (ranges + individual)</p>
                          <p className="font-mono text-xs bg-slate-50 p-2 rounded border">Admin/WS/F-5/112-123, 125, 126, 127</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 mb-1">4. Legacy format (to)</p>
                          <p className="font-mono text-xs bg-slate-50 p-2 rounded border">Admin/WS/F-5/001 to Admin/WS/F-5/098</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 mb-1">5. Short format (numbers only)</p>
                          <p className="font-mono text-xs bg-slate-50 p-2 rounded border">112-123, 125-127</p>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Display Lab's Predefined Asset ID Range */}
              {formData.labName && formData.floorId && (() => {
                const labAllocation = labAllocations.find(
                  lab => lab.floorId === formData.floorId && lab.labName === formData.labName
                );
                return labAllocation?.assetIdRange ? (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <div>
                        <span className="font-medium text-blue-900">
                          Lab's Assigned Asset ID Range:
                        </span>
                        <p className="font-mono text-xs text-blue-700 mt-0.5">
                          {labAllocation.assetIdRange}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 mt-1.5 ml-6">
                      You must assign Asset IDs from this range only
                    </p>
                  </div>
                ) : (
                  <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span className="font-medium text-amber-900">
                        No Asset ID range configured for this lab
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1 ml-6">
                      Please configure the Asset ID range in Floor & Lab Allocation Management first
                    </p>
                  </div>
                );
              })()}
              
              <Input
                id="division-assetIdRange"
                type="text"
                value={formData.assetIdRange}
                onChange={(e) => setFormData({ ...formData, assetIdRange: e.target.value })}
                placeholder="e.g., Admin/WS/F-5/112-123, 125, 126, 127"
              />
              <div className="mt-1.5 space-y-1">
                <p className="text-xs text-slate-500">
                  Enter ranges and individual IDs separated by commas. This field is mandatory.
                </p>
                
                {/* Asset ID Count Validation */}
                {formData.assetIdRange && formData.assetIdRange.trim() !== '' && (
                  <div className="mt-2">
                    {(() => {
                      const parsedCount = parseAssetIdRange(formData.assetIdRange);
                      const inUseCount = formData.inUse || 0;
                      const matches = parsedCount === inUseCount;
                      
                      return (
                        <div className={`p-2 rounded-md text-xs ${
                          matches 
                            ? 'bg-green-50 border border-green-200 text-green-700' 
                            : 'bg-amber-50 border border-amber-200 text-amber-700'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            {matches ? (
                              <>
                                <span className="font-medium">✓ Validation passed:</span>
                                <span>Asset IDs count ({parsedCount}) matches workstations allocated ({inUseCount})</span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">⚠ Count mismatch:</span>
                                <span>Asset IDs count ({parsedCount}) vs Workstations allocated ({inUseCount})</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                
                <p className="text-xs text-slate-400">
                  Common examples:
                </p>
                <ul className="text-xs text-slate-400 space-y-0.5 ml-4">
                  <li>• <span className="font-mono">Admin/WS/F-5/112-123, 125, 126, 127</span></li>
                  <li>• <span className="font-mono">112-123, 125-127</span> (short format)</li>
                </ul>
              </div>
            </div>

            {/* Add to pending list button */}
            {!editingLab && formData.floorId && formData.labName && (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddToPendingList}
                  className="flex items-center gap-1 w-full"
                  disabled={!formData.division || !formData.inUse || !formData.assetIdRange || formData.assetIdRange.trim() === ''}
                >
                  <Plus className="w-3 h-3" />
                  Add to List
                </Button>
              </div>
            )}

            {/* Pending divisions list - Compact design */}
            {pendingDivisions.length > 0 && !editingLab && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200">
                  <p className="text-sm font-medium text-slate-700">
                    Pending Divisions ({pendingDivisions.length})
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {pendingDivisions.map((division) => (
                    <div 
                      key={division.division} 
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{division.division}</p>
                        <div className="space-y-0.5">
                          <p className="text-xs text-slate-500">{division.inUse} workstations</p>
                          {division.assetIdRange && division.assetIdRange.trim() !== '' ? (
                            <p className="text-xs text-slate-600 font-mono truncate">
                              Asset IDs: {division.assetIdRange}
                            </p>
                          ) : (
                            <p className="text-xs text-amber-600 italic">
                              Asset IDs: Not assigned (can be added later)
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveFromPendingList(division.division)}
                        className="ml-2 h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingLab ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDialogTitle className="text-base">Delete Lab Allocation</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="sr-only">
              This action will permanently delete the lab allocation, all associated division allocations in Workstation Data Management, and mark related seat bookings as rejected. Division entries in Division Management will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-sm space-y-3">
            {labToDelete && (
              <div className="space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="font-semibold text-amber-900 mb-1.5 text-sm">You are about to delete:</div>
                  <div className="text-amber-800 space-y-0.5 text-sm">
                    <div><strong>Lab:</strong> {labToDelete.labName}</div>
                    <div><strong>Location:</strong> {labToDelete.officeName} - {labToDelete.floorName}</div>
                    <div><strong>Total Workstations:</strong> {labToDelete.totalWorkstations}</div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="font-semibold text-red-900 mb-2 text-sm">⚠️ This will permanently delete:</div>
                  <div className="space-y-2 text-red-800">
                    {deletionImpact.divisionsCount > 0 && (
                      <div>
                        <div className="font-medium mb-1.5 text-sm">
                          📊 {deletionImpact.divisionsCount} Division Allocation{deletionImpact.divisionsCount > 1 ? 's' : ''} in Workstation Data Management:
                        </div>
                        <div className="ml-3 space-y-1 max-h-32 overflow-y-auto">
                          {deletionImpact.divisions.map((div, index) => (
                            <div key={index} className="text-xs bg-white rounded p-1.5 border border-red-100 space-y-0.5">
                              <div><strong>Division:</strong> {div.division}</div>
                              <div><strong>Workstations Allocated:</strong> {div.inUse}</div>
                              <div><strong>Asset IDs:</strong> {div.assetIds}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {deletionImpact.seatBookingsCount > 0 && (
                      <div>
                        <div className="font-medium text-sm">
                          🪑 {deletionImpact.seatBookingsCount} Seat Booking{deletionImpact.seatBookingsCount > 1 ? 's' : ''} (will be marked as rejected)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-100 border border-slate-300 rounded-lg p-2.5">
                  <div className="font-semibold text-slate-900 text-sm">⚠️ This action cannot be undone.</div>
                </div>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setLabToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLabAllocation}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Lab Allocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}