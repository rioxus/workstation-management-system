import { useEffect, useState } from 'react';
import { WorkstationFloorMap } from './WorkstationFloorMap';
import { workstationRegistryService, WorkstationRegistry } from '../lib/workstationRegistryService';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, Building2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function WorkstationFloorMapContainer() {
  const [workstations, setWorkstations] = useState<WorkstationRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkstations();
  }, []);

  const loadWorkstations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await workstationRegistryService.getAllWorkstations();
      setWorkstations(data);
      
      if (data.length === 0) {
        toast.info('No workstations registered yet. Run the database setup script to add Floor 5 workstations.');
      }
    } catch (err: any) {
      console.error('Error loading workstation registry:', err);
      
      // Check if table doesn't exist
      if (err.code === 'PGRST204' || err.code === 'PGRST205' || err.message?.includes('relation')) {
        setError('Workstation registry table not found. Please run the database-workstation-ids.sql script to set it up.');
      } else {
        setError(err.message || 'Failed to load workstation data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWorkstationClick = (workstation: WorkstationRegistry) => {
    console.log('Workstation clicked:', workstation);
    // You can add more functionality here, like opening an edit dialog
  };

  const handleWorkstationUpdate = async (assetId: string, updates: Partial<WorkstationRegistry>) => {
    try {
      await workstationRegistryService.updateWorkstation(assetId, updates);
      toast.success('Workstation updated successfully');
      await loadWorkstations(); // Reload data
    } catch (err: any) {
      console.error('Error updating workstation:', err);
      toast.error('Failed to update workstation: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl mb-2 text-slate-700">Loading Workstation Map</h3>
            <p className="text-slate-500">Fetching workstation registry data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-lg mb-2">Database Setup Required</h3>
                <p className="text-sm text-slate-600 mb-4">
                  The workstation registry table needs to be set up before you can view the floor map.
                </p>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left max-w-lg mx-auto mb-4">
                  <h4 className="font-medium mb-2 text-sm">Setup Instructions:</h4>
                  <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                    <li>Open the Supabase SQL Editor</li>
                    <li>Run the <code className="text-xs bg-slate-200 px-1 rounded">database-workstation-ids.sql</code> script</li>
                    <li>This will create the workstation_registry table</li>
                    <li>It will also add Floor 5 workstations (Admin/WS/F-5/001 to 098)</li>
                    <li>Click "Try Again" below to reload</li>
                  </ol>
                </div>
                <Button onClick={loadWorkstations}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (workstations.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No workstations found in the registry. Run the database setup script to add workstations.
          </AlertDescription>
        </Alert>

        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <Building2 className="w-20 h-20 text-slate-300" />
              <div>
                <h3 className="text-2xl mb-2 text-slate-700">No Workstations Registered</h3>
                <p className="text-slate-600 mb-4">
                  Get started by adding workstation ranges to the registry
                </p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-left max-w-lg">
                <h4 className="font-medium mb-2 text-blue-900">Quick Start:</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>The database script will automatically create:</p>
                  <ul className="list-disc list-inside ml-2">
                    <li><span className="font-mono">Admin/WS/F-5/001</span> to <span className="font-mono">Admin/WS/F-5/098</span></li>
                    <li>All workstations on Floor 5</li>
                    <li>With PC, Monitor, Keyboard, Mouse equipment</li>
                    <li>Status set to "available" by default</li>
                  </ul>
                </div>
              </div>
              <Button onClick={loadWorkstations} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Building2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Displaying <strong>{workstations.length} workstations</strong> across{' '}
          <strong>{new Set(workstations.map(w => w.floor_number)).size} floors</strong>.
          All systems are assigned by Admin department.
          <Button
            onClick={loadWorkstations}
            variant="ghost"
            size="sm"
            className="ml-4 h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </AlertDescription>
      </Alert>
      
      <WorkstationFloorMap 
        workstations={workstations}
        onWorkstationClick={handleWorkstationClick}
        onWorkstationUpdate={handleWorkstationUpdate}
      />
    </div>
  );
}
