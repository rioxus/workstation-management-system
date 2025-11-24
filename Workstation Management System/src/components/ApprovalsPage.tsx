import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { CheckCircle, XCircle, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Label } from './ui/label';
import { dataService } from '../lib/dataService';
import { toast } from 'sonner';

interface Request {
  id: string;
  requestorId: string;
  requestorName: string;
  division: string;
  shift: string;
  numWorkstations?: number;
  numEmployees?: number;
  floor: string;
  location: string;
  status: string;
  createdAt: string;
  equipmentNeeded: boolean;
  equipmentDetails: string;
  specialRequirements: string;
  seats?: number[]; // Array of selected seat numbers
  labName?: string; // Lab name
  bookingDate?: string; // Date of booking
}

interface ApprovalsPageProps {
  requests: Request[];
  onApprove: (requestId: string, notes: string) => void;
  onReject: (requestId: string, reason: string) => void;
  onCleanTestData?: () => void;
}

export function ApprovalsPage({ requests, onApprove, onReject, onCleanTestData }: ApprovalsPageProps) {
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');

  const pendingRequests = requests.filter(r => r.status === 'pending');

  const handleOpenDialog = (request: Request, type: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setDialogType(type);
    setNotes('');
    setDialogOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedRequest) return;

    if (dialogType === 'approve') {
      onApprove(selectedRequest.id, notes);
    } else {
      onReject(selectedRequest.id, notes);
    }

    setDialogOpen(false);
    setSelectedRequest(null);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">Pending Approvals</h1>
          <p className="text-slate-600">
            Review and approve workstation requests from divisional managers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {onCleanTestData && (
            <Button
              variant="outline"
              onClick={onCleanTestData}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clean Test Data
            </Button>
          )}
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {pendingRequests.length} Pending
          </Badge>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl mb-2">All Caught Up!</h3>
            <p className="text-slate-600">There are no pending requests to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-l-4 border-l-amber-400">
              <CardHeader>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      {request.requestorName}
                    </CardTitle>
                    <p className="text-sm text-slate-600 mt-1">
                      {request.division} • Employee ID: {request.requestorId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleOpenDialog(request, 'reject')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleOpenDialog(request, 'approve')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Number of Workstations</p>
                    <p className="text-sm">{request.numWorkstations || request.numEmployees}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Location</p>
                    <p className="text-sm">{request.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Floor</p>
                    <p className="text-sm">{request.floor}</p>
                  </div>
                </div>

                {/* Lab and Booking Date Row - Only show if data exists */}
                {(request.labName || request.bookingDate) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {request.labName && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Lab</p>
                        <p className="text-sm">{request.labName}</p>
                      </div>
                    )}
                    {request.bookingDate && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Date of Booking</p>
                        <p className="text-sm">{new Date(request.bookingDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}

                {request.equipmentNeeded && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                      <strong className="text-blue-700">Equipment Required:</strong>
                    </p>
                    <p className="text-sm text-blue-700 ml-6">{request.equipmentDetails}</p>
                  </div>
                )}

                {request.specialRequirements && (
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm mb-1">
                      <strong>Special Requirements:</strong>
                    </p>
                    <p className="text-sm text-slate-600">{request.specialRequirements}</p>
                  </div>
                )}

                <p className="text-xs text-slate-500 mt-4">
                  Submitted on {new Date(request.createdAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approval/Rejection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'approve'
                ? 'This request will be forwarded to the Technical Team for setup.'
                : 'Please provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm">
                  <strong>Requestor:</strong> {selectedRequest.requestorName}
                </p>
                <p className="text-sm">
                  <strong>Division:</strong> {selectedRequest.division}
                </p>
                <p className="text-sm">
                  <strong>Workstations:</strong> {selectedRequest.numWorkstations || selectedRequest.numEmployees}
                </p>
                <p className="text-sm">
                  <strong>Location:</strong> {selectedRequest.location}, {selectedRequest.floor}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">
                  {dialogType === 'approve' ? 'Notes (Optional)' : 'Reason for Rejection *'}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    dialogType === 'approve'
                      ? 'Add any notes for the Technical Team...'
                      : 'Please explain why this request is being rejected...'
                  }
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className={dialogType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={dialogType === 'reject' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              disabled={dialogType === 'reject' && !notes.trim()}
            >
              {dialogType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}