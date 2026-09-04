'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { PairingModal } from '@/components/PairingModal';
import { useSocket } from '@/context/SocketContext';
import {
  Smartphone,
  Plus,
  Trash2,
  CheckCircle2,
  Activity,
  Signal,
  Radio,
  Sparkles,
  ShieldCheck,
  Zap,
  Clock,
  Cpu,
  RefreshCw,
  PhoneCall,
  Volume2,
} from 'lucide-react';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { DeviceStatus } from '@dayaar/shared';

export default function DevicesPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingStartedAt, setPairingStartedAt] = useState<number | null>(null);

  const { data: primaryDevice, isLoading, refetch } = useQuery({
    queryKey: ['my-primary-device'],
    queryFn: () => api.get<any>('/devices/my-device'),
    refetchInterval: isPairingModalOpen ? 2_000 : 15_000,
  });

  const openPairingModal = () => {
    setPairingStartedAt(Date.now());
    setIsPairingModalOpen(true);
  };

  useEffect(() => {
    if (!socket) return;
    const handlePairingUpdate = (device: any) => {
      if (!device?.pairedAt) return;
      setIsPairingModalOpen(false);
      setPairingStartedAt(null);
      void queryClient.invalidateQueries({ queryKey: ['my-primary-device'] });
    };
    socket.on('DEVICE_STATUS_CHANGED', handlePairingUpdate);
    return () => {
      socket.off('DEVICE_STATUS_CHANGED', handlePairingUpdate);
    };
  }, [queryClient, socket]);

  useEffect(() => {
    if (!isPairingModalOpen || !pairingStartedAt || !primaryDevice?.pairedAt) return;
    const pairedAt = new Date(primaryDevice.pairedAt).getTime();
    if (Number.isFinite(pairedAt) && pairedAt >= pairingStartedAt - 1_000) {
      setIsPairingModalOpen(false);
      setPairingStartedAt(null);
    }
  }, [isPairingModalOpen, pairingStartedAt, primaryDevice?.pairedAt]);

  const unpairMutation = useMutation({
    mutationFn: (deviceId: string) => api.delete(`/devices/${deviceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-primary-device'] });
      refetch();
    },
    onError: (err: any) => {
      alert(err?.message || 'Failed to unpair device');
    },
  });

  const isOnline = primaryDevice?.status === DeviceStatus.ONLINE;
  const isStale = primaryDevice?.status === DeviceStatus.STALE;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-display">
              Calling Device & SIM Gateway
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
              <Radio className="w-3 h-3 text-sky-500 animate-pulse" />
              GSM Relay
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Pair your corporate Android smartphone to dispatch cellular calls directly from Web CRM
          </p>
        </div>

        <button
          type="button"
          onClick={openPairingModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" />
          <span>{primaryDevice ? 'Re-Pair Android Device' : 'Pair Android Device'}</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-card animate-pulse">
          <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-medium">Checking paired device diagnostics...</p>
        </div>
      ) : !primaryDevice ? (
        /* Empty State */
        <div className="relative overflow-hidden p-8 md:p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-card space-y-6 max-w-xl mx-auto">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-sky-50 rounded-full blur-2xl pointer-events-none" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700 border border-sky-200 mx-auto shadow-inner">
            <Smartphone className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              No Cellular Gateway Device Paired
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Pair your corporate Android smartphone running the Dayaar CRM companion app. When you click <strong className="text-slate-700 font-semibold">Call</strong> in your web queue, your Android phone will automatically place the cellular SIM call.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={openPairingModal}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white rounded-xl text-sm font-bold shadow-md shadow-sky-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Pair Android Phone (QR Code / PIN)</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-left">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Step 1</span>
              <p className="text-xs text-slate-700 font-medium">Open Dayaar Agent app on phone</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Step 2</span>
              <p className="text-xs text-slate-700 font-medium">Scan QR or enter 6-digit PIN</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Step 3</span>
              <p className="text-xs text-slate-700 font-medium">Instant cellular dialer bridge</p>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Device Gateway Diagnostics */
        <div className="space-y-6">
          <div className="p-6 md:p-8 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-6">
            {/* Top Device Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700 border border-sky-200 shadow-sm">
                    <Smartphone className="h-7 w-7" />
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      isOnline
                        ? 'bg-emerald-500'
                        : isStale
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 font-display">
                      {primaryDevice.deviceName || 'Corporate Android Phone'}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isOnline
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isStale
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isOnline
                            ? 'bg-emerald-500 animate-ping'
                            : isStale
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      {primaryDevice.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {primaryDevice.manufacturer} {primaryDevice.model} • Agent v{primaryDevice.appVersion || '1.0'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
                  title="Refresh Diagnostics"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Diagnostic Parameters Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SIM Operator */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Cellular Carrier
                </span>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Signal className="h-4 w-4 text-sky-600 shrink-0" />
                  <span className="truncate">{primaryDevice.simOperator || 'Corporate SIM'}</span>
                </div>
              </div>

              {/* SIM Card State */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  SIM State
                </span>
                <div className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{primaryDevice.simState || 'READY'}</span>
                </div>
              </div>

              {/* WebSocket Heartbeat */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Last Heartbeat
                </span>
                <div className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-sky-500 shrink-0" />
                  <span>{formatTimeAgo(primaryDevice.lastSeenAt)}</span>
                </div>
              </div>

              {/* Device ID Fingerprint */}
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Device Hardware ID
                </span>
                <div className="text-xs font-mono font-bold text-slate-800 truncate">
                  {primaryDevice.deviceId ? primaryDevice.deviceId.substring(0, 16) + '...' : '—'}
                </div>
              </div>
            </div>

            {/* Active Capabilities Matrix */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Active Gateway Capabilities
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  All Systems Operational
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                    <PhoneCall className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">1-Click SIM Dialing</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">Real-time Call Logs</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                    <Volume2 className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">Audio Recording Sync</span>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg border border-slate-200/60 shadow-xs">
                  <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-semibold text-slate-800">E2E TLS WebSocket</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                Paired on {formatDate(primaryDevice.pairedAt)}
              </span>

              <button
                type="button"
                disabled={unpairMutation.isPending}
                onClick={() => {
                  if (confirm('Are you sure you want to unpair this Android calling device?')) {
                    unpairMutation.mutate(primaryDevice.deviceId);
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors border border-rose-200/60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{unpairMutation.isPending ? 'Unpairing...' : 'Unpair Device'}</span>
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
          setPairingStartedAt(null);
          refetch();
        }}
      />
    </div>
  );
}

