'use client';

import React, { useState } from 'react';
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

  // Fetch daily queue
  const { data: queueData, isLoading, refetch } = useQuery({
    queryKey: ['daily-queue'],
    queryFn: () => api.get<any>('/queue'),
  });

  const { data: progressData } = useQuery({
    queryKey: ['queue-progress'],
    queryFn: () => api.get<any>('/queue/progress'),
  });

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
    mutationFn: (leadId: string) => api.post<any>('/calls/initiate', { leadId, origin: CallOrigin.WEB }),
    onSuccess: (data) => {
      setCallError('');
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
  };

  return (
    <div className="space-y-6">
      {/* Header & Target Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl font-black text-slate-900">High-Throughput Call Queue</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Optimized for rapid 300 leads/day calling workflow with automatic Next-Lead progression
          </p>
        </div>

        {progressData && (
          <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Calls Today</span>
              <div className="text-lg font-black text-slate-900">{progressData.totalCallsMadeToday}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Remaining</span>
              <div className="text-lg font-black text-amber-600">{progressData.remainingCalls}</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">In Queue</span>
              <div className="text-lg font-black text-sky-700">{queue.length}</div>
            </div>
          </div>
        )}
      </div>

      {callError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{callError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading daily queue...</div>
      ) : queue.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Queue is Clear!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have called all scheduled and fresh leads in your queue. Great job! Check the Leads tab for new assignments.
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            Refresh Queue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Lead Call Card */}
          <div className="lg:col-span-2 space-y-5">
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    Active Lead #{1} of {queue.length}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-2">{currentLead.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="font-mono font-bold text-slate-700">{currentLead.phone}</span>
                    <span>•</span>
                    <span>{currentLead.project}</span>
                    <span>•</span>
                    <span className="text-slate-400">Source: {currentLead.source}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                      currentLead.temperature === Temperature.HOT
                        ? 'bg-rose-100 text-rose-700'
                        : currentLead.temperature === Temperature.WARM
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {currentLead.temperature}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Attempts: <b>{currentLead.attemptCount || 0} / 4</b>
                  </span>
                </div>
              </div>

              {/* Massive CALL Button */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center space-y-3">
                <button
                  type="button"
                  disabled={!isCallReady || callMutation.isPending}
                  onClick={handleCallCurrentLead}
                  className={`w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-3 shadow-lg transition-all ${
                    isCallReady
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  <Phone className={`h-6 w-6 ${isCallReady ? 'animate-pulse' : ''}`} />
                  <span>
                    {callMutation.isPending
                      ? 'Dispatching to Android SIM...'
                      : isCallReady
                      ? `CALL ${currentLead.name.toUpperCase()} NOW`
                      : 'Calling Disabled (Android Phone Offline)'}
                  </span>
                </button>

                {!isCallReady && (
                  <p className="text-xs text-rose-600 font-medium">
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
                    className={`pb-2.5 px-4 text-xs font-bold transition-colors ${
                      activeTab === 'quick'
                        ? 'border-b-2 border-sky-700 text-sky-700'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    1-Click Quick Dispositions
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('full')}
                    className={`pb-2.5 px-4 text-xs font-bold transition-colors ${
                      activeTab === 'full'
                        ? 'border-b-2 border-sky-700 text-sky-700'
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
            <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Up Next in Queue</h3>
                <span className="text-xs font-semibold text-sky-700">{queue.length} Leads</span>
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {queue.slice(1).map((lead: any, idx: number) => (
                  <div
                    key={lead._id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl space-y-1 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{lead.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400">#{idx + 2}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">{lead.phone}</span>
                      <span>{lead.project}</span>
                    </div>
                    {lead.status === LeadStatus.FOLLOW_UP && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
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
