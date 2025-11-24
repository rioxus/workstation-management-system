import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { 
  Monitor, 
  CheckCircle, 
  Circle,
  RefreshCw,
  Users,
  BarChart3,
  Info,
  Building2,
  Layers
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
}

interface HierarchicalBarChartProps {
  data: WorkstationData;
}

interface ChartRow {
  id: string;
  type: 'floor' | 'lab' | 'department';
  name: string;
  totalValue: number; // Total allocated
  inUseValue: number; // Currently in use
  availableValue: number; // Available for assignment
  office: string;
  floor?: string;
  lab?: string;
  indent: number;
  color: string;
  showBar: boolean;
}

const FLOOR_COLOR_IN_USE = '#3b82f6';      // Blue
const FLOOR_COLOR_AVAILABLE = '#dbeafe';   // Light Blue
const LAB_COLOR_IN_USE = '#8b5cf6';        // Purple  
const LAB_COLOR_AVAILABLE = '#e9d5ff';     // Light purple
const DEPARTMENT_COLORS = [
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Orange
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange 2
  '#a855f7', // Purple 2
];

export function HierarchicalBarChart({ data }: HierarchicalBarChartProps) {
  const [selectedOffice, setSelectedOffice] = useState<string>('all');

  // Build hierarchical data
  const { chartRows, offices } = useMemo(() => {
    const { labAllocations = [], divisionRecords = [] } = data;
    const rows: ChartRow[] = [];
    const officeSet = new Set<string>();
    
    // Group by office -> floor -> lab -> departments
    const hierarchy = new Map<string, any>();
    
    labAllocations.forEach((labAlloc) => {
      if (!labAlloc.floors) return;
      
      const officeName = labAlloc.floors.offices?.office_name || 'Unknown Office';
      const floorName = labAlloc.floors.floor_name || 'Unknown Floor';
      const labName = labAlloc.lab_name;
      const floorId = labAlloc.floor_id;
      const labTotalSystems = labAlloc.total_workstations || 0;
      
      officeSet.add(officeName);
      
      const key = `${officeName}|${floorName}`;
      
      if (!hierarchy.has(key)) {
        hierarchy.set(key, {
          office: officeName,
          floor: floorName,
          floorId: floorId,
          totalSystems: 0,
          inUseSystems: 0,
          labs: new Map()
        });
      }
      
      const floorData = hierarchy.get(key);
      
      if (!floorData.labs.has(labName)) {
        floorData.labs.set(labName, {
          name: labName,
          totalSystems: labTotalSystems,
          inUseSystems: 0,
          departments: []
        });
      }
      
      const labData = floorData.labs.get(labName);
      
      // Add to floor total
      floorData.totalSystems += labTotalSystems;
      
      // Find departments in this lab
      const depts = divisionRecords.filter(
        (div) => div.floor_id === floorId && div.lab_name === labName
      );
      
      let labInUse = 0;
      depts.forEach(dept => {
        const systemCount = dept.in_use || 0;
        labInUse += systemCount;
        labData.departments.push({
          name: dept.division,
          systems: systemCount
        });
      });
      
      labData.inUseSystems = labInUse;
      floorData.inUseSystems += labInUse;
    });
    
    // Convert to flat array
    let departmentColorIndex = 0;
    
    hierarchy.forEach((floorData, key) => {
      // Skip if filtering by office and this doesn't match
      if (selectedOffice !== 'all' && floorData.office !== selectedOffice) {
        return;
      }
      
      const floorAvailable = Math.max(0, floorData.totalSystems - floorData.inUseSystems);
      
      // Add Floor row (with badges)
      rows.push({
        id: `floor-${key}`,
        type: 'floor',
        name: `${floorData.office} - ${floorData.floor}`,
        totalValue: floorData.totalSystems,
        inUseValue: floorData.inUseSystems,
        availableValue: floorAvailable,
        office: floorData.office,
        floor: floorData.floor,
        indent: 0,
        color: FLOOR_COLOR_IN_USE,
        showBar: false // Floors use badges
      });
      
      // Add Labs and Departments
      floorData.labs.forEach((labData: any) => {
        const labAvailable = Math.max(0, labData.totalSystems - labData.inUseSystems);
        
        // Add Lab row (with badges)
        rows.push({
          id: `lab-${key}-${labData.name}`,
          type: 'lab',
          name: `${labData.name}`,
          totalValue: labData.totalSystems,
          inUseValue: labData.inUseSystems,
          availableValue: labAvailable,
          office: floorData.office,
          floor: floorData.floor,
          lab: labData.name,
          indent: 1,
          color: LAB_COLOR_IN_USE,
          showBar: false // Labs use badges
        });
        
        // Add Department rows (with bars)
        if (labData.departments.length > 0) {
          labData.departments.forEach((dept: any) => {
            if (dept.systems > 0) {
              rows.push({
                id: `dept-${key}-${labData.name}-${dept.name}`,
                type: 'department',
                name: dept.name,
                totalValue: dept.systems,
                inUseValue: dept.systems,
                availableValue: 0,
                office: floorData.office,
                floor: floorData.floor,
                lab: labData.name,
                indent: 2,
                color: DEPARTMENT_COLORS[departmentColorIndex % DEPARTMENT_COLORS.length],
                showBar: true // Only departments use bars
              });
              departmentColorIndex++;
            }
          });
        }
      });
    });
    
    return { 
      chartRows: rows, 
      offices: Array.from(officeSet).sort() 
    };
  }, [data, selectedOffice]);

  // Find max value for department bar scaling
  const maxDepartmentValue = useMemo(() => {
    const deptValues = chartRows
      .filter(r => r.type === 'department' && r.showBar)
      .map(r => r.inUseValue);
    return Math.max(...deptValues, 50); // Minimum 50 for scaling
  }, [chartRows]);

  return (
    <div className="space-y-6">
      {/* Main Chart - Full Width */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium">Workstation Allocation Overview</h4>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-slate-100 transition-colors">
                    <Info className="w-4 h-4 text-slate-500" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">Quick Guide</h4>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p>• All data visible at a glance</p>
                      <p>• Floors & Labs show status badges</p>
                      <p>• Departments show proportional bars</p>
                      <p>• 🏢 Floor = Total workstations per floor</p>
                      <p>• 🔬 Lab = Workstations per lab</p>
                      <p>• 👥 Department = Workstations in use</p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="office-filter" className="text-sm">Office:</Label>
              <Select value={selectedOffice} onValueChange={setSelectedOffice}>
                <SelectTrigger id="office-filter" className="w-48 h-8">
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
          </div>

          {/* Legend - Moved to Top */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h5 className="text-xs font-medium text-slate-600 mb-3 uppercase tracking-wide">Legend</h5>
            <div className="flex flex-wrap gap-6">
              {/* Floor Legend */}
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 rounded border border-blue-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    <span className="text-xs text-blue-900">In Use</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-700">Available</span>
                  </div>
                </div>
                <span className="text-xs text-slate-600">Floor</span>
              </div>

              {/* Lab Legend */}
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div className="flex gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 rounded border border-purple-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div>
                    <span className="text-xs text-purple-900">In Use</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded border border-slate-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs text-slate-700">Available</span>
                  </div>
                </div>
                <span className="text-xs text-slate-600">Lab</span>
              </div>

              {/* Department Legend */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                <div className="flex gap-1">
                  {DEPARTMENT_COLORS.slice(0, 4).map((color, i) => (
                    <div key={i} className="w-6 h-3 rounded" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
                <span className="text-xs text-slate-600">Departments (Bars)</span>
              </div>
            </div>
          </div>

          {chartRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[600px] text-slate-500">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">No workstation data available</p>
              <p className="text-sm">Add labs in Workstation Data Management</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Chart Container */}
              <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                {chartRows.map((row, index) => {
                  const indentPx = row.indent * 32;
                  const isFloor = row.type === 'floor';
                  const isLab = row.type === 'lab';
                  const isDept = row.type === 'department';
                  
                  // Calculate bar width as percentage of max department value (for proper proportions)
                  const barWidthPercent = isDept && row.showBar 
                    ? Math.max((row.inUseValue / maxDepartmentValue) * 100, 8) // Min 8% for visibility
                    : 0;
                  
                  return (
                    <div
                      key={row.id}
                      className={`
                        flex items-center py-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors
                        ${isFloor ? 'bg-blue-50/40' : ''}
                        ${isLab ? 'bg-purple-50/20' : ''}
                      `}
                    >
                      {/* Label Section - Fixed Width */}
                      <div className="w-80 flex items-center gap-2.5 pr-4 flex-shrink-0" style={{ paddingLeft: `${indentPx}px` }}>
                        {/* Icon */}
                        {isFloor && <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                        {isLab && <Layers className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                        {isDept && <Users className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />}
                        
                        {/* Name */}
                        <span 
                          className={`
                            truncate
                            ${isFloor ? 'font-semibold text-slate-900 text-base' : ''}
                            ${isLab ? 'font-medium text-slate-700 text-sm' : ''}
                            ${isDept ? 'text-slate-600 text-sm' : ''}
                          `}
                          title={row.name}
                        >
                          {row.name}
                        </span>
                      </div>

                      {/* Data Section - Flexible Width */}
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        {/* For floors: show only total badge */}
                        {isFloor ? (
                          <div className="flex items-center gap-3 py-1">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-blue-100 border-blue-300">
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                              <span className="text-sm font-medium text-blue-900">
                                {row.totalValue} {row.totalValue === 1 ? 'workstation' : 'workstations'}
                              </span>
                            </div>
                          </div>
                        ) : isLab ? (
                          /* For labs: show in use, available, and total */
                          <div className="flex items-center gap-3 py-1">
                            {/* In Use Badge */}
                            {row.inUseValue > 0 && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-purple-100 border-purple-300">
                                <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                                <span className="text-sm font-medium text-purple-900">
                                  {row.inUseValue} in use
                                </span>
                              </div>
                            )}
                            
                            {/* Available Badge */}
                            {row.availableValue > 0 && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-300">
                                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                <span className="text-sm font-medium text-slate-700">
                                  {row.availableValue} available
                                </span>
                              </div>
                            )}
                            
                            {/* Total */}
                            <span className="text-sm text-slate-500 font-medium ml-2">
                              Total: {row.totalValue} {row.totalValue === 1 ? 'workstation' : 'workstations'}
                            </span>
                          </div>
                        ) : isDept && row.showBar ? (
                          /* For departments: show proportional bar */
                          <div className="flex-1 flex items-center min-w-0">
                            <div 
                              className="h-10 rounded flex items-center justify-end px-4 transition-all duration-300 shadow-sm"
                              style={{ 
                                width: `${barWidthPercent}%`,
                                backgroundColor: row.color,
                                minWidth: '120px'
                              }}
                            >
                              <span 
                                className="text-white font-semibold whitespace-nowrap"
                                style={{ 
                                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                                  fontSize: '0.9375rem' // 15px
                                }}
                              >
                                {row.inUseValue} {row.inUseValue === 1 ? 'workstation' : 'workstations'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-9"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
