'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  PhoneCall,
  Users,
  CheckCircle2,
  Zap,
  TrendingUp,
  Clock,
  Smartphone,
  Flame,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  const { user, isAdmin, isManager } = useAuth();

  const { data: adminData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<any>('/analytics/admin-dashboard'),
    enabled: isAdmin,
  });

  const { data: managerData } = useQuery({
    queryKey: ['manager-dashboard'],
    queryFn: () => api.get<any>('/analytics/manager-dashboard'),
    enabled: isManager,
  });

  const { data: employeeData } = useQuery({
    queryKey: ['my-performance'],
    queryFn: () => api.get<any>('/analytics/my-performance'),
    enabled: !isAdmin && !isManager,
  });

  const { data: queueProgress } = useQuery({
    queryKey: ['queue-progress'],
    queryFn: () => api.get<any>('/queue/progress'),
    enabled: !isAdmin,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-5 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950 text-white p-6 md:p-7 rounded-2xl shadow-card border border-slate-800/80">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30 tracking-wider">
              {isAdmin ? 'Executive Portal' : isManager ? 'Team Dashboard' : 'Telecaller Workspace'}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Dayaar Consultants</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-xs text-slate-300/90 font-medium max-w-xl">
            {isAdmin
              ? 'Organization Executive Overview & High-Velocity Telecalling Monitor'
              : isManager
              ? 'Sales Team Performance & Live Telecalling Activity'
              : `Daily 300-Call Quota & Telecalling Workspace (${user?.employeeCode})`}
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Link
            href="/queue"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-glow-emerald transition-all duration-200"
          >
            <Zap className="h-4 w-4 text-emerald-100" />
            <span>Launch High-Speed Queue</span>
          </Link>
        </div>
      </div>

      {/* 300 Target Progress Bar for Callers */}
      {queueProgress && (
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daily 300-Call Target Progress
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Auto-advances queue with single-click logging</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-black text-sky-800 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/60">
                {queueProgress.totalCallsMadeToday} / {queueProgress.dailyTarget} Calls ({queueProgress.progressPercentage}%)
              </span>
            </div>
          </div>

          {/* Progress Bar with milestone ticks */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${Math.min(100, queueProgress.progressPercentage)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono px-0.5">
              <span>0</span>
              <span>75</span>
              <span>150</span>
              <span>225</span>
              <span>300 Targets</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-900">Connected Calls</span>
              <span className="text-sm font-extrabold text-emerald-700">{queueProgress.connectedToday}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Remaining Today</span>
              <span className="text-sm font-extrabold text-slate-900">{queueProgress.remainingCalls}</span>
            </div>
            <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-900">Leads in Queue</span>
              <span className="text-sm font-extrabold text-sky-700">{queueProgress.pendingInQueue}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin KPI Grid */}
      {isAdmin && adminData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today Calls</span>
                <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
                  <PhoneCall className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-950 tracking-tight">{adminData.todayCallsTotal}</div>
              <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                {adminData.todayConnectedCalls} Connected ({adminData.conversionRatePercentage}%)
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Checked In</span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                  <Users className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-950 tracking-tight">{adminData.checkedInEmployeesCount}</div>
              <p className="text-xs text-slate-500 font-medium">
                Out of <b className="text-slate-800">{adminData.activeEmployeesCount}</b> total registered staff
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card hover:shadow-card-hover transition-all space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Devices Online</span>
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                  <Smartphone className="h-4 w-4" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-950 tracking-tight">{adminData.onlineDevicesCount}</div>
              <p className="text-xs text-slate-500 font-medium">Company Android SIM Gateways</p>
            </div>
          </div>

          {/* Top Performers Table */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today Leaderboard (Top Telecallers)</h3>
                <p className="text-xs text-slate-400 font-medium">Ranked by volume towards the daily 300 quota</p>
              </div>
              <span className="text-xs text-sky-800 font-bold bg-sky-50 border border-sky-200/80 px-2.5 py-1 rounded-lg">
                Live Daily Stats
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="pb-3">Rank & Employee</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Calls Made</th>
                    <th className="pb-3">Connected</th>
                    <th className="pb-3">Connection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminData.topPerformers?.map((p: any, idx: number) => {
                    const rate = p.callsMade > 0 ? Math.round((p.connectedCalls / p.callsMade) * 100) : 0;
                    return (
                      <tr key={p.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 font-bold text-slate-900 flex items-center gap-3">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-extrabold border ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-700 border-slate-300'
                                : idx === 2
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <span>{p.userName}</span>
                        </td>
                        <td className="py-3.5 font-mono text-slate-500 font-medium">{p.employeeCode}</td>
                        <td className="py-3.5 font-bold text-sky-800">{p.callsMade}</td>
                        <td className="py-3.5 font-bold text-emerald-700">{p.connectedCalls}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, rate)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-800">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manager KPI Grid */}
      {isManager && managerData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Size</span>
              <div className="text-2xl font-extrabold text-slate-950">{managerData.teamSize}</div>
              <p className="text-[11px] text-slate-500 font-medium">Active telecallers</p>
            </div>

            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Checked In</span>
              <div className="text-2xl font-extrabold text-emerald-600">{managerData.teamCheckedInCount}</div>
              <p className="text-[11px] text-slate-500 font-medium">At office today</p>
            </div>

            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Calls Today</span>
              <div className="text-2xl font-extrabold text-sky-800">{managerData.teamTodayCalls}</div>
              <p className="text-[11px] text-emerald-700 font-bold">{managerData.teamTodayConnected} connected</p>
            </div>

            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Devices Online</span>
              <div className="text-2xl font-extrabold text-purple-700">{managerData.teamOnlineDevicesCount}</div>
              <p className="text-[11px] text-slate-500 font-medium">Ready to call</p>
            </div>
          </div>
        </div>
      )}

      {/* Employee Personal Summary */}
      {!isAdmin && !isManager && employeeData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Calls Today</span>
            <div className="text-2xl font-extrabold text-slate-950">{employeeData.callsMadeToday}</div>
            <p className="text-[11px] text-emerald-700 font-bold">{employeeData.connectedToday} Connected</p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Leads</span>
            <div className="text-2xl font-extrabold text-sky-800">{employeeData.assignedLeadsCount}</div>
            <p className="text-[11px] text-slate-500 font-medium">Total in pipeline</p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Interested / Hot</span>
            <div className="text-2xl font-extrabold text-emerald-700">{employeeData.interestedCount}</div>
            <p className="text-[11px] text-amber-700 font-bold">{employeeData.hotCount} Hot Leads</p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Status</span>
            <div className="text-2xl font-extrabold text-slate-950">
              {employeeData.isCheckedIn ? (
                <span className="text-emerald-700 flex items-center gap-1.5 text-base font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Checked In
                </span>
              ) : (
                <span className="text-amber-700 text-base font-bold">Not Checked In</span>
              )}
            </div>
            <Link href="/attendance" className="text-[11px] text-sky-700 font-bold hover:underline">
              Manage Attendance
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
