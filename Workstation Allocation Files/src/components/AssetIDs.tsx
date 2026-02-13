import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart3, Info, Plus, Edit, Trash2, Building, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner@2.0.3';
import { db } from '../lib/supabase';
import { WorkstationGridSelector } from './WorkstationGridSelector';
import { DivisionAllocation } from './DivisionAllocation';

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
}

interface AssetIDsProps {
  data: WorkstationData;
}

interface DivisionData {
  division: string;
  seats: number;
}

interface FloorAssetRange {
  id?: string;
  officeId: string;
  officeName: string;
  floorId: string;
  floorName: string;
  floorNumber: string; // e.g., "9", "5", "4"
  formattedRange: string; // e.g., "Admin/WS/F-9/001 to Admin/WS/F-9/195"
}

interface LabAssetRange {
  id?: string;
  floorRangeId: string; // Parent floor range ID
  labId: string;
  labName: string;
  formattedRange: string; // e.g., "Admin/WS/F-9/001 to Admin/WS/F-9/050"
}

interface DivisionAssetAssignment {
  id?: string;
  labRangeId: string; // Parent lab range ID
  division: string;
  assetIds: string; // Format: "112-123, 125, 127"
  formattedRange?: string;
  seatCount: number;
}

// Parse asset range string to get individual IDs (defined outside component for hoisting)
const parseAssetIds = (rangeString: string): number[] => {
  if (!rangeString.trim()) return [];
  
  const ids: number[] = [];
  const parts = rangeString.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          ids.push(i);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        ids.push(num);
      }
    }
  }
  
  return [...new Set(ids)].sort((a, b) => a - b);
};

// Format asset IDs into display format (showing ranges and singles)
const formatAssetIdsDisplay = (ids: number[], floorNumber: string): string => {
  if (!ids.length) return '';
  
  const sortedIds = [...ids].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sortedIds[0];
  let rangeEnd = sortedIds[0];
  
  for (let i = 1; i <= sortedIds.length; i++) {
    if (i < sortedIds.length && sortedIds[i] === rangeEnd + 1) {
      rangeEnd = sortedIds[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(`Admin/WS/F-${floorNumber}/${rangeStart.toString().padStart(3, '0')}`);
      } else {
        ranges.push(
          `Admin/WS/F-${floorNumber}/${rangeStart.toString().padStart(3, '0')} to Admin/WS/F-${floorNumber}/${rangeEnd.toString().padStart(3, '0')}`
        );
      }
      if (i < sortedIds.length) {
        rangeStart = sortedIds[i];
        rangeEnd = sortedIds[i];
      }
    }
  }
  
  return ranges.join(', ');
};

// Extract just the numeric range from formatted range (e.g., "Admin/WS/F-9/001 to Admin/WS/F-9/005" -> "001 to 005")
const extractNumericRange = (formattedRange: string): string => {
  if (!formattedRange) return '';
  
  // Match pattern like "Admin/WS/F-9/001 to Admin/WS/F-9/005"
  const rangeMatch = formattedRange.match(/\/(\d{3})\s+to\s+.*\/(\d{3})/);
  if (rangeMatch) {
    return `${rangeMatch[1]} to ${rangeMatch[2]}`;
  }
  
  // Match single ID pattern like "Admin/WS/F-9/001"
  const singleMatch = formattedRange.match(/\/(\d{3})(?:,|$)/);
  if (singleMatch) {
    return singleMatch[1];
  }
  
  // Match multiple ranges separated by commas
  const parts = formattedRange.split(',').map(part => {
    const match = part.match(/\/(\d{3})/g);
    if (match && match.length > 0) {
      const nums = match.map(m => m.replace('/', ''));
      if (nums.length === 2) {
        return `${nums[0]} to ${nums[1]}`;
      } else if (nums.length === 1) {
        return nums[0];
      }
    }
    return null;
  }).filter(Boolean);
  
  return parts.join(', ') || formattedRange;
};

