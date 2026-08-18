'use client';

import React, { useState } from 'react';
import { LeadStatus, NotInterestedReason, Temperature } from '@dayaar/shared';
import { api } from '@/lib/api';
import { Check, Clock, PhoneMissed, ThumbsDown, AlertCircle } from 'lucide-react';

interface QuickDispositionBarProps {
  leadId: string;
  onDispositionComplete: () => void;
}

export function QuickDispositionBar({ leadId, onDispositionComplete }: QuickDispositionBarProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitQuickAction = async (payload: any) => {
    setLoading(true);
    setError('');
    try {
      await api.patch(`/leads/${leadId}/disposition`, payload);
      onDispositionComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save disposition');
    } finally {
      setLoading(false);
    }
  };

  const handleInterested = () => {
    submitQuickAction({
      status: LeadStatus.INTERESTED,
      temperature: Temperature.WARM,
      employeeNotes: 'Qualified via Quick Disposition: Customer expressed interest.',
    });
  };

  const handleBusyCallback = () => {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    submitQuickAction({
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpAt: nextHour,
      employeeNotes: 'Quick Disposition: Customer busy, scheduled 1-hour callback.',
    });
  };

  const handleNoAnswer = () => {
    const nextThreeHours = new Date(Date.now() + 3 * 60 * 60 * 1000);
    submitQuickAction({
      status: LeadStatus.FOLLOW_UP,
      nextFollowUpAt: nextThreeHours,
      employeeNotes: 'Quick Disposition: Unanswered, scheduled 3-hour retry.',
    });
  };

  const handleBudgetMismatch = () => {
    submitQuickAction({
      status: LeadStatus.NOT_INTERESTED,
      notInterestedReason: NotInterestedReason.BUDGET,
      employeeNotes: 'Quick Disposition: Budget mismatch.',
    });
  };

  const handleAlreadyPurchased = () => {
    submitQuickAction({
      status: LeadStatus.NOT_INTERESTED,
      notInterestedReason: NotInterestedReason.ALREADY_PURCHASED,
      employeeNotes: 'Quick Disposition: Already bought elsewhere.',
    });
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          High-Speed One-Click Dispositions
        </span>
        {loading && <span className="text-xs text-sky-600 font-semibold animate-pulse">Saving...</span>}
      </div>

      {error && (
        <div className="text-xs p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleInterested}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <Check className="h-3.5 w-3.5 text-emerald-600" />
          <span>Interested</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleBusyCallback}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <Clock className="h-3.5 w-3.5 text-sky-600" />
          <span>Busy (1h)</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleNoAnswer}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <PhoneMissed className="h-3.5 w-3.5 text-slate-600" />
          <span>No Answer (3h)</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleBudgetMismatch}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <ThumbsDown className="h-3.5 w-3.5 text-rose-600" />
          <span>Budget Mismatch</span>
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleAlreadyPurchased}
          className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          <span>Already Bought</span>
        </button>
      </div>
    </div>
  );
}
