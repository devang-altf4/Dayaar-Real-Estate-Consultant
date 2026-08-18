'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AudioPlayer } from '@/components/AudioPlayer';
import { PhoneCall, Phone, Clock, User, Calendar, Volume2 } from 'lucide-react';
import { formatDate, formatSecondsToTime } from '@/lib/utils';
import Link from 'next/link';

export default function CallHistoryPage() {
  const [page, setPage] = useState(1);

  const { data: callData, isLoading } = useQuery({
    queryKey: ['recent-calls', page],
    queryFn: () => api.get<any>('/calls/recent', { page, limit: 25 }),
  });

  const calls = callData?.data || [];
  const meta = callData?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Telecalling Logs & Recordings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time cellular call records, attempt counts, and signed audio playback
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
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
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading call history...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No calls logged yet. Start calling from the Daily Queue!
                  </td>
                </tr>
              ) : (
                calls.map((call: any) => (
                  <tr key={call._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      {call.leadId ? (
                        <Link
                          href={`/leads/${call.leadId._id || call.leadId}`}
                          className="font-bold text-slate-900 hover:text-sky-700 block"
                        >
                          {call.leadId.name || 'Lead Contact'}
                        </Link>
                      ) : (
                        <span className="font-bold text-slate-900">Lead Contact</span>
                      )}
                      <span className="font-mono text-[11px] text-slate-500">
                        {call.phoneNumberDialed}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-800">
                        {call.employeeId?.name || 'Caller'}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {call.employeeId?.employeeCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-sky-800 border border-sky-200">
                        {call.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      {formatSecondsToTime(call.durationSeconds || 0)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          call.countsAsAttempt
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {call.countsAsAttempt ? 'Counted' : 'Tech/Skip'}
                      </span>
                    </td>
                    <td className="p-4">
                      {call.recordingStatus === 'AVAILABLE' ? (
                        <AudioPlayer
                          callAttemptId={call._id}
                          durationSeconds={call.durationSeconds}
                        />
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No Recording</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {formatDate(call.startedAt)}
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
