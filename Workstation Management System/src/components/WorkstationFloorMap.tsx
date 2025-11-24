import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Monitor, 
  Cpu,
  CheckCircle2, 
  Circle,
  AlertCircle,
  Power,
  Clock,
  User,
  Search,
  Filter,
  Building2,
  Grid3x3,
  List
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
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from './ui/utils';

interface WorkstationData {
  id: string;
  asset_id: string;
  floor_number: number;
  floor_name: string;
  workstation_number: string;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'offline';
  assigned_to?: string;
  assigned_employee_id?: string;
  division?: string;
  shift?: string;
  has_pc: boolean;
  has_monitor: boolean;
  has_keyboard: boolean;
  has_mouse: boolean;
  ip_address?: string;
  location_details?: string;
  notes?: string;
  assigned_date?: string;
}

interface WorkstationFloorMapProps {
  workstations: WorkstationData[];
  onWorkstationClick?: (workstation: WorkstationData) => void;
  onWorkstationUpdate?: (assetId: string, updates: Partial<WorkstationData>) => void;
}

const STATUS_CONFIG = {
  available: { 
    color: 'bg-green-500', 
    lightBg: 'bg-green-50', 
    border: 'border-green-300',
    icon: Circle, 
    label: 'Available',
    textColor: 'text-green-700'
  },
  occupied: { 
    color: 'bg-blue-500', 
    lightBg: 'bg-blue-50', 
    border: 'border-blue-300',
    icon: CheckCircle2, 
    label: 'Occupied',
    textColor: 'text-blue-700'
  },
  maintenance: { 
    color: 'bg-amber-500', 
    lightBg: 'bg-amber-50', 
    border: 'border-amber-300',
    icon: AlertCircle, 
    label: 'Maintenance',
    textColor: 'text-amber-700'
  },
  reserved: { 
    color: 'bg-purple-500', 
    lightBg: 'bg-purple-50', 
    border: 'border-purple-300',
    icon: Clock, 
    label: 'Reserved',
    textColor: 'text-purple-700'
  },
  offline: { 
    color: 'bg-slate-500', 
    lightBg: 'bg-slate-50', 
    border: 'border-slate-300',
    icon: Power, 
    label: 'Offline',
    textColor: 'text-slate-700'
  },
};

