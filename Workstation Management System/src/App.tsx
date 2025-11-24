import React, { useState, useEffect } from 'react';
import { RoleSelector } from './components/RoleSelector';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RequestsTable } from './components/RequestsTable';
import { ApprovalsPage } from './components/ApprovalsPage';
import { RequestForm } from './components/RequestForm';
import { WorkstationRegistryAdmin } from './components/WorkstationRegistryAdmin';
import { AIAnalytics } from './components/AIAnalytics';
import { EquipmentInventory } from './components/EquipmentInventory';
import { TechnicalTasks } from './components/TechnicalTasks';
import { MaintenanceSchedule } from './components/MaintenanceSchedule';
import { UserDashboard } from './components/UserDashboard';
import { WorkstationManagement } from './components/WorkstationManagement';
import { SupabaseStatus } from './components/SupabaseStatus';
import { SetupBanner } from './components/SetupBanner';
import { DatabaseKeepAlive } from './components/DatabaseKeepAlive';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { dataService } from './lib/dataService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './components/ui/dialog';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Label } from './components/ui/label';
import { Package } from 'lucide-react';

export default function App() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('dashboard');

  // Data states
  const [requests, setRequests] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [seatBookings, setSeatBookings] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [equipmentDetails, setEquipmentDetails] = useState('');
  const [showSetupBanner, setShowSetupBanner] = useState(false);

  // Load data from Supabase when role is selected
  useEffect(() => {
    if (selectedRole) {
      loadDataFromSupabase();
    }
  }, [selectedRole]);

  const handleRoleSelect = (roleName: string) => {
    setSelectedRole(roleName);
    toast.success(`Welcome! Accessing ${roleName} interface`);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setActivePage('dashboard');
  };

  const loadDataFromSupabase = async () => {
    try {
      // Load data from Supabase
      const [requestsData, stats, workstationMapData, seatBookingsData] = await Promise.all([
        dataService.getRequests(),
        dataService.getDashboardStats(selectedRole || 'Admin'),
        dataService.getWorkstationMapData().catch(() => []), // Gracefully handle if workstations don't exist yet
        dataService.getSeatBookings().catch(() => []) // Gracefully handle if seat bookings don't exist yet
      ]);

      setRequests(requestsData);
      setDashboardStats(stats);
      setWorkstations(workstationMapData);
      setSeatBookings(seatBookingsData);
      setShowSetupBanner(false);
    } catch (error: any) {
      console.error('Error loading data from Supabase:', error);
      
      // Check if error is due to table not existing (database not set up)
      // PGRST205 is the error code for "Could not find table in schema cache"
      const isTableMissingError = 
        error?.code === 'PGRST205' || 
        error?.message?.includes('Could not find the table') ||
        error?.message?.includes('relation') || 
        error?.message?.includes('does not exist');
      
      if (isTableMissingError) {
        setShowSetupBanner(true);
        toast.info('Database setup required. Please run the SQL schema file.');
      } else {
        toast.error('Failed to load data. Please check your connection.');
      }
      
      // Fallback to minimal mock data on error
      const mockStats = {
        totalWorkstations: 0,
        occupiedWorkstations: 0,
        availableWorkstations: 0,
        pendingRequests: 0,
        totalRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalEmployees: 0,
        utilizationRate: 0,
        requestsByFloor: [],
        recentRequests: [],
        floorBreakdown: [],
        divisionBreakdown: []
      };
      setDashboardStats(mockStats);
    }
  };

  const getUserInfo = () => {
    switch (selectedRole) {
      case 'Admin':
        return { name: 'Admin User', division: 'Administration', employeeId: 'ADM001' };
      case 'Manager':
        return { name: 'Manager User', division: 'IT Operations', employeeId: 'MGR001' };
      case 'Technical':
        return { name: 'Technical User', division: 'Technical Support', employeeId: 'TEC001' };
      default:
        return { name: 'User', division: 'General', employeeId: 'USR001' };
    }
  };

  const handleSubmitRequest = async (formData: any) => {
    try {
      const currentUserInfo = getUserInfo();
      
      // Check if this is a booking request from the workstation allocation
      if (formData.seats && formData.labName) {
        // Transform booking data to request format
        const requestData = {
          division: formData.division || currentUserInfo.division,
          location: formData.location || 'Commerce House',
          floor: formData.floor || 'Floor 9',
          labName: formData.labName,
          seats: formData.seats,
          numWorkstations: formData.numWorkstations,
          requestorName: formData.requestorName || currentUserInfo.name,
          requestorId: formData.requestorId || currentUserInfo.employeeId,
          justification: formData.justification || `Seat booking request`,
          shift: formData.shift || 'General',
          bookingDate: formData.bookingDate,
          requiresPC: formData.requiresPC || false,
          requiresMonitor: formData.requiresMonitor || false,
        };
        
        await dataService.createRequest(requestData);
      } else {
        // Regular request submission
        await dataService.createRequest({
          ...formData,
          requestorName: currentUserInfo.name,
          requestorId: currentUserInfo.employeeId,
          division: currentUserInfo.division,
        });
      }
      
      // Reload data
      await loadDataFromSupabase();
      
      toast.success('Request submitted successfully!');
      setActivePage('dashboard');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request. Please try again.');
    }
  };

  const handleApprove = async (requestId: string, notes: string) => {
    try {
      const currentUserInfo = getUserInfo();
      await dataService.approveRequest(requestId, currentUserInfo.employeeId, notes);
      
      // Reload data
      await loadDataFromSupabase();
      
      toast.success('Request approved successfully!');
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request. Please try again.');
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      await dataService.rejectRequest(requestId, reason);
      
      // Reload data
      await loadDataFromSupabase();
      
      toast.success('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request. Please try again.');
    }
  };

  const handleOrderEquipment = (itemId: string) => {
    toast.success(`Equipment order request submitted for item ${itemId}`);
  };

  const handleRequestEquipment = (requestId: string, equipmentDetails: string) => {
    setRequests(prev => prev.map(req => 
      req.id === requestId 
        ? { ...req, equipmentRequested: true, equipmentDetails, equipmentRequestedAt: new Date().toISOString() }
        : req
    ));
    toast.success('Equipment request submitted to Technical Team');
    setDetailsDialogOpen(false);
  };

  const handleUpdateTaskStatus = (taskId: string, status: string, notes?: string) => {
    toast.success(`Task ${taskId} status updated to ${status}`);
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setEquipmentDetails(request.equipmentDetails || '');
    setDetailsDialogOpen(true);
  };

  const handleCleanTestData = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL requests, seat bookings, and notifications. This action cannot be undone. Are you sure you want to continue?')) {
      return;
    }
    
    try {
      const loadingToast = toast.loading('Cleaning test data...');
      
      await dataService.cleanAllTestData();
      
      // Clear local state immediately
      setRequests([]);
      setSeatBookings([]);
      
      // Reload fresh data from database
      await loadDataFromSupabase();
      
      toast.dismiss(loadingToast);
      toast.success('✅ All test data has been successfully removed!');
    } catch (error) {
      console.error('Error cleaning test data:', error);
      toast.error('Failed to clean test data. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  if (!selectedRole) {
    return (
      <>
        <RoleSelector onSelectRole={handleRoleSelect} />
        <Toaster />
      </>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const userInfo = getUserInfo();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50">
      {/* Database Keep-Alive - Prevents Supabase free tier from going inactive */}
      <DatabaseKeepAlive />

      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        userRole={selectedRole.toLowerCase()}
        userName={userInfo.name}
        pendingCount={pendingCount}
        onLogout={handleBackToRoleSelection}
      />

      <main className="flex-1 overflow-y-auto pt-16 md:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          {/* Database Status Indicator */}
          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm md:text-base text-slate-600">
                {activePage === 'dashboard' ? 'Dashboard' : 
                 activePage === 'requests' ? 'System Requests' :
                 activePage === 'add-request' ? 'Add Request' :
                 activePage === 'approvals' ? 'Approvals' :
                 activePage === 'workstation-management' ? 'Workstation Data Management' :
                 activePage === 'workstations' ? 'Workstation Map' :
                 activePage === 'analytics' ? 'AI Analytics' :
                 activePage === 'equipment' ? 'Equipment Inventory' :
                 activePage === 'technical-tasks' ? 'Technical Tasks' :
                 activePage === 'maintenance' ? 'Maintenance Schedule' : ''}
              </h2>
            </div>
            <SupabaseStatus />
          </div>

          {/* Setup Banner - Shows when database is not configured */}
          {showSetupBanner && <SetupBanner />}

          {activePage === 'dashboard' && selectedRole === 'Manager' && (
            <UserDashboard
              requests={requests}
              userInfo={userInfo}
              onNavigateToRequests={() => setActivePage('requests')}
              dashboardStats={dashboardStats}
              onAddRequest={handleSubmitRequest}
              seatBookings={seatBookings}
              onCleanTestData={handleCleanTestData}
              onRefreshData={loadDataFromSupabase}
            />
          )}

          {activePage === 'dashboard' && selectedRole !== 'Manager' && dashboardStats && (
            <Dashboard 
              stats={dashboardStats} 
              userRole={selectedRole.toLowerCase()} 
              seatBookings={seatBookings}
            />
          )}

          {activePage === 'requests' && (
            <RequestsTable
              requests={requests}
              onViewDetails={handleViewDetails}
              userRole={selectedRole.toLowerCase()}
              userInfo={userInfo}
            />
          )}

          {activePage === 'add-request' && (
            <RequestForm
              onSubmit={handleSubmitRequest}
              userInfo={userInfo}
            />
          )}

          {activePage === 'approvals' && (
            <ApprovalsPage
              requests={requests}
              onApprove={handleApprove}
              onReject={handleReject}
              onCleanTestData={selectedRole === 'Admin' ? handleCleanTestData : undefined}
            />
          )}

          {activePage === 'workstation-management' && (
            <WorkstationManagement 
              onDataChange={loadDataFromSupabase}
            />
          )}

          {activePage === 'workstations' && <WorkstationRegistryAdmin />}

          {activePage === 'analytics' && <AIAnalytics />}

          {activePage === 'equipment' && (
            <EquipmentInventory onOrderEquipment={handleOrderEquipment} />
          )}

          {activePage === 'technical-tasks' && (
            <TechnicalTasks 
              requests={requests}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          )}

          {activePage === 'maintenance' && <MaintenanceSchedule />}
        </div>
      </main>

      {/* Request Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Complete information about this workstation request</DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg">{selectedRequest.requestorName}</h3>
                  <p className="text-sm text-slate-600">
                    {selectedRequest.division} • {selectedRequest.requestorId}
                  </p>
                </div>
                <Badge className={getStatusColor(selectedRequest.status)}>
                  {selectedRequest.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Number of Workstations</p>
                  <p className="text-sm">{selectedRequest.numWorkstations || selectedRequest.numEmployees}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Location</p>
                  <p className="text-sm">{selectedRequest.location}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Floor</p>
                  <p className="text-sm">{selectedRequest.floor}</p>
                </div>
              </div>

              {selectedRequest.specialRequirements && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm mb-1">
                    <strong>Special Requirements:</strong>
                  </p>
                  <p className="text-sm text-slate-700">{selectedRequest.specialRequirements}</p>
                </div>
              )}

              {selectedRequest.status === 'rejected' && selectedRequest.adminNotes && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm mb-1 text-red-900">
                    <strong>Reason for Rejection:</strong>
                  </p>
                  <p className="text-sm text-red-800">{selectedRequest.adminNotes}</p>
                </div>
              )}

              {selectedRequest.status === 'approved' && selectedRequest.adminNotes && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm mb-1 text-green-900">
                    <strong>Admin Notes:</strong>
                  </p>
                  <p className="text-sm text-green-800">{selectedRequest.adminNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}