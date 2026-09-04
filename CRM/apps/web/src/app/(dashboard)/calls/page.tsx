'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AudioPlayer } from '@/components/AudioPlayer';
import { PhoneCall, Phone, Clock, User, Calendar, Volume2, RefreshCw } from 'lucide-react';
import { formatDate, formatSecondsToTime } from '@/lib/utils';
import Link from 'next/link';
import { RecordingStatus } from '@dayaar/shared';
import { useAuth } from '@/context/AuthContext';

export default function CallHistoryPage() {
  const [page, setPage] = useState(1);
  const { isAdmin, isManager } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef(0);

  const { data: callData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['recent-calls', page],
    queryFn: () => api.get<any>('/calls', { page, limit: 25 }),
    refetchInterval: 10000, // Auto background sync every 10s
  });

  const calls = Array.isArray(callData) ? callData : callData?.data || [];
  const meta = Array.isArray(callData)
    ? { total: calls.length, totalPages: 1 }
    : callData?.meta || { total: 0, totalPages: 1 };

  const handleManualRefresh = async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) return; // 3s cooldown rate limit
    lastRefreshRef.current = now;
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recent-calls'] }),
      refetch(),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Telecalling Logs & Recordings</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time cellular call records, attempt counts, and signed audio playback
          </p>
        </div>

        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing || isLoading}
          title="Refresh Call History (3s cooldown)"
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-subtle disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || isRefetching ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
          <span>{isRefreshing || isRefetching ? 'Syncing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Lead Contact</th>
                <th className="p-4">Employee</th>
                <th className="p-4">Status & Outcome</th>
                <th className="p-4">Duration</th>
                <th className="p-4">Attempt Rule</th>
                <th className="p-4">Audio Recording</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    Loading call history...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-medium">
                    No calls logged yet. Start calling from the Daily Queue!
                  </td>
                </tr>
              ) : (
                calls.map((call: any) => (
                  <tr key={call._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      {call.leadId ? (
                        <Link
                          href={`/leads/${call.leadId._id || call.leadId}`}
                          className="font-bold text-slate-900 hover:text-sky-700 block transition-colors"
                        >
                          {call.leadId.name || 'Lead Contact'}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-900">Lead Contact</span>
                      )}
                      <span className="font-mono text-[11px] text-slate-500 font-medium">
                        {call.phoneNumber}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900">
                        {call.employeeId?.name || 'Caller'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono font-medium">
                        {call.employeeId?.employeeCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                          call.status === 'CONNECTED' || call.status === 'ANSWERED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : call.status === 'BUSY' || call.status === 'NO_ANSWER'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : call.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-sky-50 text-sky-800 border-sky-200'
                        }`}
                      >
                        {call.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      {formatSecondsToTime(call.duration || 0)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase border ${
                          call.countsAsAttempt
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {call.countsAsAttempt ? 'Counted' : 'Tech/Skip'}
                      </span>
                    </td>
                    <td className="p-4">
                      {(isAdmin || isManager) && call.recordingStatus === RecordingStatus.ARCHIVED ? (
                        <AudioPlayer
                          callAttemptId={call._id}
                          durationSeconds={call.duration}
                        />
                      ) : (isAdmin || isManager) && (call.recordingStatus === RecordingStatus.PENDING || call.recordingStatus === RecordingStatus.ARCHIVING) ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 animate-pulse">
                          ⏳ Syncing Audio...
                        </span>
                      ) : (isAdmin || isManager) && call.recordingStatus === RecordingStatus.FAILED ? (
                        <span className="text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Recording Failed</span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px] font-medium">No Recording</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px] font-medium">
                      {formatDate(call.callDate || call.dialedAt)}
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
