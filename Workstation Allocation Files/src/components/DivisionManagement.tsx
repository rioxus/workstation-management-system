import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Plus, Trash2, AlertCircle, Building2, Info } from 'lucide-react';
import { db, Division } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from './ui/alert';

interface DivisionManagementProps {
  onDataChange?: () => void;
}

export function DivisionManagement({ onDataChange }: DivisionManagementProps) {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [newDivisionName, setNewDivisionName] = useState('');
  const [workstationUsage, setWorkstationUsage] = useState<any>(null);
  const [isCheckingUsage, setIsCheckingUsage] = useState(false);

  useEffect(() => {
    loadDivisions();
  }, []);

  const loadDivisions = async () => {
    try {
      setLoading(true);
      const data = await db.divisions.getAll();
      setDivisions(data);
    } catch (error) {
      console.error('Error loading divisions:', error);
      toast.error('Failed to load divisions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDivision = async () => {
    if (!newDivisionName.trim()) {
      toast.error('Division name is required');
      return;
    }

    // Check for duplicate names
    const exists = divisions.some(
      d => d.division_name.toLowerCase() === newDivisionName.trim().toLowerCase()
    );
    if (exists) {
      toast.error('A division with this name already exists');
      return;
    }

    try {
      await db.divisions.create({
        division_name: newDivisionName.trim(),
      });

      toast.success('Division added successfully');
      setShowAddDialog(false);
      setNewDivisionName('');
      loadDivisions();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error adding division:', error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        toast.error('A division with this name already exists');
      } else {
        toast.error('Failed to add division');
      }
    }
  };

  const handleDeleteDivision = async () => {
    if (!selectedDivision) return;

    try {
      const loadingToast = toast.loading('Deleting division...');
      
      // Use cascade delete which handles:
      // 1. Delete all lab_allocations entries
      // 2. Remove from employee credentials
      // 3. Delete the division itself
      await db.divisions.cascadeDelete(selectedDivision.id, selectedDivision.division_name);
      
      toast.dismiss(loadingToast);
      toast.success(
        `✅ Division "${selectedDivision.division_name}" deleted successfully!${
          workstationUsage?.hasWorkstations 
            ? ` Removed ${workstationUsage.workstationCount} workstations from ${workstationUsage.labCount} lab(s).`
            : ''
        }`
      );
      
      setShowDeleteDialog(false);
      setSelectedDivision(null);
      setWorkstationUsage(null);
      loadDivisions();
      onDataChange?.();
    } catch (error: any) {
      console.error('Error deleting division:', error);
      toast.error(`Failed to delete division: ${error.message || 'Unknown error'}`);
    }
  };

  const confirmDelete = async (division: Division) => {
    setSelectedDivision(division);
    setIsCheckingUsage(true);
    setShowDeleteDialog(true);
    
    try {
      // Check if division has workstations allocated
      const usage = await db.divisions.checkWorkstationUsage(division.division_name);
      setWorkstationUsage(usage);
    } catch (error) {
      console.error('Error checking workstation usage:', error);
      setWorkstationUsage(null);
    } finally {
      setIsCheckingUsage(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-blue-600" />
            <CardTitle className="flex items-center gap-2">
              Division Management
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors">
                      <Info className="w-3 h-3 text-blue-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">
                      Adding or removing divisions here will automatically update all division dropdowns 
                      throughout the application. Divisions will only appear in "Division Totals" visualizations when they have 
                      workstations assigned.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Division
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading divisions...</div>
        ) : divisions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No divisions found. Add a division to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Division Name</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {divisions.map((division, index) => (
                <TableRow key={division.id}>
                  <TableCell className="text-slate-500">{index + 1}</TableCell>
                  <TableCell>
                    <span className="font-medium">{division.division_name}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmDelete(division)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-4 text-sm text-slate-500">
          Total Divisions: {divisions.length}
        </div>
      </CardContent>

      {/* Add Division Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Division</DialogTitle>
            <DialogDescription>
              Add a new division to the centralized list. It will be available immediately in all division dropdowns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="division-name">Division Name *</Label>
              <Input
                id="division-name"
                placeholder="Enter division name"
                value={newDivisionName}
                onChange={(e) => setNewDivisionName(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDivision}>Add Division</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Remove Division</DialogTitle>
            <DialogDescription>
              You are about to permanently delete the division <strong>"{selectedDivision?.division_name}"</strong>.
            </DialogDescription>
          </DialogHeader>

          {/* Loading state while checking workstation usage */}
          {isCheckingUsage && (
            <div className="py-6 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                Checking workstation allocations...
              </div>
            </div>
          )}

          {/* Show workstation usage details */}
          {!isCheckingUsage && workstationUsage && (
            <>
              {workstationUsage.hasWorkstations ? (
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <AlertDescription className="text-sm text-red-900">
                    <div className="space-y-2">
                      <p className="font-semibold">⚠️ Warning: This division has active workstation allocations!</p>
                      <div className="space-y-1 text-xs mt-3">
                        <p>• <strong>{workstationUsage.workstationCount} workstations</strong> currently allocated</p>
                        <p>• Assigned across <strong>{workstationUsage.labCount} lab(s)</strong></p>
                      </div>
                      {workstationUsage.labs && workstationUsage.labs.length > 0 && (
                        <div className="mt-3 max-h-32 overflow-y-auto bg-white/50 rounded p-2">
                          <p className="font-medium text-xs mb-1">Labs affected:</p>
                          <ul className="text-xs space-y-0.5">
                            {workstationUsage.labs.map((lab: any, idx: number) => (
                              <li key={idx} className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-red-600 rounded-full" />
                                {lab.floors?.offices?.office_name} - {lab.floors?.floor_name} - {lab.lab_name} ({lab.in_use || 0} seats)
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t border-red-200">
                        <p className="font-semibold text-sm">If you proceed with deletion:</p>
                        <ul className="mt-2 space-y-1 text-xs">
                          <li>✓ All {workstationUsage.workstationCount} workstation entries will be removed from the database</li>
                          <li>✓ Division will be removed from all employee credentials</li>
                          <li>✓ Division will be permanently deleted</li>
                          <li>✓ This action <strong className="text-red-700">CANNOT BE UNDONE</strong></li>
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-50 border-green-200">
                  <AlertCircle className="w-5 h-5 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">
                    <div className="space-y-2">
                      <p className="font-semibold">✓ No workstation allocations found</p>
                      <p className="text-xs">This division can be safely deleted. It will also be removed from any employee credentials that reference it.</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setWorkstationUsage(null);
                setSelectedDivision(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteDivision}
              disabled={isCheckingUsage}
            >
              {workstationUsage?.hasWorkstations ? 'Delete Anyway' : 'Delete Division'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}