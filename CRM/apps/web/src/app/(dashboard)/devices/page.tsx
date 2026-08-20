'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PairingModal } from '@/components/PairingModal';
import {
  Smartphone,
  Plus,
  Trash2,
  CheckCircle2,
  Activity,
  Signal,
} from 'lucide-react';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { DeviceStatus, SimState } from '@dayaar/shared';

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);

  const { data: primaryDevice, isLoading, refetch } = useQuery({
    queryKey: ['my-primary-device'],
    queryFn: () => api.get<any>('/devices/my-device'),
  });

  const unpairMutation = useMutation({
    mutationFn: (deviceId: string) => api.delete(`/devices/${deviceId}`),
    onSuccess: () => {
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Calling Device & SIM Gateway</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pair your corporate Android smartphone to dispatch unlimited cellular SIM calls directly from Web CRM
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPairingModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Pair New Android Device</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading device diagnostics...</div>
      ) : !primaryDevice ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-lg mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto">
            <Smartphone className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Calling Device Paired</h3>
            <p className="text-xs text-slate-500 mt-1">
              You must pair a company Android smartphone with an active SIM card to make calls from Web CRM.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsPairingModalOpen(true)}
              className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition-colors"
            >
              Pair Android Device Now (6-Digit PIN)
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Main Device Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-100">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{primaryDevice.deviceName}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {primaryDevice.manufacturer} {primaryDevice.model} • App v{primaryDevice.appVersion}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5 ${
                    primaryDevice.status === DeviceStatus.ONLINE
                      ? 'bg-emerald-100 text-emerald-800'
                      : primaryDevice.status === DeviceStatus.STALE
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      primaryDevice.status === DeviceStatus.ONLINE
                        ? 'bg-emerald-500'
                        : primaryDevice.status === DeviceStatus.STALE
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span>{primaryDevice.status}</span>
                </span>
              </div>
            </div>

            {/* Diagnostic Parameters */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">SIM Operator</span>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Signal className="h-4 w-4 text-sky-600" />
                  <span>{primaryDevice.simOperator || 'Corporate SIM'}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">SIM Card State</span>
                <div className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{primaryDevice.simState}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Last Heartbeat</span>
                <div className="text-xs font-mono font-semibold text-slate-700">
                  {formatTimeAgo(primaryDevice.lastSeenAt)}
                </div>
              </div>
            </div>

            {/* Capabilities Checklist */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Active Device Capabilities</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Cellular Outbound Calls</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Call-Log Sync</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Audio Recording Sync</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">
                Paired on: {formatDate(primaryDevice.pairedAt)}
              </span>

              <button
                type="button"
                disabled={unpairMutation.isPending}
                onClick={() => unpairMutation.mutate(primaryDevice.deviceId)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Unpair Device</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pairing Modal */}
      <PairingModal
        isOpen={isPairingModalOpen}
        onClose={() => {
          setIsPairingModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
