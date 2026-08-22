'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Clock, MapPin, ShieldCheck, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface DailyReportRow {
  _id: string;
  date: string;
  checkInAt: string;
  checkOutAt: string | null;
  totalWorkingSeconds: number;
  totalBreakSeconds: number;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceFromOfficeMeters: number;
  } | null;
  checkOutLocation?: {
    distanceFromOfficeMeters: number;
  } | null;
  employeeId?: {
    name?: string;
    email?: string;
    employeeCode?: string;
  } | null;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export default function AdminAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ['admin-attendance-logs', date],
    queryFn: () =>
      api.get<{ date: string; totalRecords: number; records: DailyReportRow[] }>(
        '/attendance/daily-report',
        { date },
      ),
  });

  const logs = report?.records ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Organization Attendance Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit employee daily office presence, shift durations, break compliance and check-in
            locations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4">Total Work</th>
                <th className="p-4">Break Total</th>
                <th className="p-4">Check-in Location</th>
                <th className="p-4">Geofence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading attendance report...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No attendance records found for this date.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-300" />
                        {row.employeeId?.name || 'Unknown'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {row.employeeId?.employeeCode || row.employeeId?.email || ''}
                      </span>
                    </td>
                    <td className="p-4 font-mono">{formatDate(row.checkInAt, 'hh:mm a')}</td>
                    <td className="p-4 font-mono">
                      {row.checkOutAt ? formatDate(row.checkOutAt, 'hh:mm a') : 'Active Shift'}
                    </td>
                    <td className="p-4 font-bold text-slate-900">{formatDuration(row.totalWorkingSeconds)}</td>
                    <td className="p-4 text-amber-700 font-medium">
                      {row.totalBreakSeconds ? `${Math.round(row.totalBreakSeconds / 60)} mins` : '0 mins'}
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">
                      {row.checkInLocation ? (
                        <a
                          href={`https://www.google.com/maps?q=${row.checkInLocation.latitude},${row.checkInLocation.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-900 underline decoration-dotted"
                        >
                          <MapPin className="h-3 w-3" />
                          {row.checkInLocation.latitude.toFixed(5)}, {row.checkInLocation.longitude.toFixed(5)}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-4">
                      {row.checkInLocation &&
                      row.checkInLocation.distanceFromOfficeMeters != null ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          <ShieldCheck className="h-3 w-3" />
                          Inside ({Math.round(row.checkInLocation.distanceFromOfficeMeters)}m)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          No GPS
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