export function WorkstationFloorMap({ workstations, onWorkstationClick, onWorkstationUpdate }: WorkstationFloorMapProps) {
  const [selectedFloor, setSelectedFloor] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Group workstations by floor
  const floorGroups = useMemo(() => {
    const groups = new Map<number, WorkstationData[]>();
    
    workstations.forEach(ws => {
      if (!groups.has(ws.floor_number)) {
        groups.set(ws.floor_number, []);
      }
      groups.get(ws.floor_number)!.push(ws);
    });

    // Sort workstations within each floor
    groups.forEach(wsArray => {
      wsArray.sort((a, b) => a.workstation_number.localeCompare(b.workstation_number));
    });

    return groups;
  }, [workstations]);

  const floors = useMemo(() => {
    return Array.from(floorGroups.keys()).sort((a, b) => b - a); // Descending order
  }, [floorGroups]);

  // Filter workstations
  const filteredWorkstations = useMemo(() => {
    let filtered = workstations;

    if (selectedFloor !== 'all') {
      filtered = filtered.filter(ws => ws.floor_number === selectedFloor);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ws => ws.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ws => 
        ws.asset_id.toLowerCase().includes(query) ||
        ws.workstation_number.toLowerCase().includes(query) ||
        ws.assigned_to?.toLowerCase().includes(query) ||
        ws.division?.toLowerCase().includes(query) ||
        ws.assigned_employee_id?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [workstations, selectedFloor, statusFilter, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = workstations.length;
    const available = workstations.filter(ws => ws.status === 'available').length;
    const occupied = workstations.filter(ws => ws.status === 'occupied').length;
    const maintenance = workstations.filter(ws => ws.status === 'maintenance').length;
    const reserved = workstations.filter(ws => ws.status === 'reserved').length;
    const offline = workstations.filter(ws => ws.status === 'offline').length;
    const utilizationRate = total > 0 ? (occupied / total) * 100 : 0;

    return { total, available, occupied, maintenance, reserved, offline, utilizationRate };
  }, [workstations]);

  // Get floor range info
  const getFloorRange = (floorNum: number) => {
    const floorWS = floorGroups.get(floorNum) || [];
    if (floorWS.length === 0) return null;
    
    const numbers = floorWS.map(ws => parseInt(ws.workstation_number));
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    
    return {
      start: String(min).padStart(3, '0'),
      end: String(max).padStart(3, '0'),
      count: floorWS.length,
    };
  };

  if (workstations.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Building2 className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-xl mb-2 text-slate-700">No Workstation Data</h3>
            <p className="text-slate-500">
              No workstations have been registered yet. Add workstation ranges to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl mb-2">Workstation Map – Floor Allocation Overview</h1>
        <p className="text-slate-600">
          Visual representation of {stats.total} workstations assigned by Admin across {floors.length} floors
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 mb-1">Total</p>
                <p className="text-2xl">{stats.total}</p>
              </div>
              <Monitor className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1">Available</p>
                <p className="text-2xl text-green-700">{stats.available}</p>
              </div>
              <Circle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 mb-1">Occupied</p>
                <p className="text-2xl text-blue-700">{stats.occupied}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 mb-1">Maintenance</p>
                <p className="text-2xl text-amber-700">{stats.maintenance}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 mb-1">Reserved</p>
                <p className="text-2xl text-purple-700">{stats.reserved}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-700 mb-1">Offline</p>
                <p className="text-2xl text-slate-700">{stats.offline}</p>
              </div>
              <Power className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by Asset ID, Employee, Division..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Floor Filter */}
            <Select value={String(selectedFloor)} onValueChange={(val) => setSelectedFloor(val === 'all' ? 'all' : parseInt(val))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map(floor => (
                  <SelectItem key={floor} value={String(floor)}>
                    Floor {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 border border-slate-200 rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'grid' ? "bg-slate-200" : "hover:bg-slate-100"
                )}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-2 rounded transition-colors",
                  viewMode === 'list' ? "bg-slate-200" : "hover:bg-slate-100"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedFloor !== 'all' || statusFilter !== 'all' || searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Active filters:</span>
              <div className="flex gap-2">
                {selectedFloor !== 'all' && (
                  <Badge variant="secondary">Floor {selectedFloor}</Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge variant="secondary">{STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG].label}</Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary">Search: "{searchQuery}"</Badge>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedFloor('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="ml-auto text-sm text-blue-600 hover:text-blue-700"
              >
                Clear all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", config.color)}></div>
                  <Icon className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-700">{config.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Floor Tabs */}
      <Tabs defaultValue={String(floors[0])} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {floors.map(floor => {
            const range = getFloorRange(floor);
            return (
              <TabsTrigger key={floor} value={String(floor)} className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  <span>Floor {floor}</span>
                </div>
                {range && (
                  <span className="text-xs text-slate-500">
                    {range.start}-{range.end} ({range.count})
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {floors.map(floor => {
          const floorWorkstations = (floorGroups.get(floor) || []).filter(ws => {
            if (statusFilter !== 'all' && ws.status !== statusFilter) return false;
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return ws.asset_id.toLowerCase().includes(query) ||
                     ws.workstation_number.toLowerCase().includes(query) ||
                     ws.assigned_to?.toLowerCase().includes(query) ||
                     ws.division?.toLowerCase().includes(query);
            }
            return true;
          });

          const range = getFloorRange(floor);

          return (
            <TabsContent key={floor} value={String(floor)} className="space-y-4">
              {/* Floor Header */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl mb-1">Floor {floor}</h2>
                        {range && (
                          <p className="text-sm text-slate-600">
                            Workstations: <span className="font-mono font-semibold">Admin/WS/F-{floor}/{range.start}</span> to{' '}
                            <span className="font-mono font-semibold">Admin/WS/F-{floor}/{range.end}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl">{range?.count || 0}</p>
                      <p className="text-sm text-slate-600">workstations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Workstation Grid/List View */}
              {viewMode === 'grid' ? (
                <Card>
                  <CardContent className="p-6">
                    <ScrollArea className="h-[600px]">
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-14 2xl:grid-cols-16 gap-3">
                        {floorWorkstations.map(ws => {
                          const statusConfig = STATUS_CONFIG[ws.status];
                          const Icon = statusConfig.icon;

                          return (
                            <Popover key={ws.id}>
                              <PopoverTrigger asChild>
                                <div
                                  className={cn(
                                    "relative p-3 rounded-lg border-2 cursor-pointer transition-all hover:scale-110 hover:shadow-lg",
                                    statusConfig.lightBg,
                                    statusConfig.border
                                  )}
                                  onClick={() => onWorkstationClick?.(ws)}
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <Icon className={cn("w-5 h-5", statusConfig.textColor)} />
                                    <span className={cn("text-sm font-bold", statusConfig.textColor)}>
                                      {ws.workstation_number}
                                    </span>
                                  </div>
                                  {/* Equipment indicators */}
                                  <div className="absolute top-1 right-1 flex gap-0.5">
                                    {ws.has_pc && <Cpu className="w-2.5 h-2.5 text-slate-600" />}
                                    {ws.has_monitor && <Monitor className="w-2.5 h-2.5 text-slate-600" />}
                                  </div>
                                  {/* Assigned indicator */}
                                  {ws.status === 'occupied' && (
                                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                                      <User className="w-3 h-3 text-blue-600" />
                                    </div>
                                  )}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <WorkstationDetails workstation={ws} />
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="divide-y divide-slate-200">
                        {floorWorkstations.map(ws => {
                          const statusConfig = STATUS_CONFIG[ws.status];
                          const Icon = statusConfig.icon;

                          return (
                            <div
                              key={ws.id}
                              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                              onClick={() => onWorkstationClick?.(ws)}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-lg", statusConfig.lightBg)}>
                                  <Icon className={cn("w-5 h-5", statusConfig.textColor)} />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono font-semibold">{ws.asset_id}</span>
                                    <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-slate-600">
                                    {ws.assigned_to && (
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {ws.assigned_to}
                                      </span>
                                    )}
                                    {ws.division && <span>{ws.division}</span>}
                                    {ws.shift && <span>{ws.shift} Shift</span>}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {ws.has_pc && (
                                    <Badge variant="outline" className="text-xs">
                                      <Cpu className="w-3 h-3 mr-1" />
                                      PC
                                    </Badge>
                                  )}
                                  {ws.has_monitor && (
                                    <Badge variant="outline" className="text-xs">
                                      <Monitor className="w-3 h-3 mr-1" />
                                      Monitor
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Results Info */}
      {filteredWorkstations.length !== workstations.length && (
        <div className="text-center text-sm text-slate-600">
          Showing {filteredWorkstations.length} of {workstations.length} workstations
        </div>
      )}
    </div>
  );
}

// Workstation Details Component
function WorkstationDetails({ workstation }: { workstation: WorkstationData }) {
  const statusConfig = STATUS_CONFIG[workstation.status];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-900">Workstation {workstation.workstation_number}</h4>
        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Asset ID:</span>
          <span className="font-mono text-xs font-semibold">{workstation.asset_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Floor:</span>
          <span>{workstation.floor_name}</span>
        </div>
        {workstation.assigned_to && (
          <>
            <div className="flex justify-between">
              <span className="text-slate-600">Assigned To:</span>
              <span>{workstation.assigned_to}</span>
            </div>
            {workstation.assigned_employee_id && (
              <div className="flex justify-between">
                <span className="text-slate-600">Employee ID:</span>
                <span className="font-mono text-xs">{workstation.assigned_employee_id}</span>
              </div>
            )}
          </>
        )}
        {workstation.division && (
          <div className="flex justify-between">
            <span className="text-slate-600">Division:</span>
            <span>{workstation.division}</span>
          </div>
        )}
        {workstation.shift && (
          <div className="flex justify-between">
            <span className="text-slate-600">Shift:</span>
            <span>{workstation.shift}</span>
          </div>
        )}
        {workstation.location_details && (
          <div className="flex justify-between">
            <span className="text-slate-600">Location:</span>
            <span className="text-xs">{workstation.location_details}</span>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-600 mb-2">Equipment:</p>
        <div className="flex flex-wrap gap-2">
          {workstation.has_pc && (
            <Badge variant="outline" className="text-xs">
              <Cpu className="w-3 h-3 mr-1" />
              PC
            </Badge>
          )}
          {workstation.has_monitor && (
            <Badge variant="outline" className="text-xs">
              <Monitor className="w-3 h-3 mr-1" />
              Monitor
            </Badge>
          )}
          {workstation.has_keyboard && (
            <Badge variant="outline" className="text-xs">Keyboard</Badge>
          )}
          {workstation.has_mouse && (
            <Badge variant="outline" className="text-xs">Mouse</Badge>
          )}
        </div>
      </div>

      {workstation.ip_address && (
        <div className="pt-2 border-t border-slate-200">
          <div className="flex justify-between text-xs">
            <span className="text-slate-600">IP Address:</span>
            <span className="font-mono">{workstation.ip_address}</span>
          </div>
        </div>
      )}

      {workstation.notes && (
        <div className="pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-600 mb-1">Notes:</p>
          <p className="text-xs text-slate-700">{workstation.notes}</p>
        </div>
      )}
    </div>
  );
}
