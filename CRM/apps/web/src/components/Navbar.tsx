'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DeviceStatusBadge } from './DeviceStatusBadge';
import { Building2, LogOut, User, Shield, PhoneCall } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { user, logout, isAdmin, isManager } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 shadow-subtle">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white shadow-md shadow-slate-900/15 group-hover:scale-105 transition-transform">
            <Building2 className="h-5 w-5 text-sky-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-tight text-slate-950">DAYAAR</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200/80 tracking-wider">
                CRM
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 tracking-wide">Real Estate Consultants</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Device Status Live Badge */}
        <DeviceStatusBadge />

        {/* User Profile and Role Pill */}
        {user && (
          <div className="flex items-center gap-3 pl-3.5 border-l border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">{user.name}</span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border tracking-wider ${
                    isAdmin
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : isManager
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {user.role}
                </span>
                <span className="text-[11px] text-slate-400 font-mono font-medium">({user.employeeCode})</span>
              </div>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-sky-950 text-white font-bold text-xs shadow-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
