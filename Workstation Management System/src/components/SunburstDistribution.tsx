import { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { 
  Building2, 
  Layers, 
  Users, 
  Monitor, 
  CheckCircle, 
  Circle,
  ChevronRight,
  Home
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
}

interface SunburstDistributionProps {
  data: WorkstationData;
}

interface HierarchyNode {
  name: string;
  value: number;
  children?: HierarchyNode[];
  floor?: string;
  lab?: string;
  division?: string;
  type: 'floor' | 'lab' | 'division';
  assigned?: number;
  available?: number;
  inUse?: number;
  totalWorkstations?: number;
}

// Color palettes for different hierarchy levels
const FLOOR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
const LAB_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#22d3ee'];
const DIVISION_COLORS = ['#93c5fd', '#c4b5fd', '#f9a8d4', '#fcd34d', '#6ee7b7', '#67e8f9'];

export function SunburstDistribution({ data }: SunburstDistributionProps) {
  const [drilldownPath, setDrilldownPath] = useState<string[]>([]);
  const [showActive, setShowActive] = useState(true);
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Build hierarchical data structure from lab allocations and division records
  const hierarchyData = useMemo(() => {
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
          value: 0,
          totalWorkstations: 0,
          assigned: 0,
          available: 0,
          inUse: 0,
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
          value: 0,
          totalWorkstations: 0,
          assigned: 0,
          available: 0,
          inUse: 0,
          children: []
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
      const labNode = {
        name: labName,
        type: 'lab',
        office: officeName,
        floor: floorName,
        value: labAlloc.total_workstations,
        totalWorkstations: labAlloc.total_workstations,
        assigned: labAlloc.total_workstations,
        available: totalAvailable,
        inUse: totalInUse,
        children: []
      };
      
      // Add division nodes if they exist
      if (divisionsInLab.length > 0) {
        divisionsInLab.forEach((div) => {
          const divNode = {
            name: div.division,
            type: 'division',
            office: officeName,
            floor: floorName,
            lab: labName,
            value: labAlloc.total_workstations,
            totalWorkstations: labAlloc.total_workstations,
            assigned: labAlloc.total_workstations,
            available: totalAvailable,
            inUse: div.in_use || 0
          };
          
          labNode.children.push(divNode);
        });
      }
      
      // Always add lab (even if no divisions)
      floorNode.children.push(labNode);
      floorNode.value += labAlloc.total_workstations;
      floorNode.totalWorkstations += labAlloc.total_workstations;
      floorNode.assigned += labAlloc.total_workstations;
      floorNode.available += totalAvailable;
      floorNode.inUse += totalInUse;
      
      officeNode.value += labAlloc.total_workstations;
      officeNode.totalWorkstations += labAlloc.total_workstations;
      officeNode.assigned += labAlloc.total_workstations;
      officeNode.available += totalAvailable;
      officeNode.inUse += totalInUse;
    });
    
    return Array.from(officeMap.values());
  }, [data]);

  // Get current view data based on drilldown path
  const currentViewData = useMemo(() => {
    if (drilldownPath.length === 0) {
      // Show all offices/floors (we'll flatten to show floors directly)
      const floors: any[] = [];
      hierarchyData.forEach(office => {
        office.children.forEach((floor: any) => {
          floors.push({
            name: `${office.name} - ${floor.name}`,
            value: floor.totalWorkstations,
            totalWorkstations: floor.totalWorkstations,
            assigned: floor.assigned,
            available: floor.available,
            inUse: floor.inUse,
            type: 'floor',
            officeName: office.name,
            floorName: floor.name
          });
        });
      });
      return floors;
    } else if (drilldownPath.length === 1) {
      // Show labs in selected floor
      const [floorFullName] = drilldownPath;
      for (const office of hierarchyData) {
        for (const floor of office.children) {
          if (`${office.name} - ${floor.name}` === floorFullName) {
            return floor.children.map((lab: any) => ({
              ...lab,
              value: lab.totalWorkstations
            })) || [];
          }
        }
      }
      return [];
    } else if (drilldownPath.length === 2) {
      // Show divisions in selected lab
      const [floorFullName, labName] = drilldownPath;
      for (const office of hierarchyData) {
        for (const floor of office.children) {
          if (`${office.name} - ${floor.name}` === floorFullName) {
            const lab = floor.children.find((l: any) => l.name === labName);
            if (lab && lab.children && lab.children.length > 0) {
              return lab.children.map((div: any) => ({
                ...div,
                value: div.inUse || 1 // Use inUse for division segments, or 1 if 0 to show it
              }));
            } else {
              // Lab has no divisions, show a placeholder
              return [{
                name: 'No divisions assigned',
                value: lab.totalWorkstations,
                totalWorkstations: lab.totalWorkstations,
                assigned: lab.totalWorkstations,
                available: lab.available,
                inUse: lab.inUse,
                type: 'placeholder'
              }];
            }
          }
        }
      }
      return [];
    }
    return [];
  }, [hierarchyData, drilldownPath]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    let totalSystems = 0;
    let totalAssigned = 0;
    let totalActive = 0;
    let totalUnassigned = 0;
    let currentLevel = 'All Floors';
    let departmentUsage: { name: string; inUse: number; available: number; total: number }[] = [];
    
    if (drilldownPath.length === 0) {
      // Top level - show total across all floors
      totalSystems = hierarchyData.reduce((sum, office) => {
        return sum + office.children.reduce((floorSum: number, floor: any) => {
          return floorSum + floor.totalWorkstations;
        }, 0);
      }, 0);
      totalActive = hierarchyData.reduce((sum, office) => {
        return sum + office.children.reduce((floorSum: number, floor: any) => {
          return floorSum + floor.inUse;
        }, 0);
      }, 0);
      totalUnassigned = hierarchyData.reduce((sum, office) => {
        return sum + office.children.reduce((floorSum: number, floor: any) => {
          return floorSum + floor.available;
        }, 0);
      }, 0);
      totalAssigned = totalSystems;
      currentLevel = 'All Floors';
      
      // Calculate department usage across all floors
      const deptMap = new Map<string, { inUse: number; available: number; total: number }>();
      hierarchyData.forEach(office => {
        office.children.forEach((floor: any) => {
          floor.children.forEach((lab: any) => {
            lab.children?.forEach((div: any) => {
              if (!deptMap.has(div.name)) {
                deptMap.set(div.name, { inUse: 0, available: 0, total: 0 });
              }
              const dept = deptMap.get(div.name)!;
              dept.inUse += div.inUse || 0;
              dept.total += div.totalWorkstations || 0;
            });
            // If lab has no divisions but has data, show lab-level usage
            if (!lab.children || lab.children.length === 0) {
              const labKey = `${lab.name} (Lab)`;
              if (!deptMap.has(labKey)) {
                deptMap.set(labKey, { inUse: 0, available: 0, total: 0 });
              }
              const dept = deptMap.get(labKey)!;
              dept.inUse += lab.inUse || 0;
              dept.total += lab.totalWorkstations || 0;
            }
          });
        });
      });
      
      // Calculate available for each department
      deptMap.forEach((value, key) => {
        value.available = Math.max(0, value.total - value.inUse);
      });
      
      departmentUsage = Array.from(deptMap.entries()).map(([name, data]) => ({
        name,
        ...data
      })).sort((a, b) => b.inUse - a.inUse);
      
    } else if (drilldownPath.length === 1) {
      // Floor level - show total for selected floor
      const [floorFullName] = drilldownPath;
      for (const office of hierarchyData) {
        for (const floor of office.children) {
          if (`${office.name} - ${floor.name}` === floorFullName) {
            totalSystems = floor.totalWorkstations;
            totalActive = floor.inUse;
            totalUnassigned = floor.available;
            totalAssigned = floor.totalWorkstations;
            currentLevel = floorFullName;
            
            // Calculate department usage for this floor
            const deptMap = new Map<string, { inUse: number; available: number; total: number }>();
            floor.children.forEach((lab: any) => {
              lab.children?.forEach((div: any) => {
                if (!deptMap.has(div.name)) {
                  deptMap.set(div.name, { inUse: 0, available: 0, total: 0 });
                }
                const dept = deptMap.get(div.name)!;
                dept.inUse += div.inUse || 0;
                dept.total += div.totalWorkstations || 0;
              });
              // If lab has no divisions
              if (!lab.children || lab.children.length === 0) {
                const labKey = `${lab.name} (Lab)`;
                if (!deptMap.has(labKey)) {
                  deptMap.set(labKey, { inUse: 0, available: 0, total: 0 });
                }
                const dept = deptMap.get(labKey)!;
                dept.inUse += lab.inUse || 0;
                dept.total += lab.totalWorkstations || 0;
              }
            });
            
            deptMap.forEach((value, key) => {
              value.available = Math.max(0, value.total - value.inUse);
            });
            
            departmentUsage = Array.from(deptMap.entries()).map(([name, data]) => ({
              name,
              ...data
            })).sort((a, b) => b.inUse - a.inUse);
            break;
          }
        }
      }
    } else if (drilldownPath.length === 2) {
      // Lab level - show total for selected lab
      const [floorFullName, labName] = drilldownPath;
      for (const office of hierarchyData) {
        for (const floor of office.children) {
          if (`${office.name} - ${floor.name}` === floorFullName) {
            const lab = floor.children.find((l: any) => l.name === labName);
            if (lab) {
              totalSystems = lab.totalWorkstations;
              totalActive = lab.inUse;
              totalUnassigned = lab.available;
              totalAssigned = lab.totalWorkstations;
              currentLevel = labName;
              
              // Calculate department usage for this lab
              if (lab.children && lab.children.length > 0) {
                departmentUsage = lab.children.map((div: any) => ({
                  name: div.name,
                  inUse: div.inUse || 0,
                  available: div.available || 0,
                  total: div.totalWorkstations || 0
                })).sort((a, b) => b.inUse - a.inUse);
              }
            }
            break;
          }
        }
      }
    }
    
    return {
      totalSystems,
      totalAssigned,
      totalActive,
      totalUnassigned,
      currentLevel,
      departmentUsage
    };
  }, [hierarchyData, drilldownPath]);

  const handleSegmentClick = (entry: any, index: number) => {
    if (drilldownPath.length === 0) {
      // Clicking on floor
      setDrilldownPath([entry.name]);
      setActiveIndex(null);
    } else if (drilldownPath.length === 1) {
      // Clicking on lab
      setDrilldownPath([...drilldownPath, entry.name]);
      setActiveIndex(null);
    }
    // At division level, do nothing (no further drill down)
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setDrilldownPath([]);
    } else {
      setDrilldownPath(drilldownPath.slice(0, index + 1));
    }
    setActiveIndex(null);
  };

  const getColorForIndex = (index: number) => {
    if (drilldownPath.length === 0) {
      return FLOOR_COLORS[index % FLOOR_COLORS.length];
    } else if (drilldownPath.length === 1) {
      return LAB_COLORS[index % LAB_COLORS.length];
    } else {
      return DIVISION_COLORS[index % DIVISION_COLORS.length];
    }
  };

  const renderActiveShape = (props: any) => {
    const {
      cx, cy, innerRadius, outerRadius, startAngle, endAngle,
      fill, payload
    } = props;

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))', outline: 'none' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 5}
          outerRadius={innerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.3}
          style={{ outline: 'none' }}
        />
      </g>
    );
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-lg shadow-lg p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-1">
            {drilldownPath.length === 0 ? 'Floor' : drilldownPath.length === 1 ? 'Lab' : 'Division'}
          </p>
          <p className="mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-600">Total Workstations:</span>
              <span>{data.totalWorkstations || data.value}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-green-600">In Use:</span>
              <span>{data.inUse || 0}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-600">Available:</span>
              <span>{data.available || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl mb-2">Workstation Distribution Overview</h3>
          <p className="text-xs md:text-sm text-slate-600">
            Hierarchical view of workstation allocation across floors, labs, and divisions
          </p>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="mb-4 md:mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  className="flex items-center gap-1 cursor-pointer hover:text-blue-600"
                  onClick={() => handleBreadcrumbClick(-1)}
                >
                  <Home className="w-4 h-4" />
                  All Floors
                </BreadcrumbLink>
              </BreadcrumbItem>
              {drilldownPath.map((segment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <BreadcrumbSeparator>
                    <ChevronRight className="w-4 h-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    {index === drilldownPath.length - 1 ? (
                      <BreadcrumbPage>{segment}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        className="cursor-pointer hover:text-blue-600"
                        onClick={() => handleBreadcrumbClick(index)}
                      >
                        {segment}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {/* Sunburst Chart */}
          <div className="lg:col-span-2 xl:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={drilldownPath.join('-')}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 md:p-8 flex items-center justify-center min-h-[400px] md:min-h-[500px]"
              >
                {currentViewData.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-center text-slate-500"
                  >
                    <Circle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p>No workstation data available</p>
                    <p className="text-sm">Add labs in Workstation Data Management</p>
                  </motion.div>
                ) : (
                  <div className="w-full h-[400px] md:h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentViewData}
                        cx="50%"
                        cy="50%"
                        innerRadius={drilldownPath.length === 0 ? 100 : drilldownPath.length === 1 ? 90 : 80}
                        outerRadius={drilldownPath.length === 0 ? 180 : drilldownPath.length === 1 ? 170 : 160}
                        paddingAngle={2}
                        dataKey="value"
                        activeIndex={activeIndex ?? undefined}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        onClick={handleSegmentClick}
                        style={{ cursor: drilldownPath.length < 2 ? 'pointer' : 'default', outline: 'none' }}
                        animationBegin={0}
                        animationDuration={600}
                        animationEasing="ease-in-out"
                      >
                        {currentViewData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getColorForIndex(index)}
                            style={{ outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      
                      {/* Center text */}
                      <text
                        x="50%"
                        y="48%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-2xl md:text-3xl"
                      >
                        {summary.totalSystems}
                      </text>
                      <text
                        x="50%"
                        y="54%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-xs md:text-sm fill-slate-600"
                      >
                        Total Systems
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Panel: In Use & Available Cards */}
          <div className="space-y-4">
            {/* In Use Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="text-sm">In Use</h4>
              </div>
              <p className="text-2xl">{summary.totalActive}</p>
              <p className="text-xs text-slate-500 mt-1">Active workstations</p>
            </div>

            {/* Currently Available Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Circle className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="text-sm">Available</h4>
              </div>
              <p className="text-2xl">{summary.totalUnassigned}</p>
              <p className="text-xs text-slate-500 mt-1">Ready to assign</p>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
              <h4 className="text-sm mb-3 text-blue-900">Current View</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Level:</span>
                  <Badge variant="outline" className="text-xs">
                    {drilldownPath.length === 0 ? 'Floors' : drilldownPath.length === 1 ? 'Labs' : 'Divisions'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Items:</span>
                  <span>{currentViewData.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Click hint */}
        {drilldownPath.length < 2 && currentViewData.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">
              Click on any segment to drill down and explore details
            </p>
          </div>
        )}

        {/* Back button */}
        {drilldownPath.length > 0 && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBreadcrumbClick(drilldownPath.length - 2)}
            >
              Back to {drilldownPath.length === 1 ? 'All Floors' : drilldownPath[drilldownPath.length - 2]}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}