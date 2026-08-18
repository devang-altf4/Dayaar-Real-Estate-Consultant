'use client';

import React, { useState } from 'react';
import { useSocket } from '@/context/SocketContext';
import { CallAttemptStatus, LeadStatus, NotInterestedReason } from '@dayaar/shared';
import { formatSecondsToTime } from '@/lib/utils';
import { Phone, PhoneOff, Smartphone, Check, X, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface CallingModalProps {
  onDispositionSaved?: () => void;
}

export function CallingModal({ onDispositionSaved }: CallingModalProps) {
  const { activeCall, setActiveCall } = useSocket();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
  const [notInterestedReason, setNotInterestedReason] = useState<NotInterestedReason>(
    NotInterestedReason.BUDGET,
  );
  const [reasonDetails, setReasonDetails] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!activeCall?.isActive) return null;

  const isConnected = activeCall.status === CallAttemptStatus.CONNECTED;
  const isDialing = activeCall.status === CallAttemptStatus.DIALING || activeCall.status === CallAttemptStatus.INITIATING;
  const isEnded = !isConnected && !isDialing;

  const handleEndCall = () => {
    // End active call in UI state to allow saving disposition
    setActiveCall((prev) => (prev ? { ...prev, status: CallAttemptStatus.NOT_CONNECTED } : null));
  };

  const handleSaveDisposition = async (status: LeadStatus) => {
    if (!activeCall.leadId) return;

    setIsSaving(true);
    setErrorMessage('');
    try {
      const payload: any = {
        status,
        employeeNotes: notes || undefined,
      };

      if (status === LeadStatus.NOT_INTERESTED) {
        payload.notInterestedReason = notInterestedReason;
        if (notInterestedReason === NotInterestedReason.OTHER) {
          payload.notInterestedReasonDetails = reasonDetails;
        }
      }

      await api.patch(`/leads/${activeCall.leadId}/disposition`, payload);

      setActiveCall(null);
      if (onDispositionSaved) onDispositionSaved();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update disposition');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header with Call Status */}
        <div
          className={`p-6 text-white flex flex-col items-center justify-center text-center transition-colors ${
            isConnected ? 'bg-emerald-600' : isEnded ? 'bg-slate-700' : 'bg-sky-600'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 mb-3 shadow-inner">
            <Phone className={`h-7 w-7 text-white ${isDialing ? 'animate-bounce' : ''}`} />
          </div>

          <h3 className="text-xl font-bold">{activeCall.leadName || 'Calling Customer...'}</h3>
          <p className="text-sm font-mono text-white/80 mt-0.5">{activeCall.phoneNumber}</p>

          <div className="mt-3 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-white animate-pulse"></span>
            <span className="text-sm font-semibold uppercase tracking-wider">
              {activeCall.status === CallAttemptStatus.INITIATING
                ? 'Routing to Company SIM...'
                : activeCall.status === CallAttemptStatus.DIALING
                ? 'Dialing Customer...'
                : activeCall.status === CallAttemptStatus.CONNECTED
                ? `Connected (${formatSecondsToTime(activeCall.durationSeconds)})`
                : 'Call Ended'}
            </span>
          </div>
        </div>

        {/* Modal Body: Quick Dispositions & Notes */}
        <div className="p-6 space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4 py-2">
              <div className="text-center text-sm text-slate-600">
                Call in progress via paired Android phone. Press <b>Hang Up</b> when finished.
              </div>
              <button
                type="button"
                onClick={handleEndCall}
                className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-md transition-colors"
              >
                <PhoneOff className="h-5 w-5" />
                <span>Hang Up Call</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Select Call Outcome
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveDisposition(LeadStatus.INTERESTED)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Interested</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveDisposition(LeadStatus.FOLLOW_UP)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 font-semibold hover:bg-sky-100 transition-colors"
                >
                  <span>Follow-up Due</span>
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveDisposition(LeadStatus.NOT_PICKED_UP)}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold hover:bg-slate-100 transition-colors"
                >
                  <span>No Answer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus(LeadStatus.NOT_INTERESTED)}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-semibold transition-colors ${
                    selectedStatus === LeadStatus.NOT_INTERESTED
                      ? 'border-rose-500 bg-rose-50 text-rose-800'
                      : 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                  }`}
                >
                  <span>Not Interested...</span>
                </button>
              </div>

              {/* Not Interested Mandatory Reason Form */}
              {selectedStatus === LeadStatus.NOT_INTERESTED && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-semibold text-rose-900 mb-1">
                      Reason for Not Interested <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={notInterestedReason}
                      onChange={(e) => setNotInterestedReason(e.target.value as NotInterestedReason)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:ring-1 focus:ring-rose-500"
                    >
                      <option value={NotInterestedReason.BUDGET}>Budget Issue (Too Expensive)</option>
                      <option value={NotInterestedReason.ALREADY_PURCHASED}>Already Purchased Elsewhere</option>
                      <option value={NotInterestedReason.NOT_LOOKING}>Not Looking Anymore</option>
                      <option value={NotInterestedReason.WRONG_LOCATION}>Location Not Suitable</option>
                      <option value={NotInterestedReason.LOAN_ISSUE}>Loan Eligibility Issue</option>
                      <option value={NotInterestedReason.JUST_BROWSING}>Just Browsing / Window Shopping</option>
                      <option value={NotInterestedReason.WRONG_NUMBER}>Wrong Number</option>
                      <option value={NotInterestedReason.OTHER}>Other Reason</option>
                    </select>
                  </div>

                  {notInterestedReason === NotInterestedReason.OTHER && (
                    <div>
                      <input
                        type="text"
                        placeholder="Specify reason..."
                        value={reasonDetails}
                        onChange={(e) => setReasonDetails(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveDisposition(LeadStatus.NOT_INTERESTED)}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition-colors"
                  >
                    Confirm Not Interested
                  </button>
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Quick Note</label>
                <input
                  type="text"
                  placeholder="e.g. Call back at 5 PM or customer wants brochure..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCall(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  Dismiss Modal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
