import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Briefcase, MapPin, Layers } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface ManagerDivisionBreakdownProps {
  divisionRecords: any[];
  managerDivisions: string[];
}

export function ManagerDivisionBreakdown({ 
  divisionRecords, 
  managerDivisions 
}: ManagerDivisionBreakdownProps) {
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  if (!managerDivisions || managerDivisions.length === 0) {
    return null;
  }

  // Single division - show simple table
  if (managerDivisions.length === 1) {
    const managerDivision = managerDivisions[0];
    
    // Filter division records for manager's division
    const divisionData = divisionRecords.filter(
      record => record.division === managerDivision
    );

    // Calculate total booked seats
    const totalBookedSeats = divisionData.reduce((sum, record) => sum + (record.in_use || 0), 0);

    // Prepare location details
    const locationDetails = divisionData.map((record: any) => ({
      office: record.floors?.offices?.office_name || 'Unknown',
      floor: record.floors?.floor_name || 'Unknown',
      lab: record.lab_name,
      bookedSeats: record.in_use || 0,
    })).sort((a, b) => {
      // Sort by office, then floor, then lab
      if (a.office !== b.office) return a.office.localeCompare(b.office);
      if (a.floor !== b.floor) return a.floor.localeCompare(b.floor);
      return a.lab.localeCompare(b.lab);
    });

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-600" />
              {managerDivision} - Location Breakdown
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Total Booked Seats:</span>
              <span className="px-3 py-1 rounded-full bg-blue-600 text-white font-medium">
                {totalBookedSeats}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {divisionData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Office Location</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Lab</TableHead>
                  <TableHead className="text-center">Booked Seats</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationDetails.map((location, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50">
                    <TableCell className="text-slate-700">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {location.office}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-400" />
                        {location.floor}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">{location.lab}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-orange-500 text-white text-sm font-medium">
                        {location.bookedSeats}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-slate-500">
              No workstation data available for {managerDivision} yet.
              <br />
              Contact your administrator to allocate workstations.
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Multiple divisions - show card-based display
  // Prepare data for each division
  const divisionsData = managerDivisions.map(division => {
    const divisionData = divisionRecords.filter(
      record => record.division === division
    );
    
    const totalBookedSeats = divisionData.reduce((sum, record) => sum + (record.in_use || 0), 0);
    
    const locationDetails = divisionData.map((record: any) => ({
      office: record.floors?.offices?.office_name || 'Unknown',
      floor: record.floors?.floor_name || 'Unknown',
      lab: record.lab_name,
      bookedSeats: record.in_use || 0,
    })).sort((a, b) => {
      if (a.office !== b.office) return a.office.localeCompare(b.office);
      if (a.floor !== b.floor) return a.floor.localeCompare(b.floor);
      return a.lab.localeCompare(b.lab);
    });

    return {
      division,
      totalBookedSeats,
      locationDetails,
      hasData: divisionData.length > 0
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          My Divisions - Location Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Division Cards */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {divisionsData.map(({ division, totalBookedSeats, hasData }) => (
              <div
                key={division}
                onClick={() => setExpandedDivision(expandedDivision === division ? null : division)}
                className={`cursor-pointer p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                  expandedDivision === division
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-1">
                  <Briefcase className={`w-4 h-4 ${
                    expandedDivision === division ? 'text-blue-600' : 'text-slate-500'
                  }`} />
                  <div className="w-full">
                    <p className="text-xs line-clamp-2 min-h-[2rem] leading-tight">{division}</p>
                    <div className={`mt-1 px-1.5 py-0.5 rounded text-center ${
                      expandedDivision === division ? 'bg-blue-600' : 'bg-blue-100'
                    }`}>
                      <p className={`text-xs ${
                        expandedDivision === division ? 'text-white' : 'text-blue-900'
                      }`}>
                        <strong className="text-sm">{totalBookedSeats}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expanded Division Details */}
          {expandedDivision && divisionsData.map(({ division, locationDetails, hasData }) => 
            expandedDivision === division && (
              <div key={division} className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-blue-600" />
                    {division} - Detailed Breakdown
                  </h3>
                  <button
                    onClick={() => setExpandedDivision(null)}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    Close ✕
                  </button>
                </div>
                {hasData ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white">
                        <TableHead>Office Location</TableHead>
                        <TableHead>Floor</TableHead>
                        <TableHead>Lab</TableHead>
                        <TableHead className="text-center">Booked Seats</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationDetails.map((location, idx) => (
                        <TableRow key={idx} className="bg-white">
                          <TableCell className="text-slate-700">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-400" />
                              {location.office}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-slate-400" />
                              {location.floor}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-700">{location.lab}</TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-orange-500 text-white text-sm font-medium">
                              {location.bookedSeats}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No workstation data available for {division} yet.
                    <br />
                    Contact your administrator to allocate workstations.
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}