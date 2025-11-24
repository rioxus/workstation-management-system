import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, Clock, AlertCircle, Monitor, Building, MapPin, Briefcase, Filter, RefreshCw, Info } from 'lucide-react';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { SeatDistributionHeatmap } from './SeatDistributionHeatmap';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

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
  } = stats;

  // Filter states for Division table
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  
  // State for expanded divisions (now supports multiple selections)
  const [expandedDivisions, setExpandedDivisions] = useState<string[]>([]);
  
  // State for division filter
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  
  // Toggle division selection
  const toggleDivision = (divisionName: string) => {
    setExpandedDivisions(prev => 
      prev.includes(divisionName)
        ? prev.filter(d => d !== divisionName)
        : [...prev, divisionName]
    );
  };

  const statCards = [
    {
      title: 'Total Workstations',
      value: totalWorkstations,
      icon: Monitor,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Occupied',
      value: occupiedWorkstations,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Available',
      value: availableWorkstations,
      icon: Building,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Pending Requests',
      value: pendingRequests,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Dashboard Overview</h1>
        <p className="text-slate-600">
          Real-time workstation allocation and utilization metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-3xl">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Division Totals Across All Labs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              Division totals across all labs
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

              return uniqueDivisions.length > 0 && (
                <div className="flex items-center gap-2">
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
      </Card>

      {/* Seat Distribution Heatmap - Workstation Distribution Overview */}
      <SeatDistributionHeatmap 
        data={{
          floorBreakdown,
          divisionBreakdown,
          labAllocations,
          divisionRecords
        }}
        enableBooking={false}
        seatBookings={seatBookings}
      />

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRequests.slice(0, 5).map((request, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm">{request.requestorName}</p>
                  <p className="text-xs text-slate-500">
                    {request.division} • {request.shift} • {request.numWorkstations || request.numEmployees} workstations
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
      {(userRole === 'admin' || userRole === 'technical') && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <AlertCircle className="w-5 h-5" />
              {userRole === 'admin' ? 'AI-Powered Insights' : 'Technical Analytics & Equipment Insights'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {userRole === 'admin' ? (
              <>
                <p>
                  • Based on current trends, you may need <strong>15-20 additional workstations</strong> in
                  the next quarter.
                </p>
                <p>
                  • <strong>CH Office 5th Floor</strong> has the highest utilization rate at 92%. Consider
                  reallocation.
                </p>
                <p>
                  • <strong>8 workstations</strong> have been vacant for more than 30 days and could be
                  reassigned.
                </p>
                <p>
                  • Equipment shortages detected: <strong>5 monitors, 3 PCs</strong> required for pending
                  requests.
                </p>
              </>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}