'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const invalidateAttendance = () => {
    queryClient.invalidateQueries({ queryKey: ['my-attendance-status'] });
    queryClient.invalidateQueries({ queryKey: ['my-attendance-history'] });
  };

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
      invalidateAttendance();
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
      invalidateAttendance();
    },
    onError: (err: any) => {
      setActionMessage({ type: 'error', text: err.message || 'Check-out rejected' });
    },
  });

  // Start Break Mutation
  const startBreakMutation = useMutation({
    mutationFn: () => {
      const reasonText =
        breakType === BreakType.LUNCH
          ? 'Lunch Break'
          : breakType === BreakType.TEA
          ? 'Tea Break'
          : 'Short Break';
      return api.post('/attendance/break/start', { reason: reasonText });
    },
    onSuccess: () => {
      setActionMessage({ type: 'success', text: `Started ${breakType} break.` });
      invalidateAttendance();
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
      invalidateAttendance();
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
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Attendance & Shift Tracker</h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Server-side Haversine geofenced check-in, check-out, and break session logs
        </p>
      </div>

      {isAdmin ? (
        <div className="p-10 bg-white border border-slate-200/80 rounded-2xl shadow-card text-center space-y-4 max-w-2xl mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/60 mx-auto">
            <Clock className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-950">
              Attendance tracking is for employees &amp; managers
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 font-medium">
              You are signed in as an administrator. Review every employee's attendance, shift hours, breaks, and check-in locations from the Org Attendance screen.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/admin/attendance"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-bold text-xs shadow-subtle transition-all"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Open Org Attendance Logs</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {actionMessage && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 shadow-subtle ${
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
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Today's Shift Status</h3>
                </div>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase border ${
                    isCheckedIn
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {isCheckedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                </span>
              </div>

              <div className="p-4 bg-slate-50/80 border border-slate-200/70 rounded-xl space-y-2.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Check-in Time:</span>
                  <b className="text-slate-900">{record ? formatDate(record.checkInAt) : '-'}</b>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-slate-500">Geofence Verification:</span>
                  <span
                    className={`font-bold flex items-center gap-1.5 ${
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
                  <span className="font-medium text-slate-500">Check-out Time:</span>
                  <b className="text-slate-900">{record?.checkOutAt ? formatDate(record.checkOutAt) : 'Active Shift'}</b>
                </div>
              </div>

              <div className="pt-1">
                {!isCheckedIn ? (
                  <button
                    type="button"
                    disabled={checkInMutation.isPending}
                    onClick={() => checkInMutation.mutate()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-glow-emerald transition-all cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{checkInMutation.isPending ? 'Verifying GPS...' : 'Check In (Office Geofence)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={checkOutMutation.isPending}
                    onClick={() => checkOutMutation.mutate()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white rounded-xl font-bold text-xs shadow-subtle transition-all cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{checkOutMutation.isPending ? 'Checking Out...' : 'Check Out of Shift'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Break Sessions Card */}
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                    <Coffee className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Break Management</h3>
                </div>
                <span
                  className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase border ${
                    activeBreak ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {activeBreak ? `ON ${activeBreak.type} BREAK` : 'WORKING'}
                </span>
              </div>

              {activeBreak ? (
                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <Timer className="h-4 w-4 text-amber-700" />
                    <span>Currently on {activeBreak.type} Break</span>
                  </div>
                  <p className="text-xs text-amber-800 font-medium">
                    Started at: <b>{formatDate(activeBreak.startTime)}</b>
                  </p>
                  <button
                    type="button"
                    disabled={endBreakMutation.isPending}
                    onClick={() => endBreakMutation.mutate()}
                    className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold text-xs shadow-subtle transition-all cursor-pointer"
                  >
                    {endBreakMutation.isPending ? 'Ending Break...' : 'End Break & Resume Shift'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Break Type</label>
                    <select
                      value={breakType}
                      onChange={(e) => setBreakType(e.target.value as BreakType)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 cursor-pointer"
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
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-950 disabled:opacity-40 text-white rounded-xl font-bold text-xs shadow-subtle transition-all cursor-pointer"
                  >
                    <Coffee className="h-4 w-4" />
                    <span>{startBreakMutation.isPending ? 'Starting...' : 'Start Break Session'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attendance History Table */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Attendance History Logs</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
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
                    <tr key={h._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 font-bold text-slate-900">{h.date}</td>
                      <td className="py-3.5 font-mono text-slate-600 font-medium">{formatDate(h.checkInAt, 'hh:mm a')}</td>
                      <td className="py-3.5 font-mono text-slate-600 font-medium">
                        {h.checkOutAt ? formatDate(h.checkOutAt, 'hh:mm a') : <span className="text-emerald-700 font-bold">Active</span>}
                      </td>
                      <td className="py-3.5 font-extrabold text-slate-950">
                        {h.totalWorkingSeconds
                          ? `${Math.floor(h.totalWorkingSeconds / 3600)}h ${Math.floor((h.totalWorkingSeconds % 3600) / 60)}m`
                          : '-'}
                      </td>
                      <td className="py-3.5 font-mono font-semibold text-amber-700">
                        {h.totalBreakSeconds ? `${Math.round(h.totalBreakSeconds / 60)} mins` : '0 mins'}
                      </td>
                      <td className="py-3.5">
                        {h.checkInLocation ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Inside Office ({Math.round(h.checkInLocation.distanceFromOfficeMeters)}m)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
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
