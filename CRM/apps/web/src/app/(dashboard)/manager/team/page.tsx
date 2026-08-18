'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Smartphone,
  PhoneCall,
  CheckCircle2,
  Clock,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { DeviceStatus } from '@dayaar/shared';

export default function ManagerTeamPage() {
  const { user } = useAuth();

  const { data: managerData, isLoading } = useQuery({
    queryKey: ['manager-team-activity'],
    queryFn: () => api.get<any>('/analytics/manager-dashboard'),
  });

  const team = managerData?.teamActivity || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Team Live Calling Monitor</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time visibility into employee attendance, Android gateway connectivity, and daily call pacing
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Shift Attendance</th>
                <th className="p-4">Android Device</th>
                <th className="p-4">Calls Made Today</th>
                <th className="p-4">Connected Calls</th>
                <th className="p-4">300 Target Quota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading team activity...
                  </td>
                </tr>
              ) : team.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No team members found under your management.
                  </td>
                </tr>
              ) : (
                team.map((member: any) => {
                  const progress = Math.min(100, Math.round((member.callsMadeToday / 300) * 100));
                  return (
                    <tr key={member.userId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{member.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {member.employeeCode} • {member.email}
                        </span>
                      </td>
                      <td className="p-4">
                        {member.isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Checked In</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not Checked In</span>
                        )}
                      </td>
                      <td className="p-4">
                        {member.device ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                member.device.status === DeviceStatus.ONLINE
                                  ? 'bg-emerald-500'
                                  : member.device.status === DeviceStatus.STALE
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            <span className="font-semibold text-slate-800">
                              {member.device.deviceName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-rose-600 font-medium">No Device</span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-sky-700">{member.callsMadeToday}</td>
                      <td className="p-4 font-bold text-emerald-700">{member.connectedCallsToday}</td>
                      <td className="p-4 w-48">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500">
                            <span>{member.callsMadeToday}/300</span>
                            <span className="font-bold">{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-sky-600 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
