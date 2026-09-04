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
    <aside className="w-64 flex-shrink-0 border-r border-slate-200/80 bg-white flex flex-col justify-between overflow-y-auto shadow-subtle">
      <div className="p-3.5 space-y-6">
        <div>
          <div className="px-3 py-1 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Workspace
            </span>
          </div>
          <nav className="mt-1.5 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group relative flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-sky-50/90 text-sky-900 font-bold shadow-subtle border border-sky-100/80'
                      : 'text-slate-600 hover:bg-slate-50/90 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
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
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Team Management
              </span>
            </div>
            <nav className="mt-1.5 space-y-0.5">
              {managerItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-sky-50/90 text-sky-900 font-bold shadow-subtle border border-sky-100/80'
                        : 'text-slate-600 hover:bg-slate-50/90 hover:text-slate-900'
                    }`}
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
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
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Administration
              </span>
            </div>
            <nav className="mt-1.5 space-y-0.5">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-150 ${
                      isActive
                        ? 'bg-purple-50/90 text-purple-900 font-bold shadow-subtle border border-purple-100/80'
                        : 'text-slate-600 hover:bg-slate-50/90 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-400 group-hover:text-slate-700 group-hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
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
