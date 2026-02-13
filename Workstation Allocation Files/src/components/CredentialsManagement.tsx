import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from './ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { UserPlus, Pencil, Trash2, Shield, Users, AlertTriangle, Check, ChevronsUpDown, X, Eye, EyeOff, Copy } from 'lucide-react';
import { db } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { PasswordCell } from './PasswordCell';

interface Employee {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager';
  division?: string;
  password?: string;
  created_at: string;
  updated_at: string;
}

interface Division {
  id: string;
  division_name: string;
  is_active: boolean;
  display_order?: number;
}

interface CredentialsManagementProps {
  onDataChange?: () => void;
}

export function CredentialsManagement({ onDataChange }: CredentialsManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [divisionSelectorOpen, setDivisionSelectorOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    role: 'Manager' as Employee['role'],
    selectedDivisions: [] as string[],
    password: '',
  });

  useEffect(() => {
    loadEmployees();
    loadDivisions();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await db.employees.getAll();
      // Filter to show only Admin and Manager roles
      const filteredData = data.filter(emp => emp.role === 'Admin' || emp.role === 'Manager');
      setEmployees(filteredData as Employee[]);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const loadDivisions = async () => {
    try {
      const data = await db.divisions.getAll();
      setDivisions(data);
    } catch (error) {
      console.error('Error loading divisions:', error);
      toast.error('Failed to load divisions');
    }
  };

  const handleOpenDialog = (employee?: Employee) => {
    if (employee) {
      setEditMode(true);
      setSelectedEmployee(employee);
      // Parse divisions from comma-separated string
      const divisionList = employee.division 
        ? employee.division.split(',').map(d => d.trim()).filter(d => d)
        : [];
      setFormData({
        employee_id: employee.employee_id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        selectedDivisions: divisionList,
        password: '',
      });
    } else {
      setEditMode(false);
      setSelectedEmployee(null);
      setFormData({
        employee_id: '',
        name: '',
        email: '',
        role: 'Manager',
        selectedDivisions: [],
        password: '',
      });
    }
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteDialogOpen(true);
  };

  const toggleDivision = (divisionName: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedDivisions.includes(divisionName);
      if (isSelected) {
        return {
          ...prev,
          selectedDivisions: prev.selectedDivisions.filter(d => d !== divisionName)
        };
      } else {
        return {
          ...prev,
          selectedDivisions: [...prev.selectedDivisions, divisionName]
        };
      }
    });
  };

  const removeDivision = (divisionName: string) => {
    setFormData(prev => ({
      ...prev,
      selectedDivisions: prev.selectedDivisions.filter(d => d !== divisionName)
    }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.employee_id.trim()) {
      toast.error('Employee ID is required');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // For Managers, division is mandatory
    if (formData.role === 'Manager' && formData.selectedDivisions.length === 0) {
      toast.error('Please select at least one division for the Manager');
      return;
    }

    try {
      // Convert selected divisions array to comma-separated string
      const divisionString = formData.selectedDivisions.join(', ');

      if (editMode && selectedEmployee) {
        // Update existing employee
        await db.employees.update(selectedEmployee.id, {
          employee_id: formData.employee_id.trim(),
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          division: formData.role === 'Manager' ? divisionString : undefined,
          password: formData.password.trim() || undefined,
        });
        toast.success('Employee updated successfully');
      } else {
        // Create new employee
        await db.employees.create({
          employee_id: formData.employee_id.trim(),
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          role: formData.role,
          division: formData.role === 'Manager' ? divisionString : undefined,
          password: formData.password.trim() || undefined,
        });
        toast.success('Employee created successfully');
      }

      setDialogOpen(false);
      await loadEmployees();
      if (onDataChange) onDataChange();
    } catch (error: any) {
      console.error('Error saving employee:', error);
      
      // Handle unique constraint violations
      if (error.message?.includes('duplicate') || error.code === '23505') {
        if (error.message?.includes('employee_id')) {
          toast.error('Employee ID already exists. Please use a different ID.');
        } else if (error.message?.includes('email')) {
          toast.error('Email already exists. Please use a different email.');
        } else {
          toast.error('Employee ID or Email already exists');
        }
      } else {
        toast.error(`Failed to ${editMode ? 'update' : 'create'} employee`);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;

    try {
      await db.employees.delete(selectedEmployee.id);
      toast.success('Employee deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedEmployee(null);
      await loadEmployees();
      if (onDataChange) onDataChange();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      
      // Handle foreign key constraint errors
      if (error.code === '23503') {
        toast.error('Cannot delete employee: This employee has associated requests or workstation assignments. Please remove those first.');
      } else {
        toast.error('Failed to delete employee');
      }
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Shield className="w-4 h-4" />;
      case 'Manager':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Employee Credentials Management
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Manage employee accounts, roles, and division assignments
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Loading employee data...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No employees found</p>
              <p className="text-sm text-slate-500">Click "Add Employee" to create the first employee account</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Division(s)</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono text-sm">{employee.employee_id}</TableCell>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell className="text-sm text-slate-600">{employee.email}</TableCell>
                      <TableCell>
                        <PasswordCell employee={employee} onPasswordUpdate={loadEmployees} />
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(employee.role)} border flex items-center gap-1 w-fit`}>
                          {getRoleIcon(employee.role)}
                          {employee.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {employee.division ? (
                          <div className="flex flex-wrap gap-1">
                            {employee.division.split(',').map((div, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {div.trim()}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {new Date(employee.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(employee)}
                            className="hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeleteDialog(employee)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editMode 
                ? 'Update employee information and access level' 
                : 'Create a new employee account with appropriate role and division'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Employee ID *</Label>
              <Input
                id="employee_id"
                placeholder="e.g., EMP001"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="e.g., John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g., john.doe@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: Employee['role']) => {
                  setFormData({ ...formData, role: value, selectedDivisions: [] });
                }}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="Manager">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Manager
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'Manager' && (
              <div className="space-y-2">
                <Label>
                  Division(s) *
                  <span className="text-xs text-slate-500 ml-2">
                    (Select one or more divisions)
                  </span>
                </Label>
                
                <Popover open={divisionSelectorOpen} onOpenChange={setDivisionSelectorOpen} modal={false}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDivisionSelectorOpen(!divisionSelectorOpen);
                      }}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-slate-100 cursor-pointer"
                    >
                      <span className={formData.selectedDivisions.length > 0 ? 'text-slate-900' : 'text-slate-500'}>
                        {formData.selectedDivisions.length > 0
                          ? `${formData.selectedDivisions.length} division(s) selected`
                          : "Select divisions..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="p-0 w-[var(--radix-popover-trigger-width)] z-[100] pointer-events-auto" 
                    align="start" 
                    sideOffset={4}
                    onInteractOutside={(e) => {
                      // Prevent closing when clicking inside the dialog
                      const target = e.target as HTMLElement;
                      if (target.closest('[role="dialog"]')) {
                        e.preventDefault();
                      }
                    }}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    <div className="p-2 border-b bg-white">
                      <Input
                        placeholder="Search divisions..."
                        value=""
                        onChange={(e) => {}}
                        className="h-9"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1 bg-white">
                      {divisions.length === 0 ? (
                        <div className="py-6 text-center text-sm text-slate-500">
                          No divisions found.
                        </div>
                      ) : (
                        divisions.map((division) => (
                          <div
                            key={division.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleDivision(division.division_name);
                            }}
                            className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none hover:bg-slate-100 active:bg-slate-200"
                            style={{ pointerEvents: 'auto' }}
                          >
                            <div className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                              formData.selectedDivisions.includes(division.division_name) 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'border-slate-300'
                            }`}>
                              {formData.selectedDivisions.includes(division.division_name) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="pointer-events-none">{division.division_name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Selected divisions display */}
                {formData.selectedDivisions.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
                    {formData.selectedDivisions.map((division, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary"
                        className="pl-2 pr-1 py-1 flex items-center gap-1"
                      >
                        {division}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeDivision(division);
                          }}
                          className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {formData.role === 'Admin' && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-900">
                  <strong>Admin Role:</strong> Full system access - no division assignment needed
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {!editMode && '*'}
                {editMode && (
                  <span className="text-xs text-slate-500 ml-2">
                    (Leave blank to keep current password)
                  </span>
                )}
              </Label>
              <Input
                id="password"
                type="text"
                placeholder={editMode ? "Enter new password" : "Enter password for user"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              {formData.password && formData.password.length < 6 && (
                <p className="text-xs text-red-600">Password must be at least 6 characters</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editMode ? 'Update Employee' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee account?
            </DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm mb-2"><strong>Employee ID:</strong> {selectedEmployee.employee_id}</p>
              <p className="text-sm mb-2"><strong>Name:</strong> {selectedEmployee.name}</p>
              <p className="text-sm mb-2"><strong>Email:</strong> {selectedEmployee.email}</p>
              <p className="text-sm"><strong>Role:</strong> {selectedEmployee.role}</p>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              <strong>Warning:</strong> This action cannot be undone. If this employee has associated workstation requests or assignments, deletion will fail.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}