import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Info } from 'lucide-react';

interface AssetIDRangeDisplayProps {
  formattedRange: string;
  seatCount: number;
  compact?: boolean;
}

export function AssetIDRangeDisplay({ formattedRange, seatCount, compact = false }: AssetIDRangeDisplayProps) {
  // Split the range by commas to show each segment
  const segments = formattedRange.split(', ').filter(s => s.trim());
  
  if (compact && segments.length > 2) {
    // Show abbreviated version for compact display
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 cursor-help">
              <span className="font-mono text-xs text-slate-600">
                {segments[0]} {segments.length > 1 && `+${segments.length - 1} more`}
              </span>
              <Info className="w-3 h-3 text-slate-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-md">
            <div className="space-y-1">
              <p className="text-xs font-medium">Full Asset ID Range:</p>
              {segments.map((segment, idx) => (
                <p key={idx} className="font-mono text-xs text-slate-300">
                  {segment}
                </p>
              ))}
              <p className="text-xs text-slate-400 mt-2">
                Total seats: {seatCount}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Full display
  return (
    <div className="space-y-0.5">
      {segments.map((segment, idx) => (
        <div key={idx} className="font-mono text-xs text-slate-600">
          {segment}
        </div>
      ))}
    </div>
  );
}
