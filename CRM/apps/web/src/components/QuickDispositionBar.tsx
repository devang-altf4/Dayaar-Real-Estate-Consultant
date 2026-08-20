'use client';

import React, { useEffect, useState } from 'react';
import { CallDisposition } from '@dayaar/shared';
import { api } from '@/lib/api';
import { AlertCircle, Check, Clock, Flame, Snowflake, ThermometerSun } from 'lucide-react';

interface QuickDispositionBarProps {
  callAttemptId?: string;
  onDispositionComplete: () => void;
}

const OPTIONS = [
  { value: CallDisposition.HOT, label: 'Hot', icon: Flame, activeClass: 'bg-rose-100 border-rose-400 text-rose-900 ring-1 ring-rose-300' },
  { value: CallDisposition.WARM, label: 'Warm', icon: ThermometerSun, activeClass: 'bg-amber-100 border-amber-400 text-amber-900 ring-1 ring-amber-300' },
  { value: CallDisposition.COLD, label: 'Cold', icon: Snowflake, activeClass: 'bg-sky-100 border-sky-400 text-sky-900 ring-1 ring-sky-300' },
  { value: CallDisposition.NOT_INTERESTED, label: 'Not Interested', icon: Check, activeClass: 'bg-slate-200 border-slate-400 text-slate-900 ring-1 ring-slate-300' },
  { value: CallDisposition.FOLLOW_UP, label: 'Follow-up', icon: Clock, activeClass: 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-1 ring-emerald-300' },
] as const;

export function QuickDispositionBar({ callAttemptId, onDispositionComplete }: QuickDispositionBarProps) {
  const [disposition, setDisposition] = useState<CallDisposition>(CallDisposition.WARM);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReason('');
    setNotes('');
    setFollowUpAt('');
    setError('');
  }, [callAttemptId]);

  const submitDisposition = async () => {
    if (!callAttemptId) {
      setError('Start a call first. A disposition must be attached to a call attempt.');
      return;
    }
    if (reason.trim().length < 2) {
      setError('A reason is required for every call disposition.');
      return;
    }
    if (disposition === CallDisposition.FOLLOW_UP && !followUpAt) {
      setError('Choose a follow-up date and time.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.patch(`/calls/${callAttemptId}/disposition`, {
        disposition,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        followUpAt:
          disposition === CallDisposition.FOLLOW_UP ? new Date(followUpAt).toISOString() : undefined,
      });
      onDispositionComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save disposition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Call Disposition
        </span>
        {loading && <span className="text-xs text-sky-600 font-semibold animate-pulse">Saving...</span>}
      </div>

      {!callAttemptId && (
        <p className="text-xs text-slate-500">Call this lead before recording an outcome.</p>
      )}

      {error && (
        <div className="text-xs p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {OPTIONS.map(({ value, label, icon: Icon, activeClass }) => (
          <button
            key={value}
            type="button"
            disabled={loading || !callAttemptId}
            onClick={() => setDisposition(value)}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 ${
              disposition === value
                ? activeClass
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason <span className="text-rose-600">*</span>
          </label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={!callAttemptId || loading}
            maxLength={1000}
            placeholder="What happened on this call?"
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
          />
        </div>
        {disposition === CallDisposition.FOLLOW_UP ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Follow-up at <span className="text-rose-600">*</span>
            </label>
            <input
              type="datetime-local"
              value={followUpAt}
              onChange={(event) => setFollowUpAt(event.target.value)}
              disabled={!callAttemptId || loading}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Optional note</label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!callAttemptId || loading}
              maxLength={5000}
              placeholder="Extra context for your team"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
            />
          </div>
        )}
      </div>

      {disposition === CallDisposition.FOLLOW_UP && (
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={!callAttemptId || loading}
          maxLength={5000}
          placeholder="Optional follow-up note"
          className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white disabled:bg-slate-100"
        />
      )}

      <button
        type="button"
        disabled={!callAttemptId || loading}
        onClick={submitDisposition}
        className="w-full md:w-auto px-5 py-2.5 bg-sky-700 hover:bg-sky-800 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold"
      >
        Save call disposition
      </button>
    </div>
  );
}
