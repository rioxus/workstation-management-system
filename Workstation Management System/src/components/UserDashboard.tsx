import { CheckCircle, Clock, AlertCircle, XCircle, Calendar, RefreshCw, Trash2, FileText, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { UserWorkstationView } from './UserWorkstationView';
import { useState } from 'react';

interface UserDashboardProps {
  requests: any[];
  userInfo: any;
  onNavigateToRequests: () => void;
  dashboardStats?: any;
  onAddRequest?: (request: any) => void;
  seatBookings?: any[]; // Add seat bookings prop
  onCleanTestData?: () => void; // Add clean test data handler
  onRefreshData?: () => void; // Add refresh handler
}

export function UserDashboard({ requests, userInfo, onNavigateToRequests, dashboardStats, onAddRequest, seatBookings = [], onCleanTestData, onRefreshData }: UserDashboardProps) {
  // Filter requests for current user (simulating user-specific requests)
  const userRequests = requests.filter(req => req.requestorId === userInfo.employeeId || requests.length < 4);
  
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">My Dashboard</h1>
          <p className="text-slate-600">
            Track your workstation requests and submission history
          </p>
        </div>
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

      {/* User-Friendly Workstation View with Lab Tabs */}
      {dashboardStats && (
        <UserWorkstationView 
          data={{
            labAllocations: dashboardStats.labAllocations || [],
            divisionRecords: dashboardStats.divisionRecords || []
          }}
          onBookingSubmit={onAddRequest}
          userInfo={userInfo}
          seatBookings={seatBookings}
          onRefreshData={onRefreshData}
        />
      )}

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
                    <div className="text-right">
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
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

      {/* Performance Insights */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <TrendingUp className="w-5 h-5" />
            Your Request Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            • Your requests typically get approved in <strong>{avgResponseTime}</strong> on average
          </p>
          {pendingRequests > 0 && (
            <p>
              • You have <strong>{pendingRequests} pending request{pendingRequests > 1 ? 's' : ''}</strong> awaiting review
            </p>
          )}
          <p>
            • Peak approval times: <strong>Tuesday-Thursday, 10 AM - 2 PM</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}