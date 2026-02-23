import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Search, Eye, Download, Trash2, AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { RequestDetailsDialog } from './RequestDetailsDialog';
import { db } from '../lib/supabase';

interface Request {
  id: string;
  requestNumber: string;
  requestorId: string;
  requestorName: string;
  division: string;
  numEmployees: number;
  floor: string;
  location: string;
  preferredFloor?: string; // Add preferred floor field
  justification: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  adminNotes?: string;
  remarks?: string;
  labName?: string;
  numWorkstations?: number;
  assignedAssetIds?: string[];
  bookingDate?: string;
  requestedAllocationDate?: string;
  employeeExists?: boolean; // Track if employee still exists in system
}

interface RequestsTableProps {
  requests: Request[];
  onViewDetails: (request: Request) => void;
  userRole: string;
  userInfo?: { name: string; division: string; employeeId: string };
  onApprove?: (requestId: string, notes: string) => void;
  onReject?: (requestId: string, reason: string) => void;
  onCleanTestData?: () => void;
  onAllocate?: (request: Request) => void;
}

export function RequestsTable({ 
  requests, 
  onViewDetails, 
  userRole, 
  userInfo, 
  onApprove, 
  onReject, 
  onCleanTestData, 
  onAllocate 
}: RequestsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [partiallyAllocatedCount, setPartiallyAllocatedCount] = useState(0);
  const [partiallyAllocatedLabs, setPartiallyAllocatedLabs] = useState<string[]>([]);
  const [employeeExistenceMap, setEmployeeExistenceMap] = useState<Map<string, boolean>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false); // Loading state for approve/reject

  // Check if employees exist in the system
  useEffect(() => {
    const checkEmployeeExistence = async () => {
      const newMap = new Map<string, boolean>();
      
      for (const request of requests) {
        try {
          // Try to fetch employee by employee ID
          await db.employees.getByEmployeeId(request.requestorId);
          newMap.set(request.requestorId, true); // Employee exists
        } catch (error) {
          newMap.set(request.requestorId, false); // Employee doesn't exist
        }
      }
      
      setEmployeeExistenceMap(newMap);
    };

    if (requests.length > 0) {
      checkEmployeeExistence();
    }
  }, [requests]);

  // Calculate partially allocated seats count and labs when selected request changes
  useEffect(() => {
    if (selectedRequest && selectedRequest.status === 'partially_allocated') {
      loadPartiallyAllocatedSeats(selectedRequest.id);
    } else {
      setPartiallyAllocatedCount(0);
      setPartiallyAllocatedLabs([]);
    }
  }, [selectedRequest]);

  const loadPartiallyAllocatedSeats = async (requestId: string) => {
    try {
      const seatBookings = await db.seatBookings.getAll();
      // Count seats that are 'pending' status for this request
      const relevantBookings = seatBookings.filter(
        booking => booking.request_id === requestId && booking.status === 'pending'
      );
      const count = relevantBookings.length;
      
      // Get unique lab names where seats are allocated
      const labs = Array.from(new Set(
        relevantBookings.map(booking => booking.lab_name).filter(Boolean)
      ));
      
      setPartiallyAllocatedCount(count);
      setPartiallyAllocatedLabs(labs);
    } catch (error) {
      setPartiallyAllocatedCount(0);
      setPartiallyAllocatedLabs([]);
    }
  };

  // Filter requests based on role - CRITICAL SECURITY FIX
  // Managers should ONLY see their own requests (filtered by Employee ID), not other managers' requests
  const roleFilteredRequests = userRole === 'manager' && userInfo
    ? requests.filter(r => {
        // Filter strictly by Employee ID for complete data isolation
        return r.requestorId === userInfo.employeeId;
      })
    : requests;

  const filteredRequests = roleFilteredRequests.filter(request => {
    const matchesSearch =
      request.requestorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.division.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesDivision = divisionFilter === 'all' || request.division === divisionFilter;
    
    // MANAGER VIEW: Now includes 'partially_allocated' and 'partially_approved' status
    const isVisibleToManager = userRole === 'manager' 
      ? (request.status === 'approved' || request.status === 'rejected' || request.status === 'pending' || request.status === 'partially_allocated' || request.status === 'partially_approved')
      : true;

    return matchesSearch && matchesStatus && matchesDivision && isVisibleToManager;
  });

  const divisions = Array.from(new Set(roleFilteredRequests.map(r => r.division)));

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      completed: 'outline',
      partially_allocated: 'default',
      partially_approved: 'default',
    };
    
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      completed: 'Completed',
      partially_allocated: 'Partially Allocated',
      partially_approved: 'Partially Approved',
    };
    
    const isPartial = status === 'partially_allocated' || status === 'partially_approved';
    
    return (
      <Badge 
        variant={variants[status as keyof typeof variants] as any}
        className={isPartial ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}
      >
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // Handle clicking eye icon
  const handleViewRequest = (request: Request) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  // Handle approve from dialog
  const handleApproveFromDialog = (request: Request) => {
    setDetailsDialogOpen(false);
    // Open allocations interface
    if (onAllocate) {
      onAllocate(request);
    }
  };

  // Handle reject from dialog
  const handleRejectFromDialog = (requestId: string, reason: string) => {
    if (onReject) {
      onReject(requestId, reason);
    }
  };

  // Function to download requests as CSV
  const downloadCSV = () => {
    // Helper function to extract partial allocation reason from admin notes
    const extractPartialReason = (adminNotes: string | undefined) => {
      if (!adminNotes) return '';
      
      // Check if it contains "Partial allocation:" pattern
      if (adminNotes.includes('Partial allocation:')) {
        // Extract reason after "Reason: "
        const reasonMatch = adminNotes.match(/Reason:\s*(.+)$/);
        if (reasonMatch) {
          return reasonMatch[1].trim();
        }
      }
      return '';
    };

    const headers = [
      'Employee ID',
      'Requestor Name',
      'Division',
      'Workstations Required',
      'Location',
      'Floor',
      'Lab',
      'Requested Allocation Date',
      'Status',
      'Assigned Asset IDs',
      'Submission Date',
      'Rejection Reason',
      'Partial Allocation Reason',
      'Manager Remarks'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredRequests.map(request => {
        const partialReason = (request.status === 'partially_approved' || request.status === 'approved')
          ? extractPartialReason(request.adminNotes)
          : '';

        const row = [
          `\"${request.requestorId || ''}\"`,
          `\"${request.requestorName || ''}\"`,
          `\"${request.division || ''}\"`,
          request.numWorkstations || request.numEmployees || 0,
          `\"${request.location || ''}\"`,
          `\"${request.floor || ''}\"`,
          // Show lab name for both approved and partially_approved requests
          `\"${request.labName || ''}\"`,
          request.requestedAllocationDate ? `\"${new Date(request.requestedAllocationDate).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric'
          })}\"` : '\"\"',
          `\"${request.status || ''}\"`,
          // Show asset IDs for both approved and partially_approved requests
          request.assignedAssetIds ? `\"${request.assignedAssetIds.join(', ')}\"` : '\"\"',
          request.createdAt ? `\"${new Date(request.createdAt).toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          })}\"` : '\"\"',
          request.status === 'rejected' ? `\"${(request.adminNotes || '').replace(/\"/g, '\"\"')}\"` : '\"\"',
          partialReason ? `\"${partialReason.replace(/\"/g, '\"\"')}\"` : '\"\"',
          `\"${(request.remarks || '').replace(/\"/g, '\"\"')}\"`
        ];
        return row.join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `workstation_requests_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl mb-2">System Requests</h1>
          <p className="text-slate-600">
            Total Requests: <strong>{filteredRequests.length}</strong>
          </p>
        </div>
        
        {/* Action Buttons - Only visible for admins */}
        {userRole === 'admin' && (
          <div className="flex items-center gap-3">
            {onCleanTestData && (
              <Button
                variant="outline"
                onClick={onCleanTestData}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clean Data
              </Button>
            )}
            {filteredRequests.length > 0 && (
              <Button 
                onClick={downloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </Button>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by name, employee ID, or division..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_allocated">Partially Allocated</SelectItem>
                  <SelectItem value="partially_approved">Partially Approved</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map(div => (
                    <SelectItem key={div} value={div}>
                      {div}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Employee ID</TableHead>
                  <TableHead className="text-center">Requestor Name</TableHead>
                  <TableHead className="text-center">Division</TableHead>
                  <TableHead className="text-center">Workstations Required</TableHead>
                  <TableHead className="text-center">Preferred Location</TableHead>
                  <TableHead className="text-center">Preferred Floor</TableHead>
                  <TableHead className="text-center">Requested Allocation Date</TableHead>
                  <TableHead className="text-center">Manager's Remarks</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Created</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-500 py-8">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const employeeExists = employeeExistenceMap.get(request.requestorId) !== false;
                    
                    return (
                    <TableRow key={request.id} className={!employeeExists ? 'bg-red-50' : ''}>
                      <TableCell className="text-center">
                        {request.requestorId}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {request.requestorName}
                          {!employeeExists && (
                            <Badge variant="destructive" className="text-xs">
                              Deleted
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{request.division}</TableCell>
                      <TableCell className="text-center">{request.numWorkstations || request.numEmployees}</TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm">
                          <div>{request.location}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {request.preferredFloor ? (
                          <span className="text-blue-600 font-medium">
                            {request.preferredFloor}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {request.requestedAllocationDate ? (
                          <span className="text-blue-600 font-medium">
                            {new Date(request.requestedAllocationDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {request.remarks ? (
                          <span className="text-amber-800 font-medium">{request.remarks}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewRequest(request)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <RequestDetailsDialog
        request={selectedRequest}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onApprove={handleApproveFromDialog}
        onReject={handleRejectFromDialog}
        userRole={userRole}
        partiallyAllocatedSeats={partiallyAllocatedCount}
        partiallyAllocatedLabs={partiallyAllocatedLabs}
        employeeExists={selectedRequest ? employeeExistenceMap.get(selectedRequest.requestorId) !== false : true}
      />
    </div>
  );
}