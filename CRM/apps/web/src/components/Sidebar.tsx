'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Zap,
  Users,
  Kanban,
  PhoneCall,
  CalendarClock,
  Clock,
  BarChart3,
  Smartphone,
  UserCheck,
  FileText,
  Settings,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, isManager } = useAuth();

  const navItems = [
    { label: 'Overview', href: '/', icon: LayoutDashboard },
    { label: 'Daily Call Queue', href: '/queue', icon: Zap, badge: '300' },
    { label: 'Leads Directory', href: '/leads', icon: Users },
    { label: 'Pipeline Kanban', href: '/pipeline', icon: Kanban },
    { label: 'Call History', href: '/calls', icon: PhoneCall },
    { label: 'Follow-ups', href: '/follow-ups', icon: CalendarClock },
    // Self-service shift clock — employees and managers only. Admins manage
    // attendance org-wide under Administration > Org Attendance Logs.
    ...(isAdmin
      ? []
      : [{ label: 'Attendance & Breaks', href: '/attendance', icon: Clock }]),
    { label: 'Performance', href: '/performance', icon: BarChart3 },
    { label: 'Calling Device', href: '/devices', icon: Smartphone },
  ];

  const managerItems = [
    { label: 'Team Live Monitor', href: '/manager/team', icon: UserCheck },
  ];

  const adminItems = [
    { label: 'User & Role Management', href: '/admin/users', icon: Users },
    { label: 'Org Attendance Logs', href: '/admin/attendance', icon: Clock },
    { label: 'System Audit Trail', href: '/admin/audit-logs', icon: FileText },
    { label: 'Settings & Geofence', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between overflow-y-auto">
      <div className="p-4 space-y-6">
        <div>
          <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-sky-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Manager Section */}
        {(isManager || isAdmin) && (
          <div>
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Team Management
            </span>
            <nav className="mt-2 space-y-1">
              {managerItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <div>
            <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Administration
            </span>
            <nav className="mt-2 space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-purple-700' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}
