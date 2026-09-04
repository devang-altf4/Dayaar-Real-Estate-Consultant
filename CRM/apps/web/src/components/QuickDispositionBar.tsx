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
  { value: CallDisposition.HOT, label: 'Hot', icon: Flame, activeClass: 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-200 shadow-subtle font-extrabold' },
  { value: CallDisposition.WARM, label: 'Warm', icon: ThermometerSun, activeClass: 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-200 shadow-subtle font-extrabold' },
  { value: CallDisposition.COLD, label: 'Cold', icon: Snowflake, activeClass: 'bg-sky-50 border-sky-400 text-sky-800 ring-2 ring-sky-200 shadow-subtle font-extrabold' },
  { value: CallDisposition.NOT_INTERESTED, label: 'Not Interested', icon: Check, activeClass: 'bg-slate-100 border-slate-400 text-slate-800 ring-2 ring-slate-200 shadow-subtle font-extrabold' },
  { value: CallDisposition.FOLLOW_UP, label: 'Follow-up', icon: Clock, activeClass: 'bg-emerald-50 border-emerald-400 text-emerald-800 ring-2 ring-emerald-200 shadow-subtle font-extrabold' },
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
    <div className="p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl shadow-subtle space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Call Outcome & Disposition
          </span>
          <p className="text-[11px] text-slate-400 font-medium">Select outcome to log call & advance to next lead</p>
        </div>
        {loading && <span className="text-xs text-sky-600 font-bold animate-pulse">Saving record...</span>}
      </div>

      {!callAttemptId && (
        <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>Call this lead using the green button above before logging a disposition.</span>
        </div>
      )}

      {error && (
        <div className="text-xs p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {OPTIONS.map(({ value, label, icon: Icon, activeClass }) => (
          <button
            key={value}
            type="button"
            disabled={loading || !callAttemptId}
            onClick={() => setDisposition(value)}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 cursor-pointer ${
              disposition === value
                ? activeClass
                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3.5 md:grid-cols-2 pt-1">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Call Outcome Reason <span className="text-rose-600">*</span>
          </label>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={!callAttemptId || loading}
            maxLength={1000}
            placeholder="e.g., Interested in 3BHK, schedule visit Sunday"
            className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium text-slate-900"
          />
        </div>
        {disposition === CallDisposition.FOLLOW_UP ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Follow-up Date & Time <span className="text-rose-600">*</span>
            </label>
            <input
              type="datetime-local"
              value={followUpAt}
              onChange={(event) => setFollowUpAt(event.target.value)}
              disabled={!callAttemptId || loading}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium text-slate-900"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Optional Notes</label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!callAttemptId || loading}
              maxLength={5000}
              placeholder="Extra context for yourself or team"
              className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium text-slate-900"
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
          placeholder="Optional follow-up notes"
          className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100/70 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-medium text-slate-900"
        />
      )}

      <div className="pt-2">
        <button
          type="button"
          disabled={!callAttemptId || loading}
          onClick={submitDisposition}
          className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-400 text-white rounded-xl text-xs font-bold shadow-subtle transition-all cursor-pointer"
        >
          {loading ? 'Logging & Advancing...' : 'Save Disposition & Next Lead →'}
        </button>
      </div>
    </div>
  );
}
