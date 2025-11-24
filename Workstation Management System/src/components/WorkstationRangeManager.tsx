import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { 
  Plus, 
  Trash2, 
  Building2, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { workstationRegistryService } from '../lib/workstationRegistryService';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface WorkstationRange {
  floorNumber: number;
  startNumber: number;
  endNumber: number;
}

export function WorkstationRangeManager() {
  const [floorNumber, setFloorNumber] = useState<string>('');
  const [startNumber, setStartNumber] = useState<string>('');
  const [endNumber, setEndNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewRange, setPreviewRange] = useState<WorkstationRange | null>(null);

  const handleAddRange = async () => {
    if (!floorNumber || !startNumber || !endNumber) {
      toast.error('Please fill in all fields');
      return;
    }

    const floor = parseInt(floorNumber);
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);

    if (start > end) {
      toast.error('Start number must be less than or equal to end number');
      return;
    }

    if (start < 1 || end > 999) {
      toast.error('Workstation numbers must be between 1 and 999');
      return;
    }

    // Show preview dialog
    setPreviewRange({ floorNumber: floor, startNumber: start, endNumber: end });
    setPreviewDialogOpen(true);
  };

  const confirmAddRange = async () => {
    if (!previewRange) return;

    setLoading(true);
    setPreviewDialogOpen(false);

    try {
      const count = previewRange.endNumber - previewRange.startNumber + 1;
      
      await workstationRegistryService.createWorkstationRange(
        previewRange.floorNumber,
        `Floor ${previewRange.floorNumber}`,
        previewRange.startNumber,
        previewRange.endNumber
      );

      toast.success(`Successfully added ${count} workstations to Floor ${previewRange.floorNumber}`);
      
      // Reset form
      setFloorNumber('');
      setStartNumber('');
      setEndNumber('');
      setPreviewRange(null);
    } catch (error: any) {
      console.error('Error adding workstation range:', error);
      
      if (error.code === '23505') {
        toast.error('Some workstations in this range already exist. Please choose a different range.');
      } else {
        toast.error('Failed to add workstation range: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const getAssetIdPreview = (floor: number, wsNum: number) => {
    const wsStr = String(wsNum).padStart(3, '0');
    return `Admin/WS/F-${floor}/${wsStr}`;
  };

  const getWorkstationCount = () => {
    if (!startNumber || !endNumber) return 0;
    const start = parseInt(startNumber);
    const end = parseInt(endNumber);
    return end - start + 1;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Workstation Range Manager</h2>
        <p className="text-slate-600">
          Add new workstation ranges to the registry. All workstations are assigned by Admin department.
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Asset ID Format:</strong> Admin/WS/F-[Floor]/[Number]
          <br />
          Example: Admin/WS/F-5/001 for Floor 5, Workstation 001
        </AlertDescription>
      </Alert>

      {/* Add Range Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Workstation Range</CardTitle>
          <CardDescription>
            Specify the floor and workstation number range to add multiple workstations at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Floor Number */}
            <div className="space-y-2">
              <Label htmlFor="floor">Floor Number</Label>
              <Select value={floorNumber} onValueChange={setFloorNumber}>
                <SelectTrigger id="floor">
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Floor 1</SelectItem>
                  <SelectItem value="2">Floor 2</SelectItem>
                  <SelectItem value="3">Floor 3</SelectItem>
                  <SelectItem value="4">Floor 4</SelectItem>
                  <SelectItem value="5">Floor 5</SelectItem>
                  <SelectItem value="6">Floor 6</SelectItem>
                  <SelectItem value="7">Floor 7</SelectItem>
                  <SelectItem value="8">Floor 8</SelectItem>
                  <SelectItem value="9">Floor 9</SelectItem>
                  <SelectItem value="10">Floor 10</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Start Number */}
            <div className="space-y-2">
              <Label htmlFor="start">Start Number</Label>
              <Input
                id="start"
                type="number"
                min="1"
                max="999"
                placeholder="001"
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
              />
            </div>

            {/* End Number */}
            <div className="space-y-2">
              <Label htmlFor="end">End Number</Label>
              <Input
                id="end"
                type="number"
                min="1"
                max="999"
                placeholder="098"
                value={endNumber}
                onChange={(e) => setEndNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {floorNumber && startNumber && endNumber && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">Preview</h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p>
                      <strong>Range:</strong>{' '}
                      {getAssetIdPreview(parseInt(floorNumber), parseInt(startNumber))} to{' '}
                      {getAssetIdPreview(parseInt(floorNumber), parseInt(endNumber))}
                    </p>
                    <p>
                      <strong>Total Workstations:</strong> {getWorkstationCount()}
                    </p>
                    <p>
                      <strong>Floor:</strong> Floor {floorNumber}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Button */}
          <Button
            onClick={handleAddRange}
            disabled={!floorNumber || !startNumber || !endNumber || loading}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Workstation Range
          </Button>
        </CardContent>
      </Card>

      {/* Quick Add Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Add Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setFloorNumber('4');
                setStartNumber('1');
                setEndNumber('75');
              }}
              className="p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">Floor 4</span>
                <Badge variant="secondary">75 workstations</Badge>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Admin/WS/F-4/001 to Admin/WS/F-4/075
              </p>
            </button>

            <button
              onClick={() => {
                setFloorNumber('9');
                setStartNumber('1');
                setEndNumber('120');
              }}
              className="p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">Floor 9</span>
                <Badge variant="secondary">120 workstations</Badge>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Admin/WS/F-9/001 to Admin/WS/F-9/120
              </p>
            </button>

            <button
              onClick={() => {
                setFloorNumber('3');
                setStartNumber('1');
                setEndNumber('50');
              }}
              className="p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">Floor 3</span>
                <Badge variant="secondary">50 workstations</Badge>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Admin/WS/F-3/001 to Admin/WS/F-3/050
              </p>
            </button>

            <button
              onClick={() => {
                setFloorNumber('2');
                setStartNumber('1');
                setEndNumber('100');
              }}
              className="p-3 text-left border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">Floor 2</span>
                <Badge variant="secondary">100 workstations</Badge>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                Admin/WS/F-2/001 to Admin/WS/F-2/100
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Workstation Range</DialogTitle>
            <DialogDescription>
              Please review the workstations that will be created
            </DialogDescription>
          </DialogHeader>

          {previewRange && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  This will create <strong>{previewRange.endNumber - previewRange.startNumber + 1} workstations</strong> on Floor {previewRange.floorNumber}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Floor:</span>
                  <span className="font-semibold">Floor {previewRange.floorNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">First Asset ID:</span>
                  <span className="font-mono text-xs">
                    {getAssetIdPreview(previewRange.floorNumber, previewRange.startNumber)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Last Asset ID:</span>
                  <span className="font-mono text-xs">
                    {getAssetIdPreview(previewRange.floorNumber, previewRange.endNumber)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Total Count:</span>
                  <span className="font-semibold">
                    {previewRange.endNumber - previewRange.startNumber + 1} workstations
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700">
                <p className="font-medium mb-1">Default Settings:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Status: Available</li>
                  <li>Equipment: PC, Monitor, Keyboard, Mouse (all enabled)</li>
                  <li>Assignment: None (can be assigned later)</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddRange} disabled={loading}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Confirm & Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
