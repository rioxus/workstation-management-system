import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Info, 
  CheckCircle2, 
  Building2, 
  Database,
  TrendingUp
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { useState } from 'react';
import { Button } from './ui/button';

export function WorkstationQuickReference() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-blue-900">
              <Info className="w-4 h-4" />
              Quick Reference Guide
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-blue-700 hover:text-blue-900 hover:bg-blue-100">
                {isOpen ? 'Hide' : 'Show'}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Asset ID Format */}
            <div>
              <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
                Asset ID Format
              </h4>
              <div className="bg-white p-3 rounded-md border border-blue-200">
                <code className="text-sm font-mono text-blue-800">
                  Admin/WS/F-[Floor]/[Number]
                </code>
                <div className="mt-2 text-xs text-blue-700 space-y-1">
                  <p><strong>Example:</strong> Admin/WS/F-5/001</p>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    <li><strong>Admin</strong> - Department (always "Admin")</li>
                    <li><strong>WS</strong> - Workstation identifier</li>
                    <li><strong>F-5</strong> - Floor code</li>
                    <li><strong>001</strong> - 3-digit workstation number</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Current Data */}
            <div>
              <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Current Floor 5 Data
              </h4>
              <div className="bg-white p-3 rounded-md border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-800">Range:</span>
                  <code className="text-xs font-mono bg-blue-100 px-2 py-1 rounded">
                    Admin/WS/F-5/001 to Admin/WS/F-5/098
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-800">Total:</span>
                  <Badge className="bg-blue-600">98 workstations</Badge>
                </div>
              </div>
            </div>

            {/* Status Legend */}
            <div>
              <h4 className="font-semibold text-sm text-blue-900 mb-2">Status Types</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2 rounded-md border border-blue-200 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-blue-800">Available</span>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-blue-200 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-blue-800">Occupied</span>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-blue-200 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-blue-800">Maintenance</span>
                  </div>
                </div>
                <div className="bg-white p-2 rounded-md border border-blue-200 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-blue-800">Reserved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <h4 className="font-semibold text-sm text-blue-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Add More Floors
              </h4>
              <div className="bg-white p-3 rounded-md border border-blue-200 text-xs text-blue-700 space-y-1">
                <p className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Go to "Manage Ranges" tab
                </p>
                <p className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Select floor and enter range
                </p>
                <p className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Click "Add Workstation Range"
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
