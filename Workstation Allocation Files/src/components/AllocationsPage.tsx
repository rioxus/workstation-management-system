import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { User, Calendar, Building, ArrowLeft, Save, CheckCircle, Edit2, Trash2, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { db } from '../lib/supabase';
import { SeatDistributionHeatmap } from './SeatDistributionHeatmap';

interface Request {
  id: string;
  requestNumber: string;
  requestorId: string;
  requestorName: string;
  division: string;
  numEmployees: number;
  numWorkstations: number;
  floor: string;
  location: string;
  justification: string;
  status: string;
  createdAt: string;
  requestedAllocationDate?: string;
  remarks?: string;
}

interface AllocationsPageProps {
  request: Request | null;
  onBack: () => void;
  onSaveAllocation: (allocationData: any) => void;
  onFinalApprove: (requestId: string, allAllocations: any[]) => void;
}

export function AllocationsPage({ request, onBack, onSaveAllocation, onFinalApprove }: AllocationsPageProps) {
  const [workstationData, setWorkstationData] = useState<any>({
    labAllocations: [],
    divisionRecords: [],
    floorBreakdown: [],
    divisionBreakdown: [],
    labAssetRanges: []
  });
  const [savedAllocations, setSavedAllocations] = useState<any[]>([]);
  const [totalAllocatedSeats, setTotalAllocatedSeats] = useState(0);
  const [selectedSeatsFromGrid, setSelectedSeatsFromGrid] = useState<number[]>([]);
  const [currentAllocationDetails, setCurrentAllocationDetails] = useState<any>(null);
  // Note: assetIdRange is no longer user input - it's auto-derived from selected positions
  const [pendingSeats, setPendingSeats] = useState<any[]>([]); // Seats that are saved but not approved yet
  const [allPendingSeatsGlobal, setAllPendingSeatsGlobal] = useState<any[]>([]); // ALL pending seats from all requests for grid visualization
  const [allSeatBookingsGlobal, setAllSeatBookingsGlobal] = useState<any[]>([]); // ALL seat bookings (pending + approved) from all requests for grid visualization
  
  // Edit mode state - for auto-navigating grid when editing saved allocations
  const [editModeInitialOffice, setEditModeInitialOffice] = useState<string | undefined>();
  const [editModeInitialFloor, setEditModeInitialFloor] = useState<string | undefined>();
  const [editModeInitialLab, setEditModeInitialLab] = useState<string | undefined>();
  const [editModeInitialSeats, setEditModeInitialSeats] = useState<number[]>([]);
  const [editModeKey, setEditModeKey] = useState<number>(0); // Key to force re-initialization on edit

  // Helper function to parse asset ID ranges and extract individual IDs
  const parseAssetIdRange = (rangeStr: string): number[] => {
    if (!rangeStr || rangeStr.trim() === '') return [];
    
    const ids: number[] = [];
    
    // Check if it's the legacy "to" format
    if (rangeStr.toLowerCase().includes(' to ')) {
      const parts = rangeStr.toLowerCase().split(' to ');
      if (parts.length === 2) {
        const startNum = parseInt(parts[0].split('/').pop()?.trim() || '0');
        const endNum = parseInt(parts[1].split('/').pop()?.trim() || '0');
        if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
          for (let i = startNum; i <= endNum; i++) {
            ids.push(i);
          }
          return ids;
        }
      }
    }
    
    // Split by commas to handle multiple ranges/individual IDs
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      // Extract just the numbers from the end
      const numberPart = part.split('/').pop() || part;
      
      // Check if it's a range with dash
      if (numberPart.includes('-')) {
        const [start, end] = numberPart.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            ids.push(i);
          }
        }
      } else {
        // Individual ID
        const num = parseInt(numberPart.trim());
        if (!isNaN(num)) {
          ids.push(num);
        }
      }
    }
    
    return ids;
  };

  // Helper function to get all asset IDs already assigned in a specific lab
  // CRITICAL: This checks BOTH approved (labs table) AND pending (seat_bookings table) allocations
  const getExistingAssetIdsInLab = async (labId: string, floorId: string, labName: string): Promise<{ assetIds: number[]; divisionMap: Map<number, string> }> => {
    try {
      const allAssetIds: number[] = [];
      const divisionMap = new Map<number, string>();

      // 1. Check APPROVED allocations (labs table)
      const allLabs = await db.labs.getAll();
      const divisionsInLab = allLabs.filter(
        lab => 
          lab.floor_id === floorId &&
          lab.lab_name === labName &&
          lab.division && 
          lab.division.trim() !== '' &&
          lab.asset_id_range && 
          lab.asset_id_range.trim() !== ''
      );

      for (const division of divisionsInLab) {
        const assetIds = parseAssetIdRange(division.asset_id_range!);
        assetIds.forEach(id => {
          allAssetIds.push(id);
          divisionMap.set(id, `${division.division} (Approved)`);
        });
      }

      // 2. CRITICAL FIX: Check PENDING allocations (seat_bookings table)
      // This prevents duplicate Asset IDs when other requests have pending allocations
      const allSeatBookings = await db.seatBookings.getAll();
      const pendingBookingsInLab = allSeatBookings.filter(
        booking =>
          booking.floor_id === floorId &&
          booking.lab_name === labName &&
          booking.status === 'pending' &&
          booking.asset_id &&
          booking.asset_id.trim() !== '' &&
          booking.request_id !== request?.id // Exclude current request's own bookings
      );

      for (const booking of pendingBookingsInLab) {
        const assetId = parseInt(booking.asset_id!, 10);
        if (!isNaN(assetId) && !allAssetIds.includes(assetId)) {
          allAssetIds.push(assetId);
          divisionMap.set(assetId, `${booking.division} (Pending/Reserved)`);
        }
      }

      return { assetIds: allAssetIds, divisionMap };
    } catch (error) {
      console.error('Error fetching existing asset IDs:', error);
      return { assetIds: [], divisionMap: new Map() };
    }
  };

  // Load workstation data on mount
  useEffect(() => {
    loadWorkstationData();
    loadAllPendingSeatsGlobal(); // Load ALL pending seats from all requests
    loadAllSeatBookingsGlobal(); // Load ALL seat bookings (pending + approved) from all requests
  }, []);

  // Load pending allocations for this request
  useEffect(() => {
    if (request) {
      loadPendingAllocations();
      loadAllPendingSeatsGlobal(); // Refresh global pending seats when request changes
      
      // CRITICAL: Clear current selection state when request changes
      // This prevents seat selections from carrying over between different requests
      setSelectedSeatsFromGrid([]);
      setCurrentAllocationDetails(null);
    }
  }, [request?.id]);

  // Load ALL pending seat bookings from all requests (for grid visualization)
  const loadAllPendingSeatsGlobal = async () => {
    try {
      const allSeatBookings = await db.seatBookings.getAll();
      const allPendingBookings = allSeatBookings.filter(
        (booking: any) => booking.status === 'pending'
      );

      const globalPendingSeats = allPendingBookings.map((booking: any) => ({
        labName: booking.lab_name,
        labId: booking.lab_id,
        floorId: booking.floor_id,
        seatNumber: booking.seat_number,
        division: booking.division,
        requestId: booking.request_id,
        status: 'pending'
      }));

      setAllPendingSeatsGlobal(globalPendingSeats);
    } catch (error) {
      console.error('Error loading global pending seats:', error);
    }
  };

  // Load ALL seat bookings (pending + approved) from all requests (for grid visualization)
  const loadAllSeatBookingsGlobal = async () => {
    try {
      const allSeatBookings = await db.seatBookings.getAll();

      const globalSeatBookings = allSeatBookings.map((booking: any) => ({
        labName: booking.lab_name,
        labId: booking.lab_id,
        floorId: booking.floor_id,
        seatNumber: booking.seat_number,
        division: booking.division,
        requestId: booking.request_id,
        status: booking.status,
        asset_id: booking.asset_id // CRITICAL FIX: Include Asset ID for grid display
      }));

      setAllSeatBookingsGlobal(globalSeatBookings);
    } catch (error) {
      console.error('Error loading global seat bookings:', error);
    }
  };

  const loadPendingAllocations = async () => {
    if (!request) return;
    
    try {
      // Fetch all seat bookings with status='pending' for this request
      const allSeatBookings = await db.seatBookings.getAll();
      const pendingBookings = allSeatBookings.filter(
        (booking: any) => booking.request_id === request.id && booking.status === 'pending'
      );

      if (pendingBookings.length === 0) {
        setSavedAllocations([]);
        setTotalAllocatedSeats(0);
        setPendingSeats([]);
        return;
      }

      // Fetch labs data to get office and floor information
      const labs = await db.labs.getAll();

      // Group pending bookings by lab to reconstruct savedAllocations
      const groupedByLab = pendingBookings.reduce((acc: any, booking: any) => {
        const key = `${booking.lab_id}_${booking.floor_id}`;
        if (!acc[key]) {
          // Find the lab record to get office and floor information
          const labRecord = labs.find((lab: any) => 
            lab.id === booking.lab_id || 
            (lab.lab_name === booking.lab_name && lab.floor_id === booking.floor_id)
          );

          // Get office and floor names from the lab's relationships
          let officeName = '';
          let floorName = '';
          
          if (labRecord && labRecord.floors) {
            floorName = labRecord.floors.floor_name || '';
            if (labRecord.floors.offices) {
              officeName = labRecord.floors.offices.office_name || '';
            }
          }

          acc[key] = {
            seats: [],
            labId: booking.lab_id,
            floorId: booking.floor_id,
            labName: booking.lab_name,
            division: booking.division,
            officeName: officeName,
            floorName: floorName,
            assetIds: []
          };
        }
        acc[key].seats.push(booking.seat_number);
        // CRITICAL FIX: Collect asset_id from each booking to maintain position mapping
        if (booking.asset_id && booking.asset_id.trim() !== '') {
          acc[key].assetIds.push(booking.asset_id);
        }
        return acc;
      }, {});

      // Reconstruct saved allocations from grouped data
      const reconstructedAllocations: any[] = [];
      let totalSeats = 0;

      for (const key in groupedByLab) {
        const group = groupedByLab[key];

        const allocation = {
          division: group.division,
          seats: group.seats,
          numSeats: group.seats.length,
          office: group.officeName,
          floor: group.floorName,
          labName: group.labName,
          labId: group.labId,
          floorId: group.floorId,
          assetIdRange: group.assetIds.length > 0 ? group.assetIds.join(', ') : null
        };

        reconstructedAllocations.push(allocation);
        totalSeats += group.seats.length;
      }

      setSavedAllocations(reconstructedAllocations);
      setTotalAllocatedSeats(totalSeats);

      // Set pending seats for grid visualization
      const pendingSeatsData = pendingBookings.map((booking: any) => ({
        labName: booking.lab_name,
        labId: booking.lab_id,
        floorId: booking.floor_id,
        seatNumber: booking.seat_number,
        division: booking.division,
        status: 'pending'
      }));
      setPendingSeats(pendingSeatsData);

      // Load pending allocations complete
    } catch (error) {
      console.error('Error loading pending allocations:', error);
      // Removed toast notification
    }
  };

  const loadWorkstationData = async () => {
    try {
      const [labs, labAssetRanges] = await Promise.all([
        db.labs.getAll(),
        db.labAssetRanges.getAll()
      ]);

      // labAllocations = labs with no division (available lab spaces)
      const labAllocations = labs.filter((lab: any) => !lab.division || lab.division.trim() === '');
      
      // divisionRecords = labs with divisions assigned
      const divisionRecords = labs.filter((lab: any) => lab.division && lab.division.trim() !== '');

      setWorkstationData({
        labAllocations: labAllocations,
        divisionRecords: divisionRecords,
        floorBreakdown: labs,
        divisionBreakdown: divisionRecords,
        labAssetRanges: labAssetRanges
      });

      // Reload pending allocations after workstation data is loaded
      if (request) {
        await loadPendingAllocations();
      }
    } catch (error) {
      console.error('Error loading workstation data:', error);
      toast.error('Failed to load workstation data');
    }
  };

  // Helper function to get Asset IDs for selected seat positions
  const getAssetIdsForPositions = (positions: number[]): number[] => {
    if (!currentAllocationDetails || positions.length === 0) return [];
    
    console.log('🔍 getAssetIdsForPositions Debug:', {
      positions,
      currentAllocationDetails,
      labAssetRanges: workstationData.labAssetRanges
    });
    
    // CRITICAL FIX: Look up asset range from labs table instead of labAssetRanges table
    // The labAssetRanges table might be empty, but labs table has asset_id_range
    const labRecord = workstationData.labAllocations?.find(
      (lab: any) => 
        lab.id === currentAllocationDetails.labId &&
        lab.floor_id === currentAllocationDetails.floorId
    ) || workstationData.divisionRecords?.find(
      (lab: any) => 
        lab.id === currentAllocationDetails.labId &&
        lab.floor_id === currentAllocationDetails.floorId
    );
    
    console.log('🎯 Found lab record:', labRecord);
    
    if (!labRecord || !labRecord.asset_id_range) {
      console.warn('⚠️ No lab record found for:', {
        labId: currentAllocationDetails.labId,
        floorId: currentAllocationDetails.floorId
      });
      return [];
    }
    
    // Parse the lab's Asset ID range (e.g., "30-59")
    const parts = labRecord.asset_id_range.split('-');
    if (parts.length !== 2) return [];
    
    const start = parseInt(parts[0].trim());
    const end = parseInt(parts[1].trim());
    
    if (isNaN(start) || isNaN(end)) return [];
    
    // Generate all Asset IDs for the lab
    const labAssetIds: number[] = [];
    for (let i = start; i <= end; i++) {
      labAssetIds.push(i);
    }
    
    console.log('📋 Lab Asset IDs:', { range: `${start}-${end}`, labAssetIds: labAssetIds.slice(0, 10) });
    
    // Map positions to Asset IDs
    const result = positions.map(pos => labAssetIds[pos - 1]).filter(id => id !== undefined);
    console.log('✅ Mapped positions to Asset IDs:', { positions, result });
    return result;
  };

  const handleBookingSubmit = (bookingData: any) => {
    // This is called when user selects seats from the grid
    
    // Store the selected seats and allocation details
    // Asset IDs will be auto-derived from positions when saving
    setSelectedSeatsFromGrid(bookingData.selectedSeats || []);
    setCurrentAllocationDetails(bookingData);
  };

  const handleSave = async () => {
    if (selectedSeatsFromGrid.length === 0) {
      // Silent validation - no toast needed
      return;
    }

    if (!currentAllocationDetails) {
      // Silent validation - no toast needed
      return;
    }

    // CRITICAL VALIDATION: Check lab capacity before proceeding
    // Find the lab allocation record for this specific lab
    const labAllocation = workstationData.labAllocations.find(
      (lab: any) => 
        lab.id === currentAllocationDetails.labId || 
        (lab.lab_name === currentAllocationDetails.labName && 
         lab.floor_id === currentAllocationDetails.floorId &&
         (!lab.division || lab.division.trim() === '')) // Get the main lab allocation (no division)
    );

    if (!labAllocation) {
      toast.error(
        `⚠️ Lab "${currentAllocationDetails.labName}" not found in Workstation Data. Please ensure the lab is configured in Floor & Lab Allocation Management.`,
        { duration: 6000 }
      );
      return;
    }

    // Calculate total seats already in use in this lab (all divisions combined)
    const divisionsInLab = workstationData.divisionRecords.filter(
      (div: any) => 
        div.lab_name === currentAllocationDetails.labName && 
        div.floor_id === currentAllocationDetails.floorId
    );
    
    const totalInUse = divisionsInLab.reduce((sum: number, div: any) => sum + (div.in_use || 0), 0);
    
    // Calculate pending seats in this lab (from all pending requests)
    const pendingInLab = allPendingSeatsGlobal.filter(
      (seat: any) => 
        seat.labId === currentAllocationDetails.labId && 
        seat.floorId === currentAllocationDetails.floorId
    ).length;
    
    // Calculate seats already saved in this allocation session for this lab
    const savedInThisLab = savedAllocations
      .filter((alloc: any) => 
        alloc.labId === currentAllocationDetails.labId && 
        alloc.floorId === currentAllocationDetails.floorId
      )
      .reduce((sum: number, alloc: any) => sum + alloc.seats.length, 0);
    
    // Calculate available capacity
    const totalCapacity = labAllocation.total_workstations || 0;
    const availableCapacity = totalCapacity - totalInUse - pendingInLab - savedInThisLab;
    
    // CRITICAL CHECK: Prevent over-allocation beyond lab capacity
    if (selectedSeatsFromGrid.length > availableCapacity) {
      toast.error(
        `⚠️ Insufficient lab capacity!\n\n` +
        `Lab: ${currentAllocationDetails.labName}\n` +
        `Total Capacity: ${totalCapacity} seats\n` +
        `Already In Use: ${totalInUse} seats\n` +
        `Pending Approval: ${pendingInLab} seats\n` +
        `Saved in this session: ${savedInThisLab} seats\n` +
        `Currently Available: ${availableCapacity} seats\n\n` +
        `You are trying to allocate ${selectedSeatsFromGrid.length} seats, but only ${availableCapacity} seat${availableCapacity === 1 ? ' is' : 's are'} available.`,
        { duration: 10000 }
      );
      return;
    }

    // Calculate remaining seats needed
    const remainingSeats = (request?.numWorkstations || 0) - totalAllocatedSeats;
    
    // Validate: Prevent over-allocation
    if (selectedSeatsFromGrid.length > remainingSeats) {
      toast.error(
        `⚠️ Cannot allocate ${selectedSeatsFromGrid.length} seats. Only ${remainingSeats} seat${remainingSeats === 1 ? '' : 's'} remaining to fulfill this request.`,
        { duration: 5000 }
      );
      return;
    }

    // CRITICAL CHANGE: Auto-derive Asset IDs from selected positions
    // Instead of user manually entering Asset IDs, we automatically get them from the lab's Asset ID range
    const derivedAssetIds = getAssetIdsForPositions(selectedSeatsFromGrid);
    
    // Auto-populate assetIdRange for saving (derive from selected positions)
    const autoAssetIdRange = derivedAssetIds.length > 0 
      ? derivedAssetIds.sort((a, b) => a - b).join(', ') 
      : null;
    
    // Validation: Asset ID validation (using auto-derived Asset IDs)
    let assetIds: number[] = derivedAssetIds;
    
    if (assetIds.length > 0) {
      // Check for Asset ID conflicts in the same lab
      const { assetIds: existingAssetIds, divisionMap } = await getExistingAssetIdsInLab(
        currentAllocationDetails.labId,
        currentAllocationDetails.floorId,
        currentAllocationDetails.labName
      );

      // Find conflicts
      const conflicts: { assetId: number; division: string }[] = [];
      for (const assetId of assetIds) {
        if (existingAssetIds.includes(assetId)) {
          const division = divisionMap.get(assetId);
          if (division) {
            conflicts.push({ assetId, division });
          }
        }
      }

      // Also check for conflicts with previously saved allocations in this request
      for (const savedAllocation of savedAllocations) {
        if (savedAllocation.labId === currentAllocationDetails.labId && 
            savedAllocation.floorId === currentAllocationDetails.floorId &&
            savedAllocation.assetIdRange) {
          const savedAssetIds = parseAssetIdRange(savedAllocation.assetIdRange);
          const overlappingIds = assetIds.filter(id => savedAssetIds.includes(id));
          
          if (overlappingIds.length > 0) {
            overlappingIds.forEach(id => {
              conflicts.push({ assetId: id, division: `${savedAllocation.division} (in saved allocations)` });
            });
          }
        }
      }

      // If conflicts found, show error and prevent save
      if (conflicts.length > 0) {
        const conflictList = conflicts
          .slice(0, 3) // Show only first 3 conflicts
          .map(c => `${c.assetId} (${c.division})`)
          .join(', ');
        
        const moreCount = conflicts.length > 3 ? ` +${conflicts.length - 3} more` : '';
        
        toast.error(
          `Asset ID Conflict: ${conflictList}${moreCount}. Please use different IDs.`,
          { duration: 6000 }
        );
        return;
      }
    }

    try {
      // Silent save - no loading toast

      // Saving allocation to database

      // SMART MERGING LOGIC: Check if there's already an allocation in the same lab
      const existingAllocationIndex = savedAllocations.findIndex(
        (alloc: any) => 
          alloc.labId === currentAllocationDetails.labId && 
          alloc.floorId === currentAllocationDetails.floorId
      );

      const isExistingAllocation = existingAllocationIndex !== -1;
      let mergedSeats = [...selectedSeatsFromGrid];
      let mergedAssetIdRange = autoAssetIdRange || null; // Use auto-derived Asset IDs
      let successMessage = '';

      // CRITICAL FIX: Distinguish between EDIT MODE and MERGE MODE
      // EDIT MODE: User clicked "Edit" button (editModeInitialSeats > 0) → REPLACE seats
      // MERGE MODE: User is adding more seats to same lab (NO edit mode) → ADD seats
      const isInEditMode = editModeInitialSeats.length > 0;

      if (isExistingAllocation && !isInEditMode) {
        // MERGE MODE: Add new seats to existing allocation (normal incremental allocation)
        const existingAllocation = savedAllocations[existingAllocationIndex];
        mergedSeats = [...existingAllocation.seats, ...selectedSeatsFromGrid];
        
        // Handle Asset ID range merging - using auto-derived Asset IDs
        if (existingAllocation.assetIdRange && autoAssetIdRange) {
          // Both have Asset IDs - merge them
          mergedAssetIdRange = `${existingAllocation.assetIdRange}, ${autoAssetIdRange}`;
        } else if (existingAllocation.assetIdRange) {
          // Only existing has Asset ID
          mergedAssetIdRange = existingAllocation.assetIdRange;
        }
        // else: only new has Asset ID or neither has it - use new one

        // Smart merge: Adding new seats to existing allocation
        
        successMessage = `✅ Added ${selectedSeatsFromGrid.length} seats to existing allocation in ${currentAllocationDetails.labName}. Total: ${mergedSeats.length} seats.`;
      } else if (isExistingAllocation && isInEditMode) {
        // EDIT MODE: REPLACE seats (not merge!)
        mergedSeats = [...selectedSeatsFromGrid]; // Use ONLY new selection
        mergedAssetIdRange = autoAssetIdRange || null; // Use ONLY new auto-derived Asset IDs
        
        // Edit mode: Replacing seats in allocation
        
        successMessage = `✅ Updated allocation in ${currentAllocationDetails.labName} to ${selectedSeatsFromGrid.length} seats.`;
      } else {
        // New allocation mode
        successMessage = `✅ Saved allocation of ${selectedSeatsFromGrid.length} seats in ${currentAllocationDetails.labName}. Seats are now locked as Pending and persisted to database.`;
      }

      // Create seat bookings in database with status='pending'
      // Note: asset_id is NOW stored per seat in seat_bookings table to maintain position mapping
      // CRITICAL FIX: When in EDIT MODE, UPDATE existing records instead of creating duplicates
      const allExistingBookings = await db.seatBookings.getAll();
      
      // Check if we're in edit mode (editing an existing allocation)
      const isEditMode = editModeInitialSeats.length > 0;
      
      if (isEditMode) {
        // Edit mode: Update existing records with new Asset IDs (no duplicates)
        
        for (let i = 0; i < selectedSeatsFromGrid.length; i++) {
          const seatNum = selectedSeatsFromGrid[i];

          // Map Asset ID to this specific seat if Asset IDs were provided
          let assetIdForThisSeat: string | null = null;
          if (assetIds.length > 0 && i < assetIds.length) {
            assetIdForThisSeat = assetIds[i].toString();
          }

          // Find existing booking for this seat
          const existingBooking = allExistingBookings.find(
            (booking: any) =>
              booking.request_id === request!.id &&
              booking.lab_id === currentAllocationDetails.labId &&
              booking.floor_id === currentAllocationDetails.floorId &&
              booking.seat_number === seatNum &&
              booking.status === 'pending'
          );

          if (existingBooking) {
            // UPDATE existing record with new Asset ID
            await db.seatBookings.update(existingBooking.id, {
              asset_id: assetIdForThisSeat
            });
          } else {
            // Safety fallback: Create new record if somehow doesn't exist
            await db.seatBookings.create({
              request_id: request!.id,
              lab_id: currentAllocationDetails.labId,
              lab_name: currentAllocationDetails.labName,
              floor_id: currentAllocationDetails.floorId,
              seat_number: seatNum,
              requestor_id: request!.requestorId,
              requestor_name: request!.requestorName,
              division: request!.division,
              status: 'pending',
              asset_id: assetIdForThisSeat
            });
          }
        }
      } else {
        // NEW ALLOCATION MODE: Check for duplicates and create new records
        const existingPendingSeatsForThisRequestInLab = allExistingBookings.filter(
          (booking: any) =>
            booking.request_id === request!.id &&
            booking.lab_id === currentAllocationDetails.labId &&
            booking.floor_id === currentAllocationDetails.floorId &&
            booking.status === 'pending' &&
            selectedSeatsFromGrid.includes(booking.seat_number)
        );

        // CRITICAL FIX: Properly delete existing pending records to prevent duplicates
        // Use db.seatBookings.delete() instead of marking as 'rejected'
        for (const existingBooking of existingPendingSeatsForThisRequestInLab) {
          await db.seatBookings.delete(existingBooking.id);
        }

        // Create new booking records
        for (let i = 0; i < selectedSeatsFromGrid.length; i++) {
          const seatNum = selectedSeatsFromGrid[i];

          // Map Asset ID to this specific seat if Asset IDs were provided
          let assetIdForThisSeat: string | null = null;
          if (assetIds.length > 0 && i < assetIds.length) {
            assetIdForThisSeat = assetIds[i].toString();
          }

          await db.seatBookings.create({
            request_id: request!.id,
            lab_id: currentAllocationDetails.labId,
            lab_name: currentAllocationDetails.labName,
            floor_id: currentAllocationDetails.floorId,
            seat_number: seatNum,
            requestor_id: request!.requestorId,
            requestor_name: request!.requestorName,
            division: request!.division,
            status: 'pending',
            asset_id: assetIdForThisSeat
          });
        }
      }

      const allocation = {
        division: request?.division || '',
        seats: mergedSeats, // Use merged seats
        numSeats: mergedSeats.length, // Use merged count
        office: currentAllocationDetails.office,
        floor: currentAllocationDetails.floor,
        labName: currentAllocationDetails.labName,
        labId: currentAllocationDetails.labId,
        floorId: currentAllocationDetails.floorId,
        assetIdRange: mergedAssetIdRange, // Use merged Asset ID range
      };

      // Update savedAllocations: either replace existing or add new
      if (isExistingAllocation) {
        // MERGE: Replace the existing allocation with merged one
        const updatedAllocations = [...savedAllocations];
        updatedAllocations[existingAllocationIndex] = allocation;
        setSavedAllocations(updatedAllocations);
      } else {
        // NEW: Add to the array
        setSavedAllocations([...savedAllocations, allocation]);
      }

      // CRITICAL FIX: Calculate totalAllocatedSeats correctly for EDIT MODE
      if (isInEditMode) {
        // EDIT MODE: Total doesn't change, we're REPLACING seats
        // The count was already reduced in handleEditAllocation, now add back the new count
        setTotalAllocatedSeats(totalAllocatedSeats + selectedSeatsFromGrid.length);
      } else {
        // NEW or MERGE MODE: Add to total
        setTotalAllocatedSeats(totalAllocatedSeats + selectedSeatsFromGrid.length);
      }
      
      // Add seats to pending status (Yellow P) - these seats are now locked
      const newPendingSeats = selectedSeatsFromGrid.map(seatNum => ({
        labName: currentAllocationDetails.labName,
        labId: currentAllocationDetails.labId,
        floorId: currentAllocationDetails.floorId,
        seatNumber: seatNum,
        division: request?.division || '',
        status: 'pending'
      }));
      setPendingSeats([...pendingSeats, ...newPendingSeats]);
      
      // Reset selections for next allocation
      setSelectedSeatsFromGrid([]);
      setCurrentAllocationDetails(null);
      
      // Clear edit mode state variables
      setEditModeInitialOffice(undefined);
      setEditModeInitialFloor(undefined);
      setEditModeInitialLab(undefined);
      setEditModeInitialSeats([]);
      
      // Update request status to 'partially_allocated' when allocations are saved
      // This shows in System Requests that the admin has started allocating seats
      await db.requests.update(request!.id, { 
        status: 'partially_allocated' 
      });

      // Reload global pending seats to update the grid across all requests
      await loadAllPendingSeatsGlobal();
      await loadAllSeatBookingsGlobal(); // Reload ALL bookings to show approved seats from other divisions

      toast.success(successMessage);
      
      // Notify parent component to reload data (this updates System Requests table)
      onSaveAllocation({ requestId: request!.id, allocations: savedAllocations });
    } catch (error) {
      console.error('Error saving allocation:', error);
      toast.error('Failed to save allocation to database. Please try again.');
    }
  };

  const handleEditAllocation = async (index: number) => {
    const allocation = savedAllocations[index];
    
    try {
      // CRITICAL FIX: Do NOT delete from database when editing
      // Keep the seats as 'pending' in database so they remain locked
      // This prevents position shifting and ensures other requests can't grab these seats
      
      // Remove from saved allocations array (UI only)
      const updatedAllocations = savedAllocations.filter((_, i) => i !== index);
      setSavedAllocations(updatedAllocations);
      
      // Remove from pending seats state (UI only)
      const updatedPendingSeats = pendingSeats.filter(
        ps => !(ps.labName === allocation.labName && allocation.seats.includes(ps.seatNumber))
      );
      setPendingSeats(updatedPendingSeats);
      
      // Restore to selection (these seats will show as green/selected in grid)
      setSelectedSeatsFromGrid(allocation.seats);
      setCurrentAllocationDetails({
        office: allocation.office,
        floor: allocation.floor,
        labName: allocation.labName,
        labId: allocation.labId,
        floorId: allocation.floorId,
        selectedSeats: allocation.seats
      });
      // Note: Asset IDs will be auto-derived from positions
      
      // Set edit mode state to auto-navigate grid
      // Create composite key format: "Office|Floor|LabName"
      const compositeLabKey = `${allocation.office}|${allocation.floor}|${allocation.labName}`;
      setEditModeInitialOffice(allocation.office);
      setEditModeInitialFloor(allocation.floor);
      setEditModeInitialLab(compositeLabKey);
      setEditModeInitialSeats(allocation.seats);
      setEditModeKey(prev => prev + 1); // Increment key to force re-initialization
      
      // Update total allocated seats (reduce by the amount being edited)
      setTotalAllocatedSeats(totalAllocatedSeats - allocation.numSeats);
      
      // Reload global pending seats AND bookings to update the grid
      // The seats remain as 'pending' in database, but will show as 'selected' in grid
      await loadAllPendingSeatsGlobal();
      await loadAllSeatBookingsGlobal(); // CRITICAL: Reload ALL bookings to refresh grid visualization
      
      // Silent edit - no toast notification (REMOVED: toast.info for editing)
    } catch (error) {
      console.error('Error editing allocation:', error);
      // Silent error handling
    }
  };

  const handleDeleteAllocation = async (index: number) => {
    const allocation = savedAllocations[index];
    
    try {
      // Delete from database - get all seat bookings for this allocation
      const allSeatBookings = await db.seatBookings.getAll();
      const bookingsToDelete = allSeatBookings.filter(
        (booking: any) => 
          booking.request_id === request!.id &&
          booking.lab_id === allocation.labId &&
          booking.floor_id === allocation.floorId &&
          allocation.seats.includes(booking.seat_number) &&
          booking.status === 'pending'
      );

      // CRITICAL FIX: Actually delete bookings instead of marking as rejected
      for (const booking of bookingsToDelete) {
        await db.seatBookings.delete(booking.id);
      }

      // Remove from saved allocations
      const updatedAllocations = savedAllocations.filter((_, i) => i !== index);
      setSavedAllocations(updatedAllocations);
      
      // Remove from pending seats
      const updatedPendingSeats = pendingSeats.filter(
        ps => !(ps.labName === allocation.labName && allocation.seats.includes(ps.seatNumber))
      );
      setPendingSeats(updatedPendingSeats);
      
      // Update total allocated seats
      const newTotalAllocated = totalAllocatedSeats - allocation.numSeats;
      setTotalAllocatedSeats(newTotalAllocated);
      
      // CRITICAL FIX: If no more allocations remain, revert request status back to 'pending'
      if (updatedAllocations.length === 0) {
        await db.requests.update(request!.id, { 
          status: 'pending' 
        });
        
        // Notify parent component to reload data (this updates System Requests table)
        onSaveAllocation({ requestId: request!.id, allocations: [] });
      }
      
      // Reload global pending seats AND bookings to update the grid
      await loadAllPendingSeatsGlobal();
      await loadAllSeatBookingsGlobal(); // CRITICAL: Reload ALL bookings to refresh grid visualization
      
      // Silent delete - no toast notification (REMOVED: toast.success for deletion)
    } catch (error) {
      console.error('Error deleting allocation:', error);
      // Silent error handling
    }
  };

  const handleSaveAndApprove = async () => {
    if (!request) return;

    // Include current selection if any
    let allAllocations = [...savedAllocations];
    let currentTotal = totalAllocatedSeats;
    
    if (selectedSeatsFromGrid.length > 0) {
      // Warn user they have unsaved selections
      toast.error('You have unsaved seat selections. Please click \"Save Allocation\" first or clear your selection.');
      return;
    }

    const totalRequired = request.numWorkstations || request.numEmployees;

    if (currentTotal < totalRequired) {
      const remaining = totalRequired - currentTotal;
      toast.error(`Cannot approve: Still need to allocate ${remaining} more seats. Total required: ${totalRequired}, Allocated: ${currentTotal}`);
      return;
    }

    if (allAllocations.length === 0) {
      toast.error('No allocations to save');
      return;
    }

    // Call the final approve callback
    onFinalApprove(request.id, allAllocations);
  };

  const handleCancelSelection = async () => {
    // Check if we're in edit mode
    const isInEditMode = editModeInitialSeats.length > 0;

    if (isInEditMode) {
      // EDIT MODE: Restore the allocation to pending state
      try {
        // Silent restore - no loading toast
        
        // Restore the allocation back to savedAllocations
        const restoredAllocation = {
          division: request?.division || '',
          seats: editModeInitialSeats,
          numSeats: editModeInitialSeats.length,
          office: editModeInitialOffice || currentAllocationDetails?.office || '',
          floor: editModeInitialFloor || currentAllocationDetails?.floor || '',
          labName: currentAllocationDetails?.labName || '',
          labId: currentAllocationDetails?.labId || '',
          floorId: currentAllocationDetails?.floorId || '',
          assetIdRange: assetIdRange || null
        };

        setSavedAllocations([...savedAllocations, restoredAllocation]);
        
        // Restore total allocated seats
        setTotalAllocatedSeats(totalAllocatedSeats + editModeInitialSeats.length);
        
        // Restore to pending seats
        const restoredPendingSeats = editModeInitialSeats.map(seatNum => ({
          labName: restoredAllocation.labName,
          labId: restoredAllocation.labId,
          floorId: restoredAllocation.floorId,
          seatNumber: seatNum,
          division: request?.division || '',
          status: 'pending'
        }));
        setPendingSeats([...pendingSeats, ...restoredPendingSeats]);
        
        // Clear selection state
        setSelectedSeatsFromGrid([]);
        setCurrentAllocationDetails(null);
        
        // Clear edit mode state
        setEditModeInitialOffice(undefined);
        setEditModeInitialFloor(undefined);
        setEditModeInitialLab(undefined);
        setEditModeInitialSeats([]);
        
        // Reload global states
        await loadAllPendingSeatsGlobal();
        await loadAllSeatBookingsGlobal();
        
        // Silent success - no toast notification (REMOVED: toast for cancel)
      } catch (error) {
        console.error('Error cancelling edit:', error);
        // Silent error handling
      }
    } else {
      // NEW ALLOCATION MODE: Simply clear the selection
      setSelectedSeatsFromGrid([]);
      setCurrentAllocationDetails(null);
      setAssetIdRange('');
      
      // Silent clear - no toast notification (REMOVED: toast.info for clear)
    }
  };

  if (!request) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-slate-600 mb-4">No request selected for allocation</p>
          <Button onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Requests
          </Button>
        </div>
      </div>
    );
  }

  const totalRequired = request.numWorkstations || request.numEmployees;
  const remainingSeats = totalRequired - totalAllocatedSeats;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="outline" onClick={onBack}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Requests
      </Button>

      {/* Request Details Header */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Details of the Requestor and Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-blue-800">Requestor Name</Label>
              <div className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{request.requestorName}</span>
              </div>
            </div>
            <div>
              <Label className="text-blue-800">Employee ID</Label>
              <p className="font-medium mt-1">{request.requestorId}</p>
            </div>
            <div>
              <Label className="text-blue-800">Division</Label>
              <div className="mt-1">
                <Badge className="bg-blue-600">{request.division}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-blue-800">Workstations Required</Label>
              <p className="font-medium mt-1 text-lg">{totalRequired}</p>
            </div>
            <div>
              <Label className="text-blue-800">Preferred Location</Label>
              <div className="flex items-center gap-2 mt-1">
                <Building className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{request.location}</span>
              </div>
            </div>
            <div>
              <Label className="text-blue-800">Requested Allocation Date</Label>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium">
                  {request.requestedAllocationDate 
                    ? new Date(request.requestedAllocationDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Not specified'}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-blue-800">Submission Date</Label>
              <p className="font-medium mt-1">
                {new Date(request.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            {request.remarks && (
              <div className="col-span-full">
                <Label className="text-blue-800">Manager's Remarks</Label>
                <p className="mt-1 text-sm bg-white p-3 rounded border border-blue-200">{request.remarks}</p>
              </div>
            )}
          </div>

          {/* Allocation Progress */}
          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-blue-800">Allocation Progress</Label>
              <span className="text-sm font-medium">
                {totalAllocatedSeats} / {totalRequired} seats allocated
              </span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(totalAllocatedSeats / totalRequired) * 100}%` }}
              />
            </div>
            {remainingSeats > 0 && (
              <p className="text-sm text-amber-600 mt-2">
                ⚠️ {remainingSeats} seats remaining to allocate
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workstation Allocations Grid - Using the EXACT same component */}
      <SeatDistributionHeatmap
        data={workstationData}
        enableBooking={true}
        onBookingSubmit={handleBookingSubmit}
        userInfo={{
          id: 'admin',
          name: 'Admin',
          division: request.division
        }}
        seatBookings={allSeatBookingsGlobal}
        pendingAllocations={allPendingSeatsGlobal}
        onRefreshData={loadWorkstationData}
        userMode={false}
        showFloorData={totalAllocatedSeats >= totalRequired}
        requestId={request.id}
        initialOffice={editModeInitialOffice}
        initialFloor={editModeInitialFloor}
        initialLab={editModeInitialLab}
        initialSelectedSeats={editModeInitialSeats}
        editModeKey={editModeKey}
      />

      {/* Saved Allocations Summary - Moved after grid for better accessibility */}
      {savedAllocations.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-900">Saved Allocations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedAllocations.map((allocation, index) => (
                <div key={index} className="p-4 bg-white rounded-lg border border-green-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
                    <div>
                      <Label className="text-xs text-slate-600">Lab</Label>
                      <p className="font-medium text-sm">{allocation.labName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Office & Floor</Label>
                      <p className="font-medium text-sm">{allocation.office} - {allocation.floor}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Division</Label>
                      <Badge className="bg-green-600">{allocation.division}</Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Seats Allocated</Label>
                      <p className="font-medium text-sm">{allocation.numSeats} seats</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-green-100">
                    <Label className="text-xs text-slate-600">Asset IDs Allocated</Label>
                    <p className="text-xs mt-1 font-mono text-slate-700">
                      {allocation.assetIdRange || 'N/A'}
                    </p>
                  </div>
                  <div className="pt-2 flex gap-2">
                    <Button 
                      onClick={() => handleEditAllocation(index)}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      onClick={() => handleDeleteAllocation(index)}
                      size="sm"
                      variant="destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-filled Fields - Shown when seats are selected */}
      {selectedSeatsFromGrid.length > 0 && currentAllocationDetails && (
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader>
            <CardTitle className="text-sky-900">Allocation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sky-800 font-medium">Office (Autofilled)</Label>
                <Input 
                  value={currentAllocationDetails.office} 
                  disabled 
                  className="mt-1 bg-white border-sky-300 font-medium" 
                />
              </div>
              <div>
                <Label className="text-sky-800 font-medium">Floor (Autofilled)</Label>
                <Input 
                  value={currentAllocationDetails.floor} 
                  disabled 
                  className="mt-1 bg-white border-sky-300 font-medium" 
                />
              </div>
              <div>
                <Label className="text-sky-800 font-medium">Total Seats Selected</Label>
                <Input 
                  value={selectedSeatsFromGrid.length} 
                  disabled 
                  className="mt-1 bg-white border-sky-300 font-medium text-lg" 
                />
              </div>
              <div>
                <Label className="text-sky-800 font-medium">Division (From Request)</Label>
                <Input 
                  value={request.division} 
                  disabled 
                  className="mt-1 bg-white border-sky-300 font-medium" 
                />
              </div>
            </div>

            <div className="mt-4 p-3 bg-white rounded border border-sky-200">
              <Label className="text-sky-800 font-medium">Selected Asset IDs</Label>
              <p className="text-sm mt-1 font-mono text-slate-700">
                {(() => {
                  const assetIds = getAssetIdsForPositions(selectedSeatsFromGrid);
                  return assetIds.length > 0 
                    ? assetIds.sort((a, b) => a - b).join(', ')
                    : selectedSeatsFromGrid.sort((a, b) => a - b).join(', '); // Fallback to positions if Asset IDs not available
                })()}
              </p>
            </div>

            {/* Show warning if trying to select more than remaining */}
            {selectedSeatsFromGrid.length > remainingSeats && (
              <div className="mt-4 p-3 bg-red-50 rounded border border-red-300">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Warning: You have selected {selectedSeatsFromGrid.length} seats, but only {remainingSeats} seat{remainingSeats === 1 ? '' : 's'} {remainingSeats === 1 ? 'is' : 'are'} remaining to be allocated.
                </p>
              </div>
            )}

            {/* Show helpful info about remaining seats */}
            {selectedSeatsFromGrid.length > 0 && selectedSeatsFromGrid.length <= remainingSeats && (
              <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-300">
                <p className="text-sm text-blue-700 font-medium">
                  ℹ️ Allocating {selectedSeatsFromGrid.length} of {remainingSeats} remaining seats. {remainingSeats - selectedSeatsFromGrid.length} will still need to be allocated.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {selectedSeatsFromGrid.length > 0 && (
        <div className="flex justify-end gap-4">
          <Button 
            onClick={handleCancelSelection}
            variant="outline"
            size="lg"
            className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            variant="outline"
            size="lg"
            className="bg-blue-100 hover:bg-blue-200 border-blue-400 text-blue-900"
          >
            <Save className="w-5 h-5 mr-2" />
            Save
          </Button>
          <Button 
            onClick={handleSaveAndApprove}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Submit
          </Button>
        </div>
      )}

      {/* Show Save and Approve even when no current selection if there are saved allocations */}
      {selectedSeatsFromGrid.length === 0 && savedAllocations.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveAndApprove}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}