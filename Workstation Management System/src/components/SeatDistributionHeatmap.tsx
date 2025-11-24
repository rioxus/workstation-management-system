import { useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { BarChart3, Calendar, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
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
import { toast } from 'sonner';

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
}

interface SeatDistributionHeatmapProps {
  data: WorkstationData;
  enableBooking?: boolean;
  onBookingSubmit?: (request: any) => void;
  userInfo?: any;
  seatBookings?: any[]; // Add seat bookings prop
  onRefreshData?: () => void; // Add refresh handler
  userMode?: boolean; // Add user mode prop to simplify interface
}

interface DivisionData {
  division: string;
  seats: number;
  color: string;
}

// Seat status type
type SeatStatus = 'available' | 'booked' | 'pending';

export function SeatDistributionHeatmap({ data, enableBooking = true, onBookingSubmit, userInfo, seatBookings = [], onRefreshData, userMode = false }: SeatDistributionHeatmapProps) {
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedLab, setSelectedLab] = useState<string>('all');
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    fullName: '',
    department: '',
    shift: 'General',
    bookingDate: '',
    remarks: ''
  });

  // NOTE: This component displays live data from the Workstation Data tab (lab_allocations table)
  // Data updates automatically when admin approves/rejects requests via dataService.approveRequest()
  // The division-wise usage (divisionRecords) shows current seat occupancy across all divisions

  // Define color palette for divisions - highly contrasting colors
  const divisionColors = [
    '#EF4444', // red
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
    '#06B6D4', // cyan
    '#6366F1', // indigo
    '#84CC16', // lime
    '#F43F5E', // rose
  ];

  // Process data to extract offices, floors, and labs
  const { offices, floors, labs, labInfo, divisionUtilization, allDivisions } = useMemo(() => {
    const { labAllocations = [], divisionRecords = [] } = data;
    
    if (!labAllocations.length) {
      return {
        offices: [],
        floors: [],
        labs: [],
        labInfo: new Map<string, { total: number; office: string; floor: string; inUse: number; vacant: number }>(),
        divisionUtilization: [],
        allDivisions: [],
      };
    }

    // Create a map of lab info
    const labInfoMap = new Map<string, { total: number; office: string; floor: string; inUse: number; vacant: number }>();
    const officeSet = new Set<string>();
    const floorsByOffice = new Map<string, Set<string>>();
    const labsByFloor = new Map<string, Set<string>>();
    const divisionsSet = new Set<string>(); // Collect all unique divisions

    // First, populate from lab allocations (records without division - these are the "Floor & Lab Allocation Management" entries)
    labAllocations.forEach((lab) => {
      if (lab.floors) {
        const officeName = lab.floors.offices?.office_name || 'Unknown Office';
        const floorName = lab.floors.floor_name || 'Unknown Floor';
        const labName = lab.lab_name;
        const total = lab.total_workstations || 0;
        
        officeSet.add(officeName);
        
        if (!floorsByOffice.has(officeName)) {
          floorsByOffice.set(officeName, new Set());
        }
        floorsByOffice.get(officeName)!.add(floorName);
        
        if (!labsByFloor.has(floorName)) {
          labsByFloor.set(floorName, new Set());
        }
        labsByFloor.get(floorName)!.add(labName);
        
        // Use a unique key combining office, floor, and lab name to prevent duplicates
        const uniqueKey = `${officeName}|${floorName}|${labName}`;
        
        // Only set if not already exists (avoid overwriting)
        if (!labInfoMap.has(uniqueKey)) {
          labInfoMap.set(uniqueKey, {
            total,
            office: officeName,
            floor: floorName,
            inUse: 0,
            vacant: total,
          });
        }
      }
    });
    
    // Also add any labs from division records that might not have allocation records
    // This ensures we show all labs even if they only exist in division assignments
    divisionRecords.forEach((record) => {
      if (record.floors) {
        const officeName = record.floors.offices?.office_name || 'Unknown Office';
        const floorName = record.floors.floor_name || 'Unknown Floor';
        const labName = record.lab_name;
        const total = record.total_workstations || 0;
        
        officeSet.add(officeName);
        
        if (!floorsByOffice.has(officeName)) {
          floorsByOffice.set(officeName, new Set());
        }
        floorsByOffice.get(officeName)!.add(floorName);
        
        if (!labsByFloor.has(floorName)) {
          labsByFloor.set(floorName, new Set());
        }
        labsByFloor.get(floorName)!.add(labName);
        
        const uniqueKey = `${officeName}|${floorName}|${labName}`;
        
        // Only set if not already exists from lab allocations
        if (!labInfoMap.has(uniqueKey)) {
          labInfoMap.set(uniqueKey, {
            total,
            office: officeName,
            floor: floorName,
            inUse: 0,
            vacant: total,
          });
        }
      }
    });

    // Calculate in-use workstations for each lab and collect divisions
    divisionRecords.forEach((record) => {
      if (record.floors) {
        const officeName = record.floors.offices?.office_name || 'Unknown Office';
        const floorName = record.floors.floor_name || 'Unknown Floor';
        const labName = record.lab_name;
        const inUse = record.in_use || 0;
        const division = record.division;
        
        if (division) {
          divisionsSet.add(division); // Collect all divisions
        }
        
        const uniqueKey = `${officeName}|${floorName}|${labName}`;
        
        if (labInfoMap.has(uniqueKey)) {
          const lab = labInfoMap.get(uniqueKey)!;
          lab.inUse += inUse;
          lab.vacant = Math.max(0, lab.total - lab.inUse);
        }
      }
    });

    const officeList = Array.from(officeSet).sort();
    
    // Filter floors based on selected office
    let floorList: string[] = [];
    if (selectedOffice === 'all') {
      floorList = Array.from(new Set(Array.from(floorsByOffice.values()).flatMap(s => Array.from(s)))).sort();
    } else {
      floorList = Array.from(floorsByOffice.get(selectedOffice) || []).sort();
    }

    // Filter labs based on selected office and floor
    let labList: string[] = [];
    if (selectedFloor === 'all') {
      if (selectedOffice === 'all') {
        labList = Array.from(labInfoMap.keys()).sort();
      } else {
        // All labs in selected office (across all floors in that office)
        labList = Array.from(labInfoMap.entries())
          .filter(([_, info]) => info.office === selectedOffice)
          .map(([name, _]) => name)
          .sort();
      }
    } else {
      // Labs in selected floor ONLY - this ensures no duplicates across floors
      // Filter by BOTH office (if specified) and floor to get unique labs
      labList = Array.from(labInfoMap.entries())
        .filter(([_, info]) => {
          const floorMatches = info.floor === selectedFloor;
          const officeMatches = selectedOffice === 'all' || info.office === selectedOffice;
          return floorMatches && officeMatches;
        })
        .map(([name, _]) => name)
        .sort();
    }

    // Get division utilization for selected lab
    let divisionData: DivisionData[] = [];
    if (selectedLab !== 'all') {
      // Extract office, floor, and lab name from the composite key (format: "office|floor|labName")
      const [officeName, floorName, labName] = selectedLab.split('|');
      
      // Filter by office, floor, AND lab name to ensure we get the correct lab
      const divisionsInLab = divisionRecords.filter(record => {
        if (!record.floors) return false;
        
        const recordOffice = record.floors.offices?.office_name || '';
        const recordFloor = record.floors.floor_name || '';
        const recordLab = record.lab_name;
        
        return recordOffice === officeName && 
               recordFloor === floorName && 
               recordLab === labName;
      });
      
      const divisionMap = new Map<string, number>();
      
      divisionsInLab.forEach(record => {
        const division = record.division;
        const seats = record.in_use || 0;
        
        if (division && seats > 0) {
          divisionMap.set(division, (divisionMap.get(division) || 0) + seats);
        }
      });

      divisionData = Array.from(divisionMap.entries())
        .map(([division, seats], index) => ({
          division,
          seats,
          color: divisionColors[index % divisionColors.length],
        }))
        .sort((a, b) => b.seats - a.seats); // Sort by seats descending
    }

    return {
      offices: officeList,
      floors: floorList,
      labs: labList,
      labInfo: labInfoMap,
      divisionUtilization: divisionData,
      allDivisions: Array.from(divisionsSet).sort(),
    };
  }, [data, selectedOffice, selectedFloor, selectedLab]);

  // Get current lab info
  const currentLabInfo = selectedLab !== 'all' ? labInfo.get(selectedLab) : null;

  // Extract lab name from composite key (format: "office|floor|labName")
  const currentLabName = selectedLab !== 'all' ? selectedLab.split('|')[2] : null;

  // Calculate pending seat bookings for selected lab
  const pendingSeatsCount = selectedLab !== 'all' && currentLabName
    ? seatBookings?.filter(
        booking => 
          booking.lab_name === currentLabName && 
          booking.status === 'pending'
      ).length || 0
    : 0;

  // Calculate available seats (seats not yet assigned to any division OR pending booking)
  const availableSeatsToAssign = currentLabInfo 
    ? currentLabInfo.total - divisionUtilization.reduce((sum, d) => sum + d.seats, 0) - pendingSeatsCount
    : 0;

  // Calculate max seats for bar chart scaling
  const maxSeats = divisionUtilization.length > 0 
    ? Math.max(...divisionUtilization.map(d => d.seats))
    : 0;

  // Handle seat selection
  const handleSeatSelection = (seatNumber: number, seatStatusInfo: { status: 'available' | 'booked' | 'pending', division?: string, color?: string }) => {
    // Don't allow selection of booked or pending seats
    if (seatStatusInfo.status === 'booked' || seatStatusInfo.status === 'pending') {
      toast.error(`Seat ${seatNumber} is ${seatStatusInfo.status === 'booked' ? 'already booked' : 'pending approval'} and cannot be selected.`);
      return;
    }

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter(seat => seat !== seatNumber));
    } else {
      setSelectedSeats([...selectedSeats, seatNumber]);
    }
  };

  // Function to determine seat status based on division assignments and bookings
  const getSeatStatus = (workstationNumber: number): { status: 'available' | 'booked' | 'pending', division?: string, color?: string } => {
    // First check if there's a PENDING seat booking for this specific seat number
    // Match by lab name (extracted from composite key)
    const pendingBooking = seatBookings?.find(
      b => b.lab_name === currentLabName && 
           b.seat_number === workstationNumber &&
           b.status === 'pending'
    );
    
    if (pendingBooking) {
      return { status: 'pending', division: pendingBooking.division };
    }
    
    // Then check if this seat is assigned to any division (from labs table in_use)
    // This represents APPROVED bookings shown sequentially
    let currentCount = 0;
    for (const division of divisionUtilization) {
      if (workstationNumber > currentCount && workstationNumber <= currentCount + division.seats) {
        return { status: 'booked', division: division.division, color: division.color };
      }
      currentCount += division.seats;
    }
    
    return { status: 'available' };
  };

  // Handle opening booking dialog
  const handleOpenBookingDialog = () => {
    if (selectedLab === 'all') {
      toast.error('Please select a specific lab to book workstations.');
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to book.');
      return;
    }
    setBookingDialogOpen(true);
  };

  // Handle booking form submission
  const handleBookingSubmit = () => {
    if (selectedSeats.length === 0) {
      toast.error('Please select at least one seat to book.');
      return;
    }

    // Create booking request with proper data structure
    const bookingDetails = {
      labName: selectedLab,
      seats: selectedSeats,
      requestorName: bookingForm.fullName,
      requestorId: userInfo?.employeeId || 'TEMP001',
      division: bookingForm.department,
      numWorkstations: selectedSeats.length,
      location: currentLabInfo?.office || 'Commerce House',
      floor: currentLabInfo?.floor || 'Floor 9',
      shift: bookingForm.shift,
      bookingDate: bookingForm.bookingDate,
      justification: bookingForm.remarks || 'Seat booking request',
      requiresPC: false,
      requiresMonitor: false,
    };

    // Show success toast
    toast.success(`Successfully submitted booking request for ${selectedSeats.length} seat(s) in ${selectedLab}.`);
    
    // Close dialog and reset form
    setBookingDialogOpen(false);
    setSelectedSeats([]);
    setBookingForm({
      fullName: '',
      department: '',
      shift: 'General',
      bookingDate: '',
      remarks: ''
    });

    // Call the onBookingSubmit callback if provided
    if (onBookingSubmit) {
      onBookingSubmit(bookingDetails);
    }
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-blue-100 transition-colors">
                      <Info className="w-4 h-4 text-blue-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">
                      📊 Live data from Workstation Data tab • Updates automatically when requests are approved/rejected
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Lab Info Display - Show Capacity, Booked, Pending, and Available */}
            {currentLabInfo && selectedLab !== 'all' && (
              <div className="text-slate-700 mb-4">
                <span className="text-sm">
                  {currentLabInfo.floor} - {currentLabName} — Capacity: <strong>{currentLabInfo.total}</strong> | Booked: <strong>{currentLabInfo.inUse}</strong> | Pending: <strong>{pendingSeatsCount}</strong> | Available: <strong>{availableSeatsToAssign}</strong>
                </span>
              </div>
            )}
          </div>
          
          {/* Request to Book Button */}
          {enableBooking && selectedLab !== 'all' && currentLabInfo && (
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
        
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="office-filter" className="text-sm">Office:</Label>
            <Select value={selectedOffice} onValueChange={(value) => {
              setSelectedOffice(value);
              setSelectedFloor('all');
              setSelectedLab('all');
            }}>
              <SelectTrigger id="office-filter" className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {offices.map(office => (
                  <SelectItem key={office} value={office}>
                    {office}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label htmlFor="floor-filter" className="text-sm">Floor:</Label>
            <Select value={selectedFloor} onValueChange={(value) => {
              setSelectedFloor(value);
              setSelectedLab('all');
            }}>
              <SelectTrigger id="floor-filter" className="w-40 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map(floor => (
                  <SelectItem key={floor} value={floor}>
                    {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="lab-filter" className="text-sm">Lab:</Label>
            <Select value={selectedLab} onValueChange={setSelectedLab}>
              <SelectTrigger id="lab-filter" className="w-52 h-8">
                <SelectValue placeholder="Select a lab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Select a lab</SelectItem>
                {labs.map(lab => {
                  const info = labInfo.get(lab);
                  // Extract just the lab name from composite key for display
                  const labName = lab.split('|')[2] || lab;
                  return (
                    <SelectItem key={lab} value={lab}>
                      {labName} (Capacity: {info?.total || 0})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Show content based on lab selection */}
        {selectedLab === 'all' ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">Please select a lab to view division utilization</p>
          </div>
        ) : currentLabInfo ? (
          <div>
            {/* Division Utilization Table - only show if there are divisions assigned */}
            {divisionUtilization.length > 0 && (
              <>
                <h5 className="text-sm mb-3 text-slate-700">Division Utilization</h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-sm text-slate-700">Division</th>
                        <th className="text-right p-3 text-sm text-slate-700">Seats Available</th>
                        <th className="text-right p-3 text-sm text-slate-700">Seats Assigned</th>
                        <th className="text-left p-3 text-sm text-slate-700">Color</th>
                        <th className="text-left p-3 text-sm text-slate-700 w-1/2">Seat Distribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {divisionUtilization.map((division, index) => (
                        <tr key={division.division} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-sm text-slate-700">{division.division}</td>
                          <td className="p-3 text-sm text-slate-700 text-right">{availableSeatsToAssign}</td>
                          <td className="p-3 text-sm text-slate-700 text-right">{division.seats}</td>
                          <td className="p-3">
                            <div 
                              className="w-8 h-6 rounded border border-slate-300"
                              style={{ backgroundColor: division.color }}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                              <div 
                                className="h-full transition-all duration-300"
                                style={{ 
                                  width: `${maxSeats > 0 ? (division.seats / maxSeats) * 100 : 0}%`,
                                  backgroundColor: division.color 
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Workstation Grid Visualization - Always show when lab is selected */}
            <div className={divisionUtilization.length > 0 ? 'mt-0' : 'mt-0'}>
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm text-slate-700">Workstation Layout</h5>
                {enableBooking && (
                  <div className="flex items-center gap-3 text-xs">
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
                  </div>
                )}
              </div>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: currentLabInfo.total }, (_, index) => {
                      const workstationNumber = index + 1;
                      const seatStatus = getSeatStatus(workstationNumber);
                      const isSelected = selectedSeats.includes(workstationNumber);
                      
                      // Determine which division owns this seat based on sequential allocation
                      let owningDivision = '-';
                      let divisionColor = '#EF4444'; // Default red for booked
                      let currentCount = 0;
                      
                      // Only assign division if the seat is within the assigned range
                      for (const division of divisionUtilization) {
                        if (workstationNumber > currentCount && workstationNumber <= currentCount + division.seats) {
                          owningDivision = division.division;
                          divisionColor = division.color; // Use division's assigned color
                          break;
                        }
                        currentCount += division.seats;
                      }
                      
                      // Determine color based on status and selection
                      let boxColor = '#9CA3AF'; // Default gray for available
                      let textColor = 'text-white';
                      let cursorStyle = 'cursor-pointer';
                      let borderStyle = 'border-slate-300';
                      
                      if (seatStatus.status === 'booked') {
                        boxColor = divisionColor; // Use division's color for booked seats
                        cursorStyle = 'cursor-not-allowed opacity-60';
                      } else if (seatStatus.status === 'pending') {
                        boxColor = '#F59E0B'; // Amber for pending
                        cursorStyle = 'cursor-not-allowed opacity-60';
                      } else if (isSelected) {
                        boxColor = '#10B981'; // Green for selected
                        borderStyle = 'border-green-700 ring-2 ring-green-300';
                      }
                      
                      // Workstation details for tooltip
                      const workstationDetails = {
                        lab: selectedLab,
                        division: owningDivision,
                        hod: seatStatus.status === 'booked' ? 'Mr. Patel' : '-',
                        projectManager: seatStatus.status === 'booked' ? 'Alice Johnson' : '-',
                        seat: workstationNumber,
                        dateOfBooking: seatStatus.status === 'booked' ? '2025-11-12' : '-',
                        status: seatStatus.status,
                      };
                      
                      return (
                        <Tooltip key={workstationNumber}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-10 h-10 rounded flex items-center justify-center text-sm transition-all hover:scale-110 hover:shadow-md border ${cursorStyle} ${textColor} ${borderStyle}`}
                              style={{ backgroundColor: boxColor }}
                              onClick={() => enableBooking && handleSeatSelection(workstationNumber, seatStatus)}
                            >
                              {workstationNumber}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className="bg-slate-800 text-white p-3 max-w-xs border-slate-700"
                          >
                            <div className="space-y-1 text-xs">
                              <div>
                                <span className="text-slate-400">Lab:</span> {workstationDetails.lab}
                              </div>
                              <div>
                                <span className="text-slate-400">Division:</span> {workstationDetails.division}
                              </div>
                              <div>
                                <span className="text-slate-400">HOD:</span> {workstationDetails.hod}
                              </div>
                              <div>
                                <span className="text-slate-400">Project Manager:</span> {workstationDetails.projectManager}
                              </div>
                              <div>
                                <span className="text-slate-400">Seat:</span> {workstationDetails.seat}
                              </div>
                              <div>
                                <span className="text-slate-400">Date of booking:</span> {workstationDetails.dateOfBooking}
                              </div>
                              <div className="pt-2 border-t border-slate-600 mt-2">
                                <Badge className={`${
                                  seatStatus.status === 'available' ? 'bg-slate-500' :
                                  seatStatus.status === 'booked' ? 'bg-red-500' :
                                  'bg-amber-500'
                                } text-white`}>
                                  {seatStatus.status.toUpperCase()}
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
            </div>
          </div>
        ) : null}

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
                  <Label htmlFor="bookingDate">Booking Date</Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingForm.bookingDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                    className="mt-1.5"
                  />
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
                  disabled={!bookingForm.fullName || !bookingForm.department || !bookingForm.bookingDate}
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