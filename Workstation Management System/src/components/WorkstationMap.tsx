import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Monitor, 
  Layers, 
  Building2, 
  Users, 
  CheckCircle2, 
  Circle,
  ZoomIn,
  Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
import { ScrollArea } from './ui/scroll-area';

interface WorkstationData {
  id: string;
  assetId: string; // Format: Department/WS/Floor/Number (e.g., Admin/WS/F-5/001)
  department: string;
  floor: string;
  lab: string;
  number: string;
  status: 'active' | 'available' | 'maintenance' | 'reserved';
  assignedTo?: string;
  shift?: string;
  hasPC?: boolean;
  hasMonitor?: boolean;
}

interface WorkstationMapProps {
  workstations: WorkstationData[];
}

// Department color mapping
const DEPARTMENT_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  'Admin': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-700', label: 'bg-purple-500' },
  'HR': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', label: 'bg-pink-500' },
  'Tech': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700', label: 'bg-blue-500' },
  'Engineering': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700', label: 'bg-cyan-500' },
  'BPM': { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-700', label: 'bg-teal-500' },
  'Sales': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700', label: 'bg-orange-500' },
  'Marketing': { bg: 'bg-rose-100', border: 'border-rose-300', text: 'text-rose-700', label: 'bg-rose-500' },
  'Finance': { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', label: 'bg-emerald-500' },
  'Operations': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', label: 'bg-amber-500' },
  'IT Support': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-700', label: 'bg-indigo-500' },
  'QA': { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700', label: 'bg-violet-500' },
  'Default': { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', label: 'bg-slate-500' },
};

const getDepartmentColor = (department: string) => {
  return DEPARTMENT_COLORS[department] || DEPARTMENT_COLORS['Default'];
};

export function WorkstationMap({ workstations }: WorkstationMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [highlightedDepartment, setHighlightedDepartment] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Process workstation data
  const { floors, departments, floorData, summaryStats } = useMemo(() => {
    // Extract unique floors and departments
    const floorSet = new Set<string>();
    const departmentSet = new Set<string>();
    
    workstations.forEach(ws => {
      floorSet.add(ws.floor);
      departmentSet.add(ws.department);
    });

    const floorList = Array.from(floorSet).sort();
    const departmentList = Array.from(departmentSet).sort();

    // Organize workstations by floor and department
    const floorDataMap = new Map<string, Map<string, WorkstationData[]>>();
    
    workstations.forEach(ws => {
      if (!floorDataMap.has(ws.floor)) {
        floorDataMap.set(ws.floor, new Map());
      }
      const deptMap = floorDataMap.get(ws.floor)!;
      if (!deptMap.has(ws.department)) {
        deptMap.set(ws.department, []);
      }
      deptMap.get(ws.department)!.push(ws);
    });

    // Calculate summary statistics
    const totalSystems = workstations.length;
    const activeSystems = workstations.filter(ws => ws.status === 'active').length;
    const unassignedSystems = workstations.filter(ws => ws.status === 'available').length;
    
    // Calculate departments per floor
    const departmentsPerFloor = new Map<string, number>();
    floorDataMap.forEach((deptMap, floor) => {
      departmentsPerFloor.set(floor, deptMap.size);
    });

    return {
      floors: floorList,
      departments: departmentList,
      floorData: floorDataMap,
      summaryStats: {
        totalSystems,
        activeSystems,
        unassignedSystems,
        departmentsPerFloor,
      },
    };
  }, [workstations]);

  // Filter workstations based on selected filters
  const filteredFloorData = useMemo(() => {
    const filtered = new Map<string, Map<string, WorkstationData[]>>();
    
    floorData.forEach((deptMap, floor) => {
      if (selectedFloor !== 'all' && floor !== selectedFloor) return;
      
      const filteredDeptMap = new Map<string, WorkstationData[]>();
      deptMap.forEach((workstations, dept) => {
        if (selectedDepartment !== 'all' && dept !== selectedDepartment) return;
        filteredDeptMap.set(dept, workstations);
      });
      
      if (filteredDeptMap.size > 0) {
        filtered.set(floor, filteredDeptMap);
      }
    });
    
    return filtered;
  }, [floorData, selectedFloor, selectedDepartment]);

  // Get workstation status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case 'available':
        return <Circle className="w-3 h-3 text-slate-400" />;
      case 'maintenance':
        return <Circle className="w-3 h-3 text-amber-600" />;
      case 'reserved':
        return <Circle className="w-3 h-3 text-blue-600" />;
      default:
        return <Circle className="w-3 h-3 text-slate-400" />;
    }
  };

  // Get department summary for a floor
  const getDepartmentSummary = (floor: string) => {
    const deptMap = floorData.get(floor);
    if (!deptMap) return [];
    
    return Array.from(deptMap.entries()).map(([dept, workstations]) => ({
      department: dept,
      total: workstations.length,
      active: workstations.filter(ws => ws.status === 'active').length,
      available: workstations.filter(ws => ws.status === 'available').length,
    }));
  };

  if (workstations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl mb-2">Workstation Map – Floor Allocation Overview</h1>
            <p className="text-slate-600">
              Visual representation of workstation allocation across all floors and departments
            </p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Building2 className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl mb-2 text-slate-700">No Workstation Data Available</h3>
              <p className="text-slate-500">
                Add workstations in the system to view the floor allocation map
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-2">Workstation Map – Floor Allocation Overview</h1>
          <p className="text-slate-600">
            Visual representation of workstation allocation across all floors and departments
          </p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-slate-200 hover:bg-slate-100 transition-colors">
              <Info className="w-5 h-5 text-slate-600" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-slate-900">Map Guide</h4>
              <div className="space-y-1.5 text-xs text-slate-700">
                <p>• Asset ID Format: Department/WS/Floor/Number</p>
                <p>• Each colored zone represents a department</p>
                <p>• Click on department zones to highlight them</p>
                <p>• Filter by floor or department using the controls</p>
                <p>• Workstation boxes show the last 3 digits of the ID</p>
                <p>• Green checkmark = Active | Gray circle = Available</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Systems Assigned</p>
                <p className="text-3xl">{summaryStats.totalSystems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Active Systems</p>
                <p className="text-3xl text-green-600">{summaryStats.activeSystems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Unassigned Systems</p>
                <p className="text-3xl text-slate-600">{summaryStats.unassignedSystems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <Circle className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Departments</p>
                <p className="text-3xl text-purple-600">{departments.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Floor:</label>
              <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                <SelectTrigger className="w-40 h-9">
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
              <label className="text-sm text-slate-600">Department:</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 1.5))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 transition-colors text-sm"
              >
                <ZoomIn className="w-4 h-4" />
                Zoom In
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Color Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Department Color Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {departments.map(dept => {
              const colors = getDepartmentColor(dept);
              return (
                <div
                  key={dept}
                  className="flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
                  onClick={() => setHighlightedDepartment(highlightedDepartment === dept ? null : dept)}
                >
                  <div className={`w-4 h-4 rounded ${colors.label}`}></div>
                  <span className="text-sm text-slate-700">{dept}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Floor Tabs */}
      <Tabs defaultValue={floors[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {floors.map(floor => {
            const deptCount = summaryStats.departmentsPerFloor.get(floor) || 0;
            return (
              <TabsTrigger key={floor} value={floor} className="flex flex-col gap-1">
                <span>{floor}</span>
                <span className="text-xs text-slate-500">{deptCount} depts</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {floors.map(floor => {
          const deptMap = filteredFloorData.get(floor);
          if (!deptMap) return null;

          const floorSummary = getDepartmentSummary(floor);
          const totalWorkstationsOnFloor = floorSummary.reduce((sum, s) => sum + s.total, 0);

          return (
            <TabsContent key={floor} value={floor} className="space-y-6">
              {/* Floor Header */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{floor}</h3>
                    <p className="text-sm text-slate-600">
                      {totalWorkstationsOnFloor} workstations • {deptMap.size} departments
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  {floorSummary.map(summary => {
                    const colors = getDepartmentColor(summary.department);
                    return (
                      <div key={summary.department} className="text-right">
                        <p className="text-xs text-slate-500">{summary.department}</p>
                        <p className="text-sm">
                          <span className="text-green-600">{summary.active}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{summary.total}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Department Zones */}
              <ScrollArea className="h-[600px] rounded-lg border border-slate-200 p-6 bg-slate-50">
                <div 
                  className="space-y-6"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
                >
                  {Array.from(deptMap.entries()).map(([dept, workstations]) => {
                    const colors = getDepartmentColor(dept);
                    const isHighlighted = highlightedDepartment === dept || highlightedDepartment === null;
                    
                    return (
                      <Card
                        key={dept}
                        className={`transition-all ${isHighlighted ? 'opacity-100' : 'opacity-40'} ${
                          highlightedDepartment === dept ? 'ring-2 ring-blue-500 shadow-lg' : ''
                        }`}
                        onClick={() => setHighlightedDepartment(highlightedDepartment === dept ? null : dept)}
                      >
                        <CardHeader className={`${colors.bg} ${colors.border} border-b-2`}>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colors.label}`}></div>
                              <span className={colors.text}>{dept}</span>
                            </CardTitle>
                            <Badge variant="secondary">
                              {workstations.length} workstations
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                            {workstations
                              .sort((a, b) => a.number.localeCompare(b.number))
                              .map(ws => {
                                const isActive = ws.status === 'active';
                                return (
                                  <Popover key={ws.id}>
                                    <PopoverTrigger asChild>
                                      <div
                                        className={`
                                          relative p-2 rounded-md border-2 cursor-pointer
                                          transition-all hover:scale-110 hover:shadow-md
                                          ${isActive 
                                            ? `${colors.bg} ${colors.border}` 
                                            : 'bg-white border-slate-300'
                                          }
                                        `}
                                      >
                                        <div className="flex flex-col items-center gap-1">
                                          {getStatusIcon(ws.status)}
                                          <span className={`text-xs font-semibold ${colors.text}`}>
                                            {ws.number}
                                          </span>
                                        </div>
                                        {ws.hasPC && (
                                          <Monitor className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 ${colors.text}`} />
                                        )}
                                      </div>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72">
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold text-slate-900">
                                            Workstation {ws.number}
                                          </h4>
                                          <Badge 
                                            variant={isActive ? "default" : "secondary"}
                                            className={isActive ? "bg-green-600" : ""}
                                          >
                                            {ws.status}
                                          </Badge>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Asset ID:</span>
                                            <span className="font-mono text-xs">{ws.assetId}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Department:</span>
                                            <span className={colors.text}>{ws.department}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Floor:</span>
                                            <span>{ws.floor}</span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-slate-600">Lab:</span>
                                            <span>{ws.lab}</span>
                                          </div>
                                          {ws.assignedTo && (
                                            <div className="flex justify-between">
                                              <span className="text-slate-600">Assigned To:</span>
                                              <span>{ws.assignedTo}</span>
                                            </div>
                                          )}
                                          {ws.shift && (
                                            <div className="flex justify-between">
                                              <span className="text-slate-600">Shift:</span>
                                              <span>{ws.shift}</span>
                                            </div>
                                          )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-200">
                                          <p className="text-xs text-slate-600 mb-1">Equipment:</p>
                                          <div className="flex gap-2">
                                            {ws.hasPC && (
                                              <Badge variant="outline" className="text-xs">
                                                <Monitor className="w-3 h-3 mr-1" />
                                                PC
                                              </Badge>
                                            )}
                                            {ws.hasMonitor && (
                                              <Badge variant="outline" className="text-xs">
                                                Monitor
                                              </Badge>
                                            )}
                                            {!ws.hasPC && !ws.hasMonitor && (
                                              <span className="text-xs text-slate-500">No equipment</span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                );
                              })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
