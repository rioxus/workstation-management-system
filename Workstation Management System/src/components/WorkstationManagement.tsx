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
import { Building, Plus, Pencil, Trash2, Save, X, Lock, Info } from 'lucide-react';
import { dataService } from '../lib/dataService';
import { toast } from 'sonner@2.0.3';

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
}

interface LabAllocation {
  id: string;
  floorId: string;
  officeName: string;
  floorName: string;
  labName: string;
  totalWorkstations: number;
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
  
  // Filter states for Floor & Lab Allocation table
  const [filterOffice, setFilterOffice] = useState<string>('');
  const [filterFloor, setFilterFloor] = useState<string>('');
  
  const [formData, setFormData] = useState({
    office: '',
    floorId: '',
    labName: '',
    division: '',
    totalWorkstations: 0,
    inUse: 0
  });

  // Multi-division allocation states
  const [pendingDivisions, setPendingDivisions] = useState<Array<{ division: string; inUse: number }>>([]);

  // Predefined divisions
  const DIVISIONS = [
    'SEO - GT',
    'Antardhwani',
    'Aeronavigation',
    'CEO Office',
    'Innovation Labs',
    'HR',
    'Accounts',
    'Technical',
    'Admin',
    'Corporate Affairs',
    'Process Excellence',
    'DMB',
    'Engineering',
    'BIM',
    'BPM',
    'Digital Solutions',
    'Data Science'
  ];

