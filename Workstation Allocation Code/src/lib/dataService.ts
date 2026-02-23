import { db, supabase } from './supabase';
import { emailService } from './emailService';

// Data transformation functions to convert Supabase data to app format
export const dataService = {
  // Get dashboard statistics
  async getDashboardStats(userRole: string, userId?: string) {
    try {
      const [workstations, requests, labs] = await Promise.all([
        db.workstations.getAll(),
        db.requests.getAll(),
        db.labs.getAll()
      ]);

      // Separate lab allocations (no division) from division assignments (with division)
      const labAllocations = labs.filter(lab => !lab.division || lab.division.trim() === '');
      const divisionRecords = labs.filter(lab => lab.division && lab.division.trim() !== '');

      // Calculate totals from lab allocations and division records
      // Total Workstations = sum of total_workstations from lab allocations (Floor & Lab Allocation Management)
      const totalWorkstations = labAllocations.reduce((sum, lab) => sum + (lab.total_workstations || 0), 0);
      
      // Occupied Workstations = sum of in_use from division records (Workstation Data Management)
      const occupiedWorkstations = divisionRecords.reduce((sum, lab) => sum + (lab.in_use || 0), 0);
      
      // Available Workstations = sum of (total_workstations - in_use) from division records
      const availableWorkstations = divisionRecords.reduce((sum, lab) => {
        const labAllocation = labAllocations.find(
          alloc => alloc.floor_id === lab.floor_id && alloc.lab_name === lab.lab_name
        );
        if (!labAllocation) return sum;
        
        // Calculate total in use for all divisions in this lab
        const totalInUseInLab = divisionRecords
          .filter(d => d.floor_id === lab.floor_id && d.lab_name === lab.lab_name)
          .reduce((s, d) => s + (d.in_use || 0), 0);
        
        return sum + Math.max(0, labAllocation.total_workstations - totalInUseInLab);
      }, 0);
      
      // Remove duplicates by tracking unique lab+floor combinations
      const uniqueLabFloors = new Set<string>();
      const actualAvailable = divisionRecords.reduce((sum, lab) => {
        const key = `${lab.floor_id}-${lab.lab_name}`;
        if (uniqueLabFloors.has(key)) return sum;
        uniqueLabFloors.add(key);
        
        const labAllocation = labAllocations.find(
          alloc => alloc.floor_id === lab.floor_id && alloc.lab_name === lab.lab_name
        );
        if (!labAllocation) return sum;
        
        const totalInUseInLab = divisionRecords
          .filter(d => d.floor_id === lab.floor_id && d.lab_name === lab.lab_name)
          .reduce((s, d) => s + (d.in_use || 0), 0);
        
        return sum + Math.max(0, labAllocation.total_workstations - totalInUseInLab);
      }, 0);

      const pendingRequests = requests.filter(r => r.status === 'pending').length;
      const utilizationRate = totalWorkstations > 0 
        ? (occupiedWorkstations / totalWorkstations) * 100 
        : 0;

      // Group by floor for floor breakdown using lab allocations
      const floorMap = new Map();
      labAllocations.forEach(lab => {
        if (lab.floors) {
          const floorKey = `${lab.floors.offices?.office_name} - ${lab.floors.floor_name}`;
          if (!floorMap.has(floorKey)) {
            floorMap.set(floorKey, {
              floor: floorKey,
              total: 0,
              assigned: 0,
              available: 0
            });
          }
          const floorData = floorMap.get(floorKey);
          floorData.total += lab.total_workstations || 0;
          
          // Calculate in use for this lab from division records
          const labInUse = divisionRecords
            .filter(d => d.floor_id === lab.floor_id && d.lab_name === lab.lab_name)
            .reduce((sum, d) => sum + (d.in_use || 0), 0);
          
          floorData.assigned += labInUse;
          floorData.available += Math.max(0, (lab.total_workstations || 0) - labInUse);
        }
      });

      const floorBreakdown = Array.from(floorMap.values()).map(f => ({
        ...f,
        utilization: f.total > 0 ? (f.assigned / f.total) * 100 : 0
      }));

      // Group by division using division records
      const divisionMap = new Map();
      divisionRecords.forEach(lab => {
        if (lab.floors) {
          const division = lab.division;
          const floorName = `${lab.floors.offices?.office_name} - ${lab.floors.floor_name}`;
          
          if (!divisionMap.has(division)) {
            divisionMap.set(division, {
              division,
              totalAssigned: 0,
              inUse: 0,
              available: 0,
              floorDetails: []
            });
          }
          
          const divData = divisionMap.get(division);
          
          // Find the lab allocation for this division
          const labAllocation = labAllocations.find(
            alloc => alloc.floor_id === lab.floor_id && alloc.lab_name === lab.lab_name
          );
          
          if (labAllocation) {
            // Calculate total in use for all divisions in this lab
            const totalInUseInLab = divisionRecords
              .filter(d => d.floor_id === lab.floor_id && d.lab_name === lab.lab_name)
              .reduce((sum, d) => sum + (d.in_use || 0), 0);
            
            const availableInLab = Math.max(0, labAllocation.total_workstations - totalInUseInLab);
            
            divData.totalAssigned += labAllocation.total_workstations;
            divData.inUse += lab.in_use || 0;
            divData.available += availableInLab;
            
            // Track floor details
            let floorDetail = divData.floorDetails.find((f: any) => f.floor === floorName);
            if (!floorDetail) {
              floorDetail = { floor: floorName, assigned: 0, inUse: 0, available: 0 };
              divData.floorDetails.push(floorDetail);
            }
            floorDetail.assigned += labAllocation.total_workstations;
            floorDetail.inUse += lab.in_use || 0;
            floorDetail.available += availableInLab;
          }
        }
      });

      const divisionBreakdown = Array.from(divisionMap.values());

      return {
        totalWorkstations,
        occupiedWorkstations,
        availableWorkstations: actualAvailable,
        pendingRequests,
        totalEmployees: occupiedWorkstations,
        utilizationRate,
        floorBreakdown,
        divisionBreakdown,
        requestsByFloor: [],
        recentRequests: requests.slice(0, 5),
        // Pass lab data for sunburst chart
        labAllocations,
        divisionRecords
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // Get all workstation requests
  async getRequests(status?: string) {
    try {
      const requests = status 
        ? await db.requests.getByStatus(status as any)
        : await db.requests.getAll();
      
      // Get all seat bookings to determine which requests are bulk requests
      const seatBookings = await db.seatBookings.getAll().catch(() => []);
      
      // Get all floors to resolve floor names from seat bookings
      const floors = await db.floors.getAll().catch(() => []);
      
      // Get all labs to retrieve asset_id_range for each division
      const allLabs = await db.labs.getAll().catch(() => []);
      
      return requests.map(r => {
        // A request is a bulk request if it has no associated seat bookings
        const hasSeats = seatBookings.some(b => b.request_id === r.id);
        
        // CRITICAL BUSINESS RULE: Show floor/lab allocation details for APPROVED, PARTIALLY_APPROVED, PARTIALLY_ALLOCATED, and COMPLETED requests
        // This allows managers to see what's been allocated even for partial allocations
        const showAllocationDetails = r.status === 'approved' || r.status === 'completed' || r.status === 'partially_approved' || r.status === 'partially_allocated';
        
        // Get ALL seat bookings for this request to collect all floors and labs
        // For partially allocated/approved, we get PENDING bookings, for approved we get APPROVED bookings
        const relatedBookings = seatBookings.filter(b => 
          b.request_id === r.id && (b.status === 'approved' || b.status === 'pending')
        );
        const relatedBooking = relatedBookings[0]; // First booking for backwards compatibility
        
        // CRITICAL FIX: Collect ALL unique lab names (not just first one)
        const uniqueLabNames = [...new Set(relatedBookings.map(b => b.lab_name).filter(Boolean))];
        const labName = showAllocationDetails && uniqueLabNames.length > 0 ? uniqueLabNames.join(', ') : '';
        const bookingDate = relatedBooking?.created_at || r.created_at; // Use created_at instead of booking_date
        
        // Extract ALL unique floor names from seat bookings
        let floorNames: string[] = [];
        let locationName = r.location; // Default to request's location
        
        if (showAllocationDetails && relatedBookings.length > 0) {
          // Get all unique floors from the bookings
          const uniqueFloorIds = [...new Set(relatedBookings.map(b => b.floor_id).filter(Boolean))];
          
          uniqueFloorIds.forEach(floorId => {
            const floor = floors.find(f => f.id === floorId);
            if (floor) {
              floorNames.push(floor.floor_name);
              // Use the location from the first floor found
              if (!locationName && floor.offices) {
                locationName = floor.offices.office_name;
              }
            }
          });
        }
        
        // CRITICAL FIX: Use preserved floor/location names from audit columns as fallback
        // This ensures floor names remain visible even after workstation data is deleted
        let preservedFloorName = '';
        let preservedLocationName = '';
        
        if (showAllocationDetails) {
          // PRIMARY SOURCE: Try to get from live seat bookings (most accurate)
          const liveFloorName = floorNames.length > 0 ? floorNames.join(', ') : '';
          
          // FALLBACK: Use preserved data from workstation_requests table
          preservedFloorName = liveFloorName || r.allocated_floor_names || r.floor_name;
          preservedLocationName = locationName || r.allocated_location_names || r.location;
        }
        
        // For pending requests, only show the preferred location from request, NOT the allocated floors
        const floorName = showAllocationDetails ? preservedFloorName : r.floor_name;
        const finalLocationName = showAllocationDetails ? preservedLocationName : r.location;
        
        // CRITICAL FIX: Get Asset IDs from PRESERVED audit columns in workstation_requests table
        // This ensures Asset IDs remain visible even after workstation data is deleted
        let assignedAssetIds: string[] = [];
        let preservedLabName = '';
        
        if (showAllocationDetails) {
          // PRIMARY SOURCE: Use preserved audit data from workstation_requests table
          if (r.allocated_asset_ids && r.allocated_asset_ids.trim() !== '') {
            // Parse comma-separated Asset IDs from allocated_asset_ids column
            assignedAssetIds = r.allocated_asset_ids
              .split(',')
              .map(id => id.trim())
              .filter(id => id !== '')
              .map(id => id.padStart(3, '0')); // Ensure zero-padding
          }
          // FALLBACK: If no preserved data, try to get from seat_bookings (for old data)
          else if (relatedBookings.length > 0) {
            const uniqueAssetIds = new Set<number>();
            
            relatedBookings.forEach(booking => {
              if (booking.asset_id && booking.asset_id.trim() !== '') {
                const assetId = parseInt(booking.asset_id);
                if (!isNaN(assetId)) {
                  uniqueAssetIds.add(assetId);
                }
              }
            });
            
            assignedAssetIds = Array.from(uniqueAssetIds)
              .sort((a, b) => a - b)
              .map(id => id.toString().padStart(3, '0'));
          }
          
          // Use preserved lab name if available
          preservedLabName = r.allocated_lab_name || labName;
        }
        
        return {
          id: r.id,
          requestNumber: r.request_number,
          requestorId: r.requestor_employee_id,
          requestorName: r.requestor_name,
          division: r.division,
          numEmployees: r.num_workstations, // For backwards compatibility
          numWorkstations: r.num_workstations,
          location: finalLocationName,
          floor: floorName,
          preferredFloor: r.preferred_floor || '', // Add preferred floor field
          labName: preservedLabName, // Use preserved lab name for audit trail
          bookingDate: bookingDate, // Add booking date from created_at
          justification: r.justification || '',
          status: r.status,
          adminNotes: r.admin_notes || '',
          remarks: r.remarks || '', // Add remarks field
          requestedAllocationDate: r.requested_allocation_date || null, // Add requested allocation date
          assignedAssetIds: assignedAssetIds, // Asset IDs from preserved audit data
          isBulkRequest: !hasSeats && !r.location && !r.floor_name, // Bulk if no seats AND no location/floor
          createdAt: r.created_at,
          updatedAt: r.updated_at
        };
      });
    } catch (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
  },

  // Helper function to parse asset ID range string into array of formatted IDs
  parseAssetIdRangeToArray(rangeStr: string): string[] {
    if (!rangeStr || rangeStr.trim() === '') return [];
    
    const assetIds: string[] = [];
    
    // Check if it's the legacy "to" format (e.g., "Admin/WS/F-5/001 to Admin/WS/F-5/098")
    if (rangeStr.toLowerCase().includes(' to ')) {
      const parts = rangeStr.toLowerCase().split(' to ');
      if (parts.length === 2) {
        const startParts = parts[0].trim().split('/');
        const endNum = parseInt(parts[1].split('/').pop()?.trim() || '0');
        const startNum = parseInt(startParts.pop()?.trim() || '0');
        const prefix = startParts.join('/');
        
        if (!isNaN(startNum) && !isNaN(endNum) && endNum >= startNum) {
          for (let i = startNum; i <= endNum; i++) {
            const paddedNum = i.toString().padStart(3, '0');
            assetIds.push(prefix ? `${prefix}/${paddedNum}` : paddedNum);
          }
          return assetIds;
        }
      }
    }
    
    // Split by commas to handle multiple ranges/individual IDs
    const parts = rangeStr.split(',').map(p => p.trim());
    
    for (const part of parts) {
      // Check if it has prefix format (e.g., "Admin/WS/F-5/112-123")
      const hasPrefix = part.includes('/');
      const segments = part.split('/');
      const numberPart = segments.pop() || part;
      const prefix = segments.join('/');
      
      // Check if it's a range with dash
      if (numberPart.includes('-')) {
        const [start, end] = numberPart.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          for (let i = start; i <= end; i++) {
            const paddedNum = i.toString().padStart(3, '0');
            assetIds.push(hasPrefix ? `${prefix}/${paddedNum}` : paddedNum);
          }
        }
      } else {
        // Individual ID
        const num = parseInt(numberPart.trim());
        if (!isNaN(num)) {
          const paddedNum = num.toString().padStart(3, '0');
          assetIds.push(hasPrefix ? `${prefix}/${paddedNum}` : paddedNum);
        }
      }
    }
    
    return assetIds;
  },

  // Create a new request
  createRequest: async (requestData: {
    requestorId: string;
    requestorEmployeeId: string;
    requestorName: string;
    division: string;
    numEmployees: number;
    numWorkstations: number;
    location: string;
    floor: string;
    preferredFloor?: string; // Add preferred floor field
    justification?: string;
    remarks?: string;
    requestedAllocationDate?: string;
  }) => {
    try {
      console.log('📝 Creating new workstation request...');
      console.log('Request data:', requestData);
      
      // Generate unique request number with timestamp
      const timestamp = Date.now();
      const requestNumber = `REQ-${timestamp}`;

      // Create the request
      const { data: request, error } = await supabase
        .from('workstation_requests')
        .insert({
          request_number: requestNumber,
          requestor_id: requestData.requestorId,
          requestor_employee_id: requestData.requestorEmployeeId,
          requestor_name: requestData.requestorName,
          division: requestData.division,
          num_workstations: requestData.numWorkstations,
          location: requestData.location,
          floor_name: requestData.floor,
          preferred_floor: requestData.preferredFloor || null, // Add preferred floor to insert
          justification: requestData.justification || '',
          remarks: requestData.remarks || '',
          requested_allocation_date: requestData.requestedAllocationDate || null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating request in database:', error);
        throw error;
      }

      console.log('✅ Request created in database:', request.id);

      // REMOVED: Bulk seat booking placeholder creation
      // The system NO LONGER creates placeholder seat bookings when a request is submitted
      // Seat bookings are ONLY created when admin manually allocates seats in the Allocations tab

      // Create notifications for all admins
      const admins = await db.employees.getAll();
      const adminUsers = admins.filter(e => e.role === 'Admin');
      console.log(`Found ${adminUsers.length} admin users`);
      
      for (const admin of adminUsers) {
        await db.notifications.create({
          employee_id: admin.id,
          request_id: request.id,
          title: 'New Workstation Request',
          message: `${requestData.requestorName} has submitted a request for ${requestData.numEmployees || requestData.numWorkstations} workstations`,
          type: 'info'
        });
      }
      console.log('✅ Admin notifications created');

      // Send email notifications to all admins
      // This happens asynchronously and won't block the request submission
      console.log('📧 Attempting to send email notifications to admin...');
      
      // Get the requestor's HOD email from employees table
      let hodEmail: string | undefined;
      try {
        const requestor = await db.employees.getByEmployeeId(requestData.requestorEmployeeId);
        hodEmail = requestor.hod_email || undefined;
        console.log('📧 Found HOD email:', hodEmail || 'None');
      } catch (err) {
        console.warn('⚠️ Could not fetch requestor HOD email:', err);
      }
      
      // Send email to admin
      emailService.notifyAllAdmins({
        requestorName: requestData.requestorName,
        requestorId: requestData.requestorEmployeeId,
        division: requestData.division,
        numWorkstations: requestData.numEmployees || requestData.numWorkstations,
        location: requestData.location,
        floor: requestData.floor,
        preferredFloor: requestData.preferredFloor, // Include manager's preferred floor
        requestNumber: request.request_number,
        remarks: requestData.remarks, // Include manager's remarks
        requestedAllocationDate: requestData.requestedAllocationDate, // Include requested allocation date
        hodEmail: hodEmail, // Include HOD email for reference
      }).catch(err => {
        // Log error but don't fail the request
        console.error('❌ Failed to send email notifications:', err);
        console.error('Error stack:', err?.stack);
      });
      
      // Send FYI email to HOD if available
      if (hodEmail) {
        console.log('📧 Sending FYI notification to HOD:', hodEmail);
        emailService.sendHODNewRequestNotification({
          requestorName: requestData.requestorName,
          requestorId: requestData.requestorEmployeeId,
          division: requestData.division,
          numWorkstations: requestData.numEmployees || requestData.numWorkstations,
          location: requestData.location,
          floor: requestData.floor,
          preferredFloor: requestData.preferredFloor,
          requestNumber: request.request_number,
          remarks: requestData.remarks,
          requestedAllocationDate: requestData.requestedAllocationDate,
          adminEmail: 'angkik.borthakur@hitechdigital.com', // Placeholder
          adminName: 'Admin Team', // Placeholder
          hodEmail: hodEmail,
        }).catch(err => {
          console.error('❌ Failed to send HOD notification:', err);
        });
      } else {
        console.log('⚠️ No HOD email found for this manager, skipping HOD notification');
      }

      console.log('✅ Request creation complete!');
      return request;
    } catch (error) {
      console.error('❌ Error creating request:', error);
      throw error;
    }
  },

  // Approve partial allocation (some seats allocated, remaining rejected)
  async approvePartialAllocation(
    requestId: string,
    approvedBy: string,
    allocations: any[],
    notes: string,
    rejectedSeatsCount: number,
    rejectionReason: string
  ) {
    try {
      console.log('🟡 Starting partial allocation approval process...');
      
      // Step 0: Convert employee ID to UUID (CRITICAL FIX)
      let employeeUuid = approvedBy;
      
      try {
        const employee = await db.employees.getByEmployeeId(approvedBy);
        employeeUuid = employee.id;
      } catch (error) {
        // If employee not found by employee_id, try to find by searching all employees
        console.warn(`Employee not found with employee_id: ${approvedBy}, trying alternative lookup`);
        const allEmployees = await db.employees.getAll();
        const foundEmployee = allEmployees.find(e => e.employee_id === approvedBy);
        
        if (foundEmployee) {
          employeeUuid = foundEmployee.id;
        } else {
          console.error(`Could not find employee with employee_id: ${approvedBy}`);
        }
      }
      
      // Step 1: Approve the allocated seat bookings
      const seatBookings = await db.seatBookings.getAll();
      const allocatedBookings = seatBookings.filter(b => b.request_id === requestId && b.status === 'pending');
      
      console.log(`✅ Approving ${allocatedBookings.length} seat bookings...`);
      await Promise.all(
        allocatedBookings.map(booking => db.seatBookings.approve(booking.id))
      );
      
      // Step 2: Update request status to 'partially_approved' with partial allocation notes (USING UUID)
      const request = await db.requests.approvePartial(requestId, employeeUuid, notes);
      
      // Step 3: Create notification for manager
      await db.notifications.create({
        employee_id: request.requestor_id,
        request_id: request.id,
        title: 'Partial Allocation Approved',
        message: `Your request ${request.request_number} has been partially approved. ${allocatedBookings.length} seats allocated. Reason for partial allocation: ${rejectionReason}`,
        type: 'warning'
      });
      
      // Step 4: Send partial allocation email to manager
      try {
        const requestor = await db.employees.getById(request.requestor_id);
        const floors = await db.floors.getAll();
        
        // Build lab names from allocations
        const labNames: string[] = [];
        for (const alloc of allocations) {
          if (!labNames.includes(alloc.labName)) {
            labNames.push(alloc.labName);
          }
        }
        
        // Get floor and location details
        const requestFloor = floors.find(f => f.floor_name === request.floor_name);
        const locationName = requestFloor?.offices?.office_name || request.location || 'Unknown Location';
        const floorName = requestFloor?.floor_name || request.floor_name || 'Unknown Floor';
        
        // Send partial allocation email to manager
        await emailService.sendPartialAllocationNotification({
          requestorName: request.requestor_name,
          requestorEmail: requestor.email,
          requestorId: request.requestor_employee_id,
          division: request.division,
          totalRequested: request.num_workstations,
          seatsAllocated: allocatedBookings.length,
          seatsRejected: rejectedSeatsCount,
          rejectionReason: rejectionReason,
          requestNumber: request.request_number,
          location: locationName,
          floor: floorName,
          labNames: labNames,
          allocations: allocations
        });
        
        // Send FYI to HOD if available
        const hodEmail = requestor.hod_email;
        if (hodEmail) {
          console.log('📧 Sending partial allocation FYI to HOD:', hodEmail);
          await emailService.sendHODPartialAllocationNotification({
            requestorName: request.requestor_name,
            requestorEmail: requestor.email,
            requestorId: request.requestor_employee_id,
            division: request.division,
            totalRequested: request.num_workstations,
            seatsAllocated: allocatedBookings.length,
            seatsRejected: rejectedSeatsCount,
            rejectionReason: rejectionReason,
            requestNumber: request.request_number,
            location: locationName,
            floor: floorName,
            labNames: labNames,
            allocations: allocations,
            hodEmail: hodEmail
          });
        } else {
          console.log('⚠️ No HOD email found for this manager, skipping HOD notification');
        }
        
        console.log('✅ Partial allocation emails sent successfully');
      } catch (emailError) {
        console.error('❌ Failed to send partial allocation email (non-blocking):', emailError);
        // Don't throw - email failure shouldn't block the approval
      }
      
      console.log('✅ Partial allocation approval complete');
      return request;
    } catch (error) {
      console.error('Error approving partial allocation:', error);
      throw error;
    }
  },

  // Approve request
  async approveRequest(requestId: string, approvedBy: string, notes?: string, labsAlreadyUpdated?: boolean) {
    try {
      // CRITICAL BUSINESS RULE: When approving a request, the system NEVER automatically assigns Asset IDs
      // Asset ID assignment is ONLY done manually by Admin through the Workstation Data Management interface
      // Approved seats will show as "Booked" (State B) until Admin manually assigns Asset IDs
      
      // Get the approver's employee record to get UUID
      let employeeUuid = approvedBy;
      
      try {
        const employee = await db.employees.getByEmployeeId(approvedBy);
        employeeUuid = employee.id;
      } catch (error) {
        // If employee not found by employee_id, try to find by searching all employees
        console.warn(`Employee not found with employee_id: ${approvedBy}, trying alternative lookup`);
        const allEmployees = await db.employees.getAll();
        const foundEmployee = allEmployees.find(e => e.employee_id === approvedBy);
        
        if (foundEmployee) {
          employeeUuid = foundEmployee.id;
        } else {
          // If still not found, create a placeholder employee record
          console.warn(`Creating placeholder employee record for: ${approvedBy}`);
          const newEmployee = await db.employees.create({
            employee_id: approvedBy,
            name: approvedBy,
            email: `${approvedBy.toLowerCase()}@company.com`,
            role: 'Admin'
          });
          employeeUuid = newEmployee.id;
        }
      }
      
      const request = await db.requests.approve(requestId, employeeUuid, notes);
      
      // If this request has associated seat bookings, approve them
      const seatBookings = await db.seatBookings.getAll();
      const relatedBookings = seatBookings.filter(b => b.request_id === requestId);
      
      // CRITICAL FIX: Preserve allocation history for audit trail
      // Copy Asset IDs, lab name, and floor IDs from seat_bookings to workstation_requests
      // This ensures data is preserved even if workstation data is deleted later
      if (relatedBookings.length > 0) {
        // Extract unique Asset IDs from bookings
        const uniqueAssetIds = new Set<string>();
        relatedBookings.forEach(booking => {
          if (booking.asset_id && booking.asset_id.trim() !== '') {
            uniqueAssetIds.add(booking.asset_id);
          }
        });
        
        // CRITICAL FIX: Collect ALL unique lab names (not just first booking)
        const uniqueLabNames = new Set<string>();
        relatedBookings.forEach(booking => {
          if (booking.lab_name && booking.lab_name.trim() !== '') {
            uniqueLabNames.add(booking.lab_name);
          }
        });
        const allocatedLabName = Array.from(uniqueLabNames).join(', ');
        
        // Extract unique floor IDs
        const uniqueFloorIds = new Set<string>();
        relatedBookings.forEach(booking => {
          if (booking.floor_id) {
            uniqueFloorIds.add(booking.floor_id);
          }
        });
        
        // CRITICAL FIX: Collect floor names and location names for audit trail
        // Get floors data to extract names (not just IDs)
        const floors = await db.floors.getAll();
        const uniqueFloorNames = new Set<string>();
        const uniqueLocationNames = new Set<string>();
        
        relatedBookings.forEach(booking => {
          if (booking.floor_id) {
            const floor = floors.find(f => f.id === booking.floor_id);
            if (floor) {
              // Collect floor name
              if (floor.floor_name) {
                uniqueFloorNames.add(floor.floor_name);
              }
              // Collect office/location name
              if (floor.offices && floor.offices.office_name) {
                uniqueLocationNames.add(floor.offices.office_name);
              }
            }
          }
        });
        
        const allocatedFloorNames = Array.from(uniqueFloorNames).join(', ');
        const allocatedLocationNames = Array.from(uniqueLocationNames).join(', ');
        
        // Convert to comma-separated strings
        const allocatedAssetIds = Array.from(uniqueAssetIds)
          .map(id => parseInt(id))
          .filter(id => !isNaN(id))
          .sort((a, b) => a - b)
          .map(id => id.toString().padStart(3, '0'))
          .join(',');
        
        const allocatedFloorIds = Array.from(uniqueFloorIds).join(',');
        
        // Update workstation_requests with audit data
        console.log('📝 Saving allocation history to workstation_requests table...');
        console.log('  - Allocated Asset IDs:', allocatedAssetIds);
        console.log('  - Allocated Lab Name:', allocatedLabName);
        console.log('  - Allocated Floor Names:', allocatedFloorNames);
        console.log('  - Allocated Location Names:', allocatedLocationNames);
        console.log('  - Allocated Floor IDs:', allocatedFloorIds);
        
        await db.requests.update(requestId, {
          allocated_asset_ids: allocatedAssetIds,
          allocated_lab_name: allocatedLabName,
          allocated_floor_names: allocatedFloorNames,
          allocated_location_names: allocatedLocationNames,
          allocated_floor_ids: allocatedFloorIds,
          approval_date: new Date().toISOString()
        });
        
        console.log('✅ Allocation history preserved for audit trail');
      }
      
      // Check if labs table has already been updated (when called from handleFinalApprove)
      // If seat bookings exist with 'pending' status, it means handleFinalApprove already updated labs
      const labsAlreadyUpdatedCheck = relatedBookings.length > 0 && relatedBookings.every(b => b.status === 'pending');
      
      if (relatedBookings.length > 0) {
        // Approve all seat bookings
        for (const booking of relatedBookings) {
          await db.seatBookings.approve(booking.id, employeeUuid, notes);
        }
        
        // Only update labs table if it hasn't been updated yet
        // This prevents double-counting when called from handleFinalApprove
        if (!labsAlreadyUpdated && !labsAlreadyUpdatedCheck) {
          // Group bookings by lab and division to update lab_allocations
          const labDivisionMap = new Map<string, { labName: string; labId: string; floorId: string; division: string; count: number }>();
          
          for (const booking of relatedBookings) {
            // Group by lab + division
            const key = `${booking.lab_name}-${booking.division}`;
            if (!labDivisionMap.has(key)) {
              labDivisionMap.set(key, {
                labName: booking.lab_name,
                labId: booking.lab_id,
                floorId: booking.floor_id,
                division: booking.division,
                count: 0
              });
            }
            labDivisionMap.get(key)!.count += 1;
          }
          
          // Update or create lab_allocations records for each division
          // This updates the workstation data table for live tracking
          const allLabs = await db.labs.getAll();
          for (const [key, info] of labDivisionMap.entries()) {
            // Find existing division record in lab_allocations
            const existingRecord = allLabs.find(
              lab => lab.lab_name === info.labName && 
                     lab.floor_id === info.floorId && 
                     lab.division === info.division
            );
            
            if (existingRecord) {
              // Update existing record - increment in_use
              await db.labs.update(existingRecord.id, {
                in_use: (existingRecord.in_use || 0) + info.count
              });
            } else {
              // Create new division record in lab_allocations
              // First get the lab allocation (without division) to know total_workstations
              const labAllocation = allLabs.find(
                lab => lab.lab_name === info.labName && 
                       lab.floor_id === info.floorId && 
                       (!lab.division || lab.division.trim() === '')
              );
              
              if (labAllocation) {
                await db.labs.create({
                  floor_id: info.floorId,
                  lab_name: info.labName,
                  division: info.division,
                  total_workstations: labAllocation.total_workstations,
                  assigned: 0,
                  in_use: info.count
                });
              }
            }
          }
        }
      }
      
      // Create notification for requestor
      await db.notifications.create({
        employee_id: request.requestor_id,
        request_id: request.id,
        title: 'Request Approved',
        message: `Your workstation request ${request.request_number} has been approved`,
        type: 'success'
      });

      // Create notification for technical team
      const technicalTeam = await db.employees.getAll();
      const techUsers = technicalTeam.filter(e => e.role === 'Technical');
      
      for (const tech of techUsers) {
        await db.notifications.create({
          employee_id: tech.id,
          request_id: request.id,
          title: 'New Assignment',
          message: `Request ${request.request_number} has been approved and needs setup`,
          type: 'info'
        });
      }

      // Send approval email to the requestor
      try {
        // Get requestor's email from employees table
        const requestor = await db.employees.getById(request.requestor_id);
        
        // Get floor and office details - prioritize seat bookings data
        const floors = await db.floors.getAll();
        let locationName = request.location;
        let floorName = request.floor_name;
        let labNames: string[] = [];
        
        // If we have seat bookings, extract floor info from them (more accurate)
        if (relatedBookings.length > 0) {
          // Collect all unique floors and labs from the bookings
          const uniqueFloors = new Set<string>();
          const uniqueLabs = new Set<string>();
          const uniqueLocations = new Set<string>();
          
          for (const booking of relatedBookings) {
            const bookingFloor = floors.find(f => f.id === booking.floor_id);
            if (bookingFloor) {
              uniqueFloors.add(bookingFloor.floor_name);
              if (bookingFloor.offices) {
                uniqueLocations.add(bookingFloor.offices.office_name);
              }
            }
            if (booking.lab_name) {
              uniqueLabs.add(booking.lab_name);
            }
          }
          
          // Format floor names (show all unique floors)
          if (uniqueFloors.size > 0) {
            floorName = Array.from(uniqueFloors).join(', ');
          }
          
          // Format location names  
          if (uniqueLocations.size > 0) {
            locationName = Array.from(uniqueLocations).join(', ');
          }
          
          // Format lab names
          if (uniqueLabs.size > 0) {
            labNames = Array.from(uniqueLabs);
          }
        }
        
        // Send approval email to manager
        await emailService.sendApprovalNotification({
          requestorName: request.requestor_name,
          requestorEmail: requestor.email,
          requestorId: request.requestor_employee_id,
          division: request.division,
          numWorkstations: request.num_workstations,
          location: locationName || 'Unknown Location',
          floor: floorName || 'Unknown Floor',
          requestNumber: request.request_number,
          labName: labNames.length > 0 ? labNames.join(', ') : undefined,
          approvalNotes: notes,
        });
        
        // Send FYI approval notification to HOD if available
        const hodEmail = requestor.hod_email;
        if (hodEmail) {
          console.log('📧 Sending approval FYI to HOD:', hodEmail);
          await emailService.sendHODStatusNotification({
            requestorName: request.requestor_name,
            requestorEmail: requestor.email,
            requestorId: request.requestor_employee_id,
            division: request.division,
            numWorkstations: request.num_workstations,
            location: locationName || 'Unknown Location',
            floor: floorName || 'Unknown Floor',
            requestNumber: request.request_number,
            labName: labNames.length > 0 ? labNames.join(', ') : undefined,
            approvalNotes: notes,
            hodEmail: hodEmail,
          }, 'approved');
        } else {
          console.log('⚠️ No HOD email found for this manager, skipping HOD approval notification');
        }
      } catch (emailError) {
        console.error('Failed to send approval email, but request was approved:', emailError);
        // Don't throw - email failure shouldn't block the approval
      }

      return request;
    } catch (error) {
      console.error('Error approving request:', error);
      throw error;
    }
  },

  // Reject request
  async rejectRequest(requestId: string, notes: string) {
    try {
      console.log('🔄 Starting rejection process for request:', requestId);
      const startTime = Date.now();
      
      // Step 1: Reject the request (PRIMARY OPERATION)
      const request = await db.requests.reject(requestId, notes);
      console.log('✅ Request rejected in database');
      
      // Step 2: Get related seat bookings
      const seatBookings = await db.seatBookings.getAll();
      const relatedBookings = seatBookings.filter(b => b.request_id === requestId);
      console.log(`📋 Found ${relatedBookings.length} seat bookings to process`);
      
      if (relatedBookings.length > 0) {
        // OPTIMIZATION: Reject all seat bookings in parallel (not sequentially)
        console.log('🔄 Rejecting seat bookings in parallel...');
        await Promise.all(
          relatedBookings.map(booking => 
            db.seatBookings.reject(booking.id, notes)
          )
        );
        console.log('✅ All seat bookings rejected');
        
        // Step 3: Update labs table to free up seats
        console.log('🔄 Updating labs table...');
        const labs = await db.labs.getAll();
        
        // Group bookings by lab
        const bookingsByLab = relatedBookings.reduce((acc, booking) => {
          const key = `${booking.lab_name}-${booking.floor_id}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(booking);
          return acc;
        }, {} as Record<string, typeof relatedBookings>);
        
        // OPTIMIZATION: Update labs in parallel (not sequentially)
        const labUpdatePromises = [];
        
        for (const [labKey, bookings] of Object.entries(bookingsByLab)) {
          const firstBooking = bookings[0];
          const division = firstBooking.division;
          
          // Find the lab allocation record for this division
          const labAllocation = labs.find(
            l => l.lab_name === firstBooking.lab_name && 
                 l.floor_id === firstBooking.floor_id && 
                 l.division === division
          );
          
          if (labAllocation) {
            // Get the seat numbers that are being rejected
            const rejectedSeatNumbers = bookings.map(b => b.seat_number);
            
            // Remove these seat numbers from the seats array
            const updatedSeats = (labAllocation.seats || []).filter(
              seatNum => !rejectedSeatNumbers.includes(seatNum)
            );
            
            // If no seats remain for this division, delete the entire lab allocation
            if (updatedSeats.length === 0) {
              labUpdatePromises.push(db.labs.delete(labAllocation.id));
            } else {
              // Otherwise, update the lab allocation with remaining seats
              labUpdatePromises.push(
                db.labs.update(labAllocation.id, {
                  seats: updatedSeats,
                  total_seats: updatedSeats.length
                })
              );
            }
          }
        }
        
        // Execute all lab updates in parallel
        await Promise.all(labUpdatePromises);
        console.log('✅ Labs table updated');
      }
      
      // Step 4: Create notification for requestor
      console.log('🔔 Creating notification...');
      await db.notifications.create({
        employee_id: request.requestor_id,
        request_id: request.id,
        title: 'Request Rejected',
        message: `Your workstation request ${request.request_number} has been rejected. Reason: ${notes}`,
        type: 'error'
      });

      // Step 5: Send rejection email (NON-BLOCKING - runs in background)
      console.log('📧 Sending email notifications (non-blocking)...');
      (async () => {
        try {
          // Get requestor's email from employees table
          const requestor = await db.employees.getById(request.requestor_id);
          
          // Get floor and office details from floor_name in the request
          const floors = await db.floors.getAll();
          const requestFloor = floors.find(f => f.floor_name === request.floor_name);
          
          // Send rejection email to manager (in background)
          await emailService.sendRejectionNotification({
            requestorName: request.requestor_name,
            requestorEmail: requestor.email,
            requestorId: request.requestor_employee_id,
            division: request.division,
            numWorkstations: request.num_workstations,
            location: requestFloor?.offices?.office_name || request.location || 'Unknown Location',
            floor: requestFloor?.floor_name || request.floor_name || 'Unknown Floor',
            requestNumber: request.request_number,
            labName: relatedBookings.length > 0 ? relatedBookings[0].lab_name : undefined,
            rejectionReason: notes,
          });
          
          // Send FYI rejection notification to HOD if available (in background)
          const hodEmail = requestor.hod_email;
          if (hodEmail) {
            console.log('📧 Sending rejection FYI to HOD:', hodEmail);
            await emailService.sendHODStatusNotification({
              requestorName: request.requestor_name,
              requestorEmail: requestor.email,
              requestorId: request.requestor_employee_id,
              division: request.division,
              numWorkstations: request.num_workstations,
              location: requestFloor?.offices?.office_name || request.location || 'Unknown Location',
              floor: requestFloor?.floor_name || request.floor_name || 'Unknown Floor',
              requestNumber: request.request_number,
              labName: relatedBookings.length > 0 ? relatedBookings[0].lab_name : undefined,
              rejectionReason: notes,
              hodEmail: hodEmail,
            }, 'rejected');
          } else {
            console.log('⚠️ No HOD email found for this manager, skipping HOD rejection notification');
          }
          
          console.log('✅ Email notifications sent successfully');
        } catch (emailError) {
          console.error('❌ Failed to send rejection email (non-blocking):', emailError);
          // Don't throw - email failure shouldn't block the rejection
        }
      })(); // Execute immediately but don't await

      const elapsed = Date.now() - startTime;
      console.log(`✅ Rejection process completed in ${elapsed}ms`);
      
      return request;
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  },

  // Get workstation summary for live dashboard
  async getWorkstationSummary() {
    try {
      return await db.views.workstationSummary();
    } catch (error) {
      console.error('Error fetching workstation summary:', error);
      throw error;
    }
  },

  // Get labs/divisions data for admin management
  async getLabs() {
    try {
      const labs = await db.labs.getAll();
      
      return labs.map(l => {
        // Use database values for assigned and in_use, defaulting to 0 if not present
        const assigned = (typeof l.assigned === 'number') ? l.assigned : 0;
        const inUse = (typeof l.in_use === 'number') ? l.in_use : 0;
        // Calculate available as: Assigned - In Use
        const available = Math.max(0, assigned - inUse);
        
        return {
          id: l.id,
          labName: l.lab_name,
          division: l.division,
          office: l.floors?.offices?.office_name || '',
          floor: l.floors?.floor_name || '',
          totalWorkstations: l.total_workstations || 0,
          assigned: assigned,
          inUse: inUse,
          available: available,
          floorId: l.floor_id,
          assetIdRange: l.asset_id_range || ''
        };
      });
    } catch (error) {
      console.error('Error fetching labs:', error);
      throw error;
    }
  },

  // Update lab/division workstation count
  async updateLab(labId: string, updates: { totalWorkstations?: number; labName?: string; division?: string; assigned?: number; inUse?: number; assetIdRange?: string }) {
    try {
      const updateData: any = {};
      
      if (updates.totalWorkstations !== undefined) {
        updateData.total_workstations = updates.totalWorkstations;
      }
      if (updates.labName !== undefined) updateData.lab_name = updates.labName;
      if (updates.division !== undefined) updateData.division = updates.division;
      if (updates.inUse !== undefined) updateData.in_use = updates.inUse;
      if (updates.assetIdRange !== undefined) updateData.asset_id_range = updates.assetIdRange;
      
      return await db.labs.update(labId, updateData);
    } catch (error) {
      console.error('Error updating lab:', error);
      throw error;
    }
  },

  // Create new lab/division
  async createLab(labData: { floorId: string; labName: string; division: string; totalWorkstations: number; assigned?: number; inUse?: number; assetIdRange?: string }) {
    try {
      const labRecord: any = {
        floor_id: labData.floorId,
        lab_name: labData.labName,
        division: labData.division,
        total_workstations: labData.totalWorkstations,
        in_use: labData.inUse || 0
      };

      // Only add asset_id_range if it's provided and not empty
      if (labData.assetIdRange && labData.assetIdRange.trim() !== '') {
        labRecord.asset_id_range = labData.assetIdRange.trim();
      }

      return await db.labs.create(labRecord);
    } catch (error) {
      console.error('Error creating lab:', error);
      throw error;
    }
  },

  // Delete lab/division
  async deleteLab(labId: string) {
    try {
      return await db.labs.delete(labId);
    } catch (error) {
      console.error('Error deleting lab:', error);
      throw error;
    }
  },

  // Get offices and floors for dropdowns
  async getOfficesAndFloors() {
    try {
      const [offices, floors] = await Promise.all([
        db.offices.getAll(),
        db.floors.getAll()
      ]);

      return {
        offices: offices.map(o => ({
          id: o.id,
          name: o.office_name,
          city: o.city
        })),
        floors: floors.map(f => ({
          id: f.id,
          officeId: f.office_id,
          name: f.floor_name,
          officeName: f.offices?.office_name || ''
        }))
      };
    } catch (error) {
      console.error('Error fetching offices and floors:', error);
      throw error;
    }
  },

  // Find or create office by name
  async findOrCreateOffice(officeName: string, city: string = '') {
    try {
      const { supabase } = await import('./supabase');
      const offices = await db.offices.getAll();
      const existing = offices.find(o => o.office_name.toLowerCase() === officeName.toLowerCase());
      
      if (existing) {
        return existing;
      }

      // Create new office
      const { data, error } = await supabase
        .from('offices')
        .insert({ office_name: officeName, city: city || officeName })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding/creating office:', error);
      throw error;
    }
  },

  // Find or create floor by name for an office
  async findOrCreateFloor(officeId: string, floorName: string) {
    try {
      const { supabase } = await import('./supabase');
      const floors = await db.floors.getByOffice(officeId);
      const existing = floors.find(f => f.floor_name.toLowerCase() === floorName.toLowerCase());
      
      if (existing) {
        return existing;
      }

      // Create new floor
      const { data, error } = await supabase
        .from('floors')
        .insert({ 
          office_id: officeId, 
          floor_name: floorName,
          total_capacity: 0 // Default capacity
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding/creating floor:', error);
      throw error;
    }
  },

  // Get workstation map data - returns individual workstations with full details
  async getWorkstationMapData() {
    try {
      const [workstations, labs, floors, offices] = await Promise.all([
        db.workstations.getAll(),
        db.labs.getAll(),
        db.floors.getAll(),
        db.offices.getAll()
      ]);

      // Create lookup maps
      const labMap = new Map();
      labs.forEach(lab => {
        labMap.set(lab.id, lab);
      });

      const floorMap = new Map();
      floors.forEach(floor => {
        floorMap.set(floor.id, floor);
      });

      const officeMap = new Map();
      offices.forEach(office => {
        officeMap.set(office.id, office);
      });

      // Transform workstations to the format needed by WorkstationMap component
      return workstations.map((ws: any) => {
        const lab = labMap.get(ws.lab_id);
        const floor = lab ? floorMap.get(lab.floor_id) : null;
        const office = floor ? officeMap.get(floor.office_id) : null;
        
        const labName = lab?.lab_name || 'Unknown Lab';
        const floorName = floor?.floor_name || 'Unknown Floor';
        const department = lab?.division || 'Unassigned';
        const floorCode = floorName.replace('Floor ', 'F-').replace(' ', '-');
        
        // Generate asset ID: Department/WS/Floor/Number
        const assetId = `${department}/WS/${floorCode}/${ws.workstation_number}`;

        return {
          id: ws.id,
          assetId: assetId,
          department: department,
          floor: floorName,
          lab: labName,
          number: ws.workstation_number,
          status: ws.status,
          assignedTo: ws.employees?.full_name || undefined,
        };
      });
    } catch (error) {
      console.error('Error fetching workstation map data:', error);
      throw error;
    }
  },

  // Get seat bookings
  async getSeatBookings() {
    try {
      const bookings = await db.seatBookings.getAll();
      return bookings;
    } catch (error) {
      console.error('Error fetching seat bookings:', error);
      // Return empty array if table doesn't exist yet
      return [];
    }
  },

  // Admin utilities - Clean test data
  async cleanAllTestData() {
    try {
      const result = await db.admin.cleanAllTestData();
      return result;
    } catch (error) {
      console.error('Error cleaning test data:', error);
      throw error;
    }
  },

  // Get current user data - uses first matching employee by role
  // In a real app, this would be tied to authentication
  async getCurrentUser(role: string, employeeId?: string) {
    try {
      const employees = await db.employees.getAll();
      
      // If employeeId is provided, try to find that specific employee
      if (employeeId) {
        const employee = employees.find(emp => emp.employee_id === employeeId);
        if (employee) {
          return {
            name: employee.name,
            division: employee.division || 'General',
            employeeId: employee.employee_id,
            email: employee.email,
            role: employee.role
          };
        }
      }
      
      // Otherwise, find the first employee matching the role
      const employee = employees.find(emp => emp.role === role);
      if (employee) {
        return {
          name: employee.name,
          division: employee.division || 'General',
          employeeId: employee.employee_id,
          email: employee.email,
          role: employee.role
        };
      }
      
      // Fallback to default user data if no employee found
      return {
        name: `${role} User`,
        division: 'General',
        employeeId: 'DEFAULT001',
        email: 'user@company.com',
        role: role
      };
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Return default user on error
      return {
        name: `${role} User`,
        division: 'General',
        employeeId: 'DEFAULT001',
        email: 'user@company.com',
        role: role
      };
    }
  },

  async cleanRejectedData() {
    try {
      const result = await db.admin.cleanRejectedData();
      return result;
    } catch (error) {
      console.error('Error cleaning rejected data:', error);
      throw error;
    }
  },

  // Get all employees for existence checks
  async getEmployees() {
    try {
      const employees = await db.employees.getAll();
      return employees;
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw error;
    }
  }
};