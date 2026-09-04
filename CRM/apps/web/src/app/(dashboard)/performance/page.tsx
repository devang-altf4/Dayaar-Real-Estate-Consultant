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
  Users,
  CheckCircle2,
  Timer,
  Sparkles,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { formatSecondsToTime } from '@/lib/utils';

export default function PerformancePage() {
  const { user, isAdmin, isManager } = useAuth();

  const { data: myPerf, isLoading } = useQuery({
    queryKey: ['my-detailed-performance'],
    queryFn: () => api.get<any>('/analytics/my-performance'),
  });

  const { data: managerData } = useQuery({
    queryKey: ['manager-performance'],
    queryFn: () => api.get<any>('/analytics/manager-dashboard'),
    enabled: Boolean(isAdmin || isManager),
  });

  const dailyTarget = myPerf?.dailyTarget || 300;
  const callsMade = myPerf?.callsMadeToday || 0;
  const connected = myPerf?.connectedToday || 0;
  const connectionRate =
    myPerf?.connectionRate !== undefined
      ? myPerf.connectionRate
      : callsMade > 0
      ? Math.round((connected / callsMade) * 100)
      : 0;
  const targetPct = Math.min(100, Math.round((callsMade / dailyTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Performance Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
              <Sparkles className="w-3 h-3 text-sky-500" />
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time call velocity, 300-daily quota pacing, and conversion benchmarks
          </p>
        </div>

        {myPerf?.isCheckedIn !== undefined && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                myPerf.isCheckedIn
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  myPerf.isCheckedIn ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {myPerf.isCheckedIn ? 'Shift Active (Checked In)' : 'Shift Inactive'}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-white rounded-2xl border border-slate-200/80 animate-pulse p-6"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quota Velocity Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-navy-950 text-white p-6 md:p-8 shadow-card border border-slate-800">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-gold-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Daily Quota Pacing
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-extrabold text-white font-display">
                      {callsMade}
                    </span>
                    <span className="text-lg font-medium text-slate-400">/ {dailyTarget} Target Calls</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-right">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Quota Attainment
                    </div>
                    <div className="text-xl font-bold text-gold-400 font-display">
                      {targetPct}%
                    </div>
                  </div>

                  <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-right">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Remaining
                    </div>
                    <div className="text-xl font-bold text-white font-display">
                      {Math.max(0, dailyTarget - callsMade)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Track */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 transition-all duration-700 shadow-sm"
                    style={{ width: `${targetPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-slate-400">
                  <span>0 calls (Shift Start)</span>
                  <span>75 (25%)</span>
                  <span>150 (Midday Milestone)</span>
                  <span>225 (75%)</span>
                  <span className="text-gold-400 font-semibold">300 (Daily Goal)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* Total Calls Today */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Calls Placed
                </span>
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                  <PhoneCall className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-display">
                {callsMade}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Standard: 300 calls / shift
              </p>
            </div>

            {/* Connected Calls */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Connected
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-emerald-600 font-display">
                {connected}
              </div>
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                {connectionRate}% Connection Rate
              </p>
            </div>

            {/* Total Talk Time */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Talk Time
                </span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                  <Timer className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-display">
                {formatSecondsToTime(myPerf?.totalDurationSeconds || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Across all live discussions
              </p>
            </div>

            {/* Average Duration */}
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
              <div className="flex items-center justify-between text-slate-400 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Avg Talk Time
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 font-display">
                {formatSecondsToTime(myPerf?.avgCallDurationSeconds || 0)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Per connected engagement
              </p>
            </div>
          </div>

          {/* Lead Pipeline & Temperature Distribution */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Lead Portfolio & Temperature Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Breakdown of client leads assigned to your direct pipeline
                </p>
              </div>
              <div className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
                {myPerf?.assignedLeadsCount ?? 0} Total Active Leads
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Hot Buyers */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-rose-50/80 to-white border border-rose-200/80 shadow-xs hover:border-rose-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Hot Buyers
                  </span>
                  <Flame className="w-4 h-4 text-rose-500" />
                </div>
                <div className="text-3xl font-extrabold text-rose-600 font-display mt-2">
                  {myPerf?.hotCount ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  High purchase intent
                </p>
              </div>

              {/* Warm Prospects */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-amber-50/80 to-white border border-amber-200/80 shadow-xs hover:border-amber-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                    Warm Prospects
                  </span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-amber-600 font-display mt-2">
                  {myPerf?.warmCount ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nurturing & evaluating
                </p>
              </div>

              {/* Interested Status */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-50/80 to-white border border-emerald-200/80 shadow-xs hover:border-emerald-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Interested
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-600 font-display mt-2">
                  {myPerf?.interestedCount ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Site visit or qualification
                </p>
              </div>

              {/* Cold Leads */}
              <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50/80 to-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Cold Leads
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-3xl font-extrabold text-slate-700 font-display mt-2">
                  {myPerf?.coldCount ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Early discovery or queued
                </p>
              </div>
            </div>
          </div>

          {/* Manager & Admin Team Operations Section */}
          {(isAdmin || isManager) && managerData && (
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-600" />
                    <h3 className="text-base font-bold text-slate-900 font-display">
                      Team Operations Overview
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live supervision for your assigned consultant group
                  </p>
                </div>
                <span className="px-3 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold border border-sky-100 self-start sm:self-auto">
                  {managerData.teamSize ?? 0} Team Members
                </span>
              </div>

              {/* Team KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50/70 border border-slate-200/60 rounded-xl">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    Team Size
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900 font-display mt-1">
                    {managerData.teamSize ?? 0}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-xl">
                  <span className="text-xs font-semibold text-emerald-700 uppercase">
                    Checked In
                  </span>
                  <div className="text-2xl font-extrabold text-emerald-700 font-display mt-1">
                    {managerData.teamCheckedInCount ?? 0}
                  </div>
                </div>

                <div className="p-4 bg-sky-50/70 border border-sky-200/60 rounded-xl">
                  <span className="text-xs font-semibold text-sky-700 uppercase">
                    Team Calls Today
                  </span>
                  <div className="text-2xl font-extrabold text-sky-700 font-display mt-1">
                    {managerData.teamTodayCalls ?? 0}
                  </div>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200/60 rounded-xl">
                  <span className="text-xs font-semibold text-purple-700 uppercase">
                    Team Connected
                  </span>
                  <div className="text-2xl font-extrabold text-purple-700 font-display mt-1">
                    {managerData.teamTodayConnected ?? 0}
                  </div>
                </div>
              </div>

              {/* Team Members Telemetry Table */}
              {managerData.teamMembers && managerData.teamMembers.length > 0 && (
                <div className="overflow-hidden border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Consultant</th>
                        <th className="px-4 py-3">Employee Code</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Calls Today</th>
                        <th className="px-4 py-3 text-right">Connected</th>
                        <th className="px-4 py-3 text-right">Connection %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {managerData.teamMembers.map((member: any) => {
                        const mRate =
                          member.callsToday > 0
                            ? Math.round((member.connectedToday / member.callsToday) * 100)
                            : 0;

                        return (
                          <tr key={member.userId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {member.userName}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-500">
                              {member.employeeCode || '—'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  member.isCheckedIn
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {member.isCheckedIn ? 'On Duty' : 'Offline'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              {member.callsToday}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-600">
                              {member.connectedToday}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-700">
                              {mRate}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

