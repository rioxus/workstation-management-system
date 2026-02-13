import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, Clock, AlertCircle, Monitor, Building, MapPin, Briefcase, Filter, RefreshCw, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SeatDistributionHeatmap } from './SeatDistributionHeatmap';
import { ExpandableStatCard } from './ExpandableStatCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { db } from '../lib/supabase';

interface DashboardStats {
  totalWorkstations: number;
  occupiedWorkstations: number;
  availableWorkstations: number;
  pendingRequests: number;
  totalEmployees: number;
  requestsByFloor: { floor: string; count: number }[];
  recentRequests: any[];
  utilizationRate: number;
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
  labAllocations?: any[];
  divisionRecords?: any[];
  labAssetRanges?: any[]; // Add lab asset ranges
}

interface DashboardProps {
  stats: DashboardStats;
  userRole: string;
  seatBookings?: any[]; // Add seat bookings prop
}

export function Dashboard({ stats, userRole, seatBookings = [] }: DashboardProps) {
  const {
    totalWorkstations,
    occupiedWorkstations,
    availableWorkstations,
    pendingRequests,
    totalEmployees,
    requestsByFloor,
    recentRequests,
    utilizationRate,
    floorBreakdown = [],
    divisionBreakdown = [],
    labAllocations = [],
    divisionRecords = [],
    labAssetRanges = [],
  } = stats;

  // CRITICAL FIX: Load ALL seat bookings globally (not just filtered by division)
  // This ensures that approved allocations from OTHER divisions show as "B" (booked) instead of "A" (available)
  const [allSeatBookingsGlobal, setAllSeatBookingsGlobal] = useState<any[]>([]);

  // Load ALL seat bookings from database on mount AND when seatBookings prop changes
  // This ensures the grid updates when divisions are deleted from Workstation Management
  useEffect(() => {
    loadAllSeatBookingsGlobal();
  }, [seatBookings]); // Re-load when seatBookings prop changes

  // Load ALL seat bookings (pending + approved) from ALL requests (for grid visualization)
  const loadAllSeatBookingsGlobal = async () => {
    try {
      const allSeatBookings = await db.seatBookings.getAll();

      const globalSeatBookings = allSeatBookings.map((booking: any) => ({
        labName: booking.lab_name,
        labId: booking.lab_id,
        floorId: booking.floor_id,
        seatNumber: booking.seat_number,
        division: booking.division,
        requestId: booking.request_id,
        status: booking.status,
        asset_id: booking.asset_id // CRITICAL FIX: Include Asset ID for grid display
      }));

      setAllSeatBookingsGlobal(globalSeatBookings);
    } catch (error) {
      console.error('[Dashboard] ❌ Error loading global seat bookings:', error);
    }
  };

  // Filter pending allocations for the grid visualization
  const pendingAllocations = allSeatBookingsGlobal
    .filter((booking: any) => booking.status === 'pending')
    .map((booking: any) => ({
      labName: booking.labName,
      labId: booking.labId,
      floorId: booking.floorId,
      seatNumber: booking.seatNumber,
      division: booking.division,
      status: 'pending' as const
    }));

  // Filter states for Division table
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  
  // State for expanded divisions (now supports multiple selections)
  const [expandedDivisions, setExpandedDivisions] = useState<string[]>([]);
  
  // State for division filter
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  
  // State for collapsible division breakdown section
  const [isDivisionBreakdownExpanded, setIsDivisionBreakdownExpanded] = useState(false);
  
  // State for office filter (main dashboard filter)
  // IMPORTANT: This is a COSMETIC filter for admin convenience ONLY
  // It does NOT affect system data, database queries, or manager views
  // It only pre-selects the office in the Workstation Allocations grid on the admin dashboard landing page
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>('all');
  
  // Toggle division selection
  const toggleDivision = (divisionName: string) => {
    setExpandedDivisions(prev => 
      prev.includes(divisionName)
        ? prev.filter(d => d !== divisionName)
        : [...prev, divisionName]
    );
  };

  // Calculate location-wise breakdown for expandable stat cards
  const calculateLocationBreakdown = () => {
    // Create a map to store location-wise data
    const locationMap = new Map<string, {
      total: number;
      occupied: number;
      available: number;
    }>();

    // Process floor breakdown to get location-wise data
    floorBreakdown.forEach((floor: any) => {
      // Extract location from floor name (e.g., "Commerce House - 9th Floor")
      const location = floor.floor.split(' - ')[0] || floor.floor;
      
      const existing = locationMap.get(location) || { total: 0, occupied: 0, available: 0 };
      locationMap.set(location, {
        total: existing.total + (floor.total || 0),
        occupied: existing.occupied + (floor.assigned || 0),
        available: existing.available + (floor.available || 0),
      });
    });

    return {
      totalByLocation: Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        value: data.total,
      })),
      occupiedByLocation: Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        value: data.occupied,
      })),
      availableByLocation: Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        value: data.available,
      })),
    };
  };

  const locationBreakdown = calculateLocationBreakdown();

  // Get unique offices from floor breakdown for the filter dropdown
  const uniqueOffices = useMemo(() => {
    const offices = new Set<string>();
    floorBreakdown.forEach((floor: any) => {
      const office = floor.floor.split(' - ')[0] || floor.floor;
      offices.add(office);
    });
    return Array.from(offices).sort();
  }, [floorBreakdown]);

  // Calculate filtered stats based on selected office
  const filteredStats = useMemo(() => {
    if (selectedOfficeFilter === 'all') {
      return {
        totalWorkstations,
        occupiedWorkstations,
        availableWorkstations,
      };
    }

    // Filter floor breakdown by selected office
    const filteredFloors = floorBreakdown.filter((floor: any) => {
      const office = floor.floor.split(' - ')[0] || floor.floor;
      return office === selectedOfficeFilter;
    });

    // Calculate totals for filtered office
    const total = filteredFloors.reduce((sum, floor) => sum + (floor.total || 0), 0);
    const occupied = filteredFloors.reduce((sum, floor) => sum + (floor.assigned || 0), 0);
    const available = filteredFloors.reduce((sum, floor) => sum + (floor.available || 0), 0);

    return {
      totalWorkstations: total,
      occupiedWorkstations: occupied,
      availableWorkstations: available,
    };
  }, [selectedOfficeFilter, floorBreakdown, totalWorkstations, occupiedWorkstations, availableWorkstations]);

  const statCards = [
    {
      title: 'Total Workstations',
      value: filteredStats.totalWorkstations,
      icon: Monitor,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      locationBreakdown: locationBreakdown.totalByLocation,
    },
    {
      title: 'Occupied',
      value: filteredStats.occupiedWorkstations,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      locationBreakdown: locationBreakdown.occupiedByLocation,
    },
    {
      title: 'Available',
      value: filteredStats.availableWorkstations,
      icon: Building,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      locationBreakdown: locationBreakdown.availableByLocation,
    },
    {
      title: 'Pending Requests',
      value: pendingRequests,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      locationBreakdown: [], // No location breakdown for pending requests
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Office Filter */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Dashboard Overview</h1>
          <p className="text-slate-600">
            Real-time workstation allocation and utilization metrics
          </p>
        </div>
        {uniqueOffices.length > 0 && (
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-slate-500" />
            <Select value={selectedOfficeFilter} onValueChange={setSelectedOfficeFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filter by office" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {uniqueOffices.map((office) => (
                  <SelectItem key={office} value={office}>
                    {office}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <ExpandableStatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            bgColor={stat.bgColor}
            locationBreakdown={stat.locationBreakdown}
          />
        ))}
      </div>

      {/* Division Breakdown */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsDivisionBreakdownExpanded(!isDivisionBreakdownExpanded)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isDivisionBreakdownExpanded ? (
                <ChevronDown className="w-5 h-5 text-blue-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-blue-600" />
              )}
              <Briefcase className="w-5 h-5 text-blue-600" />
              Division breakdown
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="p-1 rounded-full hover:bg-blue-100 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
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
            </CardTitle>
            {(() => {
              // Get unique divisions for filter
              const divisionDetails = divisionRecords.map((record: any) => ({
                division: record.division,
                office: record.floors?.offices?.office_name || 'Unknown',
                floor: record.floors?.floor_name || 'Unknown',
                lab: record.lab_name,
                bookedSeats: record.in_use || 0,
              }));
              
              const uniqueDivisions = Array.from(
                new Set(divisionDetails.map(d => d.division))
              ).sort();

              return uniqueDivisions.length > 0 && isDivisionBreakdownExpanded && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Filter className="w-4 h-4 text-slate-500" />
                  <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Divisions</SelectItem>
                      {uniqueDivisions.map((div) => (
                        <SelectItem key={div} value={div}>
                          {div}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
          </div>
        </CardHeader>
        {isDivisionBreakdownExpanded && (
          <CardContent>
            {(() => {
              // Create detailed division breakdown by office, floor, and lab
              const divisionDetails = divisionRecords
                .map((record: any) => ({
                  division: record.division,
                  office: record.floors?.offices?.office_name || 'Unknown',
                  floor: record.floors?.floor_name || 'Unknown',
                  lab: record.lab_name,
                  bookedSeats: record.in_use || 0,
                }))
                .sort((a, b) => {
                  // Sort by division, then office, then floor, then lab
                  if (a.division !== b.division) return a.division.localeCompare(b.division);
                  if (a.office !== b.office) return a.office.localeCompare(b.office);
                  if (a.floor !== b.floor) return a.floor.localeCompare(b.floor);
                  return a.lab.localeCompare(b.lab);
                });

              // Group by division
              const divisionGroups = new Map<string, typeof divisionDetails>();
              divisionDetails.forEach(detail => {
                const existing = divisionGroups.get(detail.division) || [];
                divisionGroups.set(detail.division, [...existing, detail]);
              });

              // Calculate totals per division
              const divisionTotals = new Map<string, number>();
              divisionDetails.forEach(detail => {
                const current = divisionTotals.get(detail.division) || 0;
                divisionTotals.set(detail.division, current + detail.bookedSeats);
              });

              // Filter divisions based on selection
              const filteredDivisions = Array.from(divisionGroups.entries()).filter(
                ([divisionName]) => divisionFilter === 'all' || divisionName === divisionFilter
              );

              return divisionDetails.length > 0 ? (
                <div className="space-y-4">
                  {/* Division Cards Grid */}
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                    {filteredDivisions.map(([divisionName, locations], idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleDivision(divisionName)}
                        className={`cursor-pointer p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                          expandedDivisions.includes(divisionName)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center gap-1">
                          <Briefcase className={`w-4 h-4 ${
                            expandedDivisions.includes(divisionName) ? 'text-blue-600' : 'text-slate-500'
                          }`} />
                          <div className="w-full">
                            <p className="text-xs line-clamp-2 min-h-[2rem] leading-tight">{divisionName}</p>
                            <div className={`mt-1 px-1.5 py-0.5 rounded text-center ${
                              expandedDivisions.includes(divisionName) ? 'bg-blue-600' : 'bg-blue-100'
                            }`}>
                              <p className={`text-xs ${
                                expandedDivisions.includes(divisionName) ? 'text-white' : 'text-blue-900'
                              }`}>
                                <strong className="text-sm">{divisionTotals.get(divisionName)}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded Division Details */}
                  {expandedDivisions.map(divisionName => (
                    divisionGroups.has(divisionName) && (
                      <div key={divisionName} className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                            {divisionName} - Detailed Breakdown
                          </h3>
                          <button
                            onClick={() => setExpandedDivisions(prev => prev.filter(d => d !== divisionName))}
                            className="text-sm text-slate-500 hover:text-slate-700"
                          >
                            Close ✕
                          </button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white">
                              <TableHead>Office Location</TableHead>
                              <TableHead>Floor</TableHead>
                              <TableHead>Lab</TableHead>
                              <TableHead className="text-center">Booked Seats</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {divisionGroups.get(divisionName)?.map((location, locIdx) => (
                              <TableRow key={locIdx} className="bg-white">
                                <TableCell className="text-slate-700">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {location.office}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                  <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-slate-400" />
                                    {location.floor}
                                  </div>
                                </TableCell>
                                <TableCell className="text-slate-600">{location.lab}</TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant={location.bookedSeats > 0 ? "default" : "outline"}
                                    className={location.bookedSeats > 0 ? 'bg-orange-500 hover:bg-orange-600' : ''}
                                  >
                                    {location.bookedSeats}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">
                  No division data available
                </p>
              );
            })()}
          </CardContent>
        )}
      </Card>

      {/* Seat Distribution Heatmap - Workstation Distribution Overview */}
      <SeatDistributionHeatmap 
        data={{
          floorBreakdown,
          divisionBreakdown,
          labAllocations,
          divisionRecords,
          labAssetRanges // Add lab asset ranges
        }}
        enableBooking={false}
        seatBookings={allSeatBookingsGlobal}
        pendingAllocations={pendingAllocations}
        lockedOffice={selectedOfficeFilter !== 'all' ? selectedOfficeFilter : undefined}
      />

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRequests
              .filter((request) => {
                // MANAGER VIEW: Now includes 'partially_allocated' status
                // Managers can see pending, approved, rejected, and partially_allocated requests
                if (userRole === 'manager') {
                  return request.status === 'approved' || request.status === 'rejected' || request.status === 'pending' || request.status === 'partially_allocated';
                }
                // ADMIN VIEW: Show all statuses
                return true;
              })
              .slice(0, 5)
              .map((request, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="space-y-2">
                  <p className="text-sm">{request.requestorName}</p>
                  <p className="text-xs text-slate-500">
                    {request.division} • {request.numWorkstations || request.numEmployees} workstations
                  </p>
                </div>
                <Badge
                  variant={
                    request.status === 'approved'
                      ? 'default'
                      : request.status === 'pending'
                      ? 'secondary'
                      : 'destructive'
                  }
                >
                  {request.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights (if admin or technical) */}
      {userRole === 'technical' && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <AlertCircle className="w-5 h-5" />
              Technical Analytics & Equipment Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p>
              • Equipment shortage alert: <strong>5 monitors, 3 PCs, 2 headsets</strong> needed for approved requests.
            </p>
            <p>
              • <strong>CH Office 9th Floor</strong> requires immediate setup for 8 new workstations.
            </p>
            <p>
              • <strong>12 workstations</strong> scheduled for maintenance this week - plan accordingly.
            </p>
            <p>
              • Network capacity at <strong>Gurukul Office</strong> may need upgrading for new allocations.
            </p>
            <p>
              • Optimal setup time: <strong>Tuesday-Thursday, 9 AM - 11 AM</strong> (lowest user activity).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}