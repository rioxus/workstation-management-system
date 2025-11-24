import { db } from './supabase';

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
      
      return requests.map(r => ({
        id: r.id,
        requestNumber: r.request_number,
        requestorId: r.requestor_employee_id,
        requestorName: r.requestor_name,
        division: r.division,
        shift: r.shift,
        numEmployees: r.num_workstations, // For backwards compatibility
        numWorkstations: r.num_workstations,
        location: r.location,
        floor: r.floor_name,
        requiresPC: r.requires_pc,
        requiresMonitor: r.requires_monitor,
        justification: r.justification || '',
        status: r.status,
        adminNotes: r.admin_notes || '',
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }));
    } catch (error) {
      console.error('Error fetching requests:', error);
      throw error;
    }
  },

  // Create a new request
  async createRequest(requestData: any) {
    try {
      // Get the requestor employee data
      const employee = await db.employees.getByEmployeeId(requestData.requestorId);
      
      const request = await db.requests.create({
        requestor_id: employee.id,
        requestor_name: requestData.requestorName,
        requestor_employee_id: requestData.requestorId,
        division: requestData.division,
        shift: requestData.shift,
        num_workstations: requestData.numEmployees || requestData.numWorkstations,
        location: requestData.location,
        floor_name: requestData.floor,
        requires_pc: requestData.requiresPC,
        requires_monitor: requestData.requiresMonitor,
        justification: requestData.justification,
        status: 'pending'
      });

      // If this is a seat booking request, create seat booking records
      if (requestData.seats && requestData.seats.length > 0 && requestData.labName) {
        // Get lab info to find lab_id and floor_id
        const labs = await db.labs.getAll();
        const lab = labs.find(l => l.lab_name === requestData.labName);
        
        if (lab) {
          // Create seat booking records for each selected seat
          for (const seatNumber of requestData.seats) {
            await db.seatBookings.create({
              request_id: request.id,
              lab_id: lab.id,
              lab_name: requestData.labName,
              floor_id: lab.floor_id,
              seat_number: seatNumber,
              requestor_id: requestData.requestorId, // Use employee ID string (e.g., 'MGR001')
              requestor_name: requestData.requestorName,
              division: requestData.division,
              status: 'pending',
              booking_date: requestData.bookingDate || new Date().toISOString().split('T')[0],
              shift: requestData.shift || 'General',
              remarks: requestData.justification || '',
            });
          }
        }
      }

      // Create notification for admin
      const admins = await db.employees.getAll();
      const adminUsers = admins.filter(e => e.role === 'Admin');
      
      for (const admin of adminUsers) {
        await db.notifications.create({
          employee_id: admin.id,
          request_id: request.id,
          title: 'New Workstation Request',
          message: `${requestData.requestorName} has submitted a request for ${requestData.numEmployees || requestData.numWorkstations} workstations`,
          type: 'info'
        });
      }

      return request;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error;
    }
  },

  // Approve request
  async approveRequest(requestId: string, approvedBy: string, notes?: string) {
    try {
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
      
      // If this request has associated seat bookings, approve them and update labs table
      const seatBookings = await db.seatBookings.getAll();
      const relatedBookings = seatBookings.filter(b => b.request_id === requestId);
      
      if (relatedBookings.length > 0) {
        // Group bookings by lab and division to update lab_allocations
        const labDivisionMap = new Map<string, { labName: string; labId: string; floorId: string; division: string; count: number }>();
        
        for (const booking of relatedBookings) {
          await db.seatBookings.approve(booking.id, employeeUuid, notes);
          
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
            console.log(`✅ Updated ${info.division} in ${info.labName}: +${info.count} seats (now ${(existingRecord.in_use || 0) + info.count} total)`);
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
              console.log(`✅ Created new division record: ${info.division} in ${info.labName} with ${info.count} seats`);
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

      return request;
    } catch (error) {
      console.error('Error approving request:', error);
      throw error;
    }
  },

  // Reject request
  async rejectRequest(requestId: string, notes: string) {
    try {
      const request = await db.requests.reject(requestId, notes);
      
      // If this request has associated seat bookings, reject them
      // NOTE: We do NOT update labs table - it remains unchanged
      const seatBookings = await db.seatBookings.getAll();
      const relatedBookings = seatBookings.filter(b => b.request_id === requestId);
      
      for (const booking of relatedBookings) {
        await db.seatBookings.reject(booking.id, notes);
      }
      
      // Create notification for requestor
      await db.notifications.create({
        employee_id: request.requestor_id,
        request_id: request.id,
        title: 'Request Rejected',
        message: `Your workstation request ${request.request_number} has been rejected. Reason: ${notes}`,
        type: 'error'
      });

      return request;
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  },

  // Get equipment inventory
  async getEquipmentInventory() {
    try {
      const equipment = await db.equipment.getAll();
      
      const officeEquipment = equipment
        .filter(e => e.location_type === 'Office')
        .map(e => ({
          id: e.id,
          type: e.equipment_type,
          location: e.location,
          totalAssigned: e.total_assigned,
          activeUsers: e.active_users,
          inMaintenance: e.in_maintenance,
          available: e.available,
          lastUpdated: e.last_updated
        }));

      const wfhEquipment = equipment
        .filter(e => e.location_type === 'WFH')
        .map(e => ({
          id: e.id,
          type: e.equipment_type,
          location: e.location,
          totalAssigned: e.total_assigned,
          activeUsers: e.active_users,
          inMaintenance: e.in_maintenance,
          available: e.available,
          lastUpdated: e.last_updated
        }));

      return { officeEquipment, wfhEquipment };
    } catch (error) {
      console.error('Error fetching equipment:', error);
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
          floorId: l.floor_id
        };
      });
    } catch (error) {
      console.error('Error fetching labs:', error);
      throw error;
    }
  },

  // Update lab/division workstation count
  async updateLab(labId: string, updates: { totalWorkstations?: number; labName?: string; division?: string; assigned?: number; inUse?: number }) {
    try {
      const updateData: any = {};
      
      if (updates.totalWorkstations !== undefined) {
        updateData.total_workstations = updates.totalWorkstations;
      }
      if (updates.labName !== undefined) updateData.lab_name = updates.labName;
      if (updates.division !== undefined) updateData.division = updates.division;
      if (updates.inUse !== undefined) updateData.in_use = updates.inUse;
      
      return await db.labs.update(labId, updateData);
    } catch (error) {
      console.error('Error updating lab:', error);
      throw error;
    }
  },

  // Create new lab/division
  async createLab(labData: { floorId: string; labName: string; division: string; totalWorkstations: number; assigned?: number; inUse?: number }) {
    try {
      const labRecord: any = {
        floor_id: labData.floorId,
        lab_name: labData.labName,
        division: labData.division,
        total_workstations: labData.totalWorkstations,
        in_use: labData.inUse || 0
      };

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
          shift: ws.shift || undefined,
          hasPC: ws.has_pc || false,
          hasMonitor: ws.has_monitor || false,
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

  async cleanRejectedData() {
    try {
      const result = await db.admin.cleanRejectedData();
      return result;
    } catch (error) {
      console.error('Error cleaning rejected data:', error);
      throw error;
    }
  },

  // Keep-alive function to prevent Supabase free tier from going inactive
  // Makes a lightweight query to the database
  async keepAlive() {
    try {
      // Make a simple count query to offices table (smallest table)
      // This is a lightweight operation that keeps the database active
      const { count, error } = await db.supabase
        .from('offices')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.warn('Keep-alive ping failed:', error.message);
        return { success: false, error: error.message };
      }
      
      console.log('✅ Database keep-alive ping successful');
      return { success: true, timestamp: new Date().toISOString() };
    } catch (error: any) {
      console.warn('Keep-alive ping error:', error?.message || error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
};