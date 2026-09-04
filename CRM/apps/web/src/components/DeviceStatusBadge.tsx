'use client';

import React from 'react';
import { useSocket } from '@/context/SocketContext';
import { DeviceStatus } from '@dayaar/shared';
import { Smartphone, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export function DeviceStatusBadge() {
  const { deviceStatus } = useSocket();

  const isOnline = deviceStatus.status === DeviceStatus.ONLINE;
  const isStale = deviceStatus.status === DeviceStatus.STALE;
  const isSimReady = deviceStatus.isSimReady ?? true;

  if (isOnline && isSimReady) {
    return (
      <Link
        href="/devices"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50/90 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/90 transition-all shadow-subtle"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
        <span className="font-bold">{deviceStatus.deviceName || 'Android SIM Ready'}</span>
      </Link>
    );
  }

  if (isOnline && !isSimReady) {
    return (
      <Link
        href="/devices"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50/90 text-amber-800 border border-amber-200/80 hover:bg-amber-100/90 transition-all shadow-subtle"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        <span>SIM Not Ready ({deviceStatus.deviceName || 'Device'})</span>
      </Link>
    );
  }

  if (isStale) {
    return (
      <Link
        href="/devices"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50/90 text-amber-700 border border-amber-200/80 hover:bg-amber-100/90 transition-all shadow-subtle"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400"></span>
        <Smartphone className="w-3.5 h-3.5 text-amber-600" />
        <span>Device Stale</span>
      </Link>
    );
  }

  return (
    <Link
      href="/devices"
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50/90 text-rose-700 border border-rose-200/80 hover:bg-rose-100/90 transition-all shadow-subtle"
    >
      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
      <span>No Calling Device</span>
      <span className="text-[10px] bg-rose-200/90 text-rose-800 px-1.5 py-0.5 rounded-md font-extrabold tracking-wider uppercase">Pair</span>
    </Link>
  );
}
