'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Smartphone, RefreshCw, X, ShieldCheck, QrCode } from 'lucide-react';

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PairingModal({ isOpen, onClose }: PairingModalProps) {
  const [pairingData, setPairingData] = useState<{
    pairingCode: string;
    pairingToken: string;
    expiresAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 mins in seconds

  const generateSession = async () => {
    setLoading(true);
    try {
      const res: any = await api.post('/devices/pairing-session');
      setPairingData(res);
      sessionStorage.setItem('dayaar_dev_pairing_code', res.pairingCode);
      sessionStorage.setItem('dayaar_dev_pairing_token', res.pairingToken);
      setTimeLeft(300);
    } catch (err) {
      console.error('Failed to generate pairing session', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-sky-700" />
            <h3 className="text-base font-bold text-slate-900">Pair Android Calling Device</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Enter this 6-digit PIN into your company Android phone CRM app or in the <b>Dev Simulator</b> to link your calling SIM.
          </p>

          {/* 6-Digit PIN Display */}
          <div className="p-6 bg-slate-50 border-2 border-dashed border-sky-300 rounded-2xl flex flex-col items-center justify-center space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Single-Use Secure PIN
            </span>
            <div className="text-4xl font-black font-mono tracking-widest text-sky-800">
              {loading ? '------' : pairingData?.pairingCode || '------'}
            </div>
            <div className="text-xs font-medium text-slate-500">
              Expires in: <span className="font-mono font-bold text-amber-600">{`${mins}:${secs.toString().padStart(2, '0')}`}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={generateSession}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Generate New Code</span>
            </button>
          </div>

          <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-left space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>Cryptographically Secured</span>
            </div>
            <p className="text-[11px] text-sky-800 leading-normal">
              PIN is hashed, valid for 5 minutes, and single-use only. Once paired, heartbeats keep your cellular gateway active in real-time.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
