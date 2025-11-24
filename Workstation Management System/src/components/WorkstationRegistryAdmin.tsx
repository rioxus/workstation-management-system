import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { WorkstationFloorMapContainer } from './WorkstationFloorMapContainer';
import { WorkstationRangeManager } from './WorkstationRangeManager';
import { WorkstationQuickReference } from './WorkstationQuickReference';
import { Map, Settings, Database } from 'lucide-react';

export function WorkstationRegistryAdmin() {
  const [activeTab, setActiveTab] = useState('map');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl mb-2">Workstation Registry</h1>
        <p className="text-slate-600">
          Manage and visualize workstation allocations across all floors
        </p>
      </div>

      <WorkstationQuickReference />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="map" className="flex items-center gap-2">
            <Map className="w-4 h-4" />
            Floor Map
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Manage Ranges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-6">
          <WorkstationFloorMapContainer />
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <WorkstationRangeManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
