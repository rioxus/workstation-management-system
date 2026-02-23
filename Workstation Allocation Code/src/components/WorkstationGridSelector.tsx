import React, { useState } from 'react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner@2.0.3';
import { AssetAssignmentConfirmDialog } from './AssetAssignmentConfirmDialog';

interface WorkstationGridSelectorProps {
  totalSeats: number;
  floorNumber: string;
  labName: string;
  divisions: string[];
  assignedSeats: Map<number, string>; // seat number -> division name
  onAssign: (division: string, assetIds: string) => void;
  assetRange?: string; // NEW: The actual asset range for this lab (e.g., "166-195")
}

export function WorkstationGridSelector({
  totalSeats,
  floorNumber,
  labName,
  divisions,
  assignedSeats,
  onAssign,
  assetRange,
}: WorkstationGridSelectorProps) {
  // Parse the asset range to get actual asset IDs
  const parseAssetRange = (range: string): number[] => {
    if (!range) return Array.from({ length: totalSeats }, (_, i) => i + 1);
    
    const ids: number[] = [];
    const parts = range.split(',').map(p => p.trim());
    
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(s => parseInt(s.trim(), 10));
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) {
            ids.push(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) {
          ids.push(num);
        }
      }
    }
    
    return ids.sort((a, b) => a - b);
  };
  
  // Get the actual asset IDs for this lab
  const actualAssetIds = assetRange ? parseAssetRange(assetRange) : Array.from({ length: totalSeats }, (_, i) => i + 1);
  
  const [selectedSeats, setSelectedSeats] = useState<Set<number>>(new Set());
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [rangeStartSeat, setRangeStartSeat] = useState<number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSeatClick = (seatNumber: number) => {
    // Require division selection first
    if (!selectedDivision) {
      toast.error('Please select a division first before selecting seats');
      return;
    }

    // Don't allow selection of already assigned seats
    if (assignedSeats.has(seatNumber)) {
      toast.error(`Seat ${seatNumber} is already assigned to ${assignedSeats.get(seatNumber)}`);
      return;
    }

    // If no range start, this is the first click
    if (rangeStartSeat === null) {
      setRangeStartSeat(seatNumber);
      const newSelected = new Set<number>();
      newSelected.add(seatNumber);
      setSelectedSeats(newSelected);
    } else {
      // This is the second click - select range
      // Find the indices of start and end in actualAssetIds array
      const startIdx = actualAssetIds.indexOf(rangeStartSeat);
      const endIdx = actualAssetIds.indexOf(seatNumber);
      
      if (startIdx === -1 || endIdx === -1) {
        toast.error('Invalid seat selection');
        setRangeStartSeat(null);
        return;
      }
      
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      const newSelected = new Set<number>();
      
      // Add all seats in range, skipping already assigned ones
      for (let i = minIdx; i <= maxIdx; i++) {
        const assetId = actualAssetIds[i];
        if (!assignedSeats.has(assetId)) {
          newSelected.add(assetId);
        }
      }
      
      if (newSelected.size === 0) {
        toast.error('All seats in this range are already assigned');
      } else {
        setSelectedSeats(newSelected);
      }
      
      // Reset range selection
      setRangeStartSeat(null);
    }
  };

  const handleAssign = () => {
    if (!selectedDivision) {
      toast.error('Please select a division');
      return;
    }

    if (selectedSeats.size === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    // Open confirmation dialog
    setShowConfirmDialog(true);
  };

  const handleConfirmAssignment = (division: string, assetIds: string) => {
    onAssign(division, assetIds);
    setSelectedSeats(new Set());
    setSelectedDivision('');
    setRangeStartSeat(null);
  };

  const handleClearSelection = () => {
    setSelectedSeats(new Set());
    setRangeStartSeat(null);
  };

  const getSeatColor = (seatNumber: number): string => {
    if (selectedSeats.has(seatNumber)) {
      return '#3B82F6'; // Blue for selected
    }
    if (assignedSeats.has(seatNumber)) {
      return '#EF4444'; // Red for assigned
    }
    if (rangeStartSeat === seatNumber) {
      return '#8B5CF6'; // Purple for range start
    }
    return '#9CA3AF'; // Gray for available
  };

  const getSeatTooltip = (seatNumber: number): string => {
    if (assignedSeats.has(seatNumber)) {
      return `Assigned to ${assignedSeats.get(seatNumber)}`;
    }
    if (rangeStartSeat === seatNumber) {
      return 'Range start - Click another seat to complete range';
    }
    if (selectedSeats.has(seatNumber)) {
      return 'Selected';
    }
    return 'Available - Click to select';
  };

  return (
    <div className="space-y-4">
      {/* Warning if no asset range is provided */}
      {!assetRange && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div className="flex-1">
              <p className="font-medium mb-1">No asset range found for this lab</p>
              <p className="text-xs mb-2">
                The workstation grid needs an asset ID range to display the correct workstation numbers.
                Currently showing fallback sequential numbers (1-{totalSeats}).
              </p>
              <div className="bg-white rounded p-2 text-xs text-slate-700 border border-red-300">
                <strong>To fix this:</strong>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Go to "Floor Asset ID Range Management" section above</li>
                  <li>Find <strong>{floorNumber ? `Floor ${floorNumber}` : 'the floor'}</strong> and expand it</li>
                  <li>Click "+ Lab" to add a range for <strong>{labName}</strong></li>
                  <li>Set the asset ID range (e.g., "104-165")</li>
                  <li>Save and return here - the grid will update automatically</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="division-select" className="text-sm mb-1.5 block">
            Select Division
          </Label>
          <Select value={selectedDivision} onValueChange={(value) => {
            setSelectedDivision(value);
            // Clear selection when changing division
            setSelectedSeats(new Set());
            setRangeStartSeat(null);
          }}>
            <SelectTrigger id="division-select" className="w-full">
              <SelectValue placeholder="Choose a division..." />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((division) => (
                <SelectItem key={division} value={division}>
                  {division}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          onClick={handleAssign}
          disabled={selectedSeats.size === 0 || !selectedDivision}
          className="bg-green-600 hover:bg-green-700"
        >
          Assign {selectedSeats.size > 0 && `(${selectedSeats.size})`}
        </Button>
        
        {selectedSeats.size > 0 && (
          <Button
            onClick={handleClearSelection}
            variant="outline"
          >
            Clear Selection
          </Button>
        )}
      </div>

      {/* Help text */}
      {!selectedDivision && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
          ℹ️ Please select a division first before selecting seats
        </div>
      )}

      {selectedDivision && rangeStartSeat !== null && (
        <div className="text-sm text-purple-600 bg-purple-50 border border-purple-200 rounded p-3">
          📍 Range selection started at seat {rangeStartSeat}. Click another seat to complete the range.
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-slate-400" />
          <span className="text-slate-600">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span className="text-slate-600">Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-purple-500" />
          <span className="text-slate-600">Range Start</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-slate-600">Assigned</span>
        </div>
      </div>

      {/* Workstation Grid */}
      <div 
        className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto select-none"
      >
        <div className="flex flex-wrap gap-2">
          {actualAssetIds.map((assetId, index) => {
            const bgColor = getSeatColor(assetId);
            const tooltip = getSeatTooltip(assetId);
            const isAssigned = assignedSeats.has(assetId);
            const isRangeStart = rangeStartSeat === assetId;

            return (
              <div
                key={assetId}
                className={`w-12 h-12 rounded flex items-center justify-center text-xs font-mono transition-all border ${
                  selectedSeats.has(assetId)
                    ? 'border-blue-600 shadow-md scale-105'
                    : isRangeStart
                    ? 'border-purple-600 shadow-md scale-105 ring-2 ring-purple-300'
                    : isAssigned
                    ? 'border-red-300 opacity-60'
                    : 'border-slate-300 hover:scale-110 hover:shadow-md'
                } ${isAssigned ? 'cursor-not-allowed' : selectedDivision ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} text-white`}
                style={{ backgroundColor: bgColor }}
                title={tooltip}
                onClick={() => selectedDivision && handleSeatClick(assetId)}
              >
                {assetId}
              </div>
            );
          })}
        </div>
      </div>

      {selectedSeats.size > 0 && (
        <div className="text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded p-3">
          <span className="font-medium">Selected seats:</span>{' '}
          {Array.from(selectedSeats)
            .sort((a, b) => a - b)
            .join(', ')}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AssetAssignmentConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedSeats={Array.from(selectedSeats)}
        selectedDivision={selectedDivision}
        divisions={divisions}
        floorNumber={floorNumber}
        labName={labName}
        onConfirm={handleConfirmAssignment}
      />
    </div>
  );
}