// Convert array of IDs to compact string format (e.g., "112-123, 125, 127")
const idsToCompactString = (ids: number[]): string => {
  if (!ids.length) return '';
  
  const sortedIds = [...ids].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sortedIds[0];
  let rangeEnd = sortedIds[0];
  
  for (let i = 1; i <= sortedIds.length; i++) {
    if (i < sortedIds.length && sortedIds[i] === rangeEnd + 1) {
      rangeEnd = sortedIds[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(rangeStart.toString());
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      if (i < sortedIds.length) {
        rangeStart = sortedIds[i];
        rangeEnd = sortedIds[i];
      }
    }
  }
  
  return ranges.join(', ');
};

export function AssetIDs({ data }: AssetIDsProps) {
  // Floor Asset Range Management states
  const [floorAssetRanges, setFloorAssetRanges] = useState<FloorAssetRange[]>([]);
  const [labAssetRanges, setLabAssetRanges] = useState<LabAssetRange[]>([]);
  const [divisionAssetAssignments, setDivisionAssetAssignments] = useState<DivisionAssetAssignment[]>([]);
  const [offices, setOffices] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState<boolean>(true); // Track if required tables exist
  
  // Expanded floors state (to show/hide labs)
  const [expandedFloors, setExpandedFloors] = useState<Set<string>>(new Set());
  
  const [showRangeDialog, setShowRangeDialog] = useState(false);
  const [showLabRangeDialog, setShowLabRangeDialog] = useState(false);
  const [showDivisionEditDialog, setShowDivisionEditDialog] = useState(false);
  const [editingRange, setEditingRange] = useState<FloorAssetRange | null>(null);
  const [editingLabRange, setEditingLabRange] = useState<LabAssetRange | null>(null);
  const [editingDivisionAssignment, setEditingDivisionAssignment] = useState<DivisionAssetAssignment | null>(null);
  const [selectedFloorForLab, setSelectedFloorForLab] = useState<FloorAssetRange | null>(null);
  const [divisionEditFormData, setDivisionEditFormData] = useState({
    assetIds: '',
  });
  const [rangeFormData, setRangeFormData] = useState({
    officeId: '',
    floorId: '',
    assetRange: '',
  });

  const [labRangeFormData, setLabRangeFormData] = useState({
    labId: '',
    assetRange: '',
  });

  // Helper function to extract floor number from floor name
  const extractFloorNumber = (floorName: string): string => {
    const match = floorName.match(/(\d+)(st|nd|rd|th)?/i);
    return match ? match[1] : floorName;
  };

  // Helper function to format asset range
  const formatAssetRange = (rangeString: string, floorNumber: string): string => {
    if (!rangeString.trim() || !floorNumber) return '';
    
    const ids = parseAssetIds(rangeString);
    if (ids.length === 0) return '';
    
    const minId = Math.min(...ids);
    const maxId = Math.max(...ids);
    
    const formatId = (id: number) => id.toString().padStart(3, '0');
    
    return `Admin/WS/F-${floorNumber}/${formatId(minId)} to Admin/WS/F-${floorNumber}/${formatId(maxId)}`;
  };

  // Filter states for table
  const [filterOffice, setFilterOffice] = useState<string>('all');
  const [filterFloor, setFilterFloor] = useState<string>('all');

  // Load offices and floors
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Try to load data and detect if tables exist
      let assetRangesData: any[] = [];
      let labRangesData: any[] = [];
      let divisionAssignmentsData: any[] = [];
      let tablesMissing = false;
      
      const [officesData, floorsData, labsData] = await Promise.all([
        db.offices.getAll(),
        db.floors.getAll(),
        db.labs.getAll(),
      ]);
      
      // Check if floor_asset_ranges table exists
      try {
        assetRangesData = await db.floorAssetRanges.getAll();
      } catch (error: any) {
        if (error?.code === 'PGRST205' || error?.message?.includes('floor_asset_ranges')) {
          tablesMissing = true;
        }
      }
      
      // Check if lab_asset_ranges table exists
      try {
        labRangesData = await db.labAssetRanges.getAll();
      } catch (error: any) {
        if (error?.code === 'PGRST205' || error?.message?.includes('lab_asset_ranges')) {
          tablesMissing = true;
        }
      }
      
      // Check if division_asset_assignments table exists
      try {
        divisionAssignmentsData = await db.divisionAssetAssignments.getAll();
      } catch (error: any) {
        if (error?.code === 'PGRST205' || error?.message?.includes('division_asset_assignments')) {
          tablesMissing = true;
        }
      }
      
      setTablesExist(!tablesMissing);
      
      setOffices(officesData || []);
      setFloors(floorsData || []);
      setLabs(labsData || []);
      
      // Transform database data to component state format
      const transformedRanges: FloorAssetRange[] = (assetRangesData || []).map((dbRange: any) => {
        const office = officesData.find(o => o.id === dbRange.office_id);
        const floor = floorsData.find(f => f.id === dbRange.floor_id);
        
        return {
          id: dbRange.id,
          officeId: dbRange.office_id,
          officeName: office?.office_name || '',
          floorId: dbRange.floor_id,
          floorName: floor?.floor_name || '',
          floorNumber: dbRange.floor_number,
          formattedRange: dbRange.formatted_range,
        };
      });
      
      // Transform lab asset ranges
      const transformedLabRanges: LabAssetRange[] = (labRangesData || []).map((dbRange: any) => {
        const lab = labsData.find((l: any) => l.id === dbRange.lab_id);
        
        return {
          id: dbRange.id,
          floorRangeId: dbRange.floor_range_id,
          labId: dbRange.lab_id,
          labName: lab?.lab_name || '',
          formattedRange: dbRange.formatted_range,
        };
      });
      
      // Transform division asset assignments
      const transformedDivisionAssignments: DivisionAssetAssignment[] = (divisionAssignmentsData || []).map((dbAssignment: any) => ({
        id: dbAssignment.id,
        labRangeId: dbAssignment.lab_range_id,
        division: dbAssignment.division,
        assetIds: dbAssignment.asset_ids,
        formattedRange: dbAssignment.formatted_range,
        seatCount: dbAssignment.seat_count,
      }));
      
      setFloorAssetRanges(transformedRanges);
      setLabAssetRanges(transformedLabRanges);
      setDivisionAssetAssignments(transformedDivisionAssignments);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Get floor summary statistics
  const floorSummary = useMemo(() => {
    const summary = new Map<string, { floorName: string; officeName: string; totalRangeCount: number }>();
    
    floorAssetRanges.forEach(range => {
      const key = `${range.officeName}|${range.floorName}`;
      const count = parseAssetIds(range.assetRange).length;
      
      if (!summary.has(key)) {
        summary.set(key, {
          floorName: range.floorName,
          officeName: range.officeName,
          totalRangeCount: count
        });
      }
    });
    
    return Array.from(summary.values())
      .sort((a, b) => {
        const officeCompare = a.officeName.localeCompare(b.officeName);
        if (officeCompare !== 0) return officeCompare;
        return a.floorName.localeCompare(b.floorName);
      });
  }, [floorAssetRanges]);

  // Filter floors based on selected office for the table
  const filteredFloorsForTable = filterOffice && filterOffice !== 'all'
    ? floors.filter(f => f.office_id === filterOffice)
    : floors;

  // Filter asset ranges based on filters
  const filteredAssetRanges = floorAssetRanges.filter(range => {
    const officeMatch = filterOffice === 'all' || range.officeId === filterOffice;
    const floorMatch = filterFloor === 'all' || range.floorId === filterFloor;
    return officeMatch && floorMatch;
  });

  // Validate asset range
  const validateAssetRange = (rangeString: string): { valid: boolean; message: string; count: number } => {
    if (!rangeString.trim()) {
      return { valid: false, message: 'Please enter an asset ID range', count: 0 };
    }

    const ids = parseAssetIds(rangeString);
    
    if (ids.length === 0) {
      return { valid: false, message: 'Invalid format. Use format like: 166-179 or 188, 189, 191', count: 0 };
    }

    const uniqueIds = new Set(ids);
    if (uniqueIds.size !== ids.length) {
      return { valid: false, message: 'Duplicate IDs found in range', count: 0 };
    }

    return { valid: true, message: 'Valid range', count: ids.length };
  };

  // Open add range dialog
  const handleOpenAddRange = () => {
    setEditingRange(null);
    setRangeFormData({
      officeId: '',
      floorId: '',
      assetRange: '',
    });
    setShowRangeDialog(true);
  };

  // Open edit range dialog
  const handleOpenEditRange = (range: FloorAssetRange) => {
    setEditingRange(range);
    setRangeFormData({
      officeId: range.officeId,
      floorId: range.floorId,
      assetRange: range.assetRange,
    });
    setShowRangeDialog(true);
  };

  // Save floor asset range
  const handleSaveRange = async () => {
    if (!rangeFormData.officeId || !rangeFormData.floorId) {
      toast.error('Please select office and floor');
      return;
    }

    const validation = validateAssetRange(rangeFormData.assetRange);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    const office = offices.find(o => o.id === rangeFormData.officeId);
    const floor = floors.find(f => f.id === rangeFormData.floorId);

    if (!office || !floor) {
      toast.error('Invalid office or floor selection');
      return;
    }

    // Check for existing range on this floor
    const existingIndex = floorAssetRanges.findIndex(
      r => r.floorId === rangeFormData.floorId && r.id !== editingRange?.id
    );

    if (existingIndex !== -1) {
      toast.error('Asset range already exists for this floor');
      return;
    }

    const floorNumber = extractFloorNumber(floor.floor_name);
    const formattedRange = formatAssetRange(rangeFormData.assetRange, floorNumber);

    try {
      const dbData = {
        floor_id: rangeFormData.floorId,
        office_id: rangeFormData.officeId,
        formatted_range: formattedRange,
        floor_number: floorNumber,
        is_locked: editingRange?.isLocked || false,
      };

      if (editingRange) {
        // Update existing
        await db.floorAssetRanges.update(editingRange.id!, dbData);
        toast.success('Asset range updated successfully');
      } else {
        // Add new
        await db.floorAssetRanges.create(dbData);
        toast.success(`Asset range assigned to ${floor.floor_name} (${validation.count} IDs)`);
      }

      // Reload data
      await loadData();
      setShowRangeDialog(false);
    } catch (error: any) {
      console.error('Error saving asset range:', error);
      
      // Check if it's a missing table error
      if (error?.code === 'PGRST205' || error?.message?.includes('floor_asset_ranges')) {
        setTablesExist(false);
        toast.error('Database tables are missing!', {
          description: 'Please run the migration script shown in the banner above',
          duration: 10000,
        });
      } else {
        toast.error('Failed to save asset range');
      }
    }
  };

  // Delete floor asset range (with cascade)
  const handleDeleteRange = async (range: FloorAssetRange) => {
    // Check if floor has lab ranges assigned
    const floorLabRanges = labAssetRanges.filter(lr => lr.floorRangeId === range.id);
    const hasLabRanges = floorLabRanges.length > 0;
    
    // Count total division assignments that will be deleted
    const divisionAssignmentsToDelete = hasLabRanges 
      ? divisionAssetAssignments.filter(da => floorLabRanges.some(lr => lr.id === da.labRangeId))
      : [];
    
    // Build warning message
    let warningMessage = `Are you sure you want to delete the floor range "${range.floorName}"?\n\n`;
    
    if (hasLabRanges) {
      warningMessage += `⚠️ WARNING: This will CASCADE DELETE:\n`;
      warningMessage += `• ${floorLabRanges.length} lab range(s)\n`;
      warningMessage += `• ${divisionAssignmentsToDelete.length} division assignment(s)\n\n`;
      warningMessage += `This action CANNOT be undone!`;
    } else {
      warningMessage += `This action cannot be undone.`;
    }
    
    const confirmed = confirm(warningMessage);
    
    if (!confirmed) {
      return;
    }

    try {
      // Delete in correct order: division assignments → lab ranges → floor range
      
      // Step 1: Delete all division assignments for labs in this floor
      if (divisionAssignmentsToDelete.length > 0) {
        for (const assignment of divisionAssignmentsToDelete) {
          if (assignment.id) {
            await db.divisionAssetAssignments.delete(assignment.id);
          }
        }
      }
      
      // Step 2: Delete all lab ranges for this floor
      if (floorLabRanges.length > 0) {
        for (const labRange of floorLabRanges) {
          if (labRange.id) {
            await db.labAssetRanges.delete(labRange.id);
          }
        }
      }
      
      // Step 3: Delete the floor range itself
      if (range.id) {
        await db.floorAssetRanges.delete(range.id);
      }
      
      await loadData();
      
      if (hasLabRanges) {
        toast.success(`Floor range deleted along with ${floorLabRanges.length} lab range(s) and ${divisionAssignmentsToDelete.length} division assignment(s)`);
      } else {
        toast.success('Floor range deleted');
      }
    } catch (error) {
      console.error('Error deleting floor range:', error);
      toast.error('Failed to delete floor range');
    }
  };

  // Delete lab asset range
  const handleDeleteLabRange = async (labRange: LabAssetRange) => {
    try {
      if (labRange.id && db.labAssetRanges) {
        await db.labAssetRanges.delete(labRange.id);
      }
      await loadData();
      toast.success('Lab asset range deleted');
    } catch (error) {
      console.error('Error deleting lab asset range:', error);
      toast.error('Failed to delete lab asset range');
    }
  };

  // Open edit division assignment dialog
  const handleOpenEditDivisionAssignment = (assignment: DivisionAssetAssignment, floorNumber: string) => {
    setEditingDivisionAssignment(assignment);
    setDivisionEditFormData({
      assetIds: assignment.assetIds,
    });
    setShowDivisionEditDialog(true);
  };

  // Save division assignment edits
  const handleSaveDivisionEdit = async () => {
    if (!editingDivisionAssignment) return;

    const validation = validateAssetRange(divisionEditFormData.assetIds);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    try {
      const labRange = labAssetRanges.find(lr => lr.id === editingDivisionAssignment.labRangeId);
      const floorRange = labRange ? floorAssetRanges.find(fr => fr.id === labRange.floorRangeId) : null;
      const floorNumber = floorRange?.floorNumber || '';

      const ids = parseAssetIds(divisionEditFormData.assetIds);
      const formattedRange = formatAssetIdsDisplay(ids, floorNumber);

      await db.divisionAssetAssignments.update(editingDivisionAssignment.id!, {
        asset_ids: divisionEditFormData.assetIds,
        formatted_range: formattedRange,
        seat_count: ids.length,
      });

      toast.success('Division assignment updated');
      await loadData();
      setShowDivisionEditDialog(false);
    } catch (error) {
      console.error('Error updating division assignment:', error);
      toast.error('Failed to update assignment');
    }
  };

  // Toggle floor expansion
  const toggleFloorExpansion = (floorRangeId: string) => {
    const newExpanded = new Set(expandedFloors);
    if (newExpanded.has(floorRangeId)) {
      newExpanded.delete(floorRangeId);
    } else {
      newExpanded.add(floorRangeId);
    }
    setExpandedFloors(newExpanded);
  };

  // Open add lab range dialog
  const handleOpenAddLabRange = (floorRange: FloorAssetRange) => {
    setSelectedFloorForLab(floorRange);
    setEditingLabRange(null);
    setLabRangeFormData({
      labId: '',
      assetRange: '',
    });
    
    const labsOnFloor = labs.filter((lab: any) => lab.floor_id === floorRange.floorId);
    
    // Check labs with asset ranges already assigned
    const labsWithRanges = labAssetRanges.filter(lr => lr.floorRangeId === floorRange.id);
    
    // Get unique lab names that already have ranges
    const assignedLabNames = new Set(
      labsWithRanges.map(lr => {
        const lab = labs.find((l: any) => l.id === lr.labId);
        return lab?.lab_name;
      }).filter(Boolean)
    );
    
    // Filter to get available lab records (division records without ranges)
    const availableLabRecords = labsOnFloor.filter((lab: any) => !assignedLabNames.has(lab.lab_name));
    
    // Deduplicate by floor + lab name (not by ID, since multiple divisions = multiple records)
    const uniqueAvailableLabs = Array.from(
      new Map(availableLabRecords.map(lab => [`${lab.floor_id}_${lab.lab_name}`, lab])).values()
    );
    
    setShowLabRangeDialog(true);
  };

  // Open edit lab range dialog
  const handleOpenEditLabRange = (labRange: LabAssetRange) => {
    const floorRange = floorAssetRanges.find(fr => fr.id === labRange.floorRangeId);
    setSelectedFloorForLab(floorRange || null);
    setEditingLabRange(labRange);
    setLabRangeFormData({
      labId: labRange.labId,
      assetRange: labRange.assetRange,
    });
    setShowLabRangeDialog(true);
  };

  // Save lab asset range
  const handleSaveLabRange = async () => {
    if (!selectedFloorForLab || !labRangeFormData.labId) {
      toast.error('Please select a lab');
      return;
    }

    const validation = validateAssetRange(labRangeFormData.assetRange);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    // Validate that lab range is subset of floor range
    const floorIds = parseAssetIds(selectedFloorForLab.assetRange);
    const labIds = parseAssetIds(labRangeFormData.assetRange);
    
    const invalidIds = labIds.filter(id => !floorIds.includes(id));
    if (invalidIds.length > 0) {
      toast.error(`Lab range contains IDs not in floor range: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? '...' : ''}`);
      return;
    }

    // CRITICAL: Check if this lab already has an asset range on this floor (prevent duplicates)
    if (!editingLabRange) {
      const existingRangeForLab = labAssetRanges.find(
        lr => lr.floorRangeId === selectedFloorForLab.id && lr.labId === labRangeFormData.labId
      );
      
      if (existingRangeForLab) {
        const lab = labs.find((l: any) => l.id === labRangeFormData.labId);
        toast.error(`${lab?.lab_name || 'This lab'} already has an asset range on this floor. Please edit the existing range instead of creating a duplicate.`, {
          description: `Existing range: ${existingRangeForLab.formattedRange}`,
          duration: 7000,
        });
        return;
      }
      
      // DOUBLE CHECK: Query database directly to ensure we catch duplicates even if state is stale
      if (db.labAssetRanges) {
        try {
          const allLabRanges = await db.labAssetRanges.getAll();
          const dbExistingRange = allLabRanges.find(
            lr => lr.floor_range_id === selectedFloorForLab.id && lr.lab_id === labRangeFormData.labId
          );
          
          if (dbExistingRange) {
            const lab = labs.find((l: any) => l.id === labRangeFormData.labId);
            toast.error(`${lab?.lab_name || 'This lab'} already has an asset range on this floor (database check). Please edit the existing range instead of creating a duplicate.`, {
              description: `Existing range: ${dbExistingRange.formatted_range}`,
              duration: 7000,
            });
            return;
          }
        } catch (error) {
          console.error('Error checking for duplicates in database:', error);
        }
      }
    }
    
    // Check for overlapping ranges with other labs in the same floor
    const otherLabRanges = labAssetRanges.filter(
      lr => lr.floorRangeId === selectedFloorForLab.id && lr.id !== editingLabRange?.id
    );
    
    for (const otherRange of otherLabRanges) {
      const otherIds = parseAssetIds(otherRange.assetRange);
      const overlap = labIds.filter(id => otherIds.includes(id));
      if (overlap.length > 0) {
        const otherLab = labs.find((l: any) => l.id === otherRange.labId);
        toast.error(`Range overlaps with ${otherLab?.lab_name || 'another lab'}: ${overlap.slice(0, 5).join(', ')}`);
        return;
      }
    }

    const lab = labs.find((l: any) => l.id === labRangeFormData.labId);
    const formattedRange = formatAssetRange(labRangeFormData.assetRange, selectedFloorForLab.floorNumber);

    try {
      const dbData = {
        floor_range_id: selectedFloorForLab.id!,
        lab_id: labRangeFormData.labId,
        formatted_range: formattedRange,
      };

      if (editingLabRange && db.labAssetRanges) {
        // Update existing
        await db.labAssetRanges.update(editingLabRange.id!, dbData);
        toast.success('Lab asset range updated successfully');
      } else if (db.labAssetRanges) {
        // Add new
        await db.labAssetRanges.create(dbData);
        toast.success(`Asset range assigned to ${lab?.lab_name} (${validation.count} IDs)`);
      }

      // Reload data
      await loadData();
      setShowLabRangeDialog(false);
    } catch (error: any) {
      console.error('Error saving lab asset range:', error);
      
      // Check if it's a missing table error
      if (error?.code === 'PGRST205' || error?.message?.includes('lab_asset_ranges')) {
        toast.error('Database table missing! Please run the migration script.', {
          description: 'Check FIX_ASSET_RANGES_ERROR.md for instructions',
          duration: 10000,
        });
      } else {
        toast.error('Failed to save lab asset range');
      }
    }
  };

  // Get floors for selected office in form
  const floorsForSelectedOffice = rangeFormData.officeId
    ? floors.filter(f => f.office_id === rangeFormData.officeId)
    : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12">
            <div className="flex items-center justify-center">
              <p className="text-slate-500">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Setup Banner - Show when tables are missing */}
      {!tablesExist && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-lg p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-2">⚙️ Database Setup Required</h3>
              <p className="text-amber-800 mb-4">
                The asset ranges tables are missing from your database. Please run the migration script to enable this feature.
              </p>
              
              <div className="bg-white rounded-md border border-amber-300 p-4 mb-4">
                <h4 className="font-semibold text-amber-900 mb-2">📋 Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-amber-900">
                  <li>Open your <strong>Supabase Dashboard</strong></li>
                  <li>Go to <strong>SQL Editor</strong> (left sidebar)</li>
                  <li>Click <strong>"New query"</strong></li>
                  <li>Run these migration scripts in order:
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li><code className="bg-amber-100 px-1 py-0.5 rounded text-xs">ASSET_RANGES_TABLE_MIGRATION_FIXED.sql</code></li>
                      <li><code className="bg-amber-100 px-1 py-0.5 rounded text-xs">DIVISION_ASSET_ASSIGNMENTS_MIGRATION.sql</code></li>
                    </ul>
                  </li>
                  <li>After running both scripts, refresh the page</li>
                </ol>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-100 rounded-md p-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>The migration file is available in your project files</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Floor Asset ID Range Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-600" />
                <CardTitle>Floor Asset ID Range Management</CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1 rounded-full hover:bg-purple-100 transition-colors">
                        <Info className="w-4 h-4 text-purple-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">
                        Assign asset ID ranges to floors. Format: 001-195 or 001-050, 100-195
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={handleOpenAddRange} 
                      className="bg-black hover:bg-slate-800"
                      disabled={!tablesExist}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Floor Range
                    </Button>
                  </div>
                </TooltipTrigger>
                {!tablesExist && (
                  <TooltipContent>
                    <p className="text-xs">Run migration script first</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          {/* Floor Summary */}
          {floorSummary.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="text-sm font-medium mb-3 text-slate-700">Floor Summary</h5>
              <div className="space-y-2">
                {floorSummary.map((summary) => (
                  <div key={`${summary.officeName}|${summary.floorName}`} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">
                      {summary.officeName} - {summary.floorName}
                    </span>
                    <span className="text-blue-600 font-medium">
                      {summary.totalRangeCount} asset IDs allocated
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <Select value={filterOffice} onValueChange={setFilterOffice}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Offices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {offices.map(office => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.office_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterFloor} onValueChange={setFilterFloor}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Floors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {filteredFloorsForTable.map(floor => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.floor_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Office / Lab</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Asset ID Range</TableHead>
                  <TableHead className="text-center">Total IDs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssetRanges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No floor asset ranges assigned yet. Click "Add Floor Range" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssetRanges.map((range) => {
                    const isExpanded = expandedFloors.has(range.id!);
                    
                    // Get lab assignments for this floor and deduplicate by labId
                    const allLabAssignments = labAssetRanges.filter(lr => lr.floorRangeId === range.id);
                    const uniqueLabsMap = new Map<string, LabAssetRange>();
                    allLabAssignments.forEach(lab => {
                      // Keep only the first occurrence of each unique labId
                      if (!uniqueLabsMap.has(lab.labId)) {
                        uniqueLabsMap.set(lab.labId, lab);
                      }
                    });
                    const rangeLabAssignments = Array.from(uniqueLabsMap.values());
                    const hasLabs = rangeLabAssignments.length > 0;
                    
                    return (
                      <React.Fragment key={range.id}>
                        {/* Floor Row */}
                        <TableRow className="bg-slate-50/50 hover:bg-slate-100/50">
                          <TableCell className="py-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleFloorExpansion(range.id!)}
                              className="h-6 w-6 p-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="font-medium">{range.officeName}</span>
                          </TableCell>
                          <TableCell className="text-blue-600 py-3">{range.floorName}</TableCell>
                          <TableCell className="font-mono text-sm py-3">{range.formattedRange}</TableCell>
                          <TableCell className="text-center py-3">{parseAssetIds(range.assetRange).length}</TableCell>
                          <TableCell className="text-right py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAddLabRange(range)}
                                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Add Lab Range"
                                disabled={!tablesExist}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Lab
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditRange(range)}
                                className="h-8"
                                disabled={!tablesExist}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteRange(range)}
                                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                disabled={!tablesExist}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Lab Rows (expandable) */}
                        {isExpanded && rangeLabAssignments.map((labRange) => {
                          return (
                            <React.Fragment key={labRange.id}>
                              <TableRow className="bg-white">
                                <TableCell className="py-2"></TableCell>
                                <TableCell className="py-2 pl-12">
                                  <span className="text-sm text-slate-600">↳ {labRange.labName}</span>
                                </TableCell>
                                <TableCell className="py-2"></TableCell>
                                <TableCell className="font-mono text-xs text-slate-600 py-2">
                                  {labRange.formattedRange}
                                </TableCell>
                                <TableCell className="text-center text-sm py-2">
                                  {parseAssetIds(labRange.assetRange).length}
                                </TableCell>
                                <TableCell className="text-right py-2">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenEditLabRange(labRange)}
                                      className="h-7 px-2"
                                      disabled={!tablesExist}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteLabRange(labRange)}
                                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      disabled={!tablesExist}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Show message if expanded but no labs */}
                        {isExpanded && rangeLabAssignments.length === 0 && (
                          <TableRow className="bg-white">
                            <TableCell colSpan={6} className="py-3 text-center text-sm text-slate-400 italic">
                              No lab ranges assigned. Click "+ Lab" to add one.
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Division Asset Allocation - Separate Table */}
      <DivisionAllocation tablesExist={tablesExist} />

      {/* Add/Edit Range Dialog */}
      <Dialog open={showRangeDialog} onOpenChange={setShowRangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRange ? 'Edit Floor Asset Range' : 'Add Floor Asset Range'}</DialogTitle>
            <DialogDescription>
              Assign an asset ID range to a floor. Format: 001-195 or 001-050, 100-195
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Office</Label>
              <Select 
                value={rangeFormData.officeId} 
                onValueChange={(value) => {
                  setRangeFormData({ ...rangeFormData, officeId: value, floorId: '' });
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map(office => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.office_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Floor</Label>
              <Select 
                value={rangeFormData.floorId} 
                onValueChange={(value) => setRangeFormData({ ...rangeFormData, floorId: value })}
                disabled={!rangeFormData.officeId}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {floorsForSelectedOffice.map(floor => (
                    <SelectItem key={floor.id} value={floor.id}>
                      {floor.floor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Asset ID Range</Label>
              <Input
                value={rangeFormData.assetRange}
                onChange={(e) => setRangeFormData({ ...rangeFormData, assetRange: e.target.value })}
                placeholder="e.g., 001-195 or 001-050, 100-195"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Supports ranges (001-195) and comma-separated values
              </p>
            </div>

            {rangeFormData.assetRange && (() => {
              const validation = validateAssetRange(rangeFormData.assetRange);
              const floor = floors.find(f => f.id === rangeFormData.floorId);
              const floorNumber = floor ? extractFloorNumber(floor.floor_name) : '';
              const formatted = validation.valid && floorNumber 
                ? formatAssetRange(rangeFormData.assetRange, floorNumber) 
                : '';
              
              return (
                <div className="space-y-2">
                  <div className={`text-sm ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.valid ? (
                      <>✓ Valid range - {validation.count} IDs</>
                    ) : (
                      <>✗ {validation.message}</>
                    )}
                  </div>
                  {validation.valid && formatted && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Preview:</p>
                      <p className="text-sm font-mono text-blue-900">{formatted}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRangeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRange}>
              Save Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Lab Range Dialog */}
      <Dialog open={showLabRangeDialog} onOpenChange={setShowLabRangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLabRange ? 'Edit Lab Asset Range' : 'Add Lab Asset Range'}</DialogTitle>
            <DialogDescription>
              Assign a subset of the floor's asset ID range to a lab. The range must be within: {selectedFloorForLab?.formattedRange}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const totalFloorIds = selectedFloorForLab ? parseAssetIds(selectedFloorForLab.assetRange).length : 0;
              
              // Calculate allocated IDs
              const allocatedIds = new Set<number>();
              labAssetRanges
                .filter(lr => lr.floorRangeId === selectedFloorForLab?.id)
                .forEach(lr => {
                  parseAssetIds(lr.assetRange).forEach(id => allocatedIds.add(id));
                });
              
              const allocatedCount = allocatedIds.size;
              const availableCount = totalFloorIds - allocatedCount;
              const allocationPercentage = totalFloorIds > 0 ? ((allocatedCount / totalFloorIds) * 100).toFixed(1) : 0;
              
              // Calculate available labs (by unique lab name, not by division record count)
              const floorLabs = labs.filter((lab: any) => lab.floor_id === selectedFloorForLab?.floorId);
              
              // Get unique lab names that already have ranges
              const labNamesWithRanges = new Set(
                labAssetRanges
                  .filter(lr => lr.floorRangeId === selectedFloorForLab?.id)
                  .map(lr => {
                    const lab = labs.find((l: any) => l.id === lr.labId);
                    return lab?.lab_name;
                  })
                  .filter(Boolean)
              );
              
              // Get unique lab names on this floor
              const uniqueLabNames = new Set(floorLabs.map((lab: any) => lab.lab_name));
              
              // Count how many unique labs don't have ranges yet
              const availableLabsCount = Array.from(uniqueLabNames).filter(
                labName => !labNamesWithRanges.has(labName)
              ).length;
              
              return (
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-600 mb-1">Floor: {selectedFloorForLab?.officeName} - {selectedFloorForLab?.floorName}</p>
                    <p className="text-xs text-blue-600 mb-1">Floor Range:</p>
                    <p className="text-sm font-mono text-blue-900">{selectedFloorForLab?.formattedRange}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Total: {totalFloorIds} IDs | Available Labs: {availableLabsCount}
                    </p>
                  </div>
                  
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-slate-600">Range Allocation Status</p>
                      <p className="text-xs font-medium text-slate-900">{allocationPercentage}% allocated</p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${allocationPercentage}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-600">Allocated: </span>
                        <span className="font-medium text-blue-600">{allocatedCount} IDs</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Available: </span>
                        <span className="font-medium text-green-600">{availableCount} IDs</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <Label>Lab</Label>
              <Select 
                value={labRangeFormData.labId} 
                onValueChange={(value) => setLabRangeFormData({ ...labRangeFormData, labId: value })}
                disabled={!!editingLabRange}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select lab" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    // Filter labs for this floor
                    const labsOnFloor = labs.filter((lab: any) => lab.floor_id === selectedFloorForLab?.floorId);
                    
                    // Get unique lab names that already have asset ranges assigned
                    const labNamesWithRanges = new Set(
                      labAssetRanges
                        .filter(lr => lr.floorRangeId === selectedFloorForLab?.id)
                        .map(lr => {
                          const lab = labs.find((l: any) => l.id === lr.labId);
                          return lab?.lab_name;
                        })
                        .filter(Boolean)
                    );
                    
                    // When editing, get the lab name we're editing
                    const editingLabName = editingLabRange 
                      ? labs.find((l: any) => l.id === editingLabRange.labId)?.lab_name 
                      : null;
                    
                    // Filter: exclude labs that have ranges (by name), unless we're editing that lab
                    const availableLabs = labsOnFloor.filter((lab: any) => {
                      // If editing, always show the current lab being edited
                      if (editingLabRange && lab.lab_name === editingLabName) {
                        return true;
                      }
                      
                      // Otherwise, exclude labs that already have ranges
                      return !labNamesWithRanges.has(lab.lab_name);
                    });
                    
                    // Deduplicate by lab name (since multiple divisions = multiple records for same lab)
                    const uniqueLabs = Array.from(
                      new Map(availableLabs.map(lab => [`${lab.floor_id}_${lab.lab_name}`, lab])).values()
                    );

                    if (uniqueLabs.length === 0) {
                      return (
                        <SelectItem value="no-labs" disabled>
                          No available labs on this floor
                        </SelectItem>
                      );
                    }

                    return uniqueLabs.map((lab: any) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.lab_name}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
              {editingLabRange && (
                <p className="text-xs text-slate-500 mt-1">Lab cannot be changed for existing ranges</p>
              )}
              {!editingLabRange && labs.filter((lab: any) => lab.floor_id === selectedFloorForLab?.floorId).length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No labs found on this floor</p>
              )}
            </div>

            <div>
              <Label>Asset ID Range (Subset)</Label>
              <Input
                value={labRangeFormData.assetRange}
                onChange={(e) => setLabRangeFormData({ ...labRangeFormData, assetRange: e.target.value })}
                placeholder="e.g., 001-050 or 001-025, 030-050"
                className="mt-1.5"
              />
              <p className="text-xs text-slate-500 mt-1">
                Must be a subset of the floor range. No overlaps with other labs.
              </p>
            </div>

            {labRangeFormData.assetRange && selectedFloorForLab && (() => {
              const validation = validateAssetRange(labRangeFormData.assetRange);
              const formatted = validation.valid 
                ? formatAssetRange(labRangeFormData.assetRange, selectedFloorForLab.floorNumber) 
                : '';
              
              // Additional validation: Check if lab range is subset of floor range
              let subsetValid = true;
              let subsetError = '';
              if (validation.valid) {
                const floorIds = parseAssetIds(selectedFloorForLab.assetRange);
                const labIds = parseAssetIds(labRangeFormData.assetRange);
                const invalidIds = labIds.filter(id => !floorIds.includes(id));
                
                if (invalidIds.length > 0) {
                  subsetValid = false;
                  const minFloor = Math.min(...floorIds);
                  const maxFloor = Math.max(...floorIds);
                  subsetError = `IDs must be within floor range: ${minFloor.toString().padStart(3, '0')}-${maxFloor.toString().padStart(3, '0')}`;
                }
                
                // Check for overlaps
                if (subsetValid) {
                  const otherLabRanges = labAssetRanges.filter(
                    lr => lr.floorRangeId === selectedFloorForLab.id && lr.id !== editingLabRange?.id
                  );
                  
                  for (const otherRange of otherLabRanges) {
                    const otherIds = parseAssetIds(otherRange.assetRange);
                    const overlap = labIds.filter(id => otherIds.includes(id));
                    if (overlap.length > 0) {
                      const otherLab = labs.find((l: any) => l.id === otherRange.labId);
                      subsetValid = false;
                      subsetError = `Range overlaps with ${otherLab?.lab_name || 'another lab'}`;
                      break;
                    }
                  }
                }
              }
              
              const isFullyValid = validation.valid && subsetValid;
              
              return (
                <div className="space-y-2">
                  <div className={`text-sm ${isFullyValid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.valid ? (
                      subsetValid ? (
                        <>✓ Valid range - {validation.count} IDs</>
                      ) : (
                        <>✗ {subsetError}</>
                      )
                    ) : (
                      <>✗ {validation.message}</>
                    )}
                  </div>
                  {isFullyValid && formatted && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-600 mb-1">Preview:</p>
                      <p className="text-sm font-mono text-green-900">{formatted}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLabRangeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLabRange}>
              Save Lab Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Division Assignment Dialog */}
      <Dialog open={showDivisionEditDialog} onOpenChange={setShowDivisionEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Division Asset Assignment</DialogTitle>
            <DialogDescription>
              Update the asset IDs assigned to {editingDivisionAssignment?.division}. Format: 112-123, 125, 127
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Asset IDs</Label>
              <Input
                value={divisionEditFormData.assetIds}
                onChange={(e) => setDivisionEditFormData({ ...divisionEditFormData, assetIds: e.target.value })}
                placeholder="e.g., 112-123, 125, 127"
                className="mt-1.5 font-mono text-sm"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use ranges (112-123) and comma-separated singles (125, 127)
              </p>
            </div>

            {divisionEditFormData.assetIds && (() => {
              const validation = validateAssetRange(divisionEditFormData.assetIds);
              const labRange = editingDivisionAssignment ? labAssetRanges.find(lr => lr.id === editingDivisionAssignment.labRangeId) : null;
              const floorRange = labRange ? floorAssetRanges.find(fr => fr.id === labRange.floorRangeId) : null;
              const floorNumber = floorRange?.floorNumber || '';
              const formatted = validation.valid && floorNumber 
                ? formatAssetIdsDisplay(parseAssetIds(divisionEditFormData.assetIds), floorNumber)
                : '';
              
              return (
                <div className="space-y-2">
                  <div className={`text-sm ${validation.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {validation.valid ? (
                      <>✓ Valid - {validation.count} seats</>
                    ) : (
                      <>✗ {validation.message}</>
                    )}
                  </div>
                  {validation.valid && formatted && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 mb-1">Preview:</p>
                      <div className="text-xs font-mono text-blue-900 space-y-0.5">
                        {formatted.split(', ').map((segment, idx) => (
                          <div key={idx}>{segment}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDivisionEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDivisionEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
