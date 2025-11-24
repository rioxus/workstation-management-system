import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Building2, 
  Monitor, 
  CheckCircle, 
  Circle,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Users
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
}

interface TreemapDistributionProps {
  data: WorkstationData;
}

interface TreemapNode {
  name: string;
  size: number;
  children?: TreemapNode[];
  office?: string;
  floor?: string;
  lab?: string;
  division?: string;
  type: 'floor' | 'lab' | 'division';
  inUse?: number;
  available?: number;
  totalWorkstations?: number;
  status?: 'active' | 'unassigned' | 'maintenance';
  colorIndex?: number;
}

// Color palettes for different floors (6 floor color families)
const FLOOR_COLOR_FAMILIES = [
  { base: '#3b82f6', light: '#93c5fd', lighter: '#dbeafe', name: 'Blue' },      // Blue
  { base: '#10b981', light: '#6ee7b7', lighter: '#d1fae5', name: 'Green' },     // Green
  { base: '#f59e0b', light: '#fbbf24', lighter: '#fef3c7', name: 'Orange' },    // Orange
  { base: '#8b5cf6', light: '#c4b5fd', lighter: '#ede9fe', name: 'Purple' },    // Purple
  { base: '#06b6d4', light: '#67e8f9', lighter: '#cffafe', name: 'Cyan' },      // Cyan
  { base: '#ec4899', light: '#f9a8d4', lighter: '#fce7f3', name: 'Pink' },      // Pink
];

const STATUS_COLORS = {
  active: '#10b981',      // Green
  unassigned: '#64748b',  // Slate
  maintenance: '#f59e0b'  // Orange
};

