'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CalendarClock, CheckCircle2, Clock, Phone, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function FollowUpsPage() {
  const [filter, setFilter] = useState<'today' | 'overdue' | 'upcoming'>('today');

  const { data: followUps, isLoading, refetch } = useQuery({
    queryKey: ['follow-ups', filter],
    queryFn: () => api.get<any[]>('/follow-ups', { type: filter }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/follow-ups/${id}/complete`),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Scheduled Follow-ups</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Callbacks, customer meetings, and re-engagement reminders
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'today'
                ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-subtle'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Today's Due
          </button>
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'overdue'
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-subtle'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'upcoming'
                ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-subtle'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 font-medium">Loading follow-ups...</div>
        ) : !followUps || followUps.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">All Caught Up!</p>
              <p className="text-xs font-medium text-slate-400 mt-0.5">No follow-ups currently scheduled for this view.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((item: any) => (
              <div
                key={item._id}
                className={`p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 transition-all ${
                  filter === 'overdue'
                    ? 'border-l-4 border-l-rose-500 bg-rose-50/15'
                    : filter === 'today'
                    ? 'border-l-4 border-l-amber-500 bg-amber-50/15'
                    : 'border-l-4 border-l-sky-500 bg-sky-50/15'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/leads/${item.leadId?._id || item.leadId}`}
                      className="font-bold text-sm text-slate-950 hover:text-sky-700 transition-colors"
                    >
                      {item.leadId?.name || 'Customer'}
                    </Link>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200/80 uppercase">
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{item.leadId?.phone}</span>
                    <span>•</span>
                    <span className="text-slate-700 font-semibold flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Scheduled: <b>{formatDate(item.scheduledAt)}</b>
                    </span>
                  </div>
                  {item.notes && <p className="text-xs text-slate-600 italic bg-white/70 p-2 rounded-lg border border-slate-200/50">"{item.notes}"</p>}
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    href={`/leads/${item.leadId?._id || item.leadId}`}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 shadow-subtle"
                  >
                    Open Lead
                  </Link>
                  <button
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate(item._id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-glow-emerald cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{completeMutation.isPending ? 'Marking...' : 'Mark Done'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
