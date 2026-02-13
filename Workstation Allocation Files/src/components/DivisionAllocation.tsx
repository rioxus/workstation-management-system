import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Info, Plus, Edit, Trash2 } from 'lucide-react';
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
import { db, LabAssetRange } from '../lib/supabase';

interface DivisionAllocationProps {
  tablesExist: boolean;
  onNavigateToGrid?: (office: string, floor: string, lab: string) => void;
  onDataChange?: () => void; // Add callback for data changes
}

interface DivisionAssignment {
  id?: string;
  labRangeId: string;
  division: string;
  assetIds: string;
  formattedIds: string;
  status?: string;
  notes?: string;
  labName?: string;
  floorName?: string;
  officeName?: string;
}

interface LabRange {
  id: string;
  lab_id: string;
  floor_range_id: string;
  formatted_range: string;
}

interface Floor {
  id: string;
  floor_name: string;
  office_id: string;
}

interface Office {
  id: string;
  office_name: string;
}

interface Lab {
  id: string;
  lab_name: string;
  floor_id: string;
  total_workstations?: number;
  division?: string;
  in_use?: number;
}

export function DivisionAllocation({ tablesExist, onNavigateToGrid, onDataChange }: DivisionAllocationProps) {
  const [loading, setLoading] = useState(true);
  const [divisionAssignments, setDivisionAssignments] = useState<DivisionAssignment[]>([]);
  const [labRanges, setLabRanges] = useState<LabRange[]>([]);
  const [floorRanges, setFloorRanges] = useState<any[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [labAssetRanges, setLabAssetRanges] = useState<LabAssetRange[]>([]);

  const [showDialog, setShowDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<DivisionAssignment | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  // Form state with office and lab selection
  const [formData, setFormData] = useState({
    officeId: '',
    labId: '',
    labRangeId: '',
    division: '',
    assetIds: '',
  });

  // Filters
  const [filterOffice, setFilterOffice] = useState('all');
  const [filterFloor, setFilterFloor] = useState('all');
  const [filterLab, setFilterLab] = useState('all');

  // Load data
  useEffect(() => {
    if (tablesExist) {
      loadData();
    }
  }, [tablesExist]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        assignmentsData,
        labRangesData,
        floorRangesData,
        labsData,
        floorsData,
        officesData,
        labAssetRangesData,
      ] = await Promise.all([
        db.divisionAssetAssignments?.getAll() || [],
        db.labAssetRanges?.getAll() || [],
        db.floorAssetRanges?.getAll() || [],
        db.labs?.getAll() || [],
        db.floors?.getAll() || [],
        db.offices?.getAll() || [],
        db.labAssetRanges?.getAllSimple() || [], // Use simple query for direct lab_id access
      ]);

      setLabRanges(labRangesData);
      setFloorRanges(floorRangesData);
      setLabs(labsData);
      setFloors(floorsData);
      setOffices(officesData);
      setLabAssetRanges(labAssetRangesData);

      // Enrich assignments with joined data
      const enrichedAssignments = assignmentsData.map((assignment: any) => {
        const labRange = labRangesData.find((lr: any) => lr.id === assignment.lab_range_id);
        const lab = labRange ? labsData.find((l: any) => l.id === labRange.lab_id) : null;
        const floorRange = labRange ? floorRangesData.find((fr: any) => fr.id === labRange.floor_range_id) : null;
        const floor = floorRange ? floorsData.find((f: any) => f.id === floorRange.floor_id) : null;
        const office = floor ? officesData.find((o: any) => o.id === floor.office_id) : null;
        
        // Calculate formatted IDs
        const floorNumber = floorRange?.floor_number || '9';
        const divisionName = floorRange?.formatted_range?.match(/^([^/]+)/)?.[1] || 'Admin';
        
        // Parse and format asset IDs
        const parsedIds = parseAssetIds(assignment.asset_ids);
        const formattedIds = parsedIds.map(id => 
          `Admin/WS/F-${floorNumber}/${String(id).padStart(3, '0')}`
        ).join(', ');

        return {
          id: assignment.id,
          labRangeId: assignment.lab_range_id,
          division: assignment.division,
          assetIds: assignment.asset_ids,
          formattedIds,
          status: assignment.status,
          notes: assignment.notes,
          labName: lab?.lab_name,
          floorName: floor?.floor_name,
          officeName: office?.office_name,
        };
      });

      setDivisionAssignments(enrichedAssignments);
    } catch (error) {
      console.error('Error loading division allocation data:', error);
      toast.error('Failed to load division allocations');
    } finally {
      setLoading(false);
    }
  };

  // Get divisions assigned to selected lab from labs table (division records)
  const getLabDivisions = (): string[] => {
    if (!formData.labId) return [];

    const selectedLab = labs.find(l => l.id === formData.labId);
    if (!selectedLab) return [];

    // Find all division records in labs table for this floor_id and lab_name
    // Division records are labs with division field populated
    const divisions = labs
      .filter(lab => 
        lab.division && 
        lab.division.trim() !== '' &&
        lab.lab_name === selectedLab.lab_name && 
        lab.floor_id === selectedLab.floor_id
      )
      .map(lab => lab.division!)
      .filter((division, index, self) => self.indexOf(division) === index); // Deduplicate

    return divisions.sort();
  };

  // Parse asset IDs from string format
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

  // Format IDs for display
  const formatIdsForDisplay = (ids: number[], floorNumber: string): string => {
    if (!ids.length) return '';

    const sortedIds = [...ids].sort((a, b) => a - b);
    const samples = sortedIds.slice(0, 3);

    const formatted = samples.map(id => `Admin/WS/F-${floorNumber}/${id.toString().padStart(3, '0')}`);

    if (sortedIds.length > 3) {
      return `${formatted.join(', ')}, ...`;
    }

    return formatted.join(', ');
  };

  // Open add dialog
  const handleOpenAdd = () => {
    setEditingAssignment(null);
    setFormData({
      officeId: '',
      labId: '',
      labRangeId: '',
      division: '',
      assetIds: '',
    });
    setSelectedSeats([]);
    setShowDialog(true);
  };

  // Open edit dialog
  const handleOpenEdit = (assignment: DivisionAssignment) => {
    setEditingAssignment(assignment);
    setFormData({
      officeId: '',
      labId: '',
      labRangeId: assignment.labRangeId,
      division: assignment.division,
      assetIds: assignment.assetIds,
    });
    setSelectedSeats([]);
    setShowDialog(true);
  };

  // Handle seat selection from grid
  const handleSeatSelection = (seatNumber: number) => {
    setSelectedSeats(prev => {
      if (prev.includes(seatNumber)) {
        return prev.filter(s => s !== seatNumber);
      } else {
        return [...prev, seatNumber].sort((a, b) => a - b);
      }
    });
  };

  // Update assetIds when seats are selected
  useEffect(() => {
    if (selectedSeats.length > 0) {
      // Convert selected seats to range format
      const ranges: string[] = [];
      let start = selectedSeats[0];
      let end = selectedSeats[0];

      for (let i = 1; i < selectedSeats.length; i++) {
        if (selectedSeats[i] === end + 1) {
          end = selectedSeats[i];
        } else {
          ranges.push(start === end ? `${String(start).padStart(3, '0')}` : `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`);
          start = selectedSeats[i];
          end = selectedSeats[i];
        }
      }
      ranges.push(start === end ? `${String(start).padStart(3, '0')}` : `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`);

      setFormData(prev => ({ ...prev, assetIds: ranges.join(',') }));
    } else if (selectedSeats.length === 0 && formData.assetIds) {
      // Don't clear if user manually typed something
      // Only clear if it was auto-filled by grid selection
    }
  }, [selectedSeats]);

  // Save assignment
  const handleSave = async () => {
    try {
      if (!formData.labRangeId || !formData.division || !formData.assetIds) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Parse and validate asset IDs
      const parsedIds = parseAssetIds(formData.assetIds);
      if (parsedIds.length === 0) {
        toast.error('Invalid asset IDs format');
        return;
      }

      // CRITICAL VALIDATION 1: Check if Asset IDs are within the lab's Asset ID range
      if (parsedAssetRange) {
        const outOfRangeIds = parsedIds.filter(id => id < parsedAssetRange.start || id > parsedAssetRange.end);
        if (outOfRangeIds.length > 0) {
          toast.error(
            `❌ Asset IDs Out of Range!\n\nThe following Asset IDs are outside the lab's range (${parsedAssetRange.start}-${parsedAssetRange.end}):\n${outOfRangeIds.join(', ')}\n\nPlease select Asset IDs within the lab's assigned range.`,
            { duration: 8000 }
          );
          return;
        }
      }

      // CRITICAL VALIDATION 2: Check for Asset ID conflicts in the same lab
      // Get all existing assignments for the same lab (excluding the current one being edited)
      const sameLabAssignments = divisionAssignments.filter(
        assignment => 
          assignment.labRangeId === formData.labRangeId &&
          (!editingAssignment || assignment.id !== editingAssignment.id)
      );

      // Check for overlapping Asset IDs
      const conflicts: { assetId: number; division: string }[] = [];
      for (const existingAssignment of sameLabAssignments) {
        const existingIds = parseAssetIds(existingAssignment.assetIds);
        
        // Find common IDs between new assignment and existing assignment
        const overlappingIds = parsedIds.filter(id => existingIds.includes(id));
        
        if (overlappingIds.length > 0) {
          overlappingIds.forEach(id => {
            conflicts.push({ assetId: id, division: existingAssignment.division });
          });
        }
      }

      // If conflicts found, show detailed error and prevent save
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => `Asset ID ${c.assetId} (already assigned to ${c.division})`).join(', ');
        toast.error(
          `❌ Asset ID Conflict Detected!\n\nThe following Asset IDs are already assigned in this lab:\n${conflictDetails}\n\nPlease remove conflicting IDs or choose different Asset IDs.`,
          { duration: 8000 }
        );
        return;
      }

      const assignmentData = {
        lab_range_id: formData.labRangeId,
        division: formData.division,
        asset_ids: formData.assetIds,
        status: 'active',
      };

      if (editingAssignment && db.divisionAssetAssignments) {
        await db.divisionAssetAssignments.update(editingAssignment.id!, assignmentData);
        toast.success('Division assignment updated successfully');
      } else if (db.divisionAssetAssignments) {
        await db.divisionAssetAssignments.create(assignmentData);
        toast.success(`Assigned ${parsedIds.length} assets to ${formData.division}`);
      }

      setShowDialog(false);
      setSelectedSeats([]);
      await loadData();
      if (onDataChange) {
        onDataChange();
      }
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      if (error.message?.includes('unique')) {
        toast.error('This division already has an assignment for this lab');
      } else {
        toast.error('Failed to save assignment');
      }
    }
  };

  // Delete assignment
  const handleDelete = async (assignment: DivisionAssignment) => {
    if (!confirm(`Delete assignment for ${assignment.division}?`)) return;

    try {
      if (db.divisionAssetAssignments && assignment.id) {
        await db.divisionAssetAssignments.delete(assignment.id);
        toast.success('Assignment deleted successfully');
        await loadData();
        if (onDataChange) {
          onDataChange();
        }
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
    }
  };

  // Filter assignments
  const filteredAssignments = divisionAssignments.filter(assignment => {
    if (filterOffice !== 'all' && assignment.officeName !== offices.find(o => o.id === filterOffice)?.office_name) {
      return false;
    }
    if (filterFloor !== 'all' && assignment.floorName !== floors.find(f => f.id === filterFloor)?.floor_name) {
      return false;
    }
    if (filterLab !== 'all') {
      const labRange = labRanges.find(lr => lr.id === assignment.labRangeId);
      if (labRange?.lab_id !== filterLab) return false;
    }
    return true;
  });

  // Get labs filtered by selected office
  const availableLabs = formData.officeId
    ? labs.filter(lab => {
        const floor = floors.find(f => f.id === lab.floor_id);
        // Only show labs without division (these are the lab allocations, not division records)
        return floor?.office_id === formData.officeId && (!lab.division || lab.division.trim() === '');
      })
    : [];

  // Deduplicate labs
  const uniqueAvailableLabs = availableLabs.reduce((acc, lab) => {
    const floor = floors.find(f => f.id === lab.floor_id);
    const uniqueKey = `${floor?.floor_name}_${lab.lab_name}`;
    
    const alreadyExists = acc.find(l => {
      const existingFloor = floors.find(f => f.id === l.floor_id);
      return `${existingFloor?.floor_name}_${l.lab_name}` === uniqueKey;
    });
    
    if (!alreadyExists) {
      acc.push(lab);
    }
    return acc;
  }, [] as Lab[]);

  // Auto-select lab_range_id when lab is selected
  useEffect(() => {
    if (formData.labId) {
      const labRange = labRanges.find(lr => lr.lab_id === formData.labId);
      if (labRange) {
        setFormData(prev => ({ ...prev, labRangeId: labRange.id }));
      }
    }
  }, [formData.labId, labRanges]);

  // Sync manual asset ID input with grid selection
  useEffect(() => {
    if (formData.assetIds) {
      const parsedIds = parseAssetIds(formData.assetIds);
      if (parsedIds.length > 0) {
        setSelectedSeats(parsedIds);
      }
    } else {
      setSelectedSeats([]);
    }
  }, [formData.assetIds]);

  // Get current lab info for grid
  const selectedLabInfo = formData.labId ? labs.find(l => l.id === formData.labId) : null;
  
  // Parse asset range helper (same as SeatDistributionHeatmap)
  const parseAssetRange = (range: string): { start: number; end: number } | null => {
    if (!range) return null;
    const parts = range.split('-');
    if (parts.length !== 2) return null;
    return {
      start: parseInt(parts[0]),
      end: parseInt(parts[1])
    };
  };
  
  // Find lab asset range (now using simple data with direct lab_id field)
  const currentLabAssetRange = formData.labId 
    ? labAssetRanges.find(lr => lr.lab_id === formData.labId)
    : null;
  
  // Parse the asset range to get start/end numbers
  // Extract range from formatted_range like "Admin/WS/F-9/001 to Admin/WS/F-9/195" → "001-195"
  const extractAssetRange = (formattedRange: string): string | null => {
    if (!formattedRange) return null;
    const match = formattedRange.match(/\/(\d+)\s+to\s+[^/]+\/(\d+)/);
    if (!match) return null;
    return `${match[1]}-${match[2]}`;
  };
  
  const assetRangeString = currentLabAssetRange?.formatted_range 
    ? extractAssetRange(currentLabAssetRange.formatted_range) 
    : null;
  const parsedAssetRange = assetRangeString ? parseAssetRange(assetRangeString) : null;
  
  // Get floor info for the selected lab
  const selectedFloor = selectedLabInfo ? floors.find(f => f.id === selectedLabInfo.floor_id) : null;
  const floorNumber = selectedFloor?.floor_name?.match(/(\d+)/)?.[1] || '9';
  
  // Get the floor range to find division name
  const floorRange = currentLabAssetRange ? floorRanges.find(fr => fr.id === currentLabAssetRange.floor_range_id) : null;
  const divisionName = floorRange?.formatted_range?.match(/^([^/]+)/)?.[1] || 'Admin';
  
  // Grid should show if lab has workstations (from Workstation Data), regardless of asset range configuration
  const totalWorkstations = selectedLabInfo?.total_workstations || 0;
  const canShowGrid = totalWorkstations > 0;
  
  // Check if we have a valid asset range (same logic as SeatDistributionHeatmap)
  const hasValidAssetRange = !!parsedAssetRange;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex items-center justify-center">
            <p className="text-slate-500">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              <CardTitle>Division Asset Allocation</CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-green-100 transition-colors">
                      <Info className="w-4 h-4 text-green-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">
                      <strong>Important:</strong> This section only assigns divisions to existing labs.
                      It does NOT create new lab entries. All labs must be created in the 
                      "Floor Asset ID Range Management" section above first.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Assign divisions to existing lab ranges (does not create new labs)
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button
                    onClick={handleOpenAdd}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!tablesExist || labRanges.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Assign Division
                  </Button>
                </div>
              </TooltipTrigger>
              {!tablesExist && (
                <TooltipContent>
                  <p className="text-xs">Run migration script first</p>
                </TooltipContent>
              )}
              {tablesExist && labRanges.length === 0 && (
                <TooltipContent>
                  <p className="text-xs">Create lab asset ranges first</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
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
              {floors.map(floor => (
                <SelectItem key={floor.id} value={floor.id}>
                  {floor.floor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLab} onValueChange={setFilterLab}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Labs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Labs</SelectItem>
              {labs.map(lab => (
                <SelectItem key={lab.id} value={lab.id}>
                  {lab.lab_name}
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
                <TableHead>Division</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Office</TableHead>
                <TableHead>Asset ID Range</TableHead>
                <TableHead className="text-center">Count</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                    No division allocations yet. Click "Assign Division" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => {
                  // Calculate count from asset_ids
                  const assetCount = parseAssetIds(assignment.assetIds).length;
                  
                  return (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <span className="font-medium text-green-700">{assignment.division}</span>
                      </TableCell>
                      <TableCell>{assignment.labName}</TableCell>
                      <TableCell className="text-blue-600">{assignment.floorName}</TableCell>
                      <TableCell>{assignment.officeName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {assignment.assetIds}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{assetCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(assignment)}
                            className="h-8"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(assignment)}
                            className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Edit Division Assignment' : 'Assign Division'}</DialogTitle>
            <DialogDescription>
              Allocate specific asset IDs to a division within a lab range
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Office Selection */}
            <div>
              <Label>Office Location</Label>
              <Select
                value={formData.officeId}
                onValueChange={(value) => setFormData({ ...formData, officeId: value, labId: '', labRangeId: '', division: '' })}
                disabled={!!editingAssignment}
              >
                <SelectTrigger>
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

            {/* Lab Selection */}
            <div>
              <Label>Lab</Label>
              <Select
                value={formData.labId}
                onValueChange={(value) => {
                  setFormData({ ...formData, labId: value, division: '' });
                  setSelectedSeats([]);
                }}
                disabled={!!editingAssignment || !formData.officeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.officeId ? "Select lab" : "Select office first"} />
                </SelectTrigger>
                <SelectContent>
                  {uniqueAvailableLabs.map(lab => {
                    const floor = floors.find(f => f.id === lab.floor_id);
                    return (
                      <SelectItem key={lab.id} value={lab.id}>
                        {floor?.floor_name} - {lab.lab_name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Division Selection - Only shows divisions from labs table for selected lab */}
            {formData.labId && (
              <div>
                <Label>Division</Label>
                {getLabDivisions().length === 0 ? (
                  <div className="border border-slate-200 rounded-md p-3 bg-slate-50 text-sm text-slate-500">
                    No divisions assigned to this lab in Workstation Data
                  </div>
                ) : (
                  <Select
                    value={formData.division}
                    onValueChange={(value) => setFormData({ ...formData, division: value })}
                    disabled={!!editingAssignment}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {getLabDivisions().map(division => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Only divisions assigned to this lab in Workstation Data
                </p>
              </div>
            )}

            {/* Asset IDs Input */}
            {formData.labId && (
              <div>
                <Label>Asset IDs</Label>
                
                {/* Display Lab's Asset ID Range */}
                {parsedAssetRange && (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-900">
                        Lab Asset ID Range: {parsedAssetRange.start} - {parsedAssetRange.end}
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1 ml-6">
                      You can only assign Asset IDs within this range
                    </p>
                  </div>
                )}
                
                {!parsedAssetRange && (
                  <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="w-4 h-4 text-amber-600" />
                      <span className="font-medium text-amber-900">
                        No Asset ID range configured for this lab
                      </span>
                    </div>
                    <p className="text-xs text-amber-700 mt-1 ml-6">
                      Please configure the Asset ID range in Floor & Lab Allocation Management
                    </p>
                  </div>
                )}
                
                <Input
                  value={formData.assetIds}
                  onChange={(e) => setFormData({ ...formData, assetIds: e.target.value })}
                  placeholder={parsedAssetRange ? `e.g., ${parsedAssetRange.start}-${parsedAssetRange.start + 9}, ${parsedAssetRange.start + 15}` : "e.g., 001-010, 015, 020-025"}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Format: Individual IDs (001, 002) or ranges (001-010). Select from grid below or type manually.
                </p>
                {selectedSeats.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {selectedSeats.length} seat(s) selected from grid
                  </p>
                )}
              </div>
            )}

            {/* Grid Selector - Shows directly below Asset IDs when lab is selected and has workstations */}
            {formData.labId && selectedLabInfo && canShowGrid && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Select Seats from Grid</Label>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-slate-400" />
                      <span className="text-slate-600">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span className="text-slate-600">Selected</span>
                    </div>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap gap-2">
                      {/* RULE: Number of boxes = totalWorkstations (from Workstation Data / lab_allocations)
                          Numbers in boxes = Asset IDs starting from parsedAssetRange.start
                          SAME LOGIC AS SeatDistributionHeatmap */}
                      {Array.from({ length: totalWorkstations }, (_, index) => {
                        // Calculate actual asset ID number from range (EXACT SAME as SeatDistributionHeatmap)
                        const assetIdNumber = parsedAssetRange 
                          ? parsedAssetRange.start + index  // Use first N IDs from range where N = total seats
                          : index + 1; // fallback to sequential if no range found
                        
                        const isSelected = selectedSeats.includes(assetIdNumber);
                        
                        // Create formatted asset ID (EXACT SAME as SeatDistributionHeatmap)
                        const formattedAssetId = parsedAssetRange 
                          ? `Admin/WS/F-${floorNumber}/${String(assetIdNumber).padStart(3, '0')}`
                          : `Seat ${assetIdNumber}`;
                        
                        const boxColor = isSelected ? '#10B981' : '#9CA3AF';
                        const borderStyle = isSelected ? 'border-green-700 ring-2 ring-green-300' : 'border-slate-300';
                        
                        return (
                          <Tooltip key={`seat-${assetIdNumber}-${index}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-10 h-10 rounded flex items-center justify-center text-sm transition-all hover:scale-110 hover:shadow-md border cursor-pointer text-white ${borderStyle}`}
                                style={{ backgroundColor: boxColor }}
                                onClick={() => handleSeatSelection(assetIdNumber)}
                              >
                                {assetIdNumber}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-800 text-white p-3 max-w-xs border-slate-700">
                              <div className="space-y-1 text-xs">
                                <div>
                                  <span className="text-slate-400">Asset ID:</span> <strong>{formattedAssetId}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400">Seat Number:</span> {assetIdNumber}
                                </div>
                                <div>
                                  <span className="text-slate-400">Status:</span>{' '}
                                  <Badge className={`${isSelected ? 'bg-green-500' : 'bg-slate-500'} text-white`}>
                                    {isSelected ? 'SELECTED' : 'AVAILABLE'}
                                  </Badge>
                                </div>
                                {!hasValidAssetRange && (
                                  <div className="text-amber-400 text-xs mt-1">
                                    ⚠️ No asset range configured
                                  </div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </TooltipProvider>
                </div>
              </div>
            )}
            
            {/* Show warning if lab selected but no workstations configured */}
            {formData.labId && selectedLabInfo && !canShowGrid && (
              <div>
                <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-sm text-red-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <span>❌</span>
                    <div>
                      <p className="font-medium">No workstations configured for this lab</p>
                      <p className="mt-1 text-xs">
                        Lab <strong>{selectedLabInfo.lab_name}</strong> has {totalWorkstations} total workstations configured.
                      </p>
                      <p className="mt-2 text-xs">
                        <strong>To fix:</strong> Go to the Workstation Data tab and ensure this lab has workstations allocated (total_workstations &gt; 0).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show info message if grid shows but no asset range configured */}
            {formData.labId && selectedLabInfo && canShowGrid && !hasValidAssetRange && (
              <div>
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 text-sm text-blue-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <span>ℹ️</span>
                    <div>
                      <p className="font-medium">Asset range not configured (optional)</p>
                      <p className="mt-1 text-xs">
                        Grid is showing with sequential numbering. For proper asset ID formatting (e.g., "Admin/WS/F-9/166"), configure an asset range in Floor Asset ID Range Management.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDialog(false);
              setSelectedSeats([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              {editingAssignment ? 'Update' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}