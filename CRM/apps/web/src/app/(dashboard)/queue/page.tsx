'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { QuickDispositionBar } from '@/components/QuickDispositionBar';
import { LeadQualificationForm } from '@/components/LeadQualificationForm';
import {
  Phone,
  Zap,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  Building,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { formatIndianCurrency, formatDate } from '@/lib/utils';
import { CallOrigin, DeviceStatus, LeadStatus, Temperature } from '@dayaar/shared';

export default function DailyCallQueuePage() {
  const queryClient = useQueryClient();
  const { activeCall, deviceStatus, setActiveCall } = useSocket();
  const [activeTab, setActiveTab] = useState<'quick' | 'full'>('quick');
  const [callError, setCallError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshRef = useRef(0);

  // Fetch daily queue with auto background sync (8s)
  const { data: queueData, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['daily-queue'],
    queryFn: () => api.get<any>('/queue'),
    refetchInterval: 8000,
  });

  const { data: progressData, refetch: refetchProgress } = useQuery({
    queryKey: ['queue-progress'],
    queryFn: () => api.get<any>('/queue/progress'),
    refetchInterval: 8000,
  });

  const handleManualRefresh = async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 3000) return; // 3-second cooldown rate limit
    lastRefreshRef.current = now;
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['daily-queue'] }),
      queryClient.invalidateQueries({ queryKey: ['queue-progress'] }),
      refetch(),
      refetchProgress(),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const queue = queueData?.queue || [];
  const currentLead = queue[0] || null;
  const currentCallAttemptId = activeCall && currentLead && activeCall.leadId === currentLead._id
    ? activeCall.callAttemptId
    : undefined;

  const isDeviceOnline = deviceStatus.status === DeviceStatus.ONLINE;
  const isSimReady = deviceStatus.isSimReady ?? true;
  const isCallReady = isDeviceOnline && isSimReady;

  // Call Initiation Mutation
  const callMutation = useMutation({
    mutationFn: (leadId: string) =>
      api.post<any>('/calls/initiate', {
        leadId,
        origin: CallOrigin.WEB,
        idempotencyKey: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${leadId}-${Date.now()}`,
      }),
    onSuccess: (data) => {
      setCallError('');
      queryClient.invalidateQueries({ queryKey: ['queue-progress'] });
      queryClient.invalidateQueries({ queryKey: ['daily-queue'] });
      setActiveCall({
        isActive: true,
        leadId: currentLead._id,
        leadName: currentLead.name,
        phoneNumber: currentLead.phone,
        commandId: data.commandId,
        callAttemptId: data.callAttemptId,
        status: data.status,
        durationSeconds: 0,
      });
    },
    onError: (err: any) => {
      setCallError(err.message || 'Could not initiate call');
    },
  });

  const handleCallCurrentLead = () => {
    if (!currentLead) return;
    callMutation.mutate(currentLead._id);
  };

  const handleNextLead = () => {
    queryClient.invalidateQueries({ queryKey: ['daily-queue'] });
    queryClient.invalidateQueries({ queryKey: ['queue-progress'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
    queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
    queryClient.invalidateQueries({ queryKey: ['lead-calls'] });
  };

  return (
    <div className="space-y-6">
      {/* Header & Target Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-card">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950">High-Throughput Call Queue</h1>
              <p className="text-xs text-slate-500 font-medium">
                Optimized for rapid 300 leads/day calling workflow with automatic progression
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {progressData && (
            <div className="flex items-center gap-4 bg-slate-50/80 px-4 py-2.5 rounded-xl border border-slate-200/70">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Calls Today</span>
                <div className="text-base font-extrabold text-slate-900">{progressData.totalCallsMadeToday}</div>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Remaining</span>
                <div className="text-base font-extrabold text-amber-700">{progressData.remainingCalls}</div>
              </div>
              <div className="h-7 w-px bg-slate-200" />
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">In Queue</span>
                <div className="text-base font-extrabold text-sky-700">{queue.length}</div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing || isLoading}
            title="Sync Call Queue (3s cooldown)"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-subtle disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing || isRefetching ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isRefreshing || isRefetching ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>

      {callError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 shadow-subtle">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{callError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 font-medium">Loading daily queue...</div>
      ) : queue.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-card space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 mx-auto">
            <Sparkles className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Queue is Clear!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 font-medium">
              You have called all scheduled and fresh leads in your queue. Check the Leads tab for new assignments.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Refresh Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Lead Call Card */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200/70">
                    Active Lead #{1} of {queue.length}
                  </span>
                  <h2 className="text-2xl font-black text-slate-950 mt-2 tracking-tight">{currentLead.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{currentLead.phone}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{currentLead.project}</span>
                    <span>•</span>
                    <span className="text-slate-400">Source: {currentLead.source}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full uppercase border ${
                      currentLead.temperature === Temperature.HOT
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : currentLead.temperature === Temperature.WARM
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {currentLead.temperature === Temperature.HOT ? '🔥 ' : ''}{currentLead.temperature}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Attempts: <b className="text-slate-700">{currentLead.attemptCount || 0} / 4</b>
                  </span>
                </div>
              </div>

              {/* Massive CALL Button */}
              <div className="p-5 bg-gradient-to-b from-slate-50 to-slate-100/50 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center space-y-3">
                <button
                  type="button"
                  disabled={!isCallReady || callMutation.isPending}
                  onClick={handleCallCurrentLead}
                  className={`w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-3 shadow-lg transition-all duration-200 cursor-pointer ${
                    isCallReady
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-glow-emerald active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Phone className={`h-5 w-5 ${isCallReady ? 'animate-pulse' : ''}`} />
                  <span>
                    {callMutation.isPending
                      ? 'Dispatching to Android SIM...'
                      : isCallReady
                      ? `CALL ${currentLead.name.toUpperCase()} NOW`
                      : 'Calling Disabled (Android Phone Offline)'}
                  </span>
                </button>

                {!isCallReady && (
                  <p className="text-xs text-rose-600 font-semibold">
                    Pair your company Android phone in the <b>Calling Device</b> tab to activate cellular calling.
                  </p>
                )}
              </div>

              {/* Tabs for Quick vs Full Qualification */}
              <div className="space-y-4">
                <div className="flex border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('quick')}
                    className={`pb-3 px-4 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'quick'
                        ? 'border-b-2 border-sky-600 text-sky-800 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    1-Click Quick Dispositions
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('full')}
                    className={`pb-3 px-4 text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'full'
                        ? 'border-b-2 border-sky-600 text-sky-800 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Detailed Property Qualification Form
                  </button>
                </div>

                {activeTab === 'quick' ? (
                  <QuickDispositionBar
                    callAttemptId={currentCallAttemptId}
                    onDispositionComplete={handleNextLead}
                  />
                ) : (
                  <LeadQualificationForm
                    leadId={currentLead._id}
                    initialQualification={currentLead.qualification}
                    currentStatus={currentLead.status}
                    currentTemperature={currentLead.temperature}
                    onSaved={handleNextLead}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Up Next in Queue List */}
          <div className="space-y-4">
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Up Next in Queue</h3>
                <span className="text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">{queue.length} Leads</span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {queue.slice(1).map((lead: any, idx: number) => (
                  <div
                    key={lead._id}
                    className="p-3.5 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl space-y-1 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{lead.name}</span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">#{idx + 2}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">{lead.phone}</span>
                      <span className="font-medium text-slate-600">{lead.project}</span>
                    </div>
                    {lead.status === LeadStatus.FOLLOW_UP && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 font-semibold pt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>Follow-up Scheduled</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
