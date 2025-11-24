import { useMemo, useState } from 'react';
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
import { toast } from 'sonner';

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
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [multiSelectCount, setMultiSelectCount] = useState<string>('');
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    fullName: '',
    department: '',
    shift: 'General',
    remarks: ''
  });

  // Process data to extract offices, floors, and labs
  const { offices, floors, labs, labInfo, allDivisions } = useMemo(() => {
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
      requestorName: bookingForm.fullName,
      requestorId: userInfo?.employeeId || 'TEMP001',
      division: bookingForm.department,
      numWorkstations: selectedSeats.length,
      location: currentLabInfo?.office || 'Commerce House',
      floor: currentLabInfo?.floor || 'Floor 9',
      shift: bookingForm.shift,
      bookingDate: bookingDate, // Auto-captured submission date
      justification: bookingForm.remarks || 'Seat booking request',
      requiresPC: false,
      requiresMonitor: false,
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
      fullName: '',
      department: '',
      shift: 'General',
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
    setBookingDialogOpen(true);
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
              <h4 className="font-medium">Workstation Allocations</h4>
            </div>
            <p className="text-sm text-slate-600">
              Select your office location and floor to view available labs and workstations.
            </p>
          </div>
          
          {/* Request to Book Button */}
          {enableBooking && selectedLab && (
            <Button 
              onClick={handleOpenBookingDialog}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              disabled={selectedSeats.length === 0}
            >
              <Calendar className="w-4 h-4" />
              Request to Book {selectedSeats.length > 0 && `(${selectedSeats.length})`}
            </Button>
          )}
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
                setSelectedSeats([]); // Clear selected seats
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
                  setSelectedSeats([]); // Clear selected seats
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
            setSelectedSeats([]); // Clear selected seats when changing labs
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
                  {/* Lab Info */}
                  <div className="mb-4 text-slate-700">
                    <span className="text-sm">
                      {info.floor} • {info.office} — Capacity: <strong>{info.total}</strong> | Booked: <strong>{info.bookedSeats}</strong> | Pending: <strong>{info.pendingSeats}</strong> | Available: <strong className="text-green-600">{availableInLab}</strong>
                    </span>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-slate-400" />
                      <span className="text-slate-600">Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span className="text-slate-600">Selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-amber-500" />
                      <span className="text-slate-600">Pending</span>
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
                          const isLabSelected = selectedLab === lab;
                          const isSelected = isLabSelected && selectedSeats.includes(workstationNumber);
                          
                          // Check pending booking
                          const pendingBooking = seatBookings?.find(
                            (b: any) => b.lab_name === labNameOnly && 
                                 b.seat_number === workstationNumber &&
                                 b.status === 'pending'
                          );
                          
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
                          
                          const seatStatus = pendingBooking ? 'pending' : isBooked ? 'booked' : 'available';
                          
                          // Determine color based on status ONLY (no division colors in user mode)
                          let boxColor = '#9CA3AF'; // Default gray for available
                          let textColor = 'text-white';
                          let cursorStyle = 'cursor-pointer';
                          let borderStyle = 'border-slate-300';
                          let displayLetter = 'A'; // A for Available
                          
                          if (seatStatus === 'booked') {
                            boxColor = '#EF4444'; // Red for booked
                            cursorStyle = 'cursor-not-allowed opacity-60';
                            displayLetter = 'B'; // B for Booked
                          } else if (seatStatus === 'pending') {
                            boxColor = '#F59E0B'; // Amber for pending
                            cursorStyle = 'cursor-not-allowed opacity-60';
                            displayLetter = 'P'; // P for Pending
                          } else if (isSelected) {
                            boxColor = '#10B981'; // Green for selected
                            borderStyle = 'border-green-700 ring-2 ring-green-300';
                            displayLetter = 'S'; // S for Selected
                          }
                          
                          return (
                            <Tooltip key={workstationNumber}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-10 h-10 rounded flex items-center justify-center text-sm transition-all hover:scale-110 hover:shadow-md border ${cursorStyle} ${textColor} ${borderStyle}`}
                                  style={{ backgroundColor: boxColor }}
                                  onClick={() => {
                                    if (enableBooking && seatStatus === 'available') {
                                      if (isSelected) {
                                        setSelectedSeats(selectedSeats.filter(seat => seat !== workstationNumber));
                                      } else {
                                        setSelectedSeats([...selectedSeats, workstationNumber]);
                                      }
                                    } else if (seatStatus !== 'available') {
                                      toast.error(`Seat ${workstationNumber} is ${seatStatus} and cannot be selected.`);
                                    }
                                  }}
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
                                      seatStatus === 'booked' ? 'bg-red-500' :
                                      'bg-amber-500'
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
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your name"
                    value={bookingForm.fullName}
                    onChange={(e) => setBookingForm({ ...bookingForm, fullName: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                
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
                      {allDivisions.map(division => (
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
                  disabled={!bookingForm.fullName || !bookingForm.department}
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