  // Office and floor mapping (matches database office_name values)
  const officeFloorMapping = {
    'Gurukul': ['5th Floor'],
    'Commerce House': ['9th Floor', '5th Floor', '4th Floor']
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [labsData, officesFloorsData] = await Promise.all([
        dataService.getLabs(),
        dataService.getOfficesAndFloors()
      ]);
      console.log('Loaded labs data:', labsData);
      
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
        totalWorkstations: alloc.totalWorkstations
      })));
      setOffices(officesFloorsData.offices);
      setFloors(officesFloorsData.floors);
      
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
    
    return labAlloc.totalWorkstations - totalInUse;
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

  const handleAllocationSubmit = async () => {
    if (!selectedOffice || !selectedFloor || !labAllocationName || labAllocationAmount <= 0) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      if (editingLabAllocation) {
        // Update existing lab allocation
        await dataService.updateLab(editingLabAllocation.id, {
          labName: labAllocationName,
          division: '', // Lab allocations don't have divisions
          totalWorkstations: labAllocationAmount,
          inUse: 0
        });
        
        // Update all division records for this lab with new total workstations
        const divisionsToUpdate = labs.filter(
          lab => lab.floorId === editingLabAllocation.floorId && 
                 lab.labName === editingLabAllocation.labName
        );
        
        for (const division of divisionsToUpdate) {
          await dataService.updateLab(division.id, {
            labName: labAllocationName, // Update lab name if changed
            division: division.division,
            totalWorkstations: labAllocationAmount,
            inUse: division.inUse
          });
        }
        
        // Reload data to refresh everything
        await loadData();
        
        toast.success('Lab allocation updated successfully');
      } else {
        // Create new lab allocation - find or create office and floor first
        const office = await dataService.findOrCreateOffice(selectedOffice.trim());
        const floor = await dataService.findOrCreateFloor(office.id, selectedFloor.trim());
        
        // Check if lab name already exists on this floor
        const existingLab = labAllocations.find(
          lab => lab.floorId === floor.id && 
                 lab.labName.toLowerCase() === labAllocationName.toLowerCase()
        );

        if (existingLab) {
          toast.error('A lab with this name already exists on this floor');
          return;
        }

        // Create new lab allocation
        await dataService.createLab({
          floorId: floor.id,
          labName: labAllocationName,
          division: '', // Lab allocations don't have divisions
          totalWorkstations: labAllocationAmount,
          inUse: 0
        });

        // Reload data to refresh everything
        await loadData();
        
        toast.success('Lab allocation added successfully');
      }

      setShowAllocationDialog(false);
      setEditingLabAllocation(null);
      setSelectedOffice('');
      setSelectedFloor('');
      setFloorTotalWorkstations(0);
      setLabAllocationName('');
      setLabAllocationAmount(0);
      
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error saving lab allocation:', error);
      toast.error('Failed to save lab allocation');
    }
  };

  const handleOpenLabAllocationDialog = (allocation?: LabAllocation) => {
    if (allocation) {
      setEditingLabAllocation(allocation);
      setSelectedOffice(allocation.officeName);
      setSelectedFloor(allocation.floorId);
      setLabAllocationName(allocation.labName);
      setLabAllocationAmount(allocation.totalWorkstations);
    } else {
      setEditingLabAllocation(null);
      setSelectedOffice('');
      setSelectedFloor('');
      setFloorTotalWorkstations(0);
      setLabAllocationName('');
      setLabAllocationAmount(0);
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
    
    // Build confirmation message
    const confirmMessage = divisionsInLab.length > 0
      ? `Are you sure you want to delete this lab allocation?\n\nThis will also delete ${divisionsInLab.length} associated division(s):\n${divisionsInLab.map(d => `- ${d.division}`).join('\n')}\n\nThis action cannot be undone.`
      : 'Are you sure you want to delete this lab allocation? This action cannot be undone.';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // First, delete all associated divisions
      if (divisionsInLab.length > 0) {
        for (const division of divisionsInLab) {
          await dataService.deleteLab(division.id);
        }
      }
      
      // Then delete the lab allocation itself
      await dataService.deleteLab(allocationId);
      
      // Update local state
      setLabAllocations(prev => prev.filter(lab => lab.id !== allocationId));
      setLabs(prev => prev.filter(
        lab => !(lab.floorId === allocation.floorId && lab.labName === allocation.labName)
      ));
      
      // Show success message
      const successMessage = divisionsInLab.length > 0
        ? `Lab allocation deleted successfully. ${divisionsInLab.length} associated division(s) also removed.`
        : 'Lab allocation deleted successfully';
      
      toast.success(successMessage);
      
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error deleting lab allocation:', error);
      toast.error('Failed to delete lab allocation');
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
        inUse: lab.inUse
      });
    } else {
      setEditingLab(null);
      setFormData({
        office: '',
        floorId: '',
        labName: '',
        division: '',
        totalWorkstations: 0,
        inUse: 0
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
      inUse: 0
    });
    setPendingDivisions([]); // Clear pending divisions when dialog closes
  };

  // Add division to pending list
  const handleAddToPendingList = () => {
    if (!formData.division || formData.inUse <= 0) {
      toast.error('Please select a division and enter valid workstations');
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

    // Add to pending list
    setPendingDivisions([...pendingDivisions, { division: formData.division, inUse: formData.inUse }]);
    
    // Reset division and inUse fields for next entry
    setFormData({ ...formData, division: '', inUse: 0 });
    
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

        // Save the current scroll position before any operations
        const scrollPosition = window.scrollY;

        await dataService.updateLab(editingLab.id, {
          labName: formData.labName,
          division: formData.division,
          totalWorkstations: totalWorkstations,
          inUse: formData.inUse
        });
        toast.success('Division updated successfully');

        handleCloseDialog();
        await loadData();
        
        // Restore scroll position after data loads
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollPosition, behavior: 'instant' });
        });
        
        if (onDataChange) {
          onDataChange();
        }
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
          divisionsToCreate.push({ division: formData.division, inUse: formData.inUse });
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
            inUse: divisionEntry.inUse
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
    if (!confirm('Are you sure you want to delete this division? All associated workstations will be removed.')) {
      return;
    }

    try {
      await dataService.deleteLab(labId);
      toast.success('Division deleted successfully');
      loadData();
      
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error deleting division:', error);
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labAllocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
                      No lab allocations set. Click "Add Lab Allocation" to get started.
                    </TableCell>
                  </TableRow>
                ) : getFilteredLabAllocations().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500">
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
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Office</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Lab Name</TableHead>
                  <TableHead className="text-right">Total Workstations</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-right">In Use</TableHead>
                  <TableHead className="text-right">Currently Available</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500">
                      No divisions found. Allocate workstations to labs above, then click "Add Division to Lab" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...labs].reverse().map((lab) => (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLabAllocation ? 'Edit Lab Allocation' : 'Add Lab Allocation'}</DialogTitle>
            <DialogDescription>
              {editingLabAllocation ? 'Update the lab allocation details.' : 'Allocate workstations to a lab within a floor.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAllocationDialog(false);
              setEditingLabAllocation(null);
              setSelectedOffice('');
              setSelectedFloor('');
              setLabAllocationName('');
              setLabAllocationAmount(0);
            }}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleAllocationSubmit}>
              <Save className="w-4 h-4 mr-2" />
              {editingLabAllocation ? 'Update' : 'Create'}
            </Button>
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
                    .map((lab) => (
                      <SelectItem key={lab.id} value={lab.labName}>
                        {lab.labName} ({lab.totalWorkstations} workstations)
                      </SelectItem>
                    ))}
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
                  {DIVISIONS.map((division) => (
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

            {/* Add to pending list button */}
            {!editingLab && formData.floorId && formData.labName && (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddToPendingList}
                  className="flex items-center gap-1 w-full"
                  disabled={!formData.division || !formData.inUse}
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
                        <p className="text-xs text-slate-500">{division.inUse} workstations</p>
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
    </div>
  );
}