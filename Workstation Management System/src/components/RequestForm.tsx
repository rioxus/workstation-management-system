import { useState } from 'react';
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
import { Plus } from 'lucide-react';

interface RequestFormProps {
  onSubmit: (data: any) => void;
  userInfo: { name: string; division: string; employeeId: string };
}

export function RequestForm({ onSubmit, userInfo }: RequestFormProps) {
  const [formData, setFormData] = useState({
    numWorkstations: '',
    shift: '',
    floor: '',
    location: '',
    duration: 'long-term',
    durationMonths: '',
    specialRequirements: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
    // Reset form
    setFormData({
      numWorkstations: '',
      shift: '',
      floor: '',
      location: '',
      duration: 'long-term',
      durationMonths: '',
      specialRequirements: '',
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
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Requestor: <strong>{userInfo.name}</strong> ({userInfo.employeeId}) • Division:{' '}
            <strong>{userInfo.division}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                <Label htmlFor="shift">
                  Shift <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.shift} onValueChange={(value) => handleChange('shift', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning (9 AM - 5 PM)">Morning (9 AM - 5 PM)</SelectItem>
                    <SelectItem value="Afternoon (2 PM - 10 PM)">Afternoon (2 PM - 10 PM)</SelectItem>
                    <SelectItem value="Night (10 PM - 6 AM)">Night (10 PM - 6 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="location">
                  Office Location <span className="text-red-500">*</span>
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
                    <SelectItem value="CH Office">CH Office</SelectItem>
                    <SelectItem value="Gurukul Office">Gurukul Office</SelectItem>
                    <SelectItem value="Cochin Office">Cochin Office</SelectItem>
                    <SelectItem value="Chennai Office">Chennai Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">
                  Floor/Area <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.floor} onValueChange={(value) => handleChange('floor', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="9th Floor">9th Floor</SelectItem>
                    <SelectItem value="5th Floor">5th Floor</SelectItem>
                    <SelectItem value="4th Floor">4th Floor</SelectItem>
                    <SelectItem value="Ground Floor">Ground Floor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="duration">
                  Duration <span className="text-red-500">*</span>
                </Label>
                <Select 
                  value={formData.duration} 
                  onValueChange={(value) => {
                    handleChange('duration', value);
                    // Reset duration months when switching back to long-term
                    if (value === 'long-term') {
                      handleChange('durationMonths', '');
                    }
                  }} 
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long-term">Long term</SelectItem>
                    <SelectItem value="short-term">Short term</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.duration === 'short-term' && (
                <div className="space-y-2">
                  <Label htmlFor="durationMonths">
                    Duration (Months) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="durationMonths"
                    type="number"
                    min="1"
                    placeholder="e.g., 3"
                    value={formData.durationMonths}
                    onChange={(e) => handleChange('durationMonths', e.target.value)}
                    required={formData.duration === 'short-term'}
                  />
                </div>
              )}
            </div>

            {/* Special Requirements */}
            <div className="space-y-2">
              <Label htmlFor="specialRequirements">Special Requirements (Optional)</Label>
              <Textarea
                id="specialRequirements"
                placeholder="e.g., Need ergonomic chairs, dual monitors, proximity to power outlets..."
                value={formData.specialRequirements}
                onChange={(e) => handleChange('specialRequirements', e.target.value)}
                rows={4}
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline">
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
