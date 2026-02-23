import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { CheckCircle2, XCircle, AlertCircle, Radio } from 'lucide-react';

export function SupabaseStatus() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [realtimeStatus, setRealtimeStatus] = useState<'disconnected' | 'connected'>('disconnected');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkConnection();
    setupRealtimeStatusListener();
  }, []);

  const setupRealtimeStatusListener = () => {
    // Listen to Supabase realtime connection status
    const channel = supabase.channel('system-status');
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('connected');
        console.log('🟢 Real-time connection established');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setRealtimeStatus('disconnected');
        console.log('🔴 Real-time connection lost');
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  };

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
    <div className="flex items-center gap-2">
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

      {realtimeStatus === 'connected' && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200">
                <Radio className="w-3 h-3 animate-pulse" />
                Real-time Active
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Changes will appear instantly across all dashboards</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}