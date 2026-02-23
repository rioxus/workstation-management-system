import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { Database, ExternalLink, CheckCircle } from 'lucide-react';
import { useState } from 'react';

export function SetupBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <Database className="h-5 w-5 text-blue-600" />
      <AlertTitle className="text-blue-900">Database Setup Required</AlertTitle>
      <AlertDescription className="text-blue-800">
        <div className="space-y-3 mt-2">
          <p>
            Your Supabase database is connected via Figma Make, but needs to be configured with your workstation data.
          </p>
          
          <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</div>
              </div>
              <div>
                <p className="font-medium text-slate-900">Open Supabase SQL Editor</p>
                <p className="text-slate-600">Go to your Supabase dashboard and open the SQL Editor</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</div>
              </div>
              <div>
                <p className="font-medium text-slate-900">Run the Schema File</p>
                <p className="text-slate-600">Copy and run <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">supabase-schema.sql</code> to create tables and load your data</p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="mt-0.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</div>
              </div>
              <div>
                <p className="font-medium text-slate-900">Refresh & Start Using</p>
                <p className="text-slate-600">Reload this page to see your live workstation data!</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg mt-3">
            <p className="text-sm text-amber-900">
              <strong>⚠️ Common Errors:</strong>
            </p>
            <ul className="text-xs text-amber-800 mt-1 space-y-1 ml-4 list-disc">
              <li>PGRST205 - Tables not created yet → Run <code className="px-1 py-0.5 bg-amber-50 rounded">supabase-schema.sql</code></li>
              <li>Missing asset_ranges tables → Run <code className="px-1 py-0.5 bg-amber-50 rounded">ASSET_RANGES_TABLE_MIGRATION.sql</code></li>
            </ul>
          </div>

          <div className="flex gap-2 mt-3">
            <Button 
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard/project/vliwztjkmpojhgcaxblr/sql', '_blank')}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-3 h-3" />
              Open SQL Editor Now
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onClick={() => setDismissed(true)}
            >
              I've Already Set This Up
            </Button>
          </div>

          <p className="text-xs text-blue-700 mt-2">
            📖 Need help? Check <strong>QUICK_START.md</strong> or <strong>FIX_ASSET_RANGES_ERROR.md</strong> in the project files
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
