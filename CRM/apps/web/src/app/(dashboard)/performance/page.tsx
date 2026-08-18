'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  PhoneCall,
  TrendingUp,
  Award,
  Zap,
  Clock,
  Target,
  Flame,
} from 'lucide-react';
import { formatSecondsToTime } from '@/lib/utils';

export default function PerformancePage() {
  const { user, isAdmin, isManager } = useAuth();

  const { data: myPerf, isLoading } = useQuery({
    queryKey: ['my-detailed-performance'],
    queryFn: () => api.get<any>('/analytics/my-performance'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Performance Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Call volume velocity, 300-daily quota attainment, and lead conversion rates
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading metrics...</div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Calls Today</span>
                <PhoneCall className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{myPerf?.callsMadeToday}</div>
              <p className="text-[11px] text-slate-500">Target: 300 calls/day</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Connected</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-600">{myPerf?.connectedToday}</div>
              <p className="text-[11px] text-emerald-700 font-semibold">
                {myPerf?.callsMadeToday > 0
                  ? Math.round((myPerf.connectedToday / myPerf.callsMadeToday) * 100)
                  : 0}
                % Connection Rate
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Hot Prospects</span>
                <Flame className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-600">{myPerf?.hotCount}</div>
              <p className="text-[11px] text-slate-500">High purchase intent</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Follow-ups Due</span>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-600">{myPerf?.followUpCount}</div>
              <p className="text-[11px] text-slate-500">Scheduled callbacks</p>
            </div>
          </div>

          {/* Detailed Pipeline Breakdown */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Lead Pipeline Distribution</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 text-center">
                <span className="text-xs font-bold text-sky-800 uppercase">Assigned Leads</span>
                <div className="text-2xl font-black text-sky-900 mt-1">{myPerf?.assignedLeadsCount}</div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <span className="text-xs font-bold text-emerald-800 uppercase">Interested</span>
                <div className="text-2xl font-black text-emerald-900 mt-1">{myPerf?.interestedCount}</div>
              </div>

              <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 text-center">
                <span className="text-xs font-bold text-rose-800 uppercase">Hot Buyers</span>
                <div className="text-2xl font-black text-rose-900 mt-1">{myPerf?.hotCount}</div>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                <span className="text-xs font-bold text-amber-800 uppercase">Follow-up Callbacks</span>
                <div className="text-2xl font-black text-amber-900 mt-1">{myPerf?.followUpCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
