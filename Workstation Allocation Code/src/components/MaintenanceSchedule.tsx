import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar as CalendarIcon,
  Filter,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface MaintenanceItem {
  id: string;
  title: string;
  type: 'preventive' | 'corrective' | 'emergency';
  workstationId: string;
  location: string;
  floor: string;
  priority: 'high' | 'medium' | 'low';
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue';
  assignedTo: string;
  estimatedDuration: string;
  description: string;
  scheduledDate: Date;
  completedDate?: Date;
  equipmentType: string;
  lastMaintenance?: Date;
  nextDue?: Date;
}

export function MaintenanceSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<MaintenanceItem | null>(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Mock maintenance data
  const maintenanceItems: MaintenanceItem[] = [
    {
      id: '1',
      title: 'PC Hardware Check - WS001',
      type: 'preventive',
      workstationId: 'WS001',
      location: 'CH Office',
      floor: '9th Floor',
      priority: 'medium',
      status: 'scheduled',
      assignedTo: 'Technical User',
      estimatedDuration: '2 hours',
      description: 'Regular hardware inspection and cleaning',
      scheduledDate: new Date(2024, 9, 8, 10, 0), // Oct 8, 2024, 10:00 AM
      equipmentType: 'Desktop PC',
      lastMaintenance: new Date(2024, 6, 8),
    },
    {
      id: '2',
      title: 'Monitor Replacement - WS045',
      type: 'corrective',
      workstationId: 'WS045',
      location: 'Gurukul Office',
      floor: '2nd Floor',
      priority: 'high',
      status: 'in-progress',
      assignedTo: 'Technical User',
      estimatedDuration: '1 hour',
      description: 'Replace faulty monitor with flickering display',
      scheduledDate: new Date(2024, 9, 6, 14, 0), // Oct 6, 2024, 2:00 PM
      equipmentType: 'Monitor',
    },
    {
      id: '3',
      title: 'Network Port Repair - WS032',
      type: 'emergency',
      workstationId: 'WS032',
      location: 'CH Office',
      floor: '5th Floor',
      priority: 'high',
      status: 'overdue',
      assignedTo: 'Network Team',
      estimatedDuration: '3 hours',
      description: 'Emergency repair of damaged network port',
      scheduledDate: new Date(2024, 9, 5, 9, 0), // Oct 5, 2024, 9:00 AM
      equipmentType: 'Network Infrastructure',
    },
    {
      id: '4',
      title: 'Software Update - Multiple PCs',
      type: 'preventive',
      workstationId: 'BATCH-001',
      location: 'All Offices',
      floor: 'Multiple',
      priority: 'low',
      status: 'scheduled',
      assignedTo: 'IT Team',
      estimatedDuration: '4 hours',
      description: 'Monthly security updates and software patches',
      scheduledDate: new Date(2024, 9, 10, 18, 0), // Oct 10, 2024, 6:00 PM
      equipmentType: 'Software',
    },
    {
      id: '5',
      title: 'Air Conditioning Service',
      type: 'preventive',
      workstationId: 'HVAC-001',
      location: 'CH Office',
      floor: '9th Floor',
      priority: 'medium',
      status: 'completed',
      assignedTo: 'Facilities Team',
      estimatedDuration: '6 hours',
      description: 'Quarterly HVAC maintenance and filter replacement',
      scheduledDate: new Date(2024, 9, 3, 8, 0), // Oct 3, 2024, 8:00 AM
      completedDate: new Date(2024, 9, 3, 14, 0),
      equipmentType: 'HVAC',
      nextDue: new Date(2025, 0, 3), // Next quarter
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'overdue':
        return 'bg-red-500';
      case 'scheduled':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'bg-red-500';
      case 'corrective':
        return 'bg-amber-500';
      case 'preventive':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const filteredItems = filterType === 'all' 
    ? maintenanceItems 
    : maintenanceItems.filter(item => item.type === filterType);

  const todaysMaintenance = maintenanceItems.filter(item => {
    const today = new Date();
    const itemDate = item.scheduledDate;
    return itemDate.toDateString() === today.toDateString();
  });

  const overdueMaintenance = maintenanceItems.filter(item => item.status === 'overdue');
  const upcomingMaintenance = maintenanceItems.filter(item => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return item.scheduledDate > new Date() && item.scheduledDate <= nextWeek && item.status === 'scheduled';
  });

  // Generate week view
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays(currentWeek);
  const nextWeek = () => {
    const next = new Date(currentWeek);
    next.setDate(currentWeek.getDate() + 7);
    setCurrentWeek(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentWeek);
    prev.setDate(currentWeek.getDate() - 7);
    setCurrentWeek(prev);
  };

  const getItemsForDate = (date: Date) => {
    return maintenanceItems.filter(item => 
      item.scheduledDate.toDateString() === date.toDateString()
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Maintenance Schedule</h1>
          <p className="text-slate-600">
            Track and manage workstation maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Schedule
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Today's Tasks</p>
                <p className="text-2xl text-blue-600">{todaysMaintenance.length}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overdue</p>
                <p className="text-2xl text-red-600">{overdueMaintenance.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">This Week</p>
                <p className="text-2xl text-amber-600">{upcomingMaintenance.length}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed</p>
                <p className="text-2xl text-green-600">
                  {maintenanceItems.filter(item => item.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overdueMaintenance.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-medium text-red-900">Overdue Maintenance Alert</h3>
            </div>
            <p className="text-sm text-red-700 mb-3">
              {overdueMaintenance.length} maintenance task{overdueMaintenance.length > 1 ? 's are' : ' is'} overdue
            </p>
            <div className="space-y-1">
              {overdueMaintenance.map(item => (
                <p key={item.id} className="text-xs text-red-600">
                  • {item.title} - Due: {item.scheduledDate.toLocaleDateString()}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter and List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maintenance List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Maintenance Tasks</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="text-sm border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="all">All Types</option>
                    <option value="preventive">Preventive</option>
                    <option value="corrective">Corrective</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedEvent(item)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <div className="flex gap-1">
                      <Badge className={getStatusColor(item.status)} size="sm">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>{item.location} - {item.floor}</p>
                    <p>Due: {item.scheduledDate.toLocaleDateString()}</p>
                    <p>Duration: {item.estimatedDuration}</p>
                  </div>

                  <div className="flex gap-1 mt-2">
                    <Badge className={getTypeColor(item.type)} size="sm">
                      {item.type}
                    </Badge>
                    <Badge className={getPriorityColor(item.priority)} size="sm">
                      {item.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Maintenance Calendar</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={prevWeek}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium px-4">
                    {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
                  </span>
                  <Button variant="outline" size="sm" onClick={nextWeek}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div key={day} className="text-center font-medium text-sm text-slate-600 p-2">
                    {day}
                  </div>
                ))}
                
                {weekDays.map((date, index) => {
                  const dayItems = getItemsForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div 
                      key={index} 
                      className={`border border-slate-200 rounded-lg p-2 min-h-[120px] ${
                        isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
                      }`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        isToday ? 'text-blue-600' : 'text-slate-700'
                      }`}>
                        {date.getDate()}
                      </div>
                      
                      <div className="space-y-1">
                        {dayItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className={`text-xs p-1 rounded cursor-pointer truncate ${
                              item.status === 'overdue' ? 'bg-red-100 text-red-700 border border-red-300' :
                              item.status === 'in-progress' ? 'bg-blue-100 text-blue-700 border border-blue-300' :
                              item.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-300' :
                              'bg-amber-100 text-amber-700 border border-amber-300'
                            }`}
                            onClick={() => setSelectedEvent(item)}
                            title={item.title}
                          >
                            {item.title.length > 20 ? `${item.title.substring(0, 20)}...` : item.title}
                          </div>
                        ))}
                        
                        {dayItems.length > 3 && (
                          <div className="text-xs text-slate-500 text-center">
                            +{dayItems.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>Close</Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={getStatusColor(selectedEvent.status)}>
                  {selectedEvent.status}
                </Badge>
                <Badge className={getTypeColor(selectedEvent.type)}>
                  {selectedEvent.type}
                </Badge>
                <Badge className={getPriorityColor(selectedEvent.priority)}>
                  {selectedEvent.priority} priority
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Workstation ID</p>
                  <p className="font-medium">{selectedEvent.workstationId}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-medium">{selectedEvent.location} - {selectedEvent.floor}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Assigned To</p>
                  <p className="font-medium">{selectedEvent.assignedTo}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estimated Duration</p>
                  <p className="font-medium">{selectedEvent.estimatedDuration}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Equipment Type</p>
                  <p className="font-medium">{selectedEvent.equipmentType}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Scheduled Date</p>
                  <p className="font-medium">{selectedEvent.scheduledDate.toLocaleString()}</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">Description</p>
                <p className="text-sm text-blue-700">{selectedEvent.description}</p>
              </div>

              {selectedEvent.lastMaintenance && (
                <div className="text-sm text-slate-600">
                  <p>Last Maintenance: {selectedEvent.lastMaintenance.toLocaleDateString()}</p>
                </div>
              )}

              {selectedEvent.nextDue && (
                <div className="text-sm text-slate-600">
                  <p>Next Due: {selectedEvent.nextDue.toLocaleDateString()}</p>
                </div>
              )}

              {selectedEvent.completedDate && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    Completed: {selectedEvent.completedDate.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                {selectedEvent.status === 'scheduled' && (
                  <Button>Start Maintenance</Button>
                )}
                {selectedEvent.status === 'in-progress' && (
                  <Button>Mark Complete</Button>
                )}
                <Button variant="outline">Reschedule</Button>
                <Button variant="outline">Add Notes</Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}