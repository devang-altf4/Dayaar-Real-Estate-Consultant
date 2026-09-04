'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useSocket } from '@/context/SocketContext';
import { QuickDispositionBar } from '@/components/QuickDispositionBar';
import { LeadQualificationForm } from '@/components/LeadQualificationForm';
import { AudioPlayer } from '@/components/AudioPlayer';
import {
  Phone,
  Building,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Flame,
  Volume2,
  CalendarPlus,
} from 'lucide-react';
import Link from 'next/link';
import { CallOrigin, DeviceStatus, RecordingStatus, Temperature } from '@dayaar/shared';
import { formatDate, formatIndianCurrency } from '@/lib/utils';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin, isManager } = useAuth();
  const { activeCall, deviceStatus, setActiveCall } = useSocket();

  const [activeTab, setActiveTab] = useState<'qualification' | 'calls' | 'followup'>('qualification');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpReason, setFollowUpReason] = useState('Callback');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [callError, setCallError] = useState('');

  // Fetch Lead
  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get<any>(`/leads/${id}`),
  });

  // Fetch Call History
  const { data: calls, refetch: refetchCalls } = useQuery({
    queryKey: ['lead-calls', id],
    queryFn: () => api.get<any[]>(`/calls/lead/${id}`),
  });

  const isDeviceOnline = deviceStatus.status === DeviceStatus.ONLINE;
  const isSimReady = deviceStatus.isSimReady ?? true;
  const isCallReady = isDeviceOnline && isSimReady;
  const currentCallAttemptId = activeCall && activeCall.leadId === id
    ? activeCall.callAttemptId
    : undefined;

  // Call Initiation Mutation
  const callMutation = useMutation({
    mutationFn: () =>
      api.post<any>('/calls/initiate', {
        leadId: id,
        origin: CallOrigin.WEB,
        idempotencyKey: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${id}-${Date.now()}`,
      }),
    onSuccess: (data) => {
      setCallError('');
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['lead-calls', id] });
      queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
      queryClient.invalidateQueries({ queryKey: ['daily-queue'] });
      setActiveCall({
        isActive: true,
        leadId: lead._id,
        leadName: lead.name,
        phoneNumber: lead.phone,
        commandId: data.commandId,
        callAttemptId: data.callAttemptId,
        status: data.status,
        durationSeconds: 0,
      });
    },
    onError: (err: any) => {
      setCallError(err.message || 'Call initiation failed');
    },
  });

  // Schedule Follow-up Mutation
  const followUpMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        leadId: id,
        scheduledAt: new Date(followUpDate).toISOString(),
      };
      if (followUpReason.trim()) {
        payload.reason = followUpReason.trim();
      }
      if (followUpNotes.trim()) {
        payload.notes = followUpNotes.trim();
      }
      return api.post('/follow-ups', payload);
    },
    onSuccess: () => {
      setFollowUpDate('');
      setFollowUpNotes('');
      setFollowUpStatus({ type: 'success', text: 'Follow-up scheduled successfully.' });
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['daily-queue'] });
    },
    onError: (err: any) => {
      setFollowUpStatus({ type: 'error', text: err.message || 'Failed to schedule follow-up.' });
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading lead profile...</div>;
  }

  if (!lead) {
    return <div className="p-12 text-center text-rose-500">Lead not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Leads Directory</span>
      </Link>

      {/* Header Profile Card */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900">{lead.name}</h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  lead.temperature === Temperature.HOT
                    ? 'bg-rose-100 text-rose-700'
                    : lead.temperature === Temperature.WARM
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {lead.temperature}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="font-mono font-bold text-slate-800 text-sm">{lead.phone}</span>
              {lead.alternatePhone && (
                <span className="font-mono text-slate-400">Alt: {lead.alternatePhone}</span>
              )}
              <span>•</span>
              <span className="font-semibold text-slate-700">{lead.project}</span>
              <span>•</span>
              <span>Source: {lead.source}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Status</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase bg-sky-50 text-sky-800 border border-sky-200">
                {lead.status}
              </span>
            </div>

            <div className="text-right pl-3 border-l border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Attempts</span>
              <span className="text-sm font-mono font-black text-slate-800">
                {lead.attemptCount || 0} / 4
              </span>
            </div>
          </div>
        </div>

        {callError && (
          <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{callError}</span>
          </div>
        )}

        {/* Large CALL Trigger Section */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
              <Phone className="h-5 w-5 text-sky-700" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Company Android SIM Calling</span>
              <span className="text-[11px] text-slate-500">
                {isCallReady
                  ? `Paired with ${deviceStatus.deviceName || 'Android Device'} (SIM Ready)`
                  : 'Requires an active, online paired Android device with corporate SIM'}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!isCallReady || callMutation.isPending}
            onClick={() => callMutation.mutate()}
            className={`px-8 py-3 rounded-xl text-sm font-black flex items-center gap-2 shadow-md transition-all ${
              isCallReady
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Phone className="h-4 w-4" />
            <span>{callMutation.isPending ? 'Calling...' : `CALL ${lead.name.toUpperCase()}`}</span>
          </button>
        </div>

        {/* 1-Click Quick Dispositions */}
        <QuickDispositionBar
          callAttemptId={currentCallAttemptId}
          onDispositionComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['lead', id] });
            queryClient.invalidateQueries({ queryKey: ['lead-calls', id] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
            queryClient.invalidateQueries({ queryKey: ['daily-queue'] });
            queryClient.invalidateQueries({ queryKey: ['recent-calls'] });
          }}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab('qualification')}
          className={`pb-3 text-xs font-bold transition-colors ${
            activeTab === 'qualification'
              ? 'border-b-2 border-sky-700 text-sky-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Property Qualification & Notes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calls')}
          className={`pb-3 text-xs font-bold transition-colors flex items-center gap-1.5 ${
            activeTab === 'calls'
              ? 'border-b-2 border-sky-700 text-sky-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Call Attempts & Audio Recordings</span>
          <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 text-[10px]">
            {calls?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('followup')}
          className={`pb-3 text-xs font-bold transition-colors ${
            activeTab === 'followup'
              ? 'border-b-2 border-sky-700 text-sky-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Schedule Follow-up
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'qualification' && (
        <LeadQualificationForm
          leadId={lead._id}
          initialQualification={lead.qualification}
          currentStatus={lead.status}
          currentTemperature={lead.temperature}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ['lead', id] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['daily-queue'] });
          }}
        />
      )}

      {activeTab === 'calls' && (
        <div className="space-y-4">
          {calls?.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
              No historical call attempts recorded for this lead yet.
            </div>
          ) : (
            calls?.map((call: any) => (
              <div
                key={call._id}
                className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        {call.status} ({call.duration || 0}s)
                      </span>
                      <span className="block text-[11px] text-slate-400 font-mono">
                        {formatDate(call.callDate || call.dialedAt)} • Called by {call.employeeId?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        call.countsAsAttempt ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {call.countsAsAttempt ? 'Counted Attempt' : 'Device/Tech Log'}
                    </span>
                  </div>
                </div>

                {/* Audio Recording Player */}
                {(isAdmin || isManager) && call.recordingStatus === RecordingStatus.ARCHIVED && (
                  <div className="pt-2 border-t border-slate-100">
                    <AudioPlayer
                      callAttemptId={call._id}
                      durationSeconds={call.duration}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'followup' && (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-lg">
          <h4 className="text-sm font-bold text-slate-800">Schedule Callback / Meeting</h4>

          {followUpStatus && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                followUpStatus.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {followUpStatus.text}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
              <input
                type="text"
                value={followUpReason}
                onChange={(e) => setFollowUpReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                placeholder="e.g. Discuss floor plan pricing"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Notes</label>
              <textarea
                rows={2}
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                placeholder="Notes for follow-up..."
              />
            </div>

            <button
              type="button"
              disabled={!followUpDate || followUpMutation.isPending}
              onClick={() => followUpMutation.mutate()}
              className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow transition-colors"
            >
              {followUpMutation.isPending ? 'Scheduling...' : 'Confirm Follow-up'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
