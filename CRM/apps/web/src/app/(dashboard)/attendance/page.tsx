'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  Clock,
  MapPin,
  Coffee,
  CheckCircle2,
  AlertCircle,
  LogOut,
  LogIn,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { formatDate, formatSecondsToTime } from '@/lib/utils';
import { BreakType } from '@dayaar/shared';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const [gpsError, setGpsError] = useState('');
  const [breakType, setBreakType] = useState<BreakType>(BreakType.LUNCH);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch today's attendance status
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['my-attendance-status'],
    queryFn: () => api.get<any>('/attendance/today'),
  });

  // Fetch my attendance history
  const { data: historyData } = useQuery({
    queryKey: ['my-attendance-history'],
    queryFn: () => api.get<any[]>('/attendance/history'),
  });

  const getCoordinates = (): Promise<{ latitude: number; longitude: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          // If browser blocks GPS or dev testing, allow fallback to office coordinates for demo convenience
          reject(new Error(`GPS Error: ${err.message}. Please enable location permissions.`));
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  };

  // Check In Mutation — real GPS only, no fallback coordinates.
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const coords = await getCoordinates();
      return api.post('/attendance/check-in', coords);
    },
    onSuccess: (data: any) => {
      setActionMessage({ type: 'success', text: 'Checked in successfully within organization geofence!' });
      refetch();
    },
    onError: (err: any) => {
      setActionMessage({ type: 'error', text: err.message || 'Check-in rejected' });
    },
  });

  // Check Out Mutation — real GPS only, no fallback coordinates.
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const coords = await getCoordinates();
      return api.post('/attendance/check-out', coords);
    },
    onSuccess: () => {
      setActionMessage({ type: 'success', text: 'Checked out successfully.' });
      refetch();
    },
    onError: (err: any) => {
      setActionMessage({ type: 'error', text: err.message || 'Check-out rejected' });
    },
  });

  // Start Break Mutation
  const startBreakMutation = useMutation({
    mutationFn: () => api.post('/attendance/break/start', { type: breakType }),
    onSuccess: () => {
      setActionMessage({ type: 'success', text: `Started ${breakType} break.` });
      refetch();
    },
    onError: (err: any) => {
      setActionMessage({ type: 'error', text: err.message || 'Could not start break' });
    },
  });

  // End Break Mutation
  const endBreakMutation = useMutation({
    mutationFn: () => api.post('/attendance/break/end'),
    onSuccess: () => {
      setActionMessage({ type: 'success', text: 'Resumed work from break.' });
      refetch();
    },
    onError: (err: any) => {
      setActionMessage({ type: 'error', text: err.message || 'Could not end break' });
    },
  });

  const record = statusData?.record;
  const isCheckedIn = !!record && !record.checkOutTime;
  const activeBreak = statusData?.activeBreak;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Attendance & Shift Tracker</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Server-side Haversine geofenced check-in, check-out, and break session logs
        </p>
      </div>

      {isAdmin ? (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-3">
          <Clock className="h-10 w-10 text-slate-300 mx-auto" />
          <h2 className="text-lg font-black text-slate-900">
            Attendance tracking is for employees &amp; managers
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You are signed in as an administrator, so there is no personal clock-in here. Review
            every employee's attendance, shift hours, breaks and check-in locations for any date
            from the Org Attendance Logs screen.
          </p>
          <Link
            href="/admin/attendance"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            Open Org Attendance Logs
          </Link>
        </div>
      ) : (
        <>
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          )}
          <span className="font-semibold">{actionMessage.text}</span>
        </div>
      )}

      {/* Main Shift Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Card */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-sky-700" />
              <h3 className="text-sm font-bold text-slate-900">Today's Shift Status</h3>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isCheckedIn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {isCheckedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Check-in Time:</span>
              <b className="text-slate-800">{record ? formatDate(record.checkInAt) : '-'}</b>
            </div>
            <div className="flex justify-between">
              <span>Geofence Verification:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  record?.checkInLocation ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {record?.checkInLocation ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Inside Office ({Math.round(record.checkInLocation.distanceFromOfficeMeters)}m)
                  </>
                ) : (
                  'Pending'
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Check-out Time:</span>
              <b className="text-slate-800">{record?.checkOutAt ? formatDate(record.checkOutAt) : 'Active Shift'}</b>
            </div>
          </div>

          <div className="flex gap-3">
            {!isCheckedIn ? (
              <button
                type="button"
                disabled={checkInMutation.isPending}
                onClick={() => checkInMutation.mutate()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>{checkInMutation.isPending ? 'Verifying GPS...' : 'Check In (Office Geofence)'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={checkOutMutation.isPending}
                onClick={() => checkOutMutation.mutate()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>{checkOutMutation.isPending ? 'Checking Out...' : 'Check Out of Shift'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Break Sessions Card */}
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee className="h-5 w-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Break Management</h3>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                activeBreak ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {activeBreak ? `ON ${activeBreak.type} BREAK` : 'WORKING'}
            </span>
          </div>

          {activeBreak ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Timer className="h-4 w-4 text-amber-700" />
                <span>Currently on {activeBreak.type} Break</span>
              </div>
              <p className="text-xs text-amber-800">
                Started at: <b>{formatDate(activeBreak.startTime)}</b>
              </p>
              <button
                type="button"
                disabled={endBreakMutation.isPending}
                onClick={() => endBreakMutation.mutate()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow transition-colors"
              >
                {endBreakMutation.isPending ? 'Ending Break...' : 'End Break & Resume Shift'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Break Type</label>
                <select
                  value={breakType}
                  onChange={(e) => setBreakType(e.target.value as BreakType)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                >
                  <option value={BreakType.LUNCH}>Lunch Break</option>
                  <option value={BreakType.TEA}>Tea / Refreshment Break</option>
                  <option value={BreakType.MEETING}>Internal Training / Meeting</option>
                  <option value={BreakType.PERSONAL}>Personal Break</option>
                </select>
              </div>

              <button
                type="button"
                disabled={!isCheckedIn || startBreakMutation.isPending}
                onClick={() => startBreakMutation.mutate()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow transition-colors"
              >
                <Coffee className="h-4 w-4" />
                <span>{startBreakMutation.isPending ? 'Starting...' : 'Start Break Session'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Attendance History Logs</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase">
                <th className="pb-3">Date</th>
                <th className="pb-3">Check In</th>
                <th className="pb-3">Check Out</th>
                <th className="pb-3">Total Shift Hours</th>
                <th className="pb-3">Total Break (Mins)</th>
                <th className="pb-3">Geofence Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyData?.map((h: any) => (
                <tr key={h._id} className="hover:bg-slate-50">
                  <td className="py-3 font-semibold text-slate-800">{h.date}</td>
                  <td className="py-3 font-mono">{formatDate(h.checkInAt, 'hh:mm a')}</td>
                  <td className="py-3 font-mono">
                    {h.checkOutAt ? formatDate(h.checkOutAt, 'hh:mm a') : 'Active'}
                  </td>
                  <td className="py-3 font-bold text-slate-900">
                    {h.totalWorkingSeconds
                      ? `${Math.floor(h.totalWorkingSeconds / 3600)}h ${Math.floor((h.totalWorkingSeconds % 3600) / 60)}m`
                      : '-'}
                  </td>
                  <td className="py-3 font-mono text-amber-700">
                    {h.totalBreakSeconds ? `${Math.round(h.totalBreakSeconds / 60)} mins` : '0 mins'}
                  </td>
                  <td className="py-3">
                    {h.checkInLocation ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Inside Office ({Math.round(h.checkInLocation.distanceFromOfficeMeters)}m)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                        No GPS
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
