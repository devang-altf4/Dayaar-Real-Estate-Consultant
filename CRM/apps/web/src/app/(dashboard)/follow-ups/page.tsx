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
    queryFn: () => api.get<any[]>('/follow-ups', { filter }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/follow-ups/${id}/complete`),
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Scheduled Follow-ups</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Callbacks, customer meetings, and re-engagement reminders
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'today' ? 'bg-sky-700 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Today's Due
          </button>
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'overdue' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Overdue
          </button>
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filter === 'upcoming' ? 'bg-sky-700 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Upcoming
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading follow-ups...</div>
        ) : !followUps || followUps.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold">No follow-ups currently scheduled for this view.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {followUps.map((item: any) => (
              <div key={item._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leads/${item.leadId?._id || item.leadId}`}
                      className="font-bold text-sm text-slate-900 hover:text-sky-700"
                    >
                      {item.leadId?.name || 'Customer'}
                    </Link>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">{item.leadId?.phone}</span>
                    <span>•</span>
                    <span className="text-slate-700 font-medium">
                      Scheduled: <b>{formatDate(item.scheduledAt)}</b>
                    </span>
                  </div>
                  {item.notes && <p className="text-xs text-slate-600 italic mt-1">"{item.notes}"</p>}
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/leads/${item.leadId?._id || item.leadId}`}
                    className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-bold transition-colors"
                  >
                    Open Lead
                  </Link>
                  <button
                    type="button"
                    disabled={completeMutation.isPending}
                    onClick={() => completeMutation.mutate(item._id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Mark Done
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
