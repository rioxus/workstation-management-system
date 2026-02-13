import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { User, Briefcase, MapPin, Calendar, Hash, Building2, Layers, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface Request {
  id: string;
  requestNumber: string;
  requestorId: string;
  requestorName: string;
  division: string;
  numEmployees: number;
  floor: string;
  location: string;
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
}

interface RequestDetailsDialogProps {
  request: Request | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (request: Request) => void;
  onReject?: (requestId: string, reason: string) => void;
  userRole: string;
  partiallyAllocatedSeats?: number; // Number of seats already allocated
  partiallyAllocatedLabs?: string[]; // Lab names where seats are allocated
}

export function RequestDetailsDialog({
  request,
  open,
  onOpenChange,
  onApprove,
  onReject,
  userRole,
  partiallyAllocatedSeats = 0,
  partiallyAllocatedLabs = [],
}: RequestDetailsDialogProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!request) return null;

  const isPending = request.status === 'pending' || request.status === 'partially_allocated';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';
  const isAdmin = userRole === 'admin';

  const handleApprove = () => {
    onOpenChange(false);
    if (onApprove) {
      onApprove(request);
    }
  };

  const handleOpenRejectDialog = () => {
    setShowRejectDialog(true);
  };

  const handleConfirmReject = () => {
    if (rejectionReason.trim() === '') {
      return;
    }

    if (onReject) {
      onReject(request.id, rejectionReason);
    }

    setRejectionReason('');
    setShowRejectDialog(false);
    onOpenChange(false);
  };

  const handleCancelReject = () => {
    setShowRejectDialog(false);
    setRejectionReason('');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      pending: { color: 'bg-slate-500', label: 'Pending' },
      approved: { color: 'bg-green-600', label: 'Approved' },
      rejected: { color: 'bg-red-600', label: 'Rejected' },
      completed: { color: 'bg-blue-600', label: 'Completed' },
      partially_allocated: { color: 'bg-amber-500', label: 'Partially Allocated' },
    };

    const variant = variants[status] || { color: 'bg-slate-500', label: status };

    return (
      <Badge className={`${variant.color} text-white hover:${variant.color}`}>
        {variant.label}
      </Badge>
    );
  };

  // Main dialog (Request Details)
  if (!showRejectDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isPending && isAdmin ? 'Review Request' : 'Request Details'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Request Status Banner */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-slate-600" />
                <span className="font-semibold text-slate-700">
                  Request #{request.requestNumber}
                </span>
              </div>
              {getStatusBadge(request.status)}
            </div>

            {/* Partially Allocated Warning */}
            {request.status === 'partially_allocated' && partiallyAllocatedSeats > 0 && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="space-y-2">
                    <p>
                      This request has <strong>{partiallyAllocatedSeats} seats partially allocated</strong>. 
                      {partiallyAllocatedLabs.length > 0 && (
                        <>
                          {' '}The seats are allocated in the following lab{partiallyAllocatedLabs.length > 1 ? 's' : ''}:
                        </>
                      )}
                    </p>
                    {partiallyAllocatedLabs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {partiallyAllocatedLabs.map((lab, index) => (
                          <Badge key={index} className="bg-amber-600 hover:bg-amber-700 text-white">
                            {lab}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {isAdmin && (
                      <p className="text-xs mt-2">
                        Rejecting this request will delete all partial allocations and make those seats available again.
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Requestor Details Section - More Compact */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-blue-700 border-b pb-1">
                Details of the Requestor and Request
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {/* Requestor Name */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">Requestor Name</Label>
                    <p className="text-sm font-medium text-slate-900">{request.requestorName}</p>
                  </div>
                </div>

                {/* Employee ID */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Hash className="w-4 h-4 text-blue-600" />
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">Employee ID</Label>
                    <p className="text-sm font-medium text-slate-900">{request.requestorId}</p>
                  </div>
                </div>

                {/* Division */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">Division</Label>
                    <Badge className="mt-1 bg-blue-600 hover:bg-blue-600">
                      {request.division}
                    </Badge>
                  </div>
                </div>

                {/* Workstations Required */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">Workstations Required</Label>
                    <p className="text-xl font-bold text-blue-600">
                      {request.numWorkstations || request.numEmployees}
                    </p>
                  </div>
                </div>

                {/* Preferred Location */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">Preferred Location</Label>
                    <p className="text-sm font-medium text-slate-900">{request.location}</p>
                  </div>
                </div>

                {/* Requested Date of Allocation */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <div>
                    <Label className="text-xs text-blue-700 font-semibold">Requested Date of Allocation</Label>
                    <p className="text-sm font-medium text-slate-900">
                      {request.requestedAllocationDate ? (
                        new Date(request.requestedAllocationDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      ) : (
                        <span className="text-slate-400">Not specified</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Submission Date - Full width last row */}
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded col-span-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <div>
                    <Label className="text-xs text-slate-700 font-semibold">Submission Date</Label>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(request.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Manager's Remarks (if any) */}
            {request.remarks && (
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-700">Manager's Remarks</Label>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-sm text-amber-900">{request.remarks}</p>
                </div>
              </div>
            )}

            {/* Lab Name (if approved) */}
            {request.labName && (
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-700">Allocated Lab</Label>
                <div className="p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm font-medium text-green-900">{request.labName}</p>
                </div>
              </div>
            )}

            {/* Assigned Asset IDs (if approved) */}
            {request.assignedAssetIds && request.assignedAssetIds.length > 0 && (
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-700">Assigned Asset IDs</Label>
                <div className="p-2 bg-green-50 border border-green-200 rounded">
                  <div className="flex flex-wrap gap-2">
                    {request.assignedAssetIds.map((assetId) => (
                      <Badge key={assetId} className="bg-green-600 hover:bg-green-600">
                        {assetId}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Reason (if rejected) */}
            {isRejected && request.adminNotes && (
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-red-700">Rejection Reason</Label>
                <div className="p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-900">{request.adminNotes}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-2">
            {isPending && isAdmin ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleOpenRejectDialog}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Reject Request
                </Button>
                <Button
                  onClick={handleApprove}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve & Allocate
                </Button>
              </>
            ) : (
              <Button onClick={() => onOpenChange(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Reject confirmation dialog
  return (
    <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Request</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this request. The requestor will be notified.
          </DialogDescription>
        </DialogHeader>

        {/* Show request summary in reject dialog */}
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Requestor:</span>
              <span className="font-medium">{request.requestorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Employee ID:</span>
              <span className="font-medium">{request.requestorId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Division:</span>
              <Badge className="bg-blue-600">{request.division}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Workstations:</span>
              <span className="font-bold text-blue-600">
                {request.numWorkstations || request.numEmployees}
              </span>
            </div>
          </div>

          {/* Warning for partially allocated seats */}
          {request.status === 'partially_allocated' && partiallyAllocatedSeats > 0 && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 text-sm">
                <strong>Warning:</strong> This will delete {partiallyAllocatedSeats} partially allocated seats 
                and make them available again.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="rejection-reason" className="text-sm font-semibold">
              Reason for Rejection <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter the reason for rejection"
              className={rejectionReason.trim() === '' ? 'border-red-300' : ''}
              rows={4}
            />
            {rejectionReason.trim() === '' && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Rejection reason is required
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelReject}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmReject}
            disabled={rejectionReason.trim() === ''}
            className="bg-red-600 hover:bg-red-700"
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}