import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  MapPin, 
  Calendar,
  Wrench,
  Monitor,
  Package,
  FileText,
  Timer
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface TechnicalTask {
  id: string;
  requestId: string;
  title: string;
  requestorName: string;
  division: string;
  location: string;
  floor: string;
  numEmployees: number;
  equipmentRequired: string[];
  specialRequirements?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  assignedTo?: string;
  estimatedTime: string;
  actualTime?: string;
  notes?: string;
  createdAt: string;
  dueDate: string;
  completedAt?: string;
}

interface TechnicalTasksProps {
  requests: any[];
  onUpdateTaskStatus: (taskId: string, status: string, notes?: string) => void;
}

export function TechnicalTasks({ requests, onUpdateTaskStatus }: TechnicalTasksProps) {
  const [selectedTask, setSelectedTask] = useState<TechnicalTask | null>(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [timeSpent, setTimeSpent] = useState('');

  // Convert approved requests to technical tasks
  const technicalTasks: TechnicalTask[] = requests
    .filter(req => req.status === 'approved')
    .map(req => ({
      id: `task-${req.id}`,
      requestId: req.id,
      title: `Setup ${req.numEmployees} workstations - ${req.division}`,
      requestorName: req.requestorName,
      division: req.division,
      location: req.location,
      floor: req.floor,
      numEmployees: req.numEmployees,
      equipmentRequired: req.equipmentNeeded ? req.equipmentDetails?.split(', ') || [] : ['Standard Setup'],
      specialRequirements: req.specialRequirements,
      priority: req.numEmployees > 5 ? 'high' : req.numEmployees > 2 ? 'medium' : 'low',
      status: 'pending',
      estimatedTime: `${req.numEmployees * 2} hours`,
      createdAt: req.approvedAt || req.createdAt,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    }));

  // Add some mock in-progress and completed tasks
  const mockTasks: TechnicalTask[] = [
    {
      id: 'task-in-progress-1',
      requestId: 'req-ip-1',
      title: 'Setup 3 workstations - Marketing',
      requestorName: 'Alice Chen',
      division: 'Marketing',
      location: 'CH Office',
      floor: '5th Floor',
      numEmployees: 3,
      equipmentRequired: ['PC', 'Monitor', 'Keyboard & Mouse'],
      priority: 'medium',
      status: 'in-progress',
      assignedTo: 'Technical User',
      estimatedTime: '6 hours',
      actualTime: '4 hours',
      notes: 'Network setup completed, installing software',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'task-completed-1',
      requestId: 'req-c-1',
      title: 'Setup 5 workstations - Finance',
      requestorName: 'Robert Kim',
      division: 'Finance',
      location: 'Gurukul Office',
      floor: '3rd Floor',
      numEmployees: 5,
      equipmentRequired: ['PC', 'Monitor', 'Headset'],
      priority: 'high',
      status: 'completed',
      assignedTo: 'Technical User',
      estimatedTime: '10 hours',
      actualTime: '8 hours',
      notes: 'Setup completed successfully. All systems tested and operational.',
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      dueDate: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ];

  const allTasks = [...technicalTasks, ...mockTasks];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'on-hold':
        return 'bg-amber-500';
      case 'pending':
        return 'bg-slate-500';
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

  const handleUpdateStatus = (taskId: string, newStatus: string) => {
    const notes = taskNotes || undefined;
    const time = timeSpent || undefined;
    
    onUpdateTaskStatus(taskId, newStatus, notes);
    
    toast.success(`Task status updated to ${newStatus}`);
    setSelectedTask(null);
    setTaskNotes('');
    setTimeSpent('');
  };

  const filterTasks = (status: string) => {
    return allTasks.filter(task => task.status === status);
  };

  const TaskCard = ({ task }: { task: TechnicalTask }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setSelectedTask(task)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-medium mb-1">{task.title}</h3>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.requestorName}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {task.location} - {task.floor}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Equipment</p>
            <p className="font-medium">{task.equipmentRequired.join(', ')}</p>
          </div>
          <div>
            <p className="text-slate-500">Estimated Time</p>
            <p className="font-medium">{task.estimatedTime}</p>
          </div>
        </div>

        {task.specialRequirements && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
            <p className="text-blue-700"><strong>Special Requirements:</strong> {task.specialRequirements}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-slate-500">
          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
          {task.assignedTo && <span>Assigned to: {task.assignedTo}</span>}
        </div>
      </CardContent>
    </Card>
  );

  const pendingTasks = filterTasks('pending');
  const inProgressTasks = filterTasks('in-progress');
  const completedTasks = filterTasks('completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">Technical Tasks</h1>
          <p className="text-slate-600">
            Manage workstation setup and maintenance tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Task
          </Button>
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Tasks</p>
                <p className="text-2xl text-slate-600">{pendingTasks.length}</p>
              </div>
              <Clock className="w-8 h-8 text-slate-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl text-blue-600">{inProgressTasks.length}</p>
              </div>
              <Wrench className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed Today</p>
                <p className="text-2xl text-green-600">{completedTasks.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg. Setup Time</p>
                <p className="text-2xl text-purple-600">6.5h</p>
              </div>
              <Timer className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({inProgressTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTasks.length})</TabsTrigger>
          <TabsTrigger value="all">All Tasks ({allTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingTasks.length > 0 ? (
            <div className="grid gap-4">
              {pendingTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No pending tasks</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {inProgressTasks.length > 0 ? (
            <div className="grid gap-4">
              {inProgressTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Wrench className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No tasks in progress</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length > 0 ? (
            <div className="grid gap-4">
              {completedTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No completed tasks</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4">
            {allTasks.map(task => <TaskCard key={task.id} task={task} />)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{selectedTask.title}</h2>
              <Button variant="outline" onClick={() => setSelectedTask(null)}>Close</Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Requestor</p>
                  <p className="font-medium">{selectedTask.requestorName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Division</p>
                  <p className="font-medium">{selectedTask.division}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Location</p>
                  <p className="font-medium">{selectedTask.location} - {selectedTask.floor}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Employees</p>
                  <p className="font-medium">{selectedTask.numEmployees}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Equipment Required</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTask.equipmentRequired.map((item, index) => (
                    <Badge key={index} variant="outline">{item}</Badge>
                  ))}
                </div>
              </div>

              {selectedTask.specialRequirements && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">Special Requirements</p>
                  <p className="text-sm text-blue-700">{selectedTask.specialRequirements}</p>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Update Status</label>
                  <Select defaultValue={selectedTask.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Time Spent (hours)</label>
                  <input
                    type="text"
                    placeholder="e.g., 4.5"
                    value={timeSpent}
                    onChange={(e) => setTimeSpent(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-md"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Notes</label>
                  <Textarea
                    placeholder="Add progress notes or completion details..."
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={() => handleUpdateStatus(selectedTask.id, 'in-progress')}>
                    Start Task
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedTask.id, 'completed')}>
                    Mark Complete
                  </Button>
                  <Button variant="outline" onClick={() => handleUpdateStatus(selectedTask.id, 'on-hold')}>
                    Put On Hold
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}