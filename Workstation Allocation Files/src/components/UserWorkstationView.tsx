import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { BarChart3, Calendar } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { db } from '../lib/supabase';

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
}

interface UserWorkstationViewProps {
  data: WorkstationData;
  enableBooking?: boolean;
  onBookingSubmit?: (request: any) => void;
  userInfo?: any;
  seatBookings?: any[];
  onRefreshData?: () => void;
}

export function UserWorkstationView({ 
  data, 
  enableBooking = true, 
  onBookingSubmit, 
  userInfo, 
  seatBookings = [], 
  onRefreshData 
}: UserWorkstationViewProps) {
  const [selectedOffice, setSelectedOffice] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<string>('');
  const [selectedLab, setSelectedLab] = useState<string>('');
  const [divisionsFromDB, setDivisionsFromDB] = useState<string[]>([]);
  
  // Booking-related state (only used when enableBooking=true)
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bulkRequestDialogOpen, setBulkRequestDialogOpen] = useState(false);
  const [multiSelectCount, setMultiSelectCount] = useState('');
  const [bookingForm, setBookingForm] = useState({
    employeeId: '',
    department: '',
    remarks: ''
  });
  const [bulkRequestForm, setBulkRequestForm] = useState({
    numWorkstations: '',
    department: '',
    remarks: ''
  });

  // Load divisions from database
  useEffect(() => {
    loadDivisions();
  }, []);

  const loadDivisions = async () => {
    try {
      const data = await db.divisions.getAll();
      setDivisionsFromDB(data.map(d => d.division_name).sort());
    } catch (error) {
      console.error('Error loading divisions:', error);
    }
  };

  // Filter divisions based on manager's assigned divisions
  const availableDivisions = useMemo(() => {
    // For managers, only show their assigned divisions
    if (userInfo?.role === 'Manager' && userInfo?.division) {
      // Parse the comma-separated division string
      const assignedDivisions = userInfo.division
        .split(',')
        .map((div: string) => div.trim())
        .filter((div: string) => div.length > 0);
      
      // Filter divisionsFromDB to only include assigned divisions
      return divisionsFromDB.filter(div => 
        assignedDivisions.some((assigned: string) => 
          assigned.toLowerCase() === div.toLowerCase()
        )
      );
    }
    
    // For admins or users without role restrictions, show all divisions
    return divisionsFromDB;
  }, [divisionsFromDB, userInfo]);

  // Process data to extract offices, floors, and labs
  const { offices, floors, labs, labInfo, allDivisions } = useMemo(() => {
    // Handle undefined or null data object
    if (!data) {
      return {
        offices: [],
        floors: [],
        labs: [],
        labInfo: new Map<string, { 
          total: number; 
          office: string; 
          floor: string; 
          bookedSeats: number;
          pendingSeats: number;
        }>(),
        allDivisions: [],
      };
    }
    
    const { labAllocations = [], divisionRecords = [] } = data;
    
    if (!labAllocations.length) {
      return {
        offices: [],
        floors: [],
        labs: [],
        labInfo: new Map<string, { 
          total: number; 
          office: string; 
          floor: string; 
          bookedSeats: number;
          pendingSeats: number;
        }>(),
        allDivisions: [],
      };
    }

    // Create a map of lab info and collect unique offices/floors
    const labInfoMap = new Map<string, { 
      total: number; 
      office: string; 
      floor: string; 
      bookedSeats: number;
      pendingSeats: number;
    }>();
    const divisionsSet = new Set<string>();
    const officesSet = new Set<string>();
    const floorsMap = new Map<string, Set<string>>(); // office -> floors

    labAllocations.forEach((lab) => {
      if (lab.floors) {
        const officeName = lab.floors.offices?.office_name || 'Unknown Office';
        const floorName = lab.floors.floor_name || 'Unknown Floor';
        const labName = lab.lab_name;
        const total = lab.total_workstations || 0;
        
        // Add to offices and floors
        officesSet.add(officeName);
        if (!floorsMap.has(officeName)) {
          floorsMap.set(officeName, new Set());
        }
        floorsMap.get(officeName)?.add(floorName);
        
        // Calculate booked and pending seats for this lab
        // IMPORTANT: Filter by office, floor, AND lab name to avoid counting duplicates across floors
        const labDivisionRecords = divisionRecords.filter((r: any) => {
          if (!r.floors) return false;
          const recordOffice = r.floors.offices?.office_name || '';
          const recordFloor = r.floors.floor_name || '';
          const recordLab = r.lab_name;
          return recordOffice === officeName && recordFloor === floorName && recordLab === labName;
        });
        const bookedSeats = labDivisionRecords.reduce((sum: number, r: any) => sum + (r.in_use || 0), 0);
        
        // Filter pending seats by lab_id and floor_id instead of office/floor names
        const pendingSeats = seatBookings.filter((b: any) => {
          // Match by lab_id and floor_id which are foreign keys in seat_bookings table
          return b.lab_id === lab.id && 
                 b.floor_id === lab.floor_id &&
                 b.status === 'pending';
        }).length;
        
        // Use composite key to uniquely identify lab (office|floor|labName)
        const compositeKey = `${officeName}|${floorName}|${labName}`;
        
        labInfoMap.set(compositeKey, {
          total,
          office: officeName,
          floor: floorName,
          bookedSeats,
          pendingSeats,
        });
      }
    });

    // Collect all divisions
    divisionRecords.forEach((record: any) => {
      if (record.division) {
        divisionsSet.add(record.division);
      }
    });

    // Get offices list
    const officesList = Array.from(officesSet).sort();
    
    // Auto-select first office if not selected
    if (officesList.length > 0 && !selectedOffice) {
      const firstOffice = officesList[0];
      setSelectedOffice(firstOffice);
      
      // Auto-select first floor for this office
      const floorsForOffice = Array.from(floorsMap.get(firstOffice) || []).sort();
      if (floorsForOffice.length > 0) {
        setSelectedFloor(floorsForOffice[0]);
      }
    }

    // Get floors for selected office
    const floorsForSelectedOffice = selectedOffice 
      ? Array.from(floorsMap.get(selectedOffice) || []).sort()
      : [];

    // Get labs for selected office and floor
    const filteredLabs = Array.from(labInfoMap.entries())
      .filter(([_, info]) => {
        if (!selectedOffice || !selectedFloor) return false;
        return info.office === selectedOffice && info.floor === selectedFloor;
      })
      .map(([labName, _]) => labName)
      .sort();
    
    // Auto-select first lab if available
    if (filteredLabs.length > 0 && !selectedLab) {
      setSelectedLab(filteredLabs[0]);
    } else if (filteredLabs.length === 0) {
      setSelectedLab('');
    }

    return {
      offices: officesList,
      floors: floorsForSelectedOffice,
      labs: filteredLabs,
      labInfo: labInfoMap,
      allDivisions: Array.from(divisionsSet).sort(),
    };
  }, [data, seatBookings, selectedOffice, selectedFloor]);

  // Handle booking form submission
  const handleBookingSubmit = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to book.');
      return;
    }

    const currentLabInfo = labInfo.get(selectedLab);
    
    // Automatically capture the current date and time
    const bookingDate = new Date().toISOString();
    
    // Extract lab name from composite key
    const labNameOnly = selectedLab.split('|')[2] || selectedLab;
    
    // Create booking request with proper data structure
    const bookingDetails = {
      labName: labNameOnly,
      seats: selectedSeats,
      requestorName: userInfo?.name || 'User',
      requestorId: bookingForm.employeeId || userInfo?.employeeId || 'TEMP001',
      division: bookingForm.department,
      numWorkstations: selectedSeats.length,
      location: currentLabInfo?.office || 'Commerce House',
      floor: currentLabInfo?.floor || 'Floor 9',
      bookingDate: bookingDate, // Auto-captured submission date
      justification: 'Seat booking request',
      remarks: bookingForm.remarks || '', // Manager's remarks for urgent/special requests
    };

    // Call the onBookingSubmit callback if provided
    if (onBookingSubmit) {
      onBookingSubmit(bookingDetails);
    }

    // Show success toast
    toast.success(`Successfully submitted booking request for ${selectedSeats.length} seat(s) in ${labNameOnly}.`);
    
    // Close dialog and reset form
    setBookingDialogOpen(false);
    setSelectedSeats([]);
    setBookingForm({
      employeeId: '',
      department: '',
      remarks: ''
    });

    // Refresh data to show updated pending bookings
    if (onRefreshData) {
      onRefreshData();
    }
  };

  const handleOpenBookingDialog = () => {
    if (!selectedLab) {
      toast.error('Please select a lab to book workstations.');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to book.');
      return;
    }
    // Reload divisions from database when dialog opens to ensure latest data
    loadDivisions();
    setBookingDialogOpen(true);
  };

  // Handle bulk request dialog open
  const handleOpenBulkRequestDialog = () => {
    loadDivisions();
    setBulkRequestDialogOpen(true);
  };

  // Handle bulk request submission
  const handleBulkRequestSubmit = () => {
    const numWorkstations = parseInt(bulkRequestForm.numWorkstations);
    
    if (!numWorkstations || numWorkstations <= 0) {
      toast.error('Please enter a valid number of workstations.');
      return;
    }
    
    if (!bulkRequestForm.department) {
      toast.error('Please select a division.');
      return;
    }

    // Automatically capture the current date and time
    const bookingDate = new Date().toISOString();
    
    // Create bulk request - notice we don't include specific seats or lab info
    const bulkRequest = {
      requestorName: userInfo?.name || 'Manager',
      requestorId: userInfo?.employeeId || 'TEMP001',
      division: bulkRequestForm.department,
      numWorkstations: numWorkstations,
      location: '', // Admin will assign location
      floor: '', // Admin will assign floor
      labName: '', // Admin will assign lab
      seats: [], // No specific seats - admin will assign
      bookingDate: bookingDate,
      justification: 'Bulk workstation request',
      remarks: bulkRequestForm.remarks || '', // Manager's remarks for urgent/special requests
      isBulkRequest: true // Flag to identify this as a bulk request
    };

    // Call the onBookingSubmit callback if provided
    if (onBookingSubmit) {
      onBookingSubmit(bulkRequest);
    }

    // Show success toast
    toast.success(`Successfully submitted bulk request for ${numWorkstations} workstation(s).`);
    
    // Close dialog and reset form
    setBulkRequestDialogOpen(false);
    setBulkRequestForm({
      numWorkstations: '',
      department: '',
      remarks: ''
    });

    // Refresh data
    if (onRefreshData) {
      onRefreshData();
    }
  };

  // Handle multi-select: auto-select N available seats
  const handleMultiSelect = () => {
    const count = parseInt(multiSelectCount);
    if (isNaN(count) || count <= 0) {
      toast.error('Please enter a valid number of seats.');
      return;
    }

    if (!selectedLab) {
      toast.error('Please select a lab first.');
      return;
    }

    const info = labInfo.get(selectedLab);
    if (!info) return;

    // Extract lab name from composite key for filtering division records
    const labNameOnly = selectedLab.split('|')[2] || selectedLab;

    // Get all available seats
    const availableSeats: number[] = [];
    // Filter division records by office, floor, AND lab name
    const labDivisions = data.divisionRecords?.filter((r: any) => {
      if (!r.floors) return false;
      const recordOffice = r.floors.offices?.office_name || '';
      const recordFloor = r.floors.floor_name || '';
      const recordLab = r.lab_name;
      return recordOffice === info.office && recordFloor === info.floor && recordLab === labNameOnly;
    }) || [];
    
    for (let i = 1; i <= info.total; i++) {
      // Check if seat is pending
      const isPending = seatBookings?.some(
        (b: any) => b.lab_name === labNameOnly && 
                   b.seat_number === i &&
                   b.status === 'pending'
      );
      
      // Check if seat is booked
      let isBooked = false;
      let currentCount = 0;
      for (const record of labDivisions) {
        const seats = record.in_use || 0;
        if (i > currentCount && i <= currentCount + seats) {
          isBooked = true;
          break;
        }
        currentCount += seats;
      }
      
      if (!isPending && !isBooked) {
        availableSeats.push(i);
      }
    }

    if (availableSeats.length < count) {
      toast.error(`Selection not possible. Only ${availableSeats.length} seat${availableSeats.length === 1 ? '' : 's'} available, but you requested ${count}.`);
      return;
    }

    // Select the first N available seats
    const seatsToSelect = availableSeats.slice(0, count);
    setSelectedSeats(seatsToSelect);
    setMultiSelectCount('');
    toast.success(`Automatically selected ${count} seat(s).`);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium">Live Workstation Availability</h4>
            </div>
            <p className="text-sm text-slate-600">
              View real-time workstation availability across different locations and floors.
            </p>
          </div>
        </div>
        
        {/* Office and Floor Selectors */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="office-select" className="text-sm">Office:</Label>
            <Select 
              value={selectedOffice} 
              onValueChange={(value) => {
                setSelectedOffice(value);
                setSelectedFloor(''); // Reset floor when office changes
                setSelectedLab(''); // Reset lab
              }}
            >
              <SelectTrigger id="office-select" className="w-52 h-9">
                <SelectValue placeholder="Select Office" />
              </SelectTrigger>
              <SelectContent>
                {offices.map(office => (
                  <SelectItem key={office} value={office}>
                    {office}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedOffice && (
            <div className="flex items-center gap-2">
              <Label htmlFor="floor-select" className="text-sm">Floor:</Label>
              <Select 
                value={selectedFloor} 
                onValueChange={(value) => {
                  setSelectedFloor(value);
                  setSelectedLab(''); // Reset lab when floor changes
                }}
              >
                <SelectTrigger id="floor-select" className="w-52 h-9">
                  <SelectValue placeholder="Select Floor" />
                </SelectTrigger>
                <SelectContent>
                  {floors.map(floor => (
                    <SelectItem key={floor} value={floor}>
                      {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {/* Lab Tabs Interface - Only show when office and floor are selected */}
        {selectedOffice && selectedFloor && labs.length > 0 ? (
          <Tabs value={selectedLab} onValueChange={(value) => {
            setSelectedLab(value);
          }} className="w-full">
            <TabsList className="grid w-full mb-4" style={{ gridTemplateColumns: `repeat(${Math.min(labs.length, 6)}, minmax(0, 1fr))` }}>
              {labs.map(lab => {
                const info = labInfo.get(lab);
                if (!info) return null;
                
                const availableInLab = info.total - info.bookedSeats - info.pendingSeats;
                
                // Extract just the lab name from composite key (office|floor|labName)
                const labDisplayName = lab.split('|')[2] || lab;
                
                return (
                  <TabsTrigger key={lab} value={lab} className="text-sm min-w-0">
                    <div className="flex flex-col items-center w-full">
                      <span className="truncate max-w-full px-1">{labDisplayName}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{availableInLab} available</span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {labs.map(lab => {
              const info = labInfo.get(lab);
              if (!info) return null;
              
              const availableInLab = info.total - info.bookedSeats - info.pendingSeats;
              
              // Extract lab name from composite key
              const labNameOnly = lab.split('|')[2] || lab;
              
              return (
                <TabsContent key={lab} value={lab} className="mt-6">
                  {/* Lab Info - Remove Pending count for Managers */}
                  <div className="mb-4 text-slate-700">
                    <span className="text-sm">
                      {info.floor} • {info.office} — Capacity: <strong>{info.total}</strong> | Booked: <strong>{info.bookedSeats}</strong> | Available: <strong className="text-green-600">{availableInLab}</strong>
                    </span>
                  </div>
                  
                  {/* Legend - Remove Pending status for Managers */}
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-slate-400" />
                      <span className="text-slate-600">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-red-500" />
                      <span className="text-slate-600">Booked</span>
                    </div>
                  </div>
                  
                  {/* Multi-Select Feature - Only show if seats are available */}
                  {enableBooking && availableInLab > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Label htmlFor="multi-select-count" className="text-sm whitespace-nowrap">
                          Multiple-seat select:
                        </Label>
                        <Input
                          id="multi-select-count"
                          type="number"
                          min="1"
                          max={availableInLab}
                          placeholder="Enter number"
                          value={multiSelectCount}
                          onChange={(e) => setMultiSelectCount(e.target.value)}
                          className="w-32 h-9"
                        />
                        <Button
                          onClick={handleMultiSelect}
                          disabled={!multiSelectCount || parseInt(multiSelectCount) <= 0}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          Select
                        </Button>
                        {selectedSeats.length > 0 && (
                          <Button
                            onClick={() => setSelectedSeats([])}
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                          >
                            Clear All ({selectedSeats.length})
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Workstation Grid */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                    <TooltipProvider delayDuration={200}>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: info.total }, (_, index) => {
                          const workstationNumber = index + 1;
                          
                          // Check if seat is booked (any approved booking)
                          // Filter division records by office, floor, AND lab name
                          let isBooked = false;
                          let owningDivision = '-';
                          let currentCount = 0;
                          const labDivisions = data.divisionRecords?.filter((r: any) => {
                            if (!r.floors) return false;
                            const recordOffice = r.floors.offices?.office_name || '';
                            const recordFloor = r.floors.floor_name || '';
                            const recordLab = r.lab_name;
                            return recordOffice === info.office && recordFloor === info.floor && recordLab === labNameOnly;
                          }) || [];
                          for (const record of labDivisions) {
                            const seats = record.in_use || 0;
                            if (workstationNumber > currentCount && workstationNumber <= currentCount + seats) {
                              isBooked = true;
                              owningDivision = record.division || 'Unknown';
                              break;
                            }
                            currentCount += seats;
                          }
                          
                          const seatStatus = isBooked ? 'booked' : 'available';
                          
                          // Determine color based on status ONLY (no division colors in user mode)
                          let boxColor = '#9CA3AF'; // Default gray for available
                          let textColor = 'text-white';
                          let cursorStyle = 'cursor-default';
                          let borderStyle = 'border-slate-300';
                          let displayLetter = 'A'; // A for Available
                          
                          if (seatStatus === 'booked') {
                            boxColor = '#EF4444'; // Red for booked
                            cursorStyle = 'cursor-default opacity-60';
                            displayLetter = 'B'; // B for Booked
                          }
                          
                          return (
                            <Tooltip key={workstationNumber}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-10 h-10 rounded flex items-center justify-center text-sm transition-all border ${cursorStyle} ${textColor} ${borderStyle}`}
                                  style={{ backgroundColor: boxColor }}
                                >
                                  {displayLetter}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="right" 
                                className="bg-slate-800 text-white p-3 max-w-xs border-slate-700"
                              >
                                <div className="space-y-1 text-xs">
                                  <div>
                                    <span className="text-slate-400">Lab:</span> {labNameOnly}
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Seat Number:</span> {workstationNumber}
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Floor:</span> {info.floor}
                                  </div>
                                  <div>
                                    <span className="text-slate-400">Office:</span> {info.office}
                                  </div>
                                  {seatStatus === 'booked' && (
                                    <div>
                                      <span className="text-slate-400">Division:</span> {owningDivision}
                                    </div>
                                  )}
                                  <div className="pt-2 border-t border-slate-600 mt-2">
                                    <Badge className={`${
                                      seatStatus === 'available' ? 'bg-slate-500' :
                                      'bg-red-500'
                                    } text-white`}>
                                      {seatStatus.toUpperCase()}
                                    </Badge>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </TooltipProvider>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">
              {!selectedOffice 
                ? 'Please select an office to view labs' 
                : !selectedFloor 
                  ? 'Please select a floor to view labs'
                  : 'No labs available for the selected office and floor'}
            </p>
          </div>
        )}

        {/* Booking Dialog */}
        {enableBooking && (
          <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Seat Booking Request</DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-2">
                  Selected desks: {selectedSeats.sort((a, b) => a - b).join(', ')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="department">Division</Label>
                  <Select 
                    value={bookingForm.department} 
                    onValueChange={(value) => setBookingForm({ ...bookingForm, department: value })}
                  >
                    <SelectTrigger id="department" className="mt-1.5">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDivisions.map(division => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Optional comments..."
                    value={bookingForm.remarks}
                    onChange={(e) => setBookingForm({ ...bookingForm, remarks: e.target.value })}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleBookingSubmit}
                  disabled={!bookingForm.department}
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bulk Request Dialog */}
        {enableBooking && (
          <Dialog open={bulkRequestDialogOpen} onOpenChange={setBulkRequestDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Bulk Workstation Request</DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-2">
                  Request multiple workstations for a division.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="numWorkstations">Number of Workstations</Label>
                  <Input
                    id="numWorkstations"
                    type="number"
                    min="1"
                    placeholder="Enter number"
                    value={bulkRequestForm.numWorkstations}
                    onChange={(e) => setBulkRequestForm({ ...bulkRequestForm, numWorkstations: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                
                <div>
                  <Label htmlFor="department">Division</Label>
                  <Select 
                    value={bulkRequestForm.department} 
                    onValueChange={(value) => setBulkRequestForm({ ...bulkRequestForm, department: value })}
                  >
                    <SelectTrigger id="department" className="mt-1.5">
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDivisions.map(division => (
                        <SelectItem key={division} value={division}>
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Optional comments..."
                    value={bulkRequestForm.remarks}
                    onChange={(e) => setBulkRequestForm({ ...bulkRequestForm, remarks: e.target.value })}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleBulkRequestSubmit}
                  disabled={!bulkRequestForm.numWorkstations || !bulkRequestForm.department}
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}