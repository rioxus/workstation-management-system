import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Plus, User, Mail, Building2, IdCard, X, CalendarIcon } from 'lucide-react';
import { db } from '../lib/supabase';
import { CustomCalendar } from './ui/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { format } from 'date-fns';

interface RequestFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void; // Add optional cancel callback
  userInfo: { name: string; division: string; employeeId: string; email: string };
}

export function RequestForm({ onSubmit, onCancel, userInfo }: RequestFormProps) {
  const [formData, setFormData] = useState({
    numWorkstations: '',
    location: '',
    division: '',
    requestedAllocationDate: '', // New field for requested allocation date
    remarks: '' // Changed from specialRequirements
  });

  const [loading, setLoading] = useState(false);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [offices, setOffices] = useState<string[]>([]); // New state for offices

  // Update divisions when userInfo changes (e.g., after credential updates)
  useEffect(() => {
    loadDivisions();
    loadOffices(); // Load offices from database
  }, [userInfo]); // Add userInfo as dependency to reload when it changes

  const loadDivisions = async () => {
    try {
      // Filter divisions based on user's assigned divisions
      // User's division can be comma-separated (e.g., "Innovation Labs, HR Division")
      const userDivisions = userInfo.division.split(',').map(d => d.trim());
      setDivisions(userDivisions);
    } catch (error) {
      console.error('Error loading divisions:', error);
    }
  };

  const loadOffices = async () => {
    try {
      // Fetch all labs to get unique office names
      const labs = await db.labs.getAll();
      const uniqueOffices = Array.from(new Set(
        labs
          .map((lab: any) => lab.floors?.offices?.office_name)
          .filter(Boolean) // Remove undefined/null values
      )).sort();
      setOffices(uniqueOffices);
    } catch (error) {
      console.error('Error loading offices:', error);
      // Fallback to default offices if DB fetch fails
      setOffices(['Commerce House', 'Gurukul Office', 'Cochin Office', 'Chennai Office']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Build complete request data with all required fields
    const requestData = {
      ...formData,
      requestorId: userInfo.employeeId,
      requestorEmployeeId: userInfo.employeeId,
      requestorName: userInfo.name,
      floor: '', // Floor will be determined during allocation
      numWorkstations: parseInt(formData.numWorkstations) || 1
    };
    
    await onSubmit(requestData);
    setLoading(false);
    
    // Reset form
    setFormData({
      numWorkstations: '',
      location: '',
      division: '',
      requestedAllocationDate: '',
      remarks: ''
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Submit New Workstation Request</h1>
        <p className="text-slate-600">
          Fill in the details below to request workstation allocation
        </p>
      </div>

      <Card>
        <CardHeader className="border-b bg-slate-50">
          <CardTitle>Request Details</CardTitle>
          
          {/* Enhanced Requestor Information Section */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Requestor</p>
                <p className="font-semibold text-slate-900">{userInfo.name}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <IdCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Employee ID</p>
                <p className="font-semibold text-slate-900">{userInfo.employeeId}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Email</p>
                <p className="font-semibold text-slate-900">{userInfo.email}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Building2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Division</p>
                <p className="font-semibold text-slate-900">{userInfo.division}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="numWorkstations">
                  Number of Workstations Required <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="numWorkstations"
                  type="number"
                  min="1"
                  placeholder="e.g., 5"
                  value={formData.numWorkstations}
                  onChange={(e) => handleChange('numWorkstations', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">
                  Division <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.division} onValueChange={(value) => handleChange('division', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division} value={division}>
                        {division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location and Requested Allocation Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">
                  Preferred Office Location <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => handleChange('location', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office} value={office}>
                        {office}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestedAllocationDate">
                  Requested Allocation Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        !formData.requestedAllocationDate && 'text-slate-500'
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.requestedAllocationDate ? (
                        format(new Date(formData.requestedAllocationDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start" sideOffset={4}>
                    <CustomCalendar
                      selected={formData.requestedAllocationDate ? new Date(formData.requestedAllocationDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleChange('requestedAllocationDate', format(date, 'yyyy-MM-dd'));
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-500 mt-1">
                  Select the date when you want the workstations to be allocated
                </p>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                placeholder="e.g., Need ergonomic chairs, dual monitors, proximity to power outlets..."
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Plus className="w-4 h-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}