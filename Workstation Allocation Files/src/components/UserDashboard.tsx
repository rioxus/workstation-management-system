import { CheckCircle, Clock, AlertCircle, XCircle, Calendar, RefreshCw, FileText, Eye, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { UserWorkstationView } from './UserWorkstationView';
import { ManagerDivisionBreakdown } from './ManagerDivisionBreakdown';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { db } from '../lib/supabase';

interface UserDashboardProps {
  requests: any[];
  userInfo: any;
  onNavigateToRequests: () => void;
  dashboardStats?: any;
  onAddRequest?: (request: any) => void;
  seatBookings?: any[];
  onRefreshData?: () => void;
  onNavigateToAddRequest?: () => void;
}

export function UserDashboard({ requests, userInfo, onNavigateToRequests, dashboardStats, onAddRequest, seatBookings = [], onRefreshData, onNavigateToAddRequest }: UserDashboardProps) {
  // State for request details dialog
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [partiallyAllocatedLabs, setPartiallyAllocatedLabs] = useState<string[]>([]);
  const [partiallyAllocatedCount, setPartiallyAllocatedCount] = useState(0);
  
  // Load partially allocated seats when dialog opens with a partially_allocated request
  useEffect(() => {
    if (selectedRequest && selectedRequest.status === 'partially_allocated') {
      loadPartiallyAllocatedSeats(selectedRequest.id);
    } else {
      setPartiallyAllocatedLabs([]);
      setPartiallyAllocatedCount(0);
    }
  }, [selectedRequest]);

  const loadPartiallyAllocatedSeats = async (requestId: string) => {
    try {
      const allSeatBookings = await db.seatBookings.getAll();
      // Find seats allocated for this request (status: pending)
      const relevantBookings = allSeatBookings.filter(
        (booking: any) => booking.request_id === requestId && booking.status === 'pending'
      );
      
      const count = relevantBookings.length;
      
      // Get unique lab names
      const labs = Array.from(new Set(
        relevantBookings.map((booking: any) => booking.lab_name).filter(Boolean)
      ));
      
      setPartiallyAllocatedCount(count);
      setPartiallyAllocatedLabs(labs);
    } catch (error) {
      console.error('Error loading partial allocations:', error);
      setPartiallyAllocatedLabs([]);
      setPartiallyAllocatedCount(0);
    }
  };
  
  // Filter requests for current user (simulating user-specific requests)
  // CRITICAL: For managers, filter by assigned divisions (support comma-separated divisions)
  const userRequests = requests.filter(req => {
    // If the user has divisions assigned (managers have comma-separated divisions)
    if (userInfo.division && userInfo.division !== 'General') {
      // Split the user's assigned divisions (comma-separated string)
      const assignedDivisions = userInfo.division.split(',').map((d: string) => d.trim());
      
      // Check if the request's division matches ANY of the user's assigned divisions
      return assignedDivisions.includes(req.division);
    }
    
    // Fallback: filter by employee ID (for non-managers)
    return req.requestorId === userInfo.employeeId;
  });
  
  // Calculate stats
  const totalRequests = userRequests.length;
  const pendingRequests = userRequests.filter(req => req.status === 'pending').length;
  const approvedRequests = userRequests.filter(req => req.status === 'approved').length;
  const rejectedRequests = userRequests.filter(req => req.status === 'rejected').length;

  // Pie chart data
  const pieData = [
    { name: 'Approved', value: approvedRequests, color: '#22c55e' },
    { name: 'Pending', value: pendingRequests, color: '#f59e0b' },
    { name: 'Rejected', value: rejectedRequests, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Recent activity stats
  const recentRequests = userRequests.slice(0, 3);
  const avgResponseTime = '2.3 days'; // Mock data

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      case 'pending':
        return 'bg-amber-500';
      case 'partially_allocated':
        return 'bg-yellow-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      case 'pending':
        return Clock;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6">
      {/* Manager Division Access Info Banner - REMOVED */}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">My Dashboard</h1>
          <p className="text-slate-600">
            Track your workstation requests and submission history
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onNavigateToAddRequest && (
            <Button
              onClick={onNavigateToAddRequest}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Workstations
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Requests</p>
                <p className="text-3xl text-blue-600">{totalRequests}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Approved</p>
                <p className="text-3xl text-green-600">{approvedRequests}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pending</p>
                <p className="text-3xl text-amber-600">{pendingRequests}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager Division Breakdown - Only visible for Managers */}
      {userInfo.role === 'Manager' && (
        <ManagerDivisionBreakdown 
          divisionRecords={dashboardStats?.divisionRecords || []}
          managerDivisions={
            userInfo.division 
              ? userInfo.division.split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 0)
              : []
          }
        />
      )}

      {/* User Workstation View */}
      <UserWorkstationView 
        data={dashboardStats || { labAllocations: [], divisionRecords: [] }}
        enableBooking={false}
        onBookingSubmit={onAddRequest}
        userInfo={userInfo}
        seatBookings={seatBookings}
        onRefreshData={onRefreshData}
      />

      {/* Recent Requests Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Requests</CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onNavigateToRequests}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {userRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((request) => {
                const StatusIcon = getStatusIcon(request.status);
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getStatusColor(request.status)}`}>
                        <StatusIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{request.division}</p>
                        <p className="text-xs text-slate-500">
                          {request.numWorkstations || request.numEmployees} workstations • {request.location} • {request.floor}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setDetailsDialogOpen(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                
                {/* Only show Location and Floor for non-bulk requests */}
                {selectedRequest.location && selectedRequest.location.trim() !== '' && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Preferred Location</p>
                    <p className="text-sm">{selectedRequest.location}</p>
                  </div>
                )}
                
                {selectedRequest.requestedAllocationDate && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Requested Allocation Date</p>
                    <p className="text-sm font-medium text-blue-600">
                      {new Date(selectedRequest.requestedAllocationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {selectedRequest.labName && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Lab</p>
                    <p className="text-sm">{selectedRequest.labName}</p>
                  </div>
                )}
              </div>

              {/* Show remarks/special requirements for bulk requests */}
              {(selectedRequest.remarks || selectedRequest.specialRequirements) && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm mb-1">
                    <strong>Remarks:</strong>
                  </p>
                  <p className="text-sm text-slate-700">{selectedRequest.remarks || selectedRequest.specialRequirements}</p>
                </div>
              )}

              {/* Equipment Requirements section removed - no longer tracking PC/Monitor requirements */}

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

              {selectedRequest.status === 'partially_allocated' && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <div className="space-y-2">
                      <p>
                        <strong>{partiallyAllocatedCount} seats</strong> have been partially allocated for this request.
                        {partiallyAllocatedLabs.length > 0 && (
                          <>
                            {' '}The seats are allocated in the following lab{partiallyAllocatedLabs.length > 1 ? 's' : ''}:
                          </>
                        )}
                      </p>
                      {partiallyAllocatedLabs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {partiallyAllocatedLabs.map((lab, index) => (
                            <Badge key={index} className="bg-amber-600 hover:bg-amber-700 text-white">
                              {lab}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs mt-2">
                        Your request is being processed. The admin will allocate the remaining seats soon.
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}