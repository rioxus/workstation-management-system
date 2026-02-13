import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage';
import { RoleSelector } from './components/RoleSelector';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RequestsTable } from './components/RequestsTable';
import { AllocationsPage } from './components/AllocationsPage';
import { RequestForm } from './components/RequestForm';
import { TechnicalTasks } from './components/TechnicalTasks';
import { MaintenanceSchedule } from './components/MaintenanceSchedule';
import { UserDashboard } from './components/UserDashboard';
import { WorkstationDataTabs } from './components/WorkstationDataTabs';
import { CredentialsManagement } from './components/CredentialsManagement';
import { SupabaseStatus } from './components/SupabaseStatus';
import { SetupBanner } from './components/SetupBanner';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { dataService } from './lib/dataService';
import { db, supabase } from './lib/supabase';
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticatedEmployee, setAuthenticatedEmployee] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<any>(null); // Store the actual logged-in user data

  // Data states
  const [requests, setRequests] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [seatBookings, setSeatBookings] = useState<any[]>([]);
  const [labAssetRanges, setLabAssetRanges] = useState<any[]>([]); // Add lab asset ranges state
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  const [allocationRequest, setAllocationRequest] = useState<any>(null); // For allocation workflow

  // Load data from Supabase when role is selected
  useEffect(() => {
    if (selectedRole) {
      loadDataFromSupabase();
      loadCurrentUserData();
    }
  }, [selectedRole]);

  // Suppress Figma Make edge function deployment errors (cosmetic only)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress Supabase edge function deployment errors (463 status)
      // These are Figma Make platform errors and don't affect application functionality
      if (event.message?.includes('edge_functions') || 
          event.message?.includes('make-server/deploy') ||
          event.message?.includes('status 463')) {
        event.preventDefault();
        event.stopPropagation();
        console.log('ℹ️ Suppressed Figma Make edge function deployment error (cosmetic only)');
        return false;
      }
    };

    window.addEventListener('error', handleError);
    
    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  const handleRoleSelect = async (roleName: string) => {
    setSelectedRole(roleName);
    toast.success(`Welcome! Accessing ${roleName} interface`);
  };

  const handleBackToRoleSelection = () => {
    setSelectedRole(null);
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  const handleLogin = (employee: any) => {
    setIsAuthenticated(true);
    setAuthenticatedEmployee(employee);
    setSelectedRole(employee.role);
    setCurrentUser(employee);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthenticatedEmployee(null);
    setSelectedRole(null);
    setCurrentUser(null);
    setActivePage('dashboard');
  };

  const loadDataFromSupabase = async () => {
    try {
      // Load data from Supabase
      const [requestsData, stats, workstationMapData, seatBookingsData, labAssetRangesData] = await Promise.all([
        dataService.getRequests(),
        dataService.getDashboardStats(selectedRole || 'Admin'),
        dataService.getWorkstationMapData().catch(() => []), // Gracefully handle if workstations don't exist yet
        dataService.getSeatBookings().catch(() => []), // Gracefully handle if seat bookings don't exist yet
        dataService.labAssetRanges.getAll().catch(() => []) // Fetch lab asset ranges
      ]);

      setRequests(requestsData);
      setDashboardStats(stats);
      setWorkstations(workstationMapData);
      setSeatBookings(seatBookingsData);
      setLabAssetRanges(labAssetRangesData); // Set lab asset ranges state
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
        divisionBreakdown: [],
        labAllocations: [],
        divisionRecords: []
      };
      setDashboardStats(mockStats);
    }
  };

  const loadCurrentUserData = async () => {
    try {
      // Pass the authenticated employee's ID to get the correct user data
      const employeeId = authenticatedEmployee?.employee_id || currentUser?.employeeId;
      const userData = await dataService.getCurrentUser(selectedRole || 'Admin', employeeId);
      setCurrentUser(userData);
    } catch (error) {
      console.error('Error loading current user data:', error);
      // Don't show error toast - use fallback data
    }
  };

  const getUserInfo = () => {
    // If we have currentUser data from database, use it
    if (currentUser) {
      return currentUser;
    }
    
    // Otherwise fall back to defaults
    switch (selectedRole) {
      case 'Admin':
        return { 
          name: 'Admin User', 
          division: 'Administration', 
          employeeId: 'ADMIN001',
          email: 'admin@company.com',
          role: 'Admin'
        };
      case 'Manager':
        return { 
          name: 'Angkik Test User 1', 
          division: 'Innovation Labs', 
          employeeId: 'TEST001',
          email: 'angkik.borthakur@hitechdigital.com',
          role: 'Manager'
        };
      case 'Technical':
        return { 
          name: 'Angkik Test User 2', 
          division: 'Technical Support', 
          employeeId: 'TEST002',
          email: 'angkik.borthakur@hitechdigital.com',
          role: 'Technical'
        };
      default:
        return { 
          name: 'User', 
          division: 'General', 
          employeeId: 'USR001',
          email: 'angkik.borthakur@hitechdigital.com',
          role: 'User'
        };
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
          requestorEmail: currentUserInfo.email, // Add email for notifications
          justification: formData.justification || `Seat booking request`,
          remarks: formData.remarks || '', // Manager's remarks
          requestedAllocationDate: formData.requestedAllocationDate || '', // Requested allocation date
          bookingDate: formData.bookingDate,
          isBulkRequest: formData.isBulkRequest || false, // Pass bulk request flag
        };
        
        await dataService.createRequest(requestData);
      } else {
        // Regular request submission - USE dataService instead of db.requests directly
        // This ensures email notifications are sent
        const employee = await db.employees.getByEmployeeId(formData.requestorId || currentUserInfo.employeeId);
        
        // Use dataService.createRequest to ensure emails are sent
        const requestData = {
          requestorId: employee.id,
          requestorEmployeeId: formData.requestorEmployeeId || currentUserInfo.employeeId,
          requestorName: formData.requestorName || currentUserInfo.name,
          division: formData.division || currentUserInfo.division || '',
          numEmployees: formData.numWorkstations || 1,
          numWorkstations: formData.numWorkstations || 1,
          location: formData.location || '',
          floor: formData.floor || '',
          justification: formData.justification || 'Seat booking request',
          remarks: formData.remarks || '', // Manager's remarks
          requestedAllocationDate: formData.requestedAllocationDate || '', // Requested allocation date
        };
        
        await dataService.createRequest(requestData);
      }
      
      // Reload data
      await loadDataFromSupabase();
      
      toast.success('Request submitted successfully!');
      setActivePage('dashboard');
    } catch (error) {
      console.error('❌ Error submitting request:', error);
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

  const handleUpdateTaskStatus = (taskId: string, status: string, notes?: string) => {
    toast.success(`Task ${taskId} status updated to ${status}`);
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
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

  const handleAllocate = (request: any) => {
    setAllocationRequest(request);
    setActivePage('allocations');
  };

  const handleBackFromAllocations = () => {
    setAllocationRequest(null);
    setActivePage('requests');
  };

  const handleSaveAllocation = async (allocationData: any) => {
    // This will be called for partial saves
    // Reload data to update the status in System Requests table
    await loadDataFromSupabase();
  };

  const handleFinalApprove = async (requestId: string, allAllocations: any[]) => {
    try {
      const loadingToast = toast.loading('Saving allocations and approving request...');

      // Get current user info
      const currentUserInfo = getUserInfo();
      
      // Get all labs to find existing division records
      const allLabs = await db.labs.getAll();
      
      // Get the request details to know which division to assign
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        throw new Error('Request not found');
      }
      
      // REMOVED: Seat booking creation logic
      // Seat bookings are already created when admin clicks "Save Allocation" in AllocationsPage
      // They exist in the database with status='pending'
      // This function only needs to:
      // 1. Update labs table with asset ID ranges
      // 2. Call approveRequest to change status from 'pending' to 'approved'
      
      // Step 1: Group allocations by lab and division to update lab_allocations table
      const labDivisionMap = new Map<string, { 
        labName: string; 
        labId: string; 
        floorId: string; 
        division: string; 
        count: number;
        assetIdRange: string | null;
      }>();
      
      // Process each allocation
      for (const allocation of allAllocations) {
        const key = `${allocation.labName}-${allocation.division}`;
        
        if (!labDivisionMap.has(key)) {
          labDivisionMap.set(key, {
            labName: allocation.labName,
            labId: allocation.labId,
            floorId: allocation.floorId,
            division: allocation.division,
            count: 0,
            assetIdRange: allocation.assetIdRange || null
          });
        } else {
          // If this lab-division already exists, concatenate asset ID ranges
          const existing = labDivisionMap.get(key)!;
          if (allocation.assetIdRange && existing.assetIdRange) {
            existing.assetIdRange = `${existing.assetIdRange}, ${allocation.assetIdRange}`;
          } else if (allocation.assetIdRange) {
            existing.assetIdRange = allocation.assetIdRange;
          }
        }
        
        // Add the number of seats allocated in this lab for this division
        labDivisionMap.get(key)!.count += allocation.seats.length;
      }
      
      // Step 2: Update or create lab_allocations records for each division WITH Asset ID Range
      // This updates the workstation data table for live tracking
      for (const [key, info] of labDivisionMap.entries()) {
        // Find existing division record in lab_allocations
        const existingRecord = allLabs.find(
          lab => lab.lab_name === info.labName && 
                 lab.floor_id === info.floorId && 
                 lab.division === info.division
        );
        
        if (existingRecord) {
          // Update existing record - increment in_use and update asset_id_range
          const updateData: any = {
            in_use: (existingRecord.in_use || 0) + info.count
          };
          
          // Update asset_id_range if provided
          if (info.assetIdRange) {
            // If existing record has asset_id_range, concatenate
            if (existingRecord.asset_id_range && existingRecord.asset_id_range.trim() !== '') {
              updateData.asset_id_range = `${existingRecord.asset_id_range}, ${info.assetIdRange}`;
            } else {
              updateData.asset_id_range = info.assetIdRange;
            }
          }
          
          await db.labs.update(existingRecord.id, updateData);
        } else {
          // Create new division record in lab_allocations
          // First get the lab allocation (without division) to know total_workstations
          const labAllocation = allLabs.find(
            lab => lab.lab_name === info.labName && 
                   lab.floor_id === info.floorId && 
                   (!lab.division || lab.division.trim() === '')
          );
          
          if (!labAllocation) {
            // Critical error: Lab allocation not found
            throw new Error(
              `Cannot allocate seats: Lab "${info.labName}" not found in Workstation Data Management. ` +
              `Please ensure the lab is created in Floor & Lab Allocation Management before allocating seats.`
            );
          }
          
          await db.labs.create({
            floor_id: info.floorId,
            lab_name: info.labName,
            division: info.division,
            total_workstations: labAllocation.total_workstations,
            assigned: 0,
            in_use: info.count,
            asset_id_range: info.assetIdRange || '' // NEW: Save asset ID range
          });
        }
      }

      // Step 3: Approve the request (this will also approve all seat bookings and send email)
      await dataService.approveRequest(requestId, currentUserInfo.employeeId, 'Workstations allocated successfully', true); // Pass true to indicate labs already updated

      // Reload data to reflect changes in all views
      await loadDataFromSupabase();

      toast.dismiss(loadingToast);
      toast.success('✅ Allocations saved and request approved! Workstation data has been updated.');
      
      // Navigate back to requests
      setAllocationRequest(null);
      setActivePage('requests');
    } catch (error) {
      console.error('Error saving allocations:', error);
      toast.error('Failed to save allocations. Please try again.');
    }
  };

  // Helper function to parse asset ID range (simple version)
  const parseAssetIdRange = (rangeStr: string): number[] => {
    if (!rangeStr || rangeStr.trim() === '') return [];
    
    const ids: number[] = [];
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      const numberPart = part.split('/').pop() || part;
      
      if (numberPart.includes('-')) {
        const [start, end] = numberPart.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            ids.push(i);
          }
        }
      } else {
        const num = parseInt(numberPart.trim());
        if (!isNaN(num)) {
          ids.push(num);
        }
      }
    }
    
    return ids;
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

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

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
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        userRole={selectedRole.toLowerCase()}
        userName={userInfo.name}
        pendingCount={pendingCount}
        onLogout={handleLogout}
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
                 activePage === 'allocations' ? 'Workstation Allocations' :
                 activePage === 'approvals' ? 'Allocations' :
                 activePage === 'workstation-management' ? 'Workstation Data' :
                 activePage === 'credentials' ? 'Employee Credentials' :
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
              onRefreshData={loadDataFromSupabase}
              onNavigateToAddRequest={() => setActivePage('add-request')}
            />
          )}

          {activePage === 'dashboard' && selectedRole !== 'Manager' && dashboardStats && (
            <Dashboard 
              stats={{
                ...dashboardStats,
                labAssetRanges // Add lab asset ranges to stats
              }} 
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
              onApprove={handleApprove}
              onReject={handleReject}
              onCleanTestData={selectedRole === 'Admin' ? handleCleanTestData : undefined}
              onAllocate={handleAllocate}
            />
          )}

          {activePage === 'add-request' && (
            <RequestForm
              onSubmit={handleSubmitRequest}
              onCancel={() => setActivePage('requests')} // Navigate back to requests page
              userInfo={userInfo}
            />
          )}

          {activePage === 'allocations' && (
            <AllocationsPage
              request={allocationRequest}
              onBack={handleBackFromAllocations}
              onSaveAllocation={handleSaveAllocation}
              onFinalApprove={handleFinalApprove}
            />
          )}

          {activePage === 'workstation-management' && (
            <WorkstationDataTabs 
              onDataChange={loadDataFromSupabase}
            />
          )}

          {activePage === 'credentials' && (
            <CredentialsManagement 
              onDataChange={() => {
                loadDataFromSupabase();
                loadCurrentUserData(); // Reload user data when credentials change
              }}
            />
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
                {selectedRequest.floor && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Floor</p>
                    <p className="text-sm">{selectedRequest.floor}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-500 mb-1">Requested Allocation Date</p>
                  <p className="text-sm font-medium text-blue-600">
                    {selectedRequest.requestedAllocationDate 
                      ? new Date(selectedRequest.requestedAllocationDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          weekday: 'short'
                        })
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Request Date</p>
                  <p className="text-sm">
                    {selectedRequest.createdAt 
                      ? new Date(selectedRequest.createdAt).toLocaleString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'N/A'}
                  </p>
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
              
              {/* Display Remarks from Manager */}
              {selectedRequest.remarks && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm mb-1">
                    <strong className="text-amber-900">Manager's Remarks:</strong>
                  </p>
                  <p className="text-sm text-amber-800">{selectedRequest.remarks}</p>
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