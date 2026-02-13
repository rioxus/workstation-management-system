import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { BarChart3, Calendar, Info, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { toast } from "sonner";
import { LabAssetRange } from "../lib/supabase";

interface WorkstationData {
  labAllocations?: any[];
  divisionRecords?: any[];
  floorBreakdown?: any[];
  divisionBreakdown?: any[];
  labAssetRanges?: LabAssetRange[]; // Add lab asset ranges
}

interface SeatDistributionHeatmapProps {
  data: WorkstationData;
  enableBooking?: boolean;
  onBookingSubmit?: (request: any) => void;
  userInfo?: any;
  seatBookings?: any[]; // Add seat bookings prop
  pendingAllocations?: any[]; // Add pending allocations prop (for admin allocation mode)
  onRefreshData?: () => void; // Add refresh handler
  userMode?: boolean; // Add user mode prop to simplify interface
  showFloorData?: boolean; // Add prop to control floor data visibility (default: true)
  requestId?: string; // Add request ID to track when request changes
  initialOffice?: string; // Add initial office selection
  initialFloor?: string; // Add initial floor selection
  initialLab?: string; // Add initial lab selection
  initialSelectedSeats?: number[]; // Add initial seat selections
  editModeKey?: number; // Add edit mode key to force re-initialization on edit
  lockedOffice?: string; // Add locked office prop for Dashboard filter integration
}

interface DivisionData {
  division: string;
  seats: number;
  color: string;
}

// Seat status type
type SeatStatus = "available" | "booked" | "pending";

export function SeatDistributionHeatmap({
  data,
  enableBooking = true,
  onBookingSubmit,
  userInfo,
  seatBookings = [],
  pendingAllocations = [],
  onRefreshData,
  userMode = false,
  showFloorData = true,
  requestId,
  initialOffice,
  initialFloor,
  initialLab,
  initialSelectedSeats = [],
  editModeKey = 0,
  lockedOffice,
}: SeatDistributionHeatmapProps) {
  const [selectedSeats, setSelectedSeats] = useState<number[]>(
    initialSelectedSeats,
  );
  const [selectedOffice, setSelectedOffice] =
    useState<string>(initialOffice || "all");
  const [selectedFloor, setSelectedFloor] =
    useState<string>(initialFloor || "all");
  const [selectedLab, setSelectedLab] = useState<string>(initialLab || "all");
  const [selectedDivisionFilter, setSelectedDivisionFilter] =
    useState<string>("all");
  const [numSeatsToSelect, setNumSeatsToSelect] =
    useState<string>(""); // For multiple seat selector
  const [bookingDialogOpen, setBookingDialogOpen] =
    useState(false);
  const [bookingForm, setBookingForm] = useState({
    employeeId: "",
    fullName: "",
    department: "",
    bookingDate: "",
    remarks: "",
  });

  // NOTE: This component displays live data from the Workstation Data tab (lab_allocations table)
  // Data updates automatically when admin approves/rejects requests via dataService.approveRequest()
  // The division-wise usage (divisionRecords) shows current seat occupancy across all divisions

  // CRITICAL BUSINESS RULE: Asset ID Assignment
  // - When admin APPROVES a user request, seats are marked as "Booked" (State B) but NO Asset IDs are assigned
  // - Asset IDs can ONLY be assigned manually by Admin through the Workstation Data Management interface
  // - State A (Available): Gray boxes with "A" - not booked by any division
  // - State B (Booked, No Asset ID): Colored boxes with "B" - booked by division, awaiting Asset ID assignment
  // - State C (Booked, Has Asset ID): Colored boxes with asset ID number - fully allocated with Asset ID

  // Define color palette for divisions - highly contrasting colors
  const divisionColors = [
    "#EF4444", // red
    "#3B82F6", // blue
    "#10B981", // green
    "#F59E0B", // amber
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#14B8A6", // teal
    "#F97316", // orange
    "#06B6D4", // cyan
    "#6366F1", // indigo
    "#84CC16", // lime
    "#F43F5E", // rose
  ];

  // CRITICAL FIX: Clear selected seats when lab, floor, or office changes
  // This prevents seats from different labs being selected simultaneously during edit mode
  useEffect(() => {
    // EDIT MODE FIX: Don't clear selection if we're in edit mode (initialSelectedSeats is set)
    // This allows edit mode to set the selection without it being immediately cleared
    if (selectedSeats.length > 0 && initialSelectedSeats.length === 0) {
      setSelectedSeats([]);
    }
  }, [selectedLab, selectedFloor, selectedOffice]); // Watch all navigation changes

  // Handle initial values when Edit is clicked (for editing saved allocations)
  useEffect(() => {
    if (initialOffice && initialFloor && initialLab && initialSelectedSeats.length > 0) {
      setSelectedOffice(initialOffice);
      setSelectedFloor(initialFloor);
      setSelectedLab(initialLab);
      setSelectedSeats(initialSelectedSeats);
      
      // Scroll to the grid section after a short delay to ensure rendering
      setTimeout(() => {
        const gridSection = document.querySelector('[data-grid-section="true"]');
        if (gridSection) {
          gridSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [initialOffice, initialFloor, initialLab, initialSelectedSeats, editModeKey]);

  // Update selectedOffice when lockedOffice changes (Dashboard filter integration)
  // IMPORTANT: lockedOffice is a COSMETIC feature for admin dashboard convenience only
  // It does NOT affect database queries, system data, or manager views
  // It only pre-selects and locks the office dropdown on the admin dashboard landing page
  useEffect(() => {
    if (lockedOffice) {
      setSelectedOffice(lockedOffice);
      setSelectedFloor("all");
      setSelectedLab("all");
    }
  }, [lockedOffice]);

  // CRITICAL FIX: Notify parent when selectedSeats changes in edit mode
  // This ensures the Allocation Details dialog appears when edit mode is activated
  useEffect(() => {
    if (initialSelectedSeats.length > 0 && selectedSeats.length > 0 && onBookingSubmit && !userMode) {
      // We're in edit mode and have seats selected, notify parent
      // Find the lab info from data
      if (selectedLab !== 'all') {
        const [office, floor, labName] = selectedLab.split('|');
        const labInfoEntry = data.labAllocations?.find(
          lab => lab.lab_name === labName && 
                 lab.floors?.floor_name === floor &&
                 lab.floors?.offices?.office_name === office
        );
        
        if (labInfoEntry) {
          onBookingSubmit({
            selectedSeats: selectedSeats,
            office: office,
            floor: floor,
            labName: labName,
            labId: labInfoEntry.id || '',
            floorId: labInfoEntry.floor_id || '',
          });
        }
      }
    }
  }, [selectedSeats, initialSelectedSeats, selectedLab, data]);

  // Process data to extract offices, floors, and labs
  const {
    offices,
    floors,
    labs,
    labInfo,
    divisionUtilization,
    allDivisions,
  } = useMemo(() => {
    const {
      labAllocations = [],
      divisionRecords = [],
      labAssetRanges = [],
    } = data;

    // DEBUG: Log to verify asset_id_range is present
    if (labAllocations.length > 0) {
      console.log('🔍 SeatDistributionHeatmap - Lab Data:', {
        totalLabs: labAllocations.length,
        sampleLab: labAllocations[0],
        labsWithAssetRanges: labAllocations.filter(lab => lab.asset_id_range).length,
        allLabRanges: labAllocations.map(lab => ({
          name: lab.lab_name,
          assetRange: lab.asset_id_range,
          total: lab.total_workstations
        }))
      });
    }

    if (!labAllocations.length) {
      return {
        offices: [],
        floors: [],
        labs: [],
        labInfo: new Map<
          string,
          {
            total: number;
            office: string;
            floor: string;
            inUse: number;
            vacant: number;
            labId: string;
            floorId: string;
            assetIdRange?: string;
          }
        >(),
        divisionUtilization: [],
        allDivisions: [],
      };
    }

    // Create a map of lab info
    const labInfoMap = new Map<
      string,
      {
        total: number;
        office: string;
        floor: string;
        inUse: number;
        vacant: number;
        labId: string;
        floorId: string;
        assetIdRange?: string; // Add lab-level asset ID range
      }
    >();
    const officeSet = new Set<string>();
    const floorsByOffice = new Map<string, Set<string>>();
    const labsByFloor = new Map<string, Set<string>>();
    const divisionsSet = new Set<string>(); // Collect all unique divisions

    // First, populate from lab allocations (records without division - these are the "Floor & Lab Allocation Management" entries)
    labAllocations.forEach((lab) => {
      if (lab.floors) {
        const officeName =
          lab.floors.offices?.office_name || "Unknown Office";
        const floorName =
          lab.floors.floor_name || "Unknown Floor";
        const labName = lab.lab_name;
        const total = lab.total_workstations || 0;
        const labId = lab.id; // Store lab ID
        const floorId = lab.floor_id; // Store floor ID

        officeSet.add(officeName);

        if (!floorsByOffice.has(officeName)) {
          floorsByOffice.set(officeName, new Set());
        }
        floorsByOffice.get(officeName)!.add(floorName);

        if (!labsByFloor.has(floorName)) {
          labsByFloor.set(floorName, new Set());
        }
        labsByFloor.get(floorName)!.add(labName);

        // Use a unique key combining office, floor, and lab name to prevent duplicates
        const uniqueKey = `${officeName}|${floorName}|${labName}`;

        // Only set if not already exists (avoid overwriting)
        if (!labInfoMap.has(uniqueKey)) {
          labInfoMap.set(uniqueKey, {
            total,
            office: officeName,
            floor: floorName,
            inUse: 0,
            vacant: total,
            labId,
            floorId,
            assetIdRange: lab.asset_id_range || '', // Store lab-level asset ID range
          });
        }
      }
    });

    // Also add any labs from division records that might not have allocation records
    // This ensures we show all labs even if they only exist in division assignments
    divisionRecords.forEach((record) => {
      if (record.floors) {
        const officeName =
          record.floors.offices?.office_name ||
          "Unknown Office";
        const floorName =
          record.floors.floor_name || "Unknown Floor";
        const labName = record.lab_name;
        const total = record.total_workstations || 0;
        const labId = record.id; // Store lab ID
        const floorId = record.floor_id; // Store floor ID

        officeSet.add(officeName);

        if (!floorsByOffice.has(officeName)) {
          floorsByOffice.set(officeName, new Set());
        }
        floorsByOffice.get(officeName)!.add(floorName);

        if (!labsByFloor.has(floorName)) {
          labsByFloor.set(floorName, new Set());
        }
        labsByFloor.get(floorName)!.add(labName);

        const uniqueKey = `${officeName}|${floorName}|${labName}`;

        // Only set if not already exists from lab allocations
        if (!labInfoMap.has(uniqueKey)) {
          labInfoMap.set(uniqueKey, {
            total,
            office: officeName,
            floor: floorName,
            inUse: 0,
            vacant: total,
            labId,
            floorId,
            assetIdRange: record.asset_id_range || '', // Include Asset ID range from division records too
          });
        }
      }
    });

    // Calculate in-use workstations for each lab and collect divisions
    divisionRecords.forEach((record) => {
      if (record.floors) {
        const officeName =
          record.floors.offices?.office_name ||
          "Unknown Office";
        const floorName =
          record.floors.floor_name || "Unknown Floor";
        const labName = record.lab_name;
        const inUse = record.in_use || 0;
        const division = record.division;

        if (division) {
          divisionsSet.add(division); // Collect all divisions
        }

        const uniqueKey = `${officeName}|${floorName}|${labName}`;

        if (labInfoMap.has(uniqueKey)) {
          const lab = labInfoMap.get(uniqueKey)!;
          lab.inUse += inUse;
          lab.vacant = Math.max(0, lab.total - lab.inUse);
        }
      }
    });

    const officeList = Array.from(officeSet).sort();

    // Filter floors based on selected office
    let floorList: string[] = [];
    if (selectedOffice === "all") {
      floorList = Array.from(
        new Set(
          Array.from(floorsByOffice.values()).flatMap((s) =>
            Array.from(s),
          ),
        ),
      ).sort();
    } else {
      floorList = Array.from(
        floorsByOffice.get(selectedOffice) || [],
      ).sort();
    }

    // Filter labs based on selected office and floor
    let labList: string[] = [];
    if (selectedFloor === "all") {
      if (selectedOffice === "all") {
        labList = Array.from(labInfoMap.keys()).sort();
      } else {
        // All labs in selected office (across all floors in that office)
        labList = Array.from(labInfoMap.entries())
          .filter(([_, info]) => info.office === selectedOffice)
          .map(([name, _]) => name)
          .sort();
      }
    } else {
      // Labs in selected floor ONLY - this ensures no duplicates across floors
      // Filter by BOTH office (if specified) and floor to get unique labs
      labList = Array.from(labInfoMap.entries())
        .filter(([_, info]) => {
          const floorMatches = info.floor === selectedFloor;
          const officeMatches =
            selectedOffice === "all" ||
            info.office === selectedOffice;
          return floorMatches && officeMatches;
        })
        .map(([name, _]) => name)
        .sort();
    }

    // Get division utilization for selected lab
    let divisionData: DivisionData[] = [];
    if (selectedLab !== "all") {
      // Extract office, floor, and lab name from the composite key (format: "office|floor|labName")
      const [officeName, floorName, labName] =
        selectedLab.split("|");

      // Filter by office, floor, AND lab name to ensure we get the correct lab
      const divisionsInLab = divisionRecords.filter(
        (record) => {
          if (!record.floors) return false;

          const recordOffice =
            record.floors.offices?.office_name || "";
          const recordFloor = record.floors.floor_name || "";
          const recordLab = record.lab_name;

          return (
            recordOffice === officeName &&
            recordFloor === floorName &&
            recordLab === labName
          );
        },
      );

      const divisionMap = new Map<string, number>();

      console.log(`🔍 DIVISION RECORDS for "${labName}":`, {
        totalRecords: divisionsInLab.length,
        records: divisionsInLab.map(r => ({
          id: r.id,
          division: r.division,
          seats: r.in_use,
          assetIdRange: r.asset_id_range
        }))
      });

      divisionsInLab.forEach((record) => {
        const division = record.division;
        const seats = record.in_use || 0;

        if (division && seats > 0) {
          divisionMap.set(
            division,
            (divisionMap.get(division) || 0) + seats,
          );
        }
      });

      divisionData = Array.from(divisionMap.entries())
        .map(([division, seats], index) => ({
          division,
          seats,
          color: divisionColors[index % divisionColors.length],
        }))
        .sort((a, b) => b.seats - a.seats); // Sort by seats descending
    }

    return {
      offices: officeList,
      floors: floorList,
      labs: labList,
      labInfo: labInfoMap,
      divisionUtilization: divisionData,
      allDivisions: Array.from(divisionsSet).sort(),
    };
  }, [data, selectedOffice, selectedFloor, selectedLab]);

  // CRITICAL FIX: Create a GLOBAL division-to-color mapping
  // This ensures we can get colors for divisions that have pending allocations but no approved allocations yet
  const globalDivisionColorMap = useMemo(() => {
    const colorMap = new Map<string, string>();
    const allDivisionsSet = new Set<string>();

    // First, add all divisions from divisionUtilization (approved allocations in current lab)
    divisionUtilization.forEach((div) => {
      colorMap.set(div.division, div.color);
      allDivisionsSet.add(div.division);
    });

    // Second, add all divisions from allDivisions (approved allocations globally)
    allDivisions.forEach((division) => {
      allDivisionsSet.add(division);
    });

    // CRITICAL: Also add divisions from pendingAllocations (they might not be in allDivisions!)
    pendingAllocations?.forEach((pa) => {
      if (pa.division) {
        allDivisionsSet.add(pa.division);
      }
    });

    // Now assign colors to all divisions that don't have one yet
    const allDivisionsArray =
      Array.from(allDivisionsSet).sort();
    allDivisionsArray.forEach((division, index) => {
      if (!colorMap.has(division)) {
        // Assign a color from the palette
        colorMap.set(
          division,
          divisionColors[index % divisionColors.length],
        );
      }
    });

    return colorMap;
  }, [
    divisionUtilization,
    allDivisions,
    divisionColors,
    pendingAllocations,
  ]);

  // Get current lab info
  const currentLabInfo =
    selectedLab !== "all" ? labInfo.get(selectedLab) : null;

  // Extract lab name from composite key (format: "office|floor|labName")
  const currentLabName =
    selectedLab !== "all" ? selectedLab.split("|")[2] : null;

  // CRITICAL: Clear selection when request changes
  // This prevents seat selection from carrying over between different requests
  useEffect(() => {
    if (requestId) {
      console.log(
        "Request changed, clearing grid selection. New request ID:",
        requestId,
      );
      setSelectedSeats([]);

      // Also notify parent to clear its state
      if (onBookingSubmit && !userMode && currentLabInfo) {
        onBookingSubmit({
          selectedSeats: [],
          office: currentLabInfo.office || "",
          floor: currentLabInfo.floor || "",
          labName: currentLabName || "",
          labId: currentLabInfo.labId || "",
          floorId: currentLabInfo.floorId || "",
        });
      }
    }
  }, [requestId]); // Trigger when request changes

  // Notify parent when lab changes to clear parent's selection state
  // This ensures the parent (AllocationsPage) also clears its selectedSeatsFromGrid
  useEffect(() => {
    // CRITICAL FIX: Don't clear selection if we're in edit mode
    // Edit mode is indicated by initialSelectedSeats being populated
    if (initialSelectedSeats.length > 0) {
      return; // Skip this effect in edit mode
    }
    
    // Only notify parent in allocation mode (not user mode) and when a specific lab is selected
    if (
      onBookingSubmit &&
      !userMode &&
      selectedLab !== "all" &&
      currentLabInfo
    ) {
      onBookingSubmit({
        selectedSeats: [], // Clear selection in parent
        office: currentLabInfo.office || "",
        floor: currentLabInfo.floor || "",
        labName: currentLabName || "",
        labId: currentLabInfo.labId || "",
        floorId: currentLabInfo.floorId || "",
      });
    }
  }, [selectedLab]); // Only trigger when lab changes

  // Calculate pending seat bookings for selected lab
  // Use labId and floorId for accurate matching (data comes transformed from AllocationsPage)
  const pendingSeatsCount =
    selectedLab !== "all" && currentLabInfo
      ? seatBookings?.filter(
          (booking) =>
            booking.labId === currentLabInfo.labId &&
            booking.floorId === currentLabInfo.floorId &&
            booking.status === "pending",
        ).length || 0
      : 0;

  // Calculate pending seats per division for the selected lab
  const pendingSeatsPerDivision = useMemo(() => {
    if (
      selectedLab === "all" ||
      !currentLabInfo ||
      !seatBookings
    ) {
      return new Map<string, number>();
    }

    const divisionPendingMap = new Map<string, number>();

    seatBookings
      .filter(
        (booking) =>
          booking.labId === currentLabInfo.labId &&
          booking.floorId === currentLabInfo.floorId &&
          booking.status === "pending",
      )
      .forEach((booking) => {
        const division = booking.division || "Unknown";
        divisionPendingMap.set(
          division,
          (divisionPendingMap.get(division) || 0) + 1,
        );
      });

    return divisionPendingMap;
  }, [selectedLab, currentLabInfo, seatBookings]);

  // Calculate available seats (seats not yet assigned to any division OR pending booking)
  const availableSeatsToAssign = currentLabInfo
    ? currentLabInfo.total -
      divisionUtilization.reduce((sum, d) => sum + d.seats, 0) -
      pendingSeatsCount
    : 0;

  // Calculate max seats for bar chart scaling
  const maxSeats =
    divisionUtilization.length > 0
      ? Math.max(...divisionUtilization.map((d) => d.seats))
      : 0;

  // Helper function to parse asset range (e.g., "166-195" -> {start: 166, end: 195})
  const parseAssetRange = (
    range: string,
  ): { start: number; end: number } | null => {
    if (!range) return null;
    const parts = range.split("-");
    if (parts.length !== 2) return null;
    return {
      start: parseInt(parts[0]),
      end: parseInt(parts[1]),
    };
  };

  // Helper function to parse asset ID ranges and individual IDs
  // Supports formats like "Admin/WS/F-5/112-123, 125, 126, 127" or "112-123, 125-127"
  const parseAssetIdRangeString = (
    rangeStr: string,
  ): number[] => {
    if (!rangeStr || rangeStr.trim() === "") return [];

    const assetIds: number[] = [];

    // Check if it's the legacy "to" format (e.g., "Admin/WS/F-5/001 to Admin/WS/F-5/098")
    if (rangeStr.toLowerCase().includes(" to ")) {
      const parts = rangeStr.toLowerCase().split(" to ");
      if (parts.length === 2) {
        const startNum = parseInt(
          parts[0].split("/").pop()?.trim() || "0",
        );
        const endNum = parseInt(
          parts[1].split("/").pop()?.trim() || "0",
        );
        if (
          !isNaN(startNum) &&
          !isNaN(endNum) &&
          endNum >= startNum
        ) {
          for (let i = startNum; i <= endNum; i++) {
            assetIds.push(i);
          }
          return assetIds;
        }
      }
    }

    // Split by commas to handle multiple ranges/individual IDs
    const parts = rangeStr.split(",").map((p) => p.trim());

    for (const part of parts) {
      // Extract just the numbers from the end
      // Supports formats like "Admin/WS/F-5/112-123" or "112-123" or "125"
      const numberPart = part.split("/").pop() || part;

      // Check if it's a range with dash (contains '-')
      if (numberPart.includes("-")) {
        const [start, end] = numberPart
          .split("-")
          .map((n) => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            assetIds.push(i);
          }
        }
      } else {
        // Individual ID
        const num = parseInt(numberPart.trim());
        if (!isNaN(num)) {
          assetIds.push(num);
        }
      }
    }

    return assetIds;
  };

  // Find the asset range for the selected lab
  const labAssetRange = useMemo(() => {
    const { labAllocations = [] } = data;

    if (
      !labAllocations ||
      labAllocations.length === 0 ||
      selectedLab === "all"
    ) {
      return null;
    }

    // Extract office, floor name, and lab name from composite key (format: "office|floor|labName")
    const [officeName, floorName, labName] =
      selectedLab.split("|");

    // Find the matching lab allocation record
    const matchingLab = labAllocations.find((lab) => {
      if (!lab.floors) return false;

      const labOfficeName =
        lab.floors.offices?.office_name || "";
      const labFloorName = lab.floors.floor_name || "";
      const labLabName = lab.lab_name;

      return (
        labOfficeName === officeName &&
        labFloorName === floorName &&
        labLabName === labName
      );
    });

    if (!matchingLab || !matchingLab.asset_id_range) {
      return null;
    }

    // Parse the asset ID range (e.g., "105-163")
    const parsed = parseAssetRange(matchingLab.asset_id_range);
    if (!parsed) {
      return null;
    }

    // Extract floor number from floor name (e.g., "9th Floor" -> "9")
    const floorNumber = floorName.replace(/[^\d]/g, "") || "0";

    const result = {
      ...parsed,
      division: "Admin", // Workstations are always assigned by Admin department
      floorNumber: floorNumber,
      labName: labName,
      hasAssetRange: true,
    };

    return result;
  }, [data, selectedLab]);

  // DEBUG: Log labAssetRange to trace Asset ID calculation
  useEffect(() => {
    if (selectedLab !== "all" && labAssetRange) {
      console.log('✅ Parsed Asset IDs:', {
        labName: labAssetRange.labName,
        start: labAssetRange.start,
        end: labAssetRange.end,
        count: labAssetRange.end - labAssetRange.start + 1,
        sample: Array.from({ length: 5 }, (_, i) => labAssetRange.start + i)
      });
    } else if (selectedLab !== "all") {
      console.warn('⚠️ No Asset ID range found for selected lab:', selectedLab);
    }
  }, [labAssetRange, selectedLab]);

  // Build asset ID to division mapping for selected lab
  // This creates a sorted list of all asset IDs with their division assignments
  const assetIdDivisionMap = useMemo(() => {
    const { divisionRecords = [] } = data;

    if (
      !divisionRecords ||
      divisionRecords.length === 0 ||
      selectedLab === "all"
    ) {
      return { sortedAssetIds: [], assetToDivision: new Map() };
    }

    // Extract office, floor name, and lab name from composite key
    const [officeName, floorName, labName] =
      selectedLab.split("|");

    // Get all division records for this lab
    const divisionsInLab = divisionRecords.filter((record) => {
      if (!record.floors) return false;

      const recordOffice =
        record.floors.offices?.office_name || "";
      const recordFloor = record.floors.floor_name || "";
      const recordLab = record.lab_name;

      return (
        recordOffice === officeName &&
        recordFloor === floorName &&
        recordLab === labName &&
        record.asset_id_range && // Only include divisions with asset ID ranges
        record.asset_id_range.trim() !== ""
      );
    });

    // If no divisions have asset ID ranges, return empty
    if (divisionsInLab.length === 0) {
      return { sortedAssetIds: [], assetToDivision: new Map() };
    }

    // Build mapping: asset ID number → {division, color}
    const assetToDivision = new Map<
      number,
      { division: string; color: string; divisionIndex: number }
    >();

    // Get division colors from divisionUtilization
    const divisionColorMap = new Map<string, string>();
    divisionUtilization.forEach((div) => {
      divisionColorMap.set(div.division, div.color);
    });

    divisionsInLab.forEach((record, recordIndex) => {
      const division = record.division;
      const assetIdRange = record.asset_id_range;
      const color =
        divisionColorMap.get(division) ||
        divisionColors[recordIndex % divisionColors.length];

      // DEBUG: Log what we're parsing
      console.log(`🔍 PARSING Asset IDs for "${division}":`, {
        rawAssetIdRange: assetIdRange,
        parsedAssetIds: 'parsing...'
      });

      // Parse the asset ID range
      const assetIds = parseAssetIdRangeString(assetIdRange);

      console.log(`✅ PARSED Asset IDs for "${division}":`, {
        parsedAssetIds: assetIds,
        count: assetIds.length
      });

      // Map each asset ID to this division
      assetIds.forEach((assetId) => {
        assetToDivision.set(assetId, {
          division,
          color,
          divisionIndex: recordIndex,
        });
      });
    });

    // Get all unique asset IDs and sort them in ascending order
    const sortedAssetIds = Array.from(
      assetToDivision.keys(),
    ).sort((a, b) => a - b);

    return { sortedAssetIds, assetToDivision };
  }, [data, data.divisionRecords, selectedLab, divisionUtilization, divisionColors]);

  const preAllocatedPositionsMap = useMemo(() => {
    const positionToDivision = new Map<number, { division: string; color: string }>();

    if (!currentLabInfo || divisionUtilization.length === 0 || selectedLab === "all") {
      return positionToDivision;
    }

    // CRITICAL FIX: When divisions have Asset IDs assigned, map them to their ACTUAL positions
    // Get the lab's Asset ID range to calculate position mapping
    const labAssetIdRange = currentLabInfo.assetIdRange || '';
    let labAssetIds: number[] = [];
    
    if (labAssetIdRange && labAssetIdRange.trim() !== '') {
      const parts = labAssetIdRange.split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0].trim());
        const end = parseInt(parts[1].trim());
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            labAssetIds.push(i);
          }
        }
      }
    }
    
    console.log('🗺️ Building preAllocatedPositionsMap with lab Asset IDs:', labAssetIds.slice(0, 10));

    // CRITICAL RULE: Workstation Data tab is the SINGLE SOURCE OF TRUTH
    // Priority order for grid rendering:
    // 1. Asset IDs from labs.asset_id_range (Workstation Data tab) - ALWAYS takes precedence
    // 2. Approved bookings from seat_bookings - ONLY if division has NO Asset IDs in Workstation Data

    // Get all approved bookings (for divisions WITHOUT Asset IDs in Workstation Data)
    const approvedBookingsForLab = seatBookings?.filter(
      (b) => b.labName === currentLabName && b.status === "approved"
    ) || [];

    // STEP 1: Render divisions WITH Asset IDs from Workstation Data (HIGHEST PRIORITY)
    divisionUtilization.forEach((div) => {
      // Get division's assigned Asset IDs from assetIdDivisionMap
      const divisionAssetIds = Array.from(assetIdDivisionMap.assetToDivision.keys()).filter(
        assetId => assetIdDivisionMap.assetToDivision.get(assetId)?.division === div.division
      );
      
      if (divisionAssetIds.length > 0 && labAssetIds.length > 0) {
        // CRITICAL: Division has Asset IDs in Workstation Data - these are AUTHORITATIVE
        console.log(`📍 PRIORITY 1: Rendering division "${div.division}" from Workstation Data:`, divisionAssetIds);
        
        divisionAssetIds.forEach(assetId => {
          // Find the position of this Asset ID in the lab's range
          const position = labAssetIds.indexOf(assetId) + 1; // +1 because positions are 1-based
          
          if (position > 0) {
            // ALWAYS set the position, overriding any previous value
            positionToDivision.set(position, {
              division: div.division,
              color: div.color,
            });
            console.log(`  ✅ Asset ID ${assetId} → Position ${position} (from Workstation Data - AUTHORITATIVE)`);
          }
        });
      }
    });

    // STEP 2: Render divisions WITHOUT Asset IDs using approved bookings (LOWER PRIORITY)
    // Only fill positions that haven't been set by Step 1
    divisionUtilization.forEach((div) => {
      const divisionAssetIds = Array.from(assetIdDivisionMap.assetToDivision.keys()).filter(
        assetId => assetIdDivisionMap.assetToDivision.get(assetId)?.division === div.division
      );
      
      // Skip divisions that have Asset IDs (already handled in Step 1)
      if (divisionAssetIds.length > 0) {
        return;
      }
      
      // This division has NO Asset IDs in Workstation Data - use approved bookings
      const divisionBookings = approvedBookingsForLab.filter(
        b => b.division === div.division
      );
      
      if (divisionBookings.length > 0) {
        console.log(`📍 PRIORITY 2: Rendering division "${div.division}" from approved bookings:`, divisionBookings.length);
        
        divisionBookings.forEach(booking => {
          const position = booking.seatNumber;
          
          // Only set if position hasn't been claimed by Workstation Data
          if (!positionToDivision.has(position)) {
            positionToDivision.set(position, {
              division: div.division,
              color: div.color,
            });
            console.log(`  ✅ Position ${position} (from approved booking)`);
          }
        });
      } else {
        // STEP 3: Fallback sequential allocation for divisions with no Asset IDs and no bookings
        console.log(`📍 PRIORITY 3: Sequential allocation for division "${div.division}"`);
        const seatsNeedingPositions = div.seats;
        
        let currentPosition = 1;
        let seatsAdded = 0;
        while (seatsAdded < seatsNeedingPositions && currentPosition <= currentLabInfo.total) {
          // Only fill positions not already claimed
          if (!positionToDivision.has(currentPosition)) {
            positionToDivision.set(currentPosition, {
              division: div.division,
              color: div.color,
            });
            seatsAdded++;
          }
          currentPosition++;
        }
      }
    });

    return positionToDivision;
  }, [currentLabInfo, divisionUtilization, seatBookings, currentLabName, selectedLab, assetIdDivisionMap]);

  // Handle seat selection
  const handleSeatSelection = (
    seatNumber: number,
    seatStatusInfo: {
      status: "available" | "booked" | "pending";
      division?: string;
      color?: string;
    },
  ) => {
    // Don't allow selection of booked or pending seats
    if (
      seatStatusInfo.status === "booked" ||
      seatStatusInfo.status === "pending"
    ) {
      toast.error(
        `Seat ${seatNumber} is ${seatStatusInfo.status === "booked" ? "already booked" : "pending approval"} and cannot be selected.`,
      );
      return;
    }

    let newSelectedSeats: number[];
    if (selectedSeats.includes(seatNumber)) {
      newSelectedSeats = selectedSeats.filter(
        (seat) => seat !== seatNumber,
      );
    } else {
      newSelectedSeats = [...selectedSeats, seatNumber];
    }
    setSelectedSeats(newSelectedSeats);

    // Notify parent about the selection change (for admin allocation mode)
    if (onBookingSubmit && !userMode) {
      onBookingSubmit({
        selectedSeats: newSelectedSeats,
        office: currentLabInfo?.office || "",
        floor: currentLabInfo?.floor || "",
        labName: currentLabName || "",
        labId: currentLabInfo?.labId || "",
        floorId: currentLabInfo?.floorId || "",
      });
    }
  };

  // Function to determine seat status based on division assignments and bookings
  const getSeatStatus = (
    workstationNumber: number,
  ): {
    status: "available" | "booked" | "pending";
    division?: string;
    color?: string;
  } => {
    // EDIT MODE FIX: If this seat is in initialSelectedSeats, treat it as available
    // This allows editing pending seats without showing them as locked
    if (initialSelectedSeats.includes(workstationNumber)) {
      return { status: "available" };
    }
    
    // FIRST: Check for pending allocations (admin allocation mode - Yellow P)
    // EXCLUDE seats that are in edit mode
    const pendingAllocation = pendingAllocations?.find(
      (pa) =>
        pa.labName === currentLabName &&
        pa.seatNumber === workstationNumber &&
        pa.status === "pending" &&
        !initialSelectedSeats.includes(workstationNumber), // CRITICAL FIX: Exclude edit mode seats
    );

    if (pendingAllocation) {
      // CRITICAL FIX: ALL pending seats (regardless of division) should show as 'pending'
      // This ensures cross-division visibility of pending allocations
      return {
        status: "pending",
        division: pendingAllocation.division,
      };
    }

    // SECOND: Check if there's a PENDING seat booking for this specific seat number
    // Match by lab name (extracted from composite key)
    // EXCLUDE seats that are in edit mode
    const pendingBooking = seatBookings?.find(
      (b) =>
        b.labName === currentLabName &&
        b.seatNumber === workstationNumber &&
        b.status === "pending" &&
        !initialSelectedSeats.includes(workstationNumber), // CRITICAL FIX: Exclude edit mode seats
    );

    if (pendingBooking) {
      console.log(`🟡 Position ${workstationNumber}: Pending booking found`, pendingBooking);
      // CRITICAL FIX: ALL pending seats (regardless of division) should show as 'pending'
      // This prevents showing other divisions' pending seats as 'booked'
      return {
        status: "pending",
        division: pendingBooking.division,
      };
    }

    // CRITICAL ARCHITECTURAL FIX FOR APPROVED SEATS:
    // Check for APPROVED seat bookings to preserve exact seat positions
    // Even though approved allocations update the labs table (in_use count),
    // we need to check seatBookings for the SPECIFIC seat numbers
    // This ensures approved seats render at their correct workstation positions
    const approvedBooking = seatBookings?.find(
      (b) =>
        b.labName === currentLabName &&
        b.seatNumber === workstationNumber &&
        b.status === "approved",
    );

    if (approvedBooking) {
      console.log(`🔴 Position ${workstationNumber}: Approved booking found`, approvedBooking);
      // CRITICAL: Approved seats should show as 'booked' with division color
      // Get the division color from globalDivisionColorMap
      const divisionColor = globalDivisionColorMap.get(approvedBooking.division);
      return {
        status: "booked",
        division: approvedBooking.division,
        color: divisionColor,
      };
    }

    // FOURTH: Check for pre-allocated seats from Workstation Data Management
    // These are seats assigned sequentially to divisions based on in_use count
    // They come from labs.asset_id_range and are managed via Workstation Data tab
    // Use the preAllocatedPositionsMap which replicates the grid rendering logic
    const preAllocatedInfo = preAllocatedPositionsMap.get(workstationNumber);
    
    if (preAllocatedInfo) {
      console.log(`🔵 Position ${workstationNumber}: Pre-allocated to`, preAllocatedInfo);
      return {
        status: "booked",
        division: preAllocatedInfo.division,
        color: preAllocatedInfo.color,
      };
    }

    // CRITICAL NOTE: The old divisionPositionMap logic was removed because it was buggy
    // The old logic assigned sequential positions (1, 2, 3...) based on in_use count from labs table
    // This caused HR seats at actual positions 20-21 to be INCORRECTLY rendered at positions 17-18
    // because the system calculated: Admin(6) + Antardhwani(5) + Corporate(5) + HR(2) = positions 1-18
    // 
    // ONLY trust seat_bookings table for actual seat positions!
    // If a seat is approved, it's checked above. Otherwise, it's available.
    //
    // REMOVED BUGGY CODE (lines 920-945):
    // const divisionPositionMap = new Map<string, number[]>();
    // let currentPosition = 1;
    // 
    // divisionUtilization.forEach((div) => {
    //   const positions: number[] = [];
    //   for (let i = 0; i < div.seats; i++) {
    //     positions.push(currentPosition++);
    //   }
    //   divisionPositionMap.set(div.division, positions);
    // });
    // 
    // for (const [division, positions] of divisionPositionMap.entries()) {
    //   if (positions.includes(workstationNumber)) {
    //     return { status: "booked", division: division, color: divColor };
    //   }
    // }

    // Seat is available (not pending, not approved)
    return { status: "available" };
  };

  // Handle auto-selecting multiple seats
  const handleAutoSelectSeats = () => {
    // NEW LOGIC: Parse Asset IDs from input instead of seat count
    const inputAssetIds = parseAssetIdRangeString(numSeatsToSelect);
    
    console.log('🔍 Auto-select Debug:', {
      input: numSeatsToSelect,
      parsedAssetIds: inputAssetIds,
      currentLabInfo,
      selectedLab
    });
    
    if (inputAssetIds.length === 0) {
      toast.error("Please enter valid Asset IDs (e.g., 33-37, 40, 42)");
      return;
    }

    if (!currentLabInfo) {
      toast.error("No lab selected. Please select a lab first.");
      return;
    }

    // Get the lab's Asset ID range to map Asset IDs to positions
    const labAssetIdRange = currentLabInfo.assetIdRange || '';
    console.log('🎯 Lab Asset ID Range:', labAssetIdRange);
    let labAssetIds: number[] = [];
    
    if (labAssetIdRange && labAssetIdRange.trim() !== '') {
      const parts = labAssetIdRange.split('-');
      if (parts.length === 2) {
        const start = parseInt(parts[0].trim());
        const end = parseInt(parts[1].trim());
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            labAssetIds.push(i);
          }
        }
      }
    }
    
    console.log('📋 Lab Asset IDs:', labAssetIds);
    
    if (labAssetIds.length === 0) {
      toast.error("This lab doesn't have predefined Asset IDs. Please contact admin.");
      return;
    }

    // CRITICAL: Filter to only select AVAILABLE Asset IDs
    const seatsToSelect: number[] = [];
    const unavailableAssetIds: number[] = [];
    const invalidAssetIds: number[] = [];
    
    for (const assetId of inputAssetIds) {
      // Check if Asset ID exists in this lab's range
      const position = labAssetIds.indexOf(assetId) + 1;
      
      console.log(`🔎 Checking Asset ID ${assetId}: position = ${position}`);
      
      if (position === 0) {
        // Asset ID not in this lab's range
        invalidAssetIds.push(assetId);
        continue;
      }
      
      // Check if this position is available
      const seatStatus = getSeatStatus(position);
      
      console.log(`✅ Asset ID ${assetId} at position ${position}: ${seatStatus.status}`);
      
      if (seatStatus.status === "available") {
        seatsToSelect.push(position);
      } else {
        unavailableAssetIds.push(assetId);
      }
    }
    
    // Show appropriate feedback
    if (invalidAssetIds.length > 0) {
      toast.error(
        `Asset IDs not in this lab's range (${labAssetIdRange}): ${invalidAssetIds.join(', ')}`,
        { duration: 5000 }
      );
    }
    
    if (unavailableAssetIds.length > 0) {
      toast.warning(
        `These Asset IDs are already allocated: ${unavailableAssetIds.join(', ')}`,
        { duration: 5000 }
      );
    }
    
    if (seatsToSelect.length === 0) {
      toast.error("No available Asset IDs to select from your input.");
      return;
    }
    
    setSelectedSeats(seatsToSelect);

    // Notify parent about the selection (for admin allocation mode)
    if (onBookingSubmit && !userMode) {
      onBookingSubmit({
        selectedSeats: seatsToSelect,
        office: currentLabInfo?.office || "",
        floor: currentLabInfo?.floor || "",
        labName: currentLabName || "",
        labId: currentLabInfo?.labId || "",
        floorId: currentLabInfo?.floorId || "",
      });
    }

    // Show selected Asset IDs (not positions) in success message
    const selectedAssetIds = seatsToSelect.map(pos => labAssetIds[pos - 1]);
    toast.success(
      `Auto-selected ${seatsToSelect.length} available Asset IDs: ${selectedAssetIds.sort((a, b) => a - b).join(", ")}`,
      { duration: 4000 }
    );
  };

  // Handle opening booking dialog
  const handleOpenBookingDialog = () => {
    if (selectedLab === "all") {
      toast.error(
        "Please select a specific lab to book workstations.",
      );
      return;
    }
    if (selectedSeats.length === 0) {
      toast.error("Please select at least one seat to book.");
      return;
    }
    setBookingDialogOpen(true);
  };

  // Handle booking form submission
  const handleBookingSubmit = () => {
    if (selectedSeats.length === 0) {
      toast.error("Please select at least one seat to book.");
      return;
    }

    // Create booking request with proper data structure
    const bookingDetails = {
      labName: selectedLab,
      seats: selectedSeats,
      requestorName: bookingForm.fullName,
      requestorId: userInfo?.employeeId || "TEMP001",
      division: bookingForm.department,
      numWorkstations: selectedSeats.length,
      location: currentLabInfo?.office || "Commerce House",
      floor: currentLabInfo?.floor || "Floor 9",
      bookingDate: bookingForm.bookingDate,
      justification:
        bookingForm.remarks || "Seat booking request",
    };

    // Show success toast
    toast.success(
      `Successfully submitted booking request for ${selectedSeats.length} seat(s) in ${selectedLab}.`,
    );

    // Close dialog and reset form
    setBookingDialogOpen(false);
    setSelectedSeats([]);
    setBookingForm({
      employeeId: "",
      fullName: "",
      department: "",
      bookingDate: "",
      remarks: "",
    });

    // Call the onBookingSubmit callback if provided
    if (onBookingSubmit) {
      onBookingSubmit(bookingDetails);
    }
  };

  return (
    <Card data-grid-section="true">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium">
                Workstation Allocations
              </h4>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-blue-100 transition-colors">
                      <Info className="w-4 h-4 text-blue-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="max-w-xs"
                  >
                    <p className="text-xs">
                      📊 Live data from Workstation Data tab •
                      Updates automatically when requests are
                      approved/rejected
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Lab Info Display - Show Capacity, Booked, Pending, and Available */}
            {currentLabInfo && selectedLab !== "all" && (
              <div className="text-slate-700 mb-4">
                <span className="text-sm">
                  {currentLabInfo.floor} - {currentLabName} —
                  Capacity:{" "}
                  <strong>{currentLabInfo.total}</strong> |
                  Booked:{" "}
                  <strong>{currentLabInfo.inUse}</strong> |
                  Pending: <strong>{pendingSeatsCount}</strong>{" "}
                  | Available:{" "}
                  <strong>{availableSeatsToAssign}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="office-filter" className="text-sm">
              Office:
            </Label>
            <Select
              value={lockedOffice || selectedOffice}
              onValueChange={(value) => {
                if (!lockedOffice) {
                  setSelectedOffice(value);
                  setSelectedFloor("all");
                  setSelectedLab("all");
                }
              }}
              disabled={!!lockedOffice}
            >
              <SelectTrigger
                id="office-filter"
                className={`w-40 h-8 ${lockedOffice ? 'opacity-70 cursor-not-allowed bg-slate-100' : ''}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Offices</SelectItem>
                {offices.map((office) => (
                  <SelectItem key={office} value={office}>
                    {office}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockedOffice && (
              <Lock className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="floor-filter" className="text-sm">
              Floor:
            </Label>
            <Select
              value={selectedFloor}
              onValueChange={(value) => {
                setSelectedFloor(value);
                setSelectedLab("all");
              }}
            >
              <SelectTrigger
                id="floor-filter"
                className="w-40 h-8"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map((floor) => (
                  <SelectItem key={floor} value={floor}>
                    {floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="lab-filter" className="text-sm">
              Lab:
            </Label>
            <Select
              value={selectedLab}
              onValueChange={setSelectedLab}
            >
              <SelectTrigger
                id="lab-filter"
                className="w-52 h-8"
              >
                <SelectValue placeholder="Select a lab" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Select a lab
                </SelectItem>
                {labs.map((lab) => {
                  const info = labInfo.get(lab);
                  // Extract just the lab name from composite key for display
                  const labName = lab.split("|")[2] || lab;

                  // Calculate pending seats for this specific lab
                  const labPendingSeats =
                    seatBookings?.filter(
                      (booking) =>
                        booking.labId === info?.labId &&
                        booking.floorId === info?.floorId &&
                        booking.status === "pending",
                    ).length || 0;

                  // Calculate truly available seats: total - in_use - pending
                  const totalSeats = info?.total || 0;
                  const inUseSeats =
                    totalSeats - (info?.vacant || 0);
                  const availableSeats = Math.max(
                    0,
                    totalSeats - inUseSeats - labPendingSeats,
                  );

                  return (
                    <SelectItem key={lab} value={lab}>
                      {labName} (Available: {availableSeats})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Multiple Seat Selector - Only show in admin allocation mode */}
          {enableBooking &&
            !userMode &&
            selectedLab !== "all" && (
              <div className="flex items-center gap-2">
                <Label htmlFor="num-seats" className="text-sm">
                  Multiple Seat Selector:
                </Label>
                <Input
                  id="num-seats"
                  type="text"
                  value={numSeatsToSelect}
                  onChange={(e) =>
                    setNumSeatsToSelect(e.target.value)
                  }
                  placeholder="Enter Asset IDs (e.g., 33-37, 40, 42)"
                  className="w-64 h-8"
                />
                <Button
                  size="sm"
                  onClick={handleAutoSelectSeats}
                  disabled={
                    !numSeatsToSelect ||
                    numSeatsToSelect.trim() === ''
                  }
                  className="h-8 bg-blue-600 hover:bg-blue-700"
                >
                  Auto Select
                </Button>
              </div>
            )}
        </div>

        {/* Show content based on lab selection */}
        {selectedLab === "all" ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm">
              Please select a lab to view division utilization
            </p>
          </div>
        ) : currentLabInfo ? (
          <div>
            {/* Division Utilization Table - only show if there are divisions assigned */}
            {divisionUtilization.length > 0 && (
              <>
                <h5 className="text-sm mb-3 text-slate-700">
                  Division Utilization
                </h5>
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 text-sm text-slate-700">
                          Division
                        </th>
                        <th className="text-right p-3 text-sm text-slate-700">
                          Seats Available
                        </th>
                        <th className="text-right p-3 text-sm text-slate-700">
                          Seats Assigned
                        </th>
                        <th className="text-left p-3 text-sm text-slate-700">
                          Color
                        </th>
                        <th className="text-left p-3 text-sm text-slate-700 w-1/2">
                          Seat Distribution
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {divisionUtilization.map(
                        (division, index) => (
                          <tr
                            key={division.division}
                            className="border-b border-slate-100 hover:bg-slate-50"
                          >
                            <td className="p-3 text-sm text-slate-700">
                              {division.division}
                            </td>
                            <td className="p-3 text-sm text-slate-700 text-right">
                              {availableSeatsToAssign}
                            </td>
                            <td className="p-3 text-sm text-slate-700 text-right">
                              {division.seats}
                            </td>
                            <td className="p-3">
                              <div
                                className="w-8 h-6 rounded border border-slate-300"
                                style={{
                                  backgroundColor:
                                    division.color,
                                }}
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                <div
                                  className="h-full transition-all duration-300"
                                  style={{
                                    width: `${maxSeats > 0 ? (division.seats / maxSeats) * 100 : 0}%`,
                                    backgroundColor:
                                      division.color,
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Workstation Grid Visualization - Always show when lab is selected */}
            <div
              className={
                divisionUtilization.length > 0 ? "mt-0" : "mt-0"
              }
            >
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-sm text-slate-700">
                  Workstation Layout
                </h5>
                <div className="flex items-center gap-3 text-xs">
                  {/* Show division color legend when using new asset ID mapping */}
                  {assetIdDivisionMap.sortedAssetIds.length >
                  0 ? (
                    <>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-blue-100 transition-colors">
                              <Info className="w-4 h-4 text-blue-600" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            className="max-w-sm"
                          >
                            <p className="text-xs">
                              🏷️{" "}
                              <strong>
                                Predefined Asset IDs:
                              </strong>{" "}
                              Each workstation displays its predefined Asset ID number.
                              Asset IDs are assigned to the entire lab when it's created
                              (e.g., Lab with 30 seats and range 100-130 will show boxes
                              labeled 100, 101, 102, ... 130). Gray boxes show available
                              seats with their Asset IDs, colored boxes show allocated seats
                              with division-specific colors.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {divisionUtilization.map((division) => (
                        <div
                          key={division.division}
                          className="flex items-center gap-1"
                        >
                          <div
                            className="w-4 h-4 rounded border border-slate-300"
                            style={{
                              backgroundColor: division.color,
                            }}
                          />
                          <span className="text-slate-600">
                            {division.division}
                          </span>
                        </div>
                      ))}
                    </>
                  ) : enableBooking ? (
                    <>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-slate-400" />
                        <span className="text-slate-600">
                          Available
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-green-500" />
                        <span className="text-slate-600">
                          Selected
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded bg-amber-500" />
                        <span className="text-slate-600">
                          Pending
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap gap-2">
                    {/* UPDATED LOGIC: Always render ALL seats (currentLabInfo.total), handle asset IDs + unassigned seats */}
                    {divisionUtilization.length > 0 &&
                    currentLabInfo
                      ? // NEW: Render Asset IDs first (sorted), then divisions without Asset IDs
                        (() => {
                          // STEP 1: Create array of ALL seats to render
                          const seatsToRender: Array<{
                            displayText: string;
                            assetIdNumber: number | null;
                            division: string;
                            color: string;
                            seatState:
                              | "assigned_with_id"
                              | "assigned_no_id"
                              | "available";
                            workstationNumber: number;
                            boxIndex: number;
                          }> = [];

                          // CORRECTED APPROACH: Handle BOTH pre-allocated and specific bookings
                          // 
                          // TWO TYPES OF ALLOCATIONS:
                          // 1. PRE-ALLOCATED SEATS (Workstation Data Management tab):
                          //    - Stored in division_allocations with in_use count
                          //    - Displayed with sequential positions (1, 2, 3...)
                          //    - Shows as "B" markers
                          // 
                          // 2. SPECIFIC BOOKINGS (Allocations tab):
                          //    - Stored in seat_bookings with exact seat_number
                          //    - OVERRIDE pre-allocated positions with actual positions
                          //    - Shows as "B" or Asset ID
                          //
                          // CRITICAL: seat_bookings ALWAYS takes priority!

                          // STEP 1: Get all seat bookings with specific positions
                          // CRITICAL FIX: Deduplicate seat bookings to handle database duplicates
                          // If multiple bookings exist for the same seat, keep only the LATEST one (by updated_at)
                          const approvedBookingsRaw = seatBookings?.filter(
                            (b) =>
                              b.labName === currentLabName &&
                              b.status === "approved"
                          ) || [];
                          
                          // Deduplicate by seat_number, keeping the latest record
                          const approvedBookingsMap = new Map();
                          approvedBookingsRaw.forEach((booking) => {
                            const key = `${booking.division}-${booking.seatNumber}`;
                            const existing = approvedBookingsMap.get(key);
                            
                            if (!existing) {
                              approvedBookingsMap.set(key, booking);
                            } else {
                              // Keep the booking with the latest updated_at timestamp
                              const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
                              const newTime = new Date((booking as any).updated_at || (booking as any).created_at || 0).getTime();
                              
                              if (newTime > existingTime) {
                                approvedBookingsMap.set(key, booking);
                                // Duplicate detected - keeping newer record (logged for admin monitoring)
                              }
                            }
                          });
                          
                          const approvedBookingsForLab = Array.from(approvedBookingsMap.values());
                          
                          // Database integrity check - duplicates indicate data corruption
                          if (approvedBookingsRaw.length !== approvedBookingsForLab.length) {
                            // Silently handle duplicates by keeping only unique seats
                            // Admin can check database-cleanup-duplicates.sql for cleanup
                          }

                          // Create a set of positions that have specific bookings
                          const bookedPositions = new Set(
                            approvedBookingsForLab.map(b => b.seatNumber)
                          );

                          // STEP 2: Parse LAB-level Asset ID range (predefined when lab was created)
                          // NEW APPROACH: The entire lab has ONE predefined Asset ID range
                          const labAssetIdRange = currentLabInfo.assetIdRange || '';
                          let labAssetIds: number[] = [];
                          
                          // DEBUG: Log lab asset range parsing
                          console.log('🔍 Grid Rendering - Asset Range:', {
                            labName: currentLabName,
                            rawAssetRange: labAssetIdRange,
                            hasRange: !!labAssetIdRange,
                            currentLabInfo
                          });
                          
                          if (labAssetIdRange && labAssetIdRange.trim() !== '') {
                            // Parse the simple range format "100-130"
                            const parts = labAssetIdRange.split('-');
                            if (parts.length === 2) {
                              const start = parseInt(parts[0].trim());
                              const end = parseInt(parts[1].trim());
                              if (!isNaN(start) && !isNaN(end) && end >= start) {
                                for (let i = start; i <= end; i++) {
                                  labAssetIds.push(i);
                                }
                                console.log('✅ Parsed Asset IDs:', { start, end, count: labAssetIds.length, sample: labAssetIds.slice(0, 5) });
                              } else {
                                console.error('❌ Invalid range values:', { start, end });
                              }
                            } else {
                              console.error('❌ Invalid range format:', { parts, expected: 'start-end' });
                            }
                          } else {
                            console.warn('⚠️ No asset range found for lab:', currentLabName);
                          }
                          
                          // STEP 3: Add pre-allocated seats (from Workstation Data Management)
                          // CRITICAL RULE: Workstation Data is the SINGLE SOURCE OF TRUTH
                          
                          console.log('🎯 Asset ID Division Map:', {
                            sortedAssetIds: assetIdDivisionMap.sortedAssetIds,
                            mapSize: assetIdDivisionMap.assetToDivision.size,
                            sampleEntries: Array.from(assetIdDivisionMap.assetToDivision.entries()).slice(0, 10)
                          });
                          
                          // STEP 3A: Render divisions WITH Asset IDs from Workstation Data (HIGHEST PRIORITY)
                          divisionUtilization.forEach((div) => {
                            // Check if this division has specific Asset IDs assigned
                            const divisionAssetIds = assetIdDivisionMap.sortedAssetIds.filter(
                              assetId => assetIdDivisionMap.assetToDivision.get(assetId)?.division === div.division
                            );
                            
                            console.log(`📊 Division "${div.division}":`, {
                              totalSeats: div.seats,
                              assignedAssetIds: divisionAssetIds,
                              hasAssetIds: divisionAssetIds.length > 0
                            });
                            
                            if (divisionAssetIds.length > 0) {
                              // Division has specific Asset IDs in Workstation Data - ALWAYS render these
                              console.log(`  🔥 PRIORITY 1: Rendering from Workstation Data (AUTHORITATIVE)`);
                              divisionAssetIds.forEach((assetId) => {
                                const position = labAssetIds.indexOf(assetId) + 1;
                                
                                if (position > 0) {
                                  // ALWAYS render, overriding any bookings
                                  seatsToRender.push({
                                    displayText: assetId.toString(),
                                    assetIdNumber: assetId,
                                    division: div.division,
                                    color: div.color,
                                    seatState: "assigned_with_id",
                                    workstationNumber: position,
                                    boxIndex: position - 1,
                                  });
                                  
                                  console.log(`  ✅ Placed Asset ID ${assetId} at position ${position} (WORKSTATION DATA - OVERRIDES BOOKINGS)`);
                                }
                              });
                            }
                          });
                          
                          // STEP 3B: Render divisions WITHOUT Asset IDs using bookings or sequential (LOWER PRIORITY)
                          divisionUtilization.forEach((div) => {
                            const divisionAssetIds = assetIdDivisionMap.sortedAssetIds.filter(
                              assetId => assetIdDivisionMap.assetToDivision.get(assetId)?.division === div.division
                            );
                            
                            // Skip divisions that have Asset IDs (already handled in Step 3A)
                            if (divisionAssetIds.length > 0) {
                              return;
                            }
                            
                            // Division has NO specific Asset IDs - check for bookings or use sequential allocation
                            const divisionBookings = approvedBookingsForLab.filter(
                              b => b.division === div.division
                            );
                            
                            if (divisionBookings.length > 0) {
                              console.log(`  📍 PRIORITY 2: Rendering from approved bookings for "${div.division}"`);
                              // This division has NO Asset IDs but has approved bookings
                              // Render the bookings at their specific positions
                              divisionBookings.forEach(booking => {
                                const position = booking.seatNumber;
                                const assetIdNumber = labAssetIds.length >= position ? labAssetIds[position - 1] : null;
                                
                                seatsToRender.push({
                                  displayText: assetIdNumber ? assetIdNumber.toString() : position.toString(),
                                  assetIdNumber: assetIdNumber,
                                  division: div.division,
                                  color: div.color,
                                  seatState: "assigned_with_id",
                                  workstationNumber: position,
                                  boxIndex: position - 1,
                                });
                              });
                            } else {
                              // Division has NO specific Asset IDs and NO bookings - use sequential allocation
                              console.log(`  ⚠️ PRIORITY 3: Sequential allocation for "${div.division}"`);
                              
                              const positions: number[] = [];
                              let seatsAdded = 0;
                              let currentPosition = 1;
                              
                              // Calculate seats needed
                              const seatsNeedingPositions = div.seats;
                              
                              // Get positions that are already rendered by other divisions
                              const renderedPositions = new Set(seatsToRender.map(s => s.workstationNumber));
                              
                              // Assign sequential positions, skipping already rendered positions
                              while (seatsAdded < seatsNeedingPositions && currentPosition <= currentLabInfo.total) {
                                if (!bookedPositions.has(currentPosition) && !renderedPositions.has(currentPosition)) {
                                  positions.push(currentPosition);
                                  seatsAdded++;
                                }
                                currentPosition++;
                              }
                              
                              positions.forEach((position) => {
                                // Get the Asset ID from lab-level range based on position
                                const assetIdNumber = labAssetIds.length >= position ? labAssetIds[position - 1] : null;
                                
                                seatsToRender.push({
                                  displayText: assetIdNumber ? assetIdNumber.toString() : "B",
                                  assetIdNumber: assetIdNumber,
                                  division: div.division,
                                  color: div.color,
                                  seatState: assetIdNumber ? "assigned_with_id" : "assigned_no_id",
                                  workstationNumber: position,
                                  boxIndex: position - 1,
                                });
                              });
                            }
                          });

                          // STEP 4: CRITICAL FIX - DO NOT override seats from Workstation Data
                          // Workstation Data is the SINGLE SOURCE OF TRUTH
                          // Only add bookings for divisions that DON'T have Asset IDs in Workstation Data
                          
                          // Get set of divisions that have Asset IDs in Workstation Data
                          const divisionsWithAssetIds = new Set<string>();
                          divisionUtilization.forEach((div) => {
                            const divisionAssetIds = Array.from(assetIdDivisionMap.assetToDivision.keys()).filter(
                              assetId => assetIdDivisionMap.assetToDivision.get(assetId)?.division === div.division
                            );
                            if (divisionAssetIds.length > 0) {
                              divisionsWithAssetIds.add(div.division);
                            }
                          });
                          
                          console.log('🛡️ STEP 4: Divisions with Workstation Data (PROTECTED):', Array.from(divisionsWithAssetIds));
                          
                          // Only process bookings for divisions WITHOUT Workstation Data Asset IDs
                          approvedBookingsForLab.forEach((booking) => {
                            // CRITICAL: Skip if this division has Asset IDs in Workstation Data
                            if (divisionsWithAssetIds.has(booking.division)) {
                              console.log(`  🚫 SKIPPING booking for "${booking.division}" - Workstation Data takes priority`);
                              return;
                            }
                            
                            const position = booking.seatNumber;
                            
                            if (position >= 1 && position <= currentLabInfo.total) {
                              const existingIndex = seatsToRender.findIndex(
                                s => s.workstationNumber === position
                              );
                              
                              const divisionColor = globalDivisionColorMap.get(booking.division);
                              
                              // Get Asset ID from LAB-LEVEL asset range based on position
                              const assetIdFromLabs = labAssetIds.length >= position ? labAssetIds[position - 1] : null;
                              
                              const seatData = {
                                displayText: assetIdFromLabs ? assetIdFromLabs.toString() : "B",
                                assetIdNumber: assetIdFromLabs,
                                division: booking.division,
                                color: divisionColor || "#10B981",
                                seatState: (assetIdFromLabs ? "assigned_with_id" : "assigned_no_id") as const,
                                workstationNumber: position,
                                boxIndex: position - 1,
                              };

                              if (existingIndex >= 0) {
                                seatsToRender[existingIndex] = seatData;
                              } else {
                                seatsToRender.push(seatData);
                              }
                              
                              console.log(`  ✅ Added booking for "${booking.division}" at position ${position}`);
                            }
                          });

                          // STEP 5: Fill in ALL unoccupied positions as available with lab-level Asset IDs
                          // CRITICAL FIX: Check each position and add if not occupied
                          // If lab has predefined Asset IDs, show those; otherwise show "A"
                          const occupiedPositions = new Set(
                            seatsToRender.map(s => s.workstationNumber)
                          );

                          for (let pos = 1; pos <= currentLabInfo.total; pos++) {
                            if (!occupiedPositions.has(pos)) {
                              // Get the predefined Asset ID for this position
                              const assetId = labAssetIds.length >= pos ? labAssetIds[pos - 1] : null;
                              
                              seatsToRender.push({
                                displayText: assetId ? assetId.toString() : "A",
                                assetIdNumber: assetId,
                                division: "-",
                                color: "#9CA3AF",
                                seatState: "available",
                                workstationNumber: pos, // Actual position!
                                boxIndex: pos - 1,
                              });
                            }
                          }

                          // STEP 5: Sort seats by position before rendering
                          // CRITICAL: This ensures grid displays in correct order (1, 2, 3, ...)
                          seatsToRender.sort((a, b) => a.workstationNumber - b.workstationNumber);

                          // STEP 6: Render all seats
                          return seatsToRender.map((seat) => {
                            const {
                              displayText,
                              assetIdNumber,
                              boxIndex,
                            } = seat;

                            let seatState = seat.seatState;
                            let owningDivision = seat.division;
                            let divisionColor = seat.color;
                            let workstationNumber =
                              seat.workstationNumber;

                            // Extract floor number from current lab
                            const floorName =
                              currentLabInfo?.floor || "";
                            const floorNumber =
                              floorName.replace(/[^\d]/g, "") ||
                              "0";

                            // Create formatted asset ID with full structure: Admin/WS/F-{floor}/{assetId}
                            // NEW: Show predefined Asset IDs for ALL seats (including available)
                            let formattedAssetId = `Seat ${boxIndex + 1}`; // Default fallback
                            
                            if (assetIdNumber) {
                              // Pad asset ID to 3 digits (e.g., 100 -> "100", 45 -> "045")
                              const paddedAssetId = assetIdNumber.toString().padStart(3, '0');
                              // Construct full Asset ID: Admin/WS/F-{floor}/{paddedAssetId}
                              formattedAssetId = `Admin/WS/F-${floorNumber}/${paddedAssetId}`;
                            } else if (seatState === "assigned_no_id") {
                              formattedAssetId = "Not assigned";
                            }

                            // Check for actual bookings (both pending and approved)
                            // FIRST: Check for pending allocations (admin allocation mode - Yellow P)
                            // EDIT MODE FIX: Exclude seats in edit mode (initialSelectedSeats)
                            const pendingAllocation =
                              pendingAllocations?.find(
                                (pa) =>
                                  pa.labName ===
                                    currentLabName &&
                                  pa.seatNumber ===
                                    workstationNumber &&
                                  pa.status === "pending" &&
                                  !initialSelectedSeats.includes(workstationNumber),
                              );

                            const pendingBooking =
                              seatBookings?.find(
                                (b) =>
                                  b.labName ===
                                    currentLabName &&
                                  b.seatNumber ===
                                    workstationNumber &&
                                  b.status === "pending" &&
                                  !initialSelectedSeats.includes(workstationNumber),
                              );

                            // CRITICAL FIX: Check for approved bookings to render them at correct positions
                            // Even though labs table has the count, seatBookings preserves exact seat numbers
                            const approvedBooking =
                              seatBookings?.find(
                                (b) =>
                                  b.labName ===
                                    currentLabName &&
                                  b.seatNumber ===
                                    workstationNumber &&
                                  b.status === "approved",
                              );

                            const isSelected =
                              selectedSeats.includes(
                                workstationNumber,
                              );

                            // Determine box styling based on seat state
                            let boxColor = "#9CA3AF"; // Default gray for available
                            let textColor = "text-white";
                            let cursorStyle = "cursor-pointer";
                            let borderStyle =
                              "border-slate-300";
                            let finalSeatStatus:
                              | "available"
                              | "booked"
                              | "pending" = "available";
                            let displayTextOverride =
                              displayText; // Allow override for pending seats

                            if (pendingAllocation) {
                              // CRITICAL FIX: ALL pending allocations (regardless of division) → Show Asset ID or "P"
                              // This ensures cross-division visibility of pending allocations
                              boxColor = "#F59E0B"; // Amber/Yellow for pending
                              cursorStyle =
                                "cursor-not-allowed opacity-90";
                              finalSeatStatus = "pending";
                              // NEW: Check if pending allocation has Asset ID
                              const pendingAllocAssetId = (pendingAllocation as any).asset_id;
                              displayTextOverride = pendingAllocAssetId || "P"; // Show Asset ID if available, else "P"
                              owningDivision =
                                pendingAllocation.division;
                            } else if (pendingBooking) {
                              // CRITICAL FIX: ALL pending bookings (regardless of division) → Show Asset ID or "P"
                              boxColor = "#F59E0B"; // Amber for pending
                              cursorStyle =
                                "cursor-not-allowed opacity-60";
                              finalSeatStatus = "pending";
                              // NEW: Check if pending booking has Asset ID
                              const pendingBookAssetId = (pendingBooking as any).asset_id;
                              displayTextOverride = pendingBookAssetId || "P"; // Show Asset ID if available, else "P"
                              owningDivision =
                                pendingBooking.division;
                            } else if (approvedBooking && !assetIdDivisionMap.sortedAssetIds.some(
                              assetId => assetIdDivisionMap.assetToDivision.get(assetId)?.division === approvedBooking.division
                            )) {
                              // CRITICAL FIX: ONLY render approved bookings if the division does NOT have Asset IDs in Workstation Data
                              // Workstation Data is the SINGLE SOURCE OF TRUTH and overrides all bookings
                              // If division HAS Asset IDs in Workstation Data, skip this block and continue to next condition
                              const approvedDivisionColor = globalDivisionColorMap.get(approvedBooking.division);
                              boxColor = approvedDivisionColor || "#10B981";
                              cursorStyle = "cursor-not-allowed";
                              finalSeatStatus = "booked";
                              owningDivision = approvedBooking.division;
                              divisionColor = approvedDivisionColor || divisionColor;
                            } else if (
                              seatState === "assigned_with_id"
                            ) {
                              // Seats with Asset IDs assigned → Show Asset ID number
                              boxColor = divisionColor; // Use division's color for booked seats
                              cursorStyle =
                                "cursor-not-allowed";
                              finalSeatStatus = "booked";
                            } else if (
                              seatState === "assigned_no_id"
                            ) {
                              // CRITICAL: Seats assigned to division but WITHOUT Asset IDs → Show as colored "B"
                              // This handles divisions that have been allocated seats but admin hasn't assigned Asset IDs yet
                              boxColor = divisionColor; // Use division's color
                              cursorStyle = "cursor-not-allowed";
                              finalSeatStatus = "booked";
                              displayTextOverride = "B"; // Show B for Booked (no Asset ID)
                            } else if (
                              seatState === "available"
                            ) {
                              if (isSelected) {
                                boxColor = "#10B981"; // Green for selected
                                borderStyle =
                                  "border-green-700 ring-2 ring-green-300";
                              }
                              finalSeatStatus = "available";
                            }

                            // Workstation details for tooltip
                            const workstationDetails = {
                              lab:
                                currentLabName || selectedLab,
                              division: owningDivision,
                              hod:
                                finalSeatStatus === "booked"
                                  ? "Mr. Patel"
                                  : "-",
                              assetId: formattedAssetId,
                              dateOfBooking:
                                finalSeatStatus === "booked"
                                  ? "2025-11-12"
                                  : "-",
                              status: finalSeatStatus,
                            };

                            return (
                              <Tooltip key={`seat-${boxIndex}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-10 h-10 rounded flex items-center justify-center text-xs transition-all hover:scale-110 hover:shadow-md border ${cursorStyle} ${textColor} ${borderStyle}`}
                                    style={{
                                      backgroundColor: boxColor,
                                    }}
                                    onClick={() =>
                                      enableBooking &&
                                      finalSeatStatus ===
                                        "available" &&
                                      handleSeatSelection(
                                        workstationNumber,
                                        {
                                          status:
                                            finalSeatStatus,
                                        },
                                      )
                                    }
                                  >
                                    {displayTextOverride}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="bg-slate-800 text-white p-3 max-w-xs border-slate-700"
                                >
                                  <div className="space-y-1 text-xs">
                                    <div>
                                      <span className="text-slate-400">
                                        Lab:
                                      </span>{" "}
                                      {workstationDetails.lab}
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Division:
                                      </span>{" "}
                                      {
                                        workstationDetails.division
                                      }
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        HOD:
                                      </span>{" "}
                                      {workstationDetails.hod}
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Asset ID:
                                      </span>{" "}
                                      <strong>
                                        {
                                          workstationDetails.assetId
                                        }
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Date of booking:
                                      </span>{" "}
                                      {
                                        workstationDetails.dateOfBooking
                                      }
                                    </div>
                                    <div className="pt-2 border-t border-slate-600 mt-2">
                                      <Badge
                                        className={`${
                                          workstationDetails.status ===
                                          "available"
                                            ? "bg-slate-500"
                                            : workstationDetails.status ===
                                                "booked"
                                              ? "bg-red-500"
                                              : "bg-amber-500"
                                        } text-white`}
                                      >
                                        {workstationDetails.status.toUpperCase()}
                                      </Badge>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          });
                        })()
                      : // OLD LOGIC: Sequential rendering when NO divisions are allocated
                        // This path is used when the lab has capacity but no divisions assigned yet
                        Array.from(
                          { length: currentLabInfo.total },
                          (_, index) => {
                            const boxNumber = index + 1;
                            const workstationNumber = boxNumber;
                            const isSelected =
                              selectedSeats.includes(
                                workstationNumber,
                              );

                            // Check for pending allocations (admin allocation mode - Yellow P)
                            // EDIT MODE FIX: Exclude seats in edit mode (initialSelectedSeats)
                            const pendingAllocation =
                              pendingAllocations?.find(
                                (pa) =>
                                  pa.labName ===
                                    currentLabName &&
                                  pa.seatNumber ===
                                    workstationNumber &&
                                  pa.status === "pending" &&
                                  !initialSelectedSeats.includes(workstationNumber),
                              );

                            // REMOVED: approvedBooking - grid shows data only from labs table

                            // CRITICAL FIX: Use Asset ID from lab's asset_id_range instead of "A"
                            // Calculate Asset ID: start + (position - 1)
                            // Example: range "100-129", box 1 → displays "100"
                            let displayText: string | number = workstationNumber; // Default to workstation number
                            if (labAssetRange && labAssetRange.start) {
                              displayText = labAssetRange.start + (boxNumber - 1);
                            }

                            // All seats are available (show Asset ID) since no divisions are allocated
                            let boxColor = "#9CA3AF"; // Gray for available
                            let textColor = "text-white";
                            let cursorStyle = "cursor-pointer";
                            let borderStyle =
                              "border-slate-300";
                            let seatStatus:
                              | "available"
                              | "pending" = "available";

                            if (pendingAllocation) {
                              // Check if this pending allocation belongs to the CURRENT division being edited
                              const isCurrentDivisionPending =
                                userInfo?.division &&
                                pendingAllocation.division ===
                                  userInfo.division;

                              if (isCurrentDivisionPending) {
                                // CURRENT division's pending allocation → Show as "P" (Pending)
                                boxColor = "#F59E0B"; // Amber/Yellow for pending
                                cursorStyle =
                                  "cursor-not-allowed opacity-90";
                                displayText = "P";
                                seatStatus = "pending";
                              } else {
                                // ANOTHER division's pending allocation → Show as "B" (Booked by other division)
                                const otherDivisionColor =
                                  globalDivisionColorMap.get(
                                    pendingAllocation.division,
                                  );
                                boxColor =
                                  otherDivisionColor ||
                                  "#6B7280"; // Use division color or fallback to gray
                                cursorStyle =
                                  "cursor-not-allowed";
                                displayText = "B";
                                seatStatus = "available"; // Keep as available type but mark as not selectable
                              }
                            } else if (isSelected) {
                              boxColor = "#10B981"; // Green for selected
                              borderStyle =
                                "border-green-700 ring-2 ring-green-300";
                            }

                            // Workstation details for tooltip
                            // Calculate Asset ID for tooltip display with full format: Admin/WS/F-{floor}/{assetId}
                            let assetId = workstationNumber; // Default fallback
                            let fullAssetId = workstationNumber.toString(); // For display
                            
                            if (labAssetRange && labAssetRange.start && currentLabInfo) {
                              assetId = labAssetRange.start + (boxNumber - 1);
                              
                              // Extract floor number from floor name (e.g., "10th Floor" -> "10")
                              const floorNumber = currentLabInfo.floor.replace(/[^\d]/g, '') || '0';
                              
                              // Pad asset ID to 3 digits (e.g., 100 -> "100", 45 -> "045")
                              const paddedAssetId = assetId.toString().padStart(3, '0');
                              
                              // Construct full Asset ID: Admin/WS/F-{floor}/{paddedAssetId}
                              fullAssetId = `Admin/WS/F-${floorNumber}/${paddedAssetId}`;
                            }
                            
                            const workstationDetails = {
                              lab:
                                currentLabName || selectedLab,
                              division: pendingAllocation
                                ? pendingAllocation.division
                                : "-",
                              hod: "-",
                              assetId: fullAssetId, // Full format: Admin/WS/F-10/100
                              dateOfBooking: "-",
                              status: seatStatus,
                            };

                            return (
                              <Tooltip key={workstationNumber}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`w-10 h-10 rounded flex items-center justify-center text-sm transition-all hover:scale-110 hover:shadow-md border ${cursorStyle} ${textColor} ${borderStyle}`}
                                    style={{
                                      backgroundColor: boxColor,
                                    }}
                                    onClick={() =>
                                      enableBooking &&
                                      seatStatus ===
                                        "available" &&
                                      handleSeatSelection(
                                        workstationNumber,
                                        { status: seatStatus },
                                      )
                                    }
                                  >
                                    {displayText}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="bg-slate-800 text-white p-3 max-w-xs border-slate-700"
                                >
                                  <div className="space-y-1 text-xs">
                                    <div>
                                      <span className="text-slate-400">
                                        Lab:
                                      </span>{" "}
                                      {workstationDetails.lab}
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Division:
                                      </span>{" "}
                                      {
                                        workstationDetails.division
                                      }
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        HOD:
                                      </span>{" "}
                                      {workstationDetails.hod}
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Asset ID:
                                      </span>{" "}
                                      <strong>
                                        {
                                          workstationDetails.assetId
                                        }
                                      </strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">
                                        Date of booking:
                                      </span>{" "}
                                      {
                                        workstationDetails.dateOfBooking
                                      }
                                    </div>
                                    <div className="pt-2 border-t border-slate-600 mt-2">
                                      <Badge
                                        className={`${
                                          workstationDetails.status ===
                                          "available"
                                            ? "bg-slate-500"
                                            : "bg-amber-500"
                                        } text-white`}
                                      >
                                        {workstationDetails.status.toUpperCase()}
                                      </Badge>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          },
                        )}
                  </div>
                </TooltipProvider>
              </div>
            </div>
          </div>
        ) : null}

        {/* Booking Dialog */}
        {enableBooking && (
          <Dialog
            open={bookingDialogOpen}
            onOpenChange={setBookingDialogOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Seat Booking Request</DialogTitle>
                <DialogDescription className="text-sm text-slate-600 mt-2">
                  Selected desks:{" "}
                  {selectedSeats
                    .sort((a, b) => a - b)
                    .join(", ")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your name"
                    value={bookingForm.fullName}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        fullName: e.target.value,
                      })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Division</Label>
                  <Select
                    value={bookingForm.department}
                    onValueChange={(value) =>
                      setBookingForm({
                        ...bookingForm,
                        department: value,
                      })
                    }
                  >
                    <SelectTrigger
                      id="department"
                      className="mt-1.5"
                    >
                      <SelectValue placeholder="Select division" />
                    </SelectTrigger>
                    <SelectContent>
                      {allDivisions.map((division) => (
                        <SelectItem
                          key={division}
                          value={division}
                        >
                          {division}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bookingDate">
                    Booking Date
                  </Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingForm.bookingDate}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        bookingDate: e.target.value,
                      })
                    }
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Optional comments..."
                    value={bookingForm.remarks}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        remarks: e.target.value,
                      })
                    }
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6">
                <Button
                  type="button"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={handleBookingSubmit}
                  disabled={
                    !bookingForm.fullName ||
                    !bookingForm.department ||
                    !bookingForm.bookingDate
                  }
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}