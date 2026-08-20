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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight">
            Welcome back, {user?.name}!
          </h2>
          <p className="text-xs text-sky-200">
            {isAdmin
              ? 'Organization Executive Overview & High-Velocity Telecalling Monitor'
              : isManager
              ? 'Sales Team Performance & Live Telecalling Activity'
              : `Daily 300-Call Quota & Telecalling Workspace (${user?.employeeCode})`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/queue"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-colors"
          >
            <Zap className="h-4 w-4" />
            <span>Launch High-Speed Queue</span>
          </Link>
        </div>
      </div>

      {/* 300 Target Progress Bar for Callers */}
      {queueProgress && (
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Daily 300-Call Target Progress
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-sky-700">
              {queueProgress.totalCallsMadeToday} / {queueProgress.dailyTarget} Calls ({queueProgress.progressPercentage}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, queueProgress.progressPercentage)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Connected: <b className="text-emerald-700">{queueProgress.connectedToday}</b>
            </span>
            <span>
              Remaining Today: <b className="text-slate-800">{queueProgress.remainingCalls}</b>
            </span>
            <span>
              Leads in Queue: <b className="text-sky-700">{queueProgress.pendingInQueue}</b>
            </span>
          </div>
        </div>
      )}

      {/* Admin KPI Grid */}
      {isAdmin && adminData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Today Calls</span>
                <PhoneCall className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{adminData.todayCallsTotal}</div>
              <p className="text-[11px] text-emerald-600 font-medium">
                {adminData.todayConnectedCalls} Connected ({adminData.conversionRatePercentage}%)
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Staff Checked In</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{adminData.checkedInEmployeesCount}</div>
              <p className="text-[11px] text-slate-500 font-medium">
                Out of {adminData.activeEmployeesCount} total staff
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Devices Online</span>
                <Smartphone className="h-4 w-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{adminData.onlineDevicesCount}</div>
              <p className="text-[11px] text-slate-500 font-medium">Company Android Gateways</p>
            </div>

          </div>

          {/* Top Performers Table */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Today Leaderboard (Top Telecallers)</h3>
              <span className="text-xs text-slate-500 font-medium">High Volume 300 Targets</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Calls Made</th>
                    <th className="pb-3">Connected</th>
                    <th className="pb-3">Connection Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminData.topPerformers?.map((p: any, idx: number) => (
                    <tr key={p.userId} className="hover:bg-slate-50">
                      <td className="py-3 font-bold text-slate-800 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                          {idx + 1}
                        </span>
                        <span>{p.userName}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-500">{p.employeeCode}</td>
                      <td className="py-3 font-bold text-sky-700">{p.callsMade}</td>
                      <td className="py-3 font-semibold text-emerald-700">{p.connectedCalls}</td>
                      <td className="py-3 font-bold text-slate-700">
                        {p.callsMade > 0 ? Math.round((p.connectedCalls / p.callsMade) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
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
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Team Size</span>
              <div className="text-2xl font-black text-slate-900">{managerData.teamSize}</div>
              <p className="text-[11px] text-slate-500">Active telecallers</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Team Checked In</span>
              <div className="text-2xl font-black text-emerald-600">{managerData.teamCheckedInCount}</div>
              <p className="text-[11px] text-slate-500">At office today</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Team Calls Today</span>
              <div className="text-2xl font-black text-sky-700">{managerData.teamTodayCalls}</div>
              <p className="text-[11px] text-emerald-600 font-semibold">{managerData.teamTodayConnected} connected</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">Devices Online</span>
              <div className="text-2xl font-black text-purple-700">{managerData.teamOnlineDevicesCount}</div>
              <p className="text-[11px] text-slate-500">Ready to call</p>
            </div>
          </div>
        </div>
      )}

      {/* Employee Personal Summary */}
      {!isAdmin && !isManager && employeeData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase">Calls Today</span>
            <div className="text-2xl font-black text-slate-900">{employeeData.callsMadeToday}</div>
            <p className="text-[11px] text-emerald-600 font-semibold">{employeeData.connectedToday} Connected</p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase">Assigned Leads</span>
            <div className="text-2xl font-black text-sky-700">{employeeData.assignedLeadsCount}</div>
            <p className="text-[11px] text-slate-500">Total in pipeline</p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase">Interested / Hot</span>
            <div className="text-2xl font-black text-emerald-700">{employeeData.interestedCount}</div>
            <p className="text-[11px] text-amber-600 font-semibold">{employeeData.hotCount} Hot Leads</p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase">Attendance Status</span>
            <div className="text-2xl font-black text-slate-900">
              {employeeData.isCheckedIn ? (
                <span className="text-emerald-600 flex items-center gap-1.5 text-lg">
                  <CheckCircle2 className="h-5 w-5" /> Checked In
                </span>
              ) : (
                <span className="text-amber-600 text-lg">Not Checked In</span>
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
