import { useEffect, useState } from 'react';
import { WorkstationMap } from './WorkstationMap';
import { WorkstationMapDemo } from './WorkstationMapDemo';
import { dataService } from '../lib/dataService';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, Map } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

/**
 * WorkstationMapContainer - Smart container that handles data loading
 * and displays either real data or demo data
 */
export function WorkstationMapContainer() {
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    loadWorkstationData();
  }, []);

  const loadWorkstationData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await dataService.getWorkstationMapData();
      setWorkstations(data);
      setHasData(data.length > 0);
    } catch (err: any) {
      console.error('Error loading workstation map data:', err);
      setError(err.message || 'Failed to load workstation data');
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl mb-2 text-slate-700">Loading Workstation Map</h3>
            <p className="text-slate-500">Fetching workstation data from database...</p>
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
            <strong>Error loading workstation data:</strong> {error}
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <Map className="w-16 h-16 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-lg mb-2">Unable to Load Workstation Map</h3>
                <p className="text-sm text-slate-600 mb-4">
                  This could be because workstations haven't been created yet.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={loadWorkstationData} variant="outline">
                    Try Again
                  </Button>
                  <Button onClick={() => setHasData(true)} variant="default">
                    View Demo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no workstations in database, offer demo mode
  if (!hasData) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No workstation data found in the database. You can view a demo with sample data or add workstations first.
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="demo" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="demo">Demo Mode</TabsTrigger>
            <TabsTrigger value="empty">Empty State</TabsTrigger>
          </TabsList>

          <TabsContent value="demo" className="mt-4">
            <WorkstationMapDemo />
          </TabsContent>

          <TabsContent value="empty" className="mt-4">
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <Map className="w-20 h-20 text-slate-300" />
                  <div>
                    <h3 className="text-2xl mb-2 text-slate-700">No Workstations Yet</h3>
                    <p className="text-slate-600 mb-4">
                      Get started by adding workstations through the database or Workstation Data Management
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left max-w-lg">
                    <h4 className="font-medium mb-2">Quick Start:</h4>
                    <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
                      <li>Ensure you have offices and floors set up</li>
                      <li>Create labs in Workstation Data Management</li>
                      <li>Add workstations to those labs in the database</li>
                      <li>Refresh this page to see your workstation map</li>
                    </ol>
                  </div>
                  <Button onClick={loadWorkstationData}>
                    Refresh Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Display real data
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Alert className="flex-1 mr-4">
          <Map className="h-4 w-4" />
          <AlertDescription>
            Showing live data from your database: <strong>{workstations.length} workstations</strong> across{' '}
            <strong>{new Set(workstations.map(w => w.floor)).size} floors</strong> and{' '}
            <strong>{new Set(workstations.map(w => w.department)).size} departments</strong>
          </AlertDescription>
        </Alert>
        <Button onClick={loadWorkstationData} variant="outline" size="sm">
          Refresh
        </Button>
      </div>
      
      <WorkstationMap workstations={workstations} />
    </div>
  );
}
