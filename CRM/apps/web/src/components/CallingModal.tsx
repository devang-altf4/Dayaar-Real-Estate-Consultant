'use client';

import React from 'react';
import { CallAttemptStatus } from '@dayaar/shared';
import { Phone, Smartphone, X } from 'lucide-react';
import { useSocket } from '@/context/SocketContext';
import { QuickDispositionBar } from './QuickDispositionBar';

interface CallingModalProps {
  onDispositionSaved?: () => void;
}

const ACTIVE_STATUSES = new Set<CallAttemptStatus>([
  CallAttemptStatus.INITIATING,
  CallAttemptStatus.DIALING,
]);

export function CallingModal({ onDispositionSaved }: CallingModalProps) {
  const { activeCall, setActiveCall } = useSocket();
  if (!activeCall?.isActive) return null;

  const isActive = ACTIVE_STATUSES.has(activeCall.status);
  const statusText = activeCall.status === CallAttemptStatus.INITIATING
    ? 'Sending dial command to the paired Android phone...'
    : activeCall.status === CallAttemptStatus.DIALING
      ? 'The Android phone is dialing through its company SIM.'
      : 'Device flow ended. Callyzer will sync the authoritative call result.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className={`p-6 text-white ${isActive ? 'bg-sky-700' : 'bg-slate-700'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                {activeCall.status === CallAttemptStatus.INITIATING
                  ? <Smartphone className="h-6 w-6" />
                  : <Phone className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold">{activeCall.leadName || 'Customer call'}</h3>
                <p className="text-sm font-mono text-white/80">{activeCall.phoneNumber}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveCall(null)}
              aria-label="Close call panel"
              className="p-1.5 rounded-lg hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold">{statusText}</p>
          <p className="mt-1 text-xs text-white/75">Status: {activeCall.status}</p>
        </div>

        <div className="p-5">
          <QuickDispositionBar
            callAttemptId={activeCall.callAttemptId}
            onDispositionComplete={() => {
              setActiveCall(null);
              onDispositionSaved?.();
            }}
          />
          <p className="mt-3 text-[11px] text-slate-500">
            The web app does not control the handset call or its recording. Complete the call on the phone;
            Callyzer supplies the final duration, outcome, and recording asynchronously.
          </p>
        </div>
      </div>
    </div>
  );
}
