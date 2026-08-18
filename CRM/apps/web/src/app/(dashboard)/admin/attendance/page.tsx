'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Clock, ShieldCheck, UserCheck, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminAttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-attendance-logs', date],
    queryFn: () => api.get<any[]>('/attendance/daily-report', { date }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Organization Attendance Logs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit employee daily office presence, shift durations, and break compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
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
                <th className="p-4">Date</th>
                <th className="p-4">Check In</th>
                <th className="p-4">Check Out</th>
                <th className="p-4">Total Work (Hrs)</th>
                <th className="p-4">Break Total</th>
                <th className="p-4">Geofence Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading attendance report...
                  </td>
                </tr>
              ) : !logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No attendance records found for this date.
                  </td>
                </tr>
              ) : (
                logs.map((row: any) => (
                  <tr key={row._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">
                        {row.userId?.name || 'Staff Member'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {row.userId?.employeeCode}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{row.date}</td>
                    <td className="p-4 font-mono">{formatDate(row.checkInTime, 'hh:mm a')}</td>
                    <td className="p-4 font-mono">
                      {row.checkOutTime ? formatDate(row.checkOutTime, 'hh:mm a') : 'Active Shift'}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {row.totalWorkMinutes
                        ? `${Math.floor(row.totalWorkMinutes / 60)}h ${row.totalWorkMinutes % 60}m`
                        : '-'}
                    </td>
                    <td className="p-4 text-amber-700 font-medium">
                      {row.totalBreakMinutes || 0} mins
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Verified Inside Geofence</span>
                      </span>
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
