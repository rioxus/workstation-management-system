import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {

      // Try to fetch a simple count from any table to verify connection
      const { error: testError, data } = await supabase
        .from('offices')
        .select('count')
        .limit(1);

      if (testError) {
        // Check if error is due to table not existing
        // PGRST205 is the error code for "Could not find table in schema cache"
        if (testError.code === 'PGRST205' || 
            testError.message.includes('Could not find the table') ||
            testError.message.includes('relation') || 
            testError.message.includes('does not exist')) {
          setStatus('error');
          setError('Database tables not created. Please run setup.');
        } else {
          setStatus('error');
          setError(testError.message);
        }
      } else {
        setStatus('connected');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection error');
    }
  };

  if (status === 'checking') {
    return (
      <Badge variant="outline" className="gap-2">
        <AlertCircle className="w-3 h-3" />
        Checking database...
      </Badge>
    );
  }

  if (status === 'error') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="gap-2">
              <XCircle className="w-3 h-3" />
              Database not configured
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-xs">{error || 'Please run supabase-schema.sql in your Supabase SQL Editor'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-2 bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            Database connected
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Supabase database is connected and ready</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
