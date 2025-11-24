import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
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
import { Search, Eye, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface Request {
  id: string;
  requestorId: string;
  requestorName: string;
  division: string;
  shift: string;
  numEmployees: number;
  floor: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  createdAt: string;
  equipmentNeeded: boolean;
}

interface RequestsTableProps {
  requests: Request[];
  onViewDetails: (request: Request) => void;
  userRole: string;
  userInfo?: { name: string; division: string; employeeId: string };
}

export function RequestsTable({ requests, onViewDetails, userRole, userInfo }: RequestsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Filter requests based on role - managers only see their own
  const roleFilteredRequests = userRole === 'manager' && userInfo
    ? requests.filter(r => r.requestorId === userInfo.employeeId)
    : requests;

  const filteredRequests = roleFilteredRequests.filter(request => {
    const matchesSearch =
      request.requestorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.requestorId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.division.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesDivision = divisionFilter === 'all' || request.division === divisionFilter;

    return matchesSearch && matchesStatus && matchesDivision;
  });

  const divisions = Array.from(new Set(roleFilteredRequests.map(r => r.division)));

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      completed: 'outline',
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status}
      </Badge>
    );
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
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Requestor Name</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Workstations Required</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      No requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.requestorId}</TableCell>
                      <TableCell>{request.requestorName}</TableCell>
                      <TableCell>{request.division}</TableCell>
                      <TableCell>{request.numWorkstations || request.numEmployees}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{request.location}</div>
                          <div className="text-slate-500">{request.floor}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDetails(request)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}