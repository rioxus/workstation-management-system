import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Monitor, 
  Laptop, 
  Headphones, 
  Keyboard, 
  Mouse, 
  AlertTriangle, 
  Package, 
  ShoppingCart,
  Wrench,
  CheckCircle,
  Clock,
  Home,
  Wifi
} from 'lucide-react';

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  totalStock: number;
  availableStock: number;
  inUseCount: number;
  maintenanceCount: number;
  reorderLevel: number;
  location: string;
  lastUpdated: string;
}

interface EquipmentInventoryProps {
  onOrderEquipment: (itemId: string) => void;
}

export function EquipmentInventory({ onOrderEquipment }: EquipmentInventoryProps) {
  // Mock equipment data
  const equipment: EquipmentItem[] = [
    {
      id: '1',
      name: 'Dell UltraSharp 24" Monitor',
      category: 'Monitors',
      totalStock: 150,
      availableStock: 12,
      inUseCount: 135,
      maintenanceCount: 3,
      reorderLevel: 20,
      location: 'CH Office - Storage',
      lastUpdated: '2024-10-06T10:30:00Z'
    },
    {
      id: '2',
      name: 'HP EliteDesk 800 G6',
      category: 'Desktop PCs',
      totalStock: 120,
      availableStock: 8,
      inUseCount: 110,
      maintenanceCount: 2,
      reorderLevel: 15,
      location: 'CH Office - Storage',
      lastUpdated: '2024-10-06T09:15:00Z'
    },
    {
      id: '3',
      name: 'Logitech H390 Headset',
      category: 'Audio',
      totalStock: 80,
      availableStock: 25,
      inUseCount: 52,
      maintenanceCount: 3,
      reorderLevel: 10,
      location: 'Multiple Locations',
      lastUpdated: '2024-10-06T08:45:00Z'
    },
    {
      id: '4',
      name: 'Dell Wireless Keyboard & Mouse',
      category: 'Peripherals',
      totalStock: 200,
      availableStock: 45,
      inUseCount: 150,
      maintenanceCount: 5,
      reorderLevel: 25,
      location: 'All Offices',
      lastUpdated: '2024-10-06T11:00:00Z'
    },
    {
      id: '5',
      name: 'Lenovo ThinkPad T14',
      category: 'Laptops',
      totalStock: 50,
      availableStock: 3,
      inUseCount: 45,
      maintenanceCount: 2,
      reorderLevel: 8,
      location: 'Gurukul Office',
      lastUpdated: '2024-10-06T07:30:00Z'
    }
  ];

  const getIcon = (category: string) => {
    switch (category) {
      case 'Monitors':
        return Monitor;
      case 'Desktop PCs':
        return Package;
      case 'Laptops':
        return Laptop;
      case 'Audio':
        return Headphones;
      case 'Peripherals':
        return Keyboard;
      default:
        return Package;
    }
  };

  const getStockStatus = (available: number, reorderLevel: number) => {
    if (available <= 0) return { status: 'out-of-stock', color: 'bg-red-500', text: 'Out of Stock' };
    if (available <= reorderLevel) return { status: 'low', color: 'bg-amber-500', text: 'Low Stock' };
    return { status: 'good', color: 'bg-green-500', text: 'In Stock' };
  };

  const lowStockItems = equipment.filter(item => item.availableStock <= item.reorderLevel);
  const outOfStockItems = equipment.filter(item => item.availableStock === 0);

  // WFH Equipment data
  const wfhEquipment = [
    {
      id: 'wfh-1',
      name: 'Dell Latitude Laptop',
      category: 'Laptops',
      totalAssigned: 85,
      activeUsers: 82,
      inMaintenance: 3,
      location: 'Remote - Various',
      lastUpdated: '2024-10-06T10:00:00Z'
    },
    {
      id: 'wfh-2',
      name: 'Portable Monitor',
      category: 'Monitors',
      totalAssigned: 65,
      activeUsers: 63,
      inMaintenance: 2,
      location: 'Remote - Various',
      lastUpdated: '2024-10-06T09:30:00Z'
    },
    {
      id: 'wfh-3',
      name: 'Wireless Keyboard & Mouse Set',
      category: 'Peripherals',
      totalAssigned: 85,
      activeUsers: 80,
      inMaintenance: 5,
      location: 'Remote - Various',
      lastUpdated: '2024-10-06T08:15:00Z'
    },
    {
      id: 'wfh-4',
      name: 'USB Headset with Mic',
      category: 'Audio',
      totalAssigned: 90,
      activeUsers: 88,
      inMaintenance: 2,
      location: 'Remote - Various',
      lastUpdated: '2024-10-06T11:45:00Z'
    },
    {
      id: 'wfh-5',
      name: 'Webcam HD',
      category: 'Video',
      totalAssigned: 45,
      activeUsers: 42,
      inMaintenance: 3,
      location: 'Remote - Various',
      lastUpdated: '2024-10-06T07:00:00Z'
    },
    {
      id: 'wfh-6',
      name: 'Mobile Hotspot Device',
      category: 'Connectivity',
      totalAssigned: 30,
      activeUsers: 28,
      inMaintenance: 2,
      location: 'Remote - Various',
      lastUpdated: '2024-10-06T10:30:00Z'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Equipment Inventory</h1>
          <p className="text-slate-600">
            Manage and track equipment stock levels across all locations
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Bulk Order Request
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Items</p>
                <p className="text-2xl text-blue-600">{equipment.reduce((sum, item) => sum + item.totalStock, 0)}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Available</p>
                <p className="text-2xl text-green-600">{equipment.reduce((sum, item) => sum + item.availableStock, 0)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Maintenance</p>
                <p className="text-2xl text-amber-600">{equipment.reduce((sum, item) => sum + item.maintenanceCount, 0)}</p>
              </div>
              <Wrench className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Needs Reorder</p>
                <p className="text-2xl text-red-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Cards */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {outOfStockItems.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h3 className="font-medium text-red-900">Out of Stock Alert</h3>
                </div>
                <p className="text-sm text-red-700 mb-3">
                  {outOfStockItems.length} item{outOfStockItems.length > 1 ? 's' : ''} completely out of stock
                </p>
                <div className="space-y-1">
                  {outOfStockItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs text-red-600">• {item.name}</p>
                  ))}
                  {outOfStockItems.length > 3 && (
                    <p className="text-xs text-red-600">• +{outOfStockItems.length - 3} more items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {lowStockItems.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="font-medium text-amber-900">Low Stock Warning</h3>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
                </p>
                <div className="space-y-1">
                  {lowStockItems.slice(0, 3).map(item => (
                    <p key={item.id} className="text-xs text-amber-600">
                      • {item.name} ({item.availableStock} left)
                    </p>
                  ))}
                  {lowStockItems.length > 3 && (
                    <p className="text-xs text-amber-600">• +{lowStockItems.length - 3} more items</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {equipment.map((item) => {
              const Icon = getIcon(item.category);
              const stockStatus = getStockStatus(item.availableStock, item.reorderLevel);
              const utilizationRate = Math.round((item.inUseCount / item.totalStock) * 100);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-slate-100">
                      <Icon className="w-6 h-6 text-slate-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge className={stockStatus.color}>
                          {stockStatus.text}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                        <div>
                          <p className="text-xs text-slate-500">Available</p>
                          <p className="font-medium text-blue-600">{item.availableStock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">In Use</p>
                          <p className="font-medium text-green-600">{item.inUseCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Maintenance</p>
                          <p className="font-medium text-amber-600">{item.maintenanceCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Stock</p>
                          <p className="font-medium">{item.totalStock}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Utilization Rate</span>
                          <span>{utilizationRate}%</span>
                        </div>
                        <Progress value={utilizationRate} className="h-2" />
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        <p>Location: {item.location}</p>
                        <p>Last updated: {new Date(item.lastUpdated).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.availableStock <= item.reorderLevel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOrderEquipment(item.id)}
                        className="flex items-center gap-1"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        Order
                      </Button>
                    )}
                    
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      Manage
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Work From Home Equipment Section */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-green-600" />
              Work From Home Equipment Assets
            </CardTitle>
            <Badge className="bg-green-600">
              {wfhEquipment.reduce((sum, item) => sum + item.totalAssigned, 0)} Total Assets
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* WFH Summary */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-green-200">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-600" />
              WFH Equipment Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Total WFH Assets</p>
                <p className="text-lg font-medium text-green-600">
                  {wfhEquipment.reduce((sum, item) => sum + item.totalAssigned, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Active WFH Users</p>
                <p className="text-lg font-medium text-blue-600">
                  {wfhEquipment.reduce((sum, item) => sum + item.activeUsers, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">WFH Maintenance</p>
                <p className="text-lg font-medium text-amber-600">
                  {wfhEquipment.reduce((sum, item) => sum + item.inMaintenance, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Overall WFH Utilization</p>
                <p className="text-lg font-medium">
                  {Math.round((wfhEquipment.reduce((sum, item) => sum + item.activeUsers, 0) / 
                    wfhEquipment.reduce((sum, item) => sum + item.totalAssigned, 0)) * 100)}%
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {wfhEquipment.map((item) => {
              const Icon = item.category === 'Laptops' ? Laptop : 
                          item.category === 'Monitors' ? Monitor :
                          item.category === 'Audio' ? Headphones :
                          item.category === 'Peripherals' ? Keyboard :
                          item.category === 'Connectivity' ? Wifi :
                          Package;
              const activeRate = Math.round((item.activeUsers / item.totalAssigned) * 100);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-white border border-green-200 rounded-lg hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-lg bg-green-100">
                      <Icon className="w-6 h-6 text-green-600" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium">{item.name}</h3>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {item.category}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-slate-600">
                        <div>
                          <p className="text-xs text-slate-500">Total Assigned</p>
                          <p className="font-medium text-green-600">{item.totalAssigned}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Active Users</p>
                          <p className="font-medium text-blue-600">{item.activeUsers}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">In Maintenance</p>
                          <p className="font-medium text-amber-600">{item.inMaintenance}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Active Usage Rate</span>
                          <span>{activeRate}%</span>
                        </div>
                        <Progress value={activeRate} className="h-2" />
                      </div>

                      <div className="mt-2 text-xs text-slate-500">
                        <p>Location: {item.location}</p>
                        <p>Last updated: {new Date(item.lastUpdated).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="flex items-center gap-1 border-green-300 hover:bg-green-50">
                      <Package className="w-3 h-3" />
                      Track
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}