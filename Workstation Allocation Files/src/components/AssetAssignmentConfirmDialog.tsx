import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface AssetAssignmentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSeats: number[];
  selectedDivision: string;
  divisions: string[];
  floorNumber: string;
  labName: string;
  onConfirm: (division: string, assetIds: string) => void;
}

// Helper function to convert seat numbers to compact string format
const seatsToCompactString = (seats: number[]): string => {
  if (seats.length === 0) return '';
  
  const sorted = [...seats].sort((a, b) => a - b);
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];
  
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(rangeStart.toString());
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      if (i < sorted.length) {
        rangeStart = sorted[i];
        rangeEnd = sorted[i];
      }
    }
  }
  
  return ranges.join(', ');
};

// Helper function to parse asset ID input and validate
const parseAssetIds = (input: string): number[] => {
  const ids: number[] = [];
  const parts = input.split(',').map(p => p.trim()).filter(p => p);
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()));
      if (isNaN(start) || isNaN(end) || start > end) continue;
      for (let i = start; i <= end; i++) {
        ids.push(i);
      }
    } else {
      const id = parseInt(part);
      if (!isNaN(id)) {
        ids.push(id);
      }
    }
  }
  
  return [...new Set(ids)].sort((a, b) => a - b);
};

// Format IDs for display with Admin/WS/F-X prefix
const formatAssetIdsDisplay = (ids: number[], floorNumber: string): string => {
  if (ids.length === 0) return '';
  
  const ranges: string[] = [];
  let rangeStart = ids[0];
  let rangeEnd = ids[0];
  
  for (let i = 1; i <= ids.length; i++) {
    if (i < ids.length && ids[i] === rangeEnd + 1) {
      rangeEnd = ids[i];
    } else {
      if (rangeStart === rangeEnd) {
        ranges.push(`Admin/WS/F-${floorNumber}/${rangeStart.toString().padStart(3, '0')}`);
      } else {
        ranges.push(
          `Admin/WS/F-${floorNumber}/${rangeStart.toString().padStart(3, '0')} to Admin/WS/F-${floorNumber}/${rangeEnd.toString().padStart(3, '0')}`
        );
      }
      if (i < ids.length) {
        rangeStart = ids[i];
        rangeEnd = ids[i];
      }
    }
  }
  
  return ranges.join(', ');
};

export function AssetAssignmentConfirmDialog({
  open,
  onOpenChange,
  selectedSeats,
  selectedDivision,
  divisions,
  floorNumber,
  labName,
  onConfirm,
}: AssetAssignmentConfirmDialogProps) {
  const [assetIdInput, setAssetIdInput] = useState('');

  useEffect(() => {
    if (open && selectedSeats.length > 0) {
      // Initialize with selected seats as compact string
      setAssetIdInput(seatsToCompactString(selectedSeats));
    }
  }, [open, selectedSeats]);

  const handleConfirm = () => {
    if (!selectedDivision) {
      return;
    }
    
    onConfirm(selectedDivision, assetIdInput);
    handleClose();
  };

  const handleClose = () => {
    setAssetIdInput('');
    onOpenChange(false);
  };

  // Parse current input for preview
  const parsedIds = parseAssetIds(assetIdInput);
  const previewDisplay = parsedIds.length > 0 ? formatAssetIdsDisplay(parsedIds, floorNumber) : '';
  const isValid = selectedDivision && parsedIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Asset IDs to Division</DialogTitle>
          <DialogDescription>
            Confirm the asset ID range and division assignment for {labName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Division Selection - Now Read-Only */}
          <div>
            <Label htmlFor="division-confirm">Division</Label>
            <div className="mt-1.5 px-3 py-2 bg-slate-100 border border-slate-200 rounded-md text-sm">
              {selectedDivision || 'No division selected'}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Division is locked based on your selection
            </p>
          </div>

          {/* Asset ID Range Input */}
          <div>
            <Label htmlFor="asset-range">Asset ID Range</Label>
            <Input
              id="asset-range"
              value={assetIdInput}
              onChange={(e) => setAssetIdInput(e.target.value)}
              placeholder="e.g., 1-10, 15, 20-25"
              className="mt-1.5 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              Format: Use ranges (1-10) and comma-separated singles (15, 20)
            </p>
          </div>

          {/* Summary */}
          {selectedSeats.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">Selected Seats:</p>
              <p className="text-sm font-mono text-blue-900">
                {selectedSeats.sort((a, b) => a - b).join(', ')}
              </p>
              <p className="text-xs text-blue-600 mt-2">Total: {selectedSeats.length} seats</p>
            </div>
          )}

          {/* Preview */}
          {parsedIds.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-600 mb-1">Preview Asset ID Range:</p>
              <div className="text-xs font-mono text-green-900 space-y-0.5">
                {previewDisplay.split(', ').map((segment, idx) => (
                  <div key={idx}>{segment}</div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">Total: {parsedIds.length} IDs</p>
            </div>
          )}

          {/* Validation Error */}
          {assetIdInput && parsedIds.length === 0 && (
            <div className="text-sm text-red-600">
              Invalid format. Please use ranges (1-10) or singles (1, 5, 10).
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-green-600 hover:bg-green-700"
          >
            Confirm Assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}