export function TreemapDistribution({ data }: TreemapDistributionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'unassigned' | 'maintenance'>('all');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');

  // Build hierarchical treemap data structure
  const treemapData = useMemo(() => {
    const { labAllocations = [], divisionRecords = [] } = data;
    
    // Group data by office -> floor -> lab -> division
    const officeMap = new Map<string, any>();
    
    labAllocations.forEach((labAlloc) => {
      if (!labAlloc.floors) return;
      
      const officeName = labAlloc.floors.offices?.office_name || 'Unknown Office';
      const floorName = labAlloc.floors.floor_name || 'Unknown Floor';
      const labName = labAlloc.lab_name;
      
      // Create office node if it doesn't exist
      if (!officeMap.has(officeName)) {
        officeMap.set(officeName, {
          name: officeName,
          type: 'office',
          size: 0,
          totalWorkstations: 0,
          inUse: 0,
          available: 0,
          children: []
        });
      }
      
      const officeNode = officeMap.get(officeName);
      
      // Find or create floor node
      let floorNode = officeNode.children.find((f: any) => f.name === floorName);
      if (!floorNode) {
        floorNode = {
          name: floorName,
          type: 'floor',
          office: officeName,
          size: 0,
          totalWorkstations: 0,
          inUse: 0,
          available: 0,
          children: [],
          colorIndex: officeNode.children.length % FLOOR_COLOR_FAMILIES.length
        };
        officeNode.children.push(floorNode);
      }
      
      // Find all divisions in this lab
      const divisionsInLab = divisionRecords.filter(
        (div) => div.floor_id === labAlloc.floor_id && div.lab_name === labName
      );
      
      // Calculate total in use for this lab
      const totalInUse = divisionsInLab.reduce((sum, div) => sum + (div.in_use || 0), 0);
      const totalAvailable = Math.max(0, labAlloc.total_workstations - totalInUse);
      
      // Create lab node
      const labNode: any = {
        name: labName,
        type: 'lab',
        office: officeName,
        floor: floorName,
        size: labAlloc.total_workstations,
        totalWorkstations: labAlloc.total_workstations,
        inUse: totalInUse,
        available: totalAvailable,
        children: [],
        colorIndex: floorNode.colorIndex
      };
      
      // Add division nodes if they exist
      if (divisionsInLab.length > 0) {
        divisionsInLab.forEach((div) => {
          const divInUse = div.in_use || 0;
          const divAvailable = Math.max(0, labAlloc.total_workstations - totalInUse);
          
          // Determine status
          let status: 'active' | 'unassigned' | 'maintenance' = 'unassigned';
          if (divInUse > 0) {
            status = 'active';
          }
          // You could add maintenance logic here based on your data
          
          const divNode = {
            name: div.division,
            type: 'division',
            office: officeName,
            floor: floorName,
            lab: labName,
            size: divInUse || 1, // Use at least 1 to show it
            totalWorkstations: labAlloc.total_workstations,
            inUse: divInUse,
            available: divAvailable,
            status,
            colorIndex: floorNode.colorIndex
          };
          
          labNode.children.push(divNode);
        });
      } else {
        // Lab has no divisions, add a placeholder to show the lab
        labNode.children.push({
          name: 'Unassigned',
          type: 'division',
          office: officeName,
          floor: floorName,
          lab: labName,
          size: totalAvailable || 1,
          totalWorkstations: labAlloc.total_workstations,
          inUse: 0,
          available: totalAvailable,
          status: 'unassigned',
          colorIndex: floorNode.colorIndex
        });
      }
      
      // Add lab to floor
      floorNode.children.push(labNode);
      floorNode.size += labAlloc.total_workstations;
      floorNode.totalWorkstations += labAlloc.total_workstations;
      floorNode.inUse += totalInUse;
      floorNode.available += totalAvailable;
      
      // Update office totals
      officeNode.size += labAlloc.total_workstations;
      officeNode.totalWorkstations += labAlloc.total_workstations;
      officeNode.inUse += totalInUse;
      officeNode.available += totalAvailable;
    });
    
    // Flatten to array and return all floors (we'll display floors at top level)
    const allFloors: TreemapNode[] = [];
    Array.from(officeMap.values()).forEach(office => {
      office.children.forEach((floor: any) => {
        allFloors.push({
          ...floor,
          name: `${office.name} - ${floor.name}`,
          fullFloorName: floor.name,
          officeName: office.name
        } as TreemapNode);
      });
    });
    
    return allFloors;
  }, [data]);

  // Filter data based on search and filters
  const filteredTreemapData = useMemo(() => {
    let filtered = [...treemapData];
    
    // Filter by selected floor
    if (selectedFloor !== 'all') {
      filtered = filtered.filter(floor => floor.name === selectedFloor);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(floor => {
        const filteredLabs = floor.children?.filter(lab => {
          const labMatch = lab.name.toLowerCase().includes(query);
          const divMatch = lab.children?.some(div => 
            div.name.toLowerCase().includes(query)
          );
          return labMatch || divMatch;
        });
        
        if (filteredLabs && filteredLabs.length > 0) {
          return { ...floor, children: filteredLabs };
        }
        return null;
      }).filter(Boolean) as TreemapNode[];
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.map(floor => {
        const filteredLabs = floor.children?.map(lab => {
          const filteredDivs = lab.children?.filter(div => 
            div.status === filterStatus
          );
          if (filteredDivs && filteredDivs.length > 0) {
            return { ...lab, children: filteredDivs };
          }
          return null;
        }).filter(Boolean);
        
        if (filteredLabs && filteredLabs.length > 0) {
          return { ...floor, children: filteredLabs } as TreemapNode;
        }
        return null;
      }).filter(Boolean) as TreemapNode[];
    }
    
    return filtered;
  }, [treemapData, searchQuery, filterStatus, selectedFloor]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalSystems = 0;
    let activeSystems = 0;
    let unassignedSystems = 0;
    let totalDepartments = 0;
    
    treemapData.forEach(floor => {
      totalSystems += floor.totalWorkstations || 0;
      activeSystems += floor.inUse || 0;
      unassignedSystems += floor.available || 0;
      
      floor.children?.forEach(lab => {
        lab.children?.forEach(div => {
          if (div.status !== 'unassigned') {
            totalDepartments++;
          }
        });
      });
    });
    
    return {
      totalSystems,
      activeSystems,
      unassignedSystems,
      totalDepartments
    };
  }, [treemapData]);

  // Get unique floors for filter
  const uniqueFloors = useMemo(() => {
    return treemapData.map(floor => floor.name);
  }, [treemapData]);

  // Custom content renderer for treemap
  const CustomizedContent = (props: any) => {
    const { x, y, width, height, index, depth, name, type, inUse, totalWorkstations, colorIndex, status } = props;
    
    // Don't render if too small
    if (width < 20 || height < 20) return null;
    
    // Get color based on type and depth
    let fillColor = '#e2e8f0';
    let textColor = '#1e293b';
    let borderColor = '#cbd5e1';
    
    if (type === 'floor') {
      const colorFamily = FLOOR_COLOR_FAMILIES[colorIndex % FLOOR_COLOR_FAMILIES.length];
      fillColor = colorFamily.base;
      textColor = '#ffffff';
      borderColor = colorFamily.base;
    } else if (type === 'lab') {
      const colorFamily = FLOOR_COLOR_FAMILIES[colorIndex % FLOOR_COLOR_FAMILIES.length];
      fillColor = colorFamily.light;
      textColor = '#1e293b';
      borderColor = colorFamily.base;
    } else if (type === 'division') {
      const colorFamily = FLOOR_COLOR_FAMILIES[colorIndex % FLOOR_COLOR_FAMILIES.length];
      if (status === 'active') {
        fillColor = STATUS_COLORS.active;
        textColor = '#ffffff';
      } else if (status === 'unassigned') {
        fillColor = colorFamily.lighter;
        textColor = '#64748b';
      } else if (status === 'maintenance') {
        fillColor = STATUS_COLORS.maintenance;
        textColor = '#ffffff';
      }
      borderColor = colorFamily.base;
    }
    
    // Calculate font size based on available space
    const fontSize = Math.min(14, Math.max(10, width / 12));
    const smallFontSize = Math.min(12, Math.max(8, width / 15));
    
    // Create label text
    let labelText = name;
    let sublabelText = '';
    
    if (type === 'division') {
      sublabelText = `${inUse || 0} systems`;
    } else if (type === 'lab') {
      sublabelText = `${inUse || 0}/${totalWorkstations || 0}`;
    } else if (type === 'floor') {
      sublabelText = `${inUse || 0}/${totalWorkstations || 0} systems`;
    }
    
    // Truncate text if needed
    const maxChars = Math.floor(width / (fontSize * 0.6));
    if (labelText.length > maxChars) {
      labelText = labelText.substring(0, maxChars - 3) + '...';
    }
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: fillColor,
            stroke: borderColor,
            strokeWidth: type === 'floor' ? 3 : type === 'lab' ? 2 : 1,
            strokeOpacity: 0.8,
          }}
        />
        
        {/* Label text */}
        {width > 60 && height > 30 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - (sublabelText ? fontSize / 2 : 0)}
              textAnchor="middle"
              fill={textColor}
              fontSize={fontSize}
              fontWeight={type === 'floor' ? 600 : type === 'lab' ? 500 : 400}
            >
              {labelText}
            </text>
            {sublabelText && width > 80 && height > 40 && (
              <text
                x={x + width / 2}
                y={y + height / 2 + fontSize}
                textAnchor="middle"
                fill={textColor}
                fontSize={smallFontSize}
                opacity={0.9}
              >
                {sublabelText}
              </text>
            )}
          </>
        )}
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-lg shadow-xl p-4 border-2 border-slate-200">
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">
                {data.type === 'floor' ? 'Floor' : data.type === 'lab' ? 'Lab' : 'Department'}
              </p>
              <p className="font-medium">{data.name}</p>
            </div>
            
            {data.office && data.floor && (
              <p className="text-xs text-slate-600">
                {data.office} → {data.floor}
                {data.lab && ` → ${data.lab}`}
              </p>
            )}
            
            <div className="border-t border-slate-200 pt-2 space-y-1">
              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-slate-600">Total Workstations:</span>
                <span className="font-medium">{data.totalWorkstations || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-green-600">In Use:</span>
                <span className="font-medium text-green-600">{data.inUse || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-6 text-sm">
                <span className="text-blue-600">Available:</span>
                <span className="font-medium text-blue-600">{data.available || 0}</span>
              </div>
              {data.status && (
                <div className="flex items-center justify-between gap-6 text-sm pt-1">
                  <span className="text-slate-600">Status:</span>
                  <Badge 
                    variant="outline"
                    className={
                      data.status === 'active' ? 'bg-green-100 text-green-700 border-green-300' :
                      data.status === 'maintenance' ? 'bg-orange-100 text-orange-700 border-orange-300' :
                      'bg-slate-100 text-slate-700 border-slate-300'
                    }
                  >
                    {data.status}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-2xl mb-1">Workstation Distribution Overview</h3>
            <p className="text-sm text-slate-600">
              Floors, Labs, and Departments – Complete Allocation Summary
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Treemap Visualization - Takes 3 columns */}
        <div className="xl:col-span-3 space-y-4">
          {/* Main Treemap */}
          <Card>
            <CardContent className="p-6">
              {filteredTreemapData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[600px] text-slate-500">
                  <Circle className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">No workstation data available</p>
                  <p className="text-sm">Add labs in Workstation Data Management</p>
                </div>
              ) : (
                <div className="h-[600px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={filteredTreemapData}
                      dataKey="size"
                      stroke="#fff"
                      fill="#8884d8"
                      content={<CustomizedContent />}
                    >
                      <Tooltip content={<CustomTooltip />} />
                    </Treemap>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Systems Card */}
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Monitor className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-3xl mb-1">{summary.totalSystems}</p>
                <p className="text-sm text-slate-600">Total Systems Assigned</p>
              </CardContent>
            </Card>

            {/* Active Systems Card */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-3xl mb-1">{summary.activeSystems}</p>
                <p className="text-sm text-slate-600">Active Systems</p>
              </CardContent>
            </Card>

            {/* Unassigned Systems Card */}
            <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <Circle className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
                <p className="text-3xl mb-1">{summary.unassignedSystems}</p>
                <p className="text-sm text-slate-600">Unassigned Systems</p>
              </CardContent>
            </Card>

            {/* Total Departments Card */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl mb-1">{summary.totalDepartments}</p>
                <p className="text-sm text-slate-600">Total Departments</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-3">Legend</h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Hierarchy Levels</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-500"></div>
                      <span className="text-xs">Floor (Darkest)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-blue-400 bg-blue-300"></div>
                      <span className="text-xs">Lab (Medium)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded border border-blue-200 bg-blue-100"></div>
                      <span className="text-xs">Department (Lightest)</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Status</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500"></div>
                      <span className="text-xs">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-slate-400"></div>
                      <span className="text-xs">Unassigned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-orange-500"></div>
                      <span className="text-xs">Under Maintenance</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Color Families</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FLOOR_COLOR_FAMILIES.map((family, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <div 
                          className="w-3 h-3 rounded" 
                          style={{ backgroundColor: family.base }}
                        ></div>
                        <span className="text-xs">{family.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h4>
              
              <div className="space-y-3">
                {/* Status Filter */}
                <div>
                  <Label htmlFor="status-filter" className="text-xs mb-1.5 block">Status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger id="status-filter" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Show All</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="unassigned">Unassigned Only</SelectItem>
                      <SelectItem value="maintenance">Maintenance Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Floor Filter */}
                <div>
                  <Label htmlFor="floor-filter" className="text-xs mb-1.5 block">Floor</Label>
                  <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                    <SelectTrigger id="floor-filter" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Floors</SelectItem>
                      {uniqueFloors.map(floor => (
                        <SelectItem key={floor} value={floor}>
                          {floor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Search */}
                <div>
                  <Label htmlFor="search" className="text-xs mb-1.5 block">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="search"
                      type="text"
                      placeholder="Find floor, lab, or dept..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {(filterStatus !== 'all' || selectedFloor !== 'all' || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFilterStatus('all');
                      setSelectedFloor('all');
                      setSearchQuery('');
                    }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2 text-blue-900">Quick Info</h4>
              <div className="space-y-2 text-xs text-slate-700">
                <p>• Rectangle size = workstation count</p>
                <p>• Darker colors = higher hierarchy</p>
                <p>• Hover for detailed information</p>
                <p>• Use filters to focus view</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
