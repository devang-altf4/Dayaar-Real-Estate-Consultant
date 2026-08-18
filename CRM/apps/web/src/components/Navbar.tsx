'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DeviceStatusBadge } from './DeviceStatusBadge';
import { Building2, LogOut, User, Shield, PhoneCall } from 'lucide-react';
import Link from 'next/link';

export function Navbar() {
  const { user, logout, isAdmin, isManager } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-700 text-white font-bold shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">DAYAAR</span>
            <span className="ml-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              CRM
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Device Status Live Badge */}
        <DeviceStatusBadge />

        {/* User Profile and Role Pill */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user.name}</span>
              <div className="flex items-center justify-end gap-1">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-700'
                      : isManager
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {user.role}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">({user.employeeCode})</span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
