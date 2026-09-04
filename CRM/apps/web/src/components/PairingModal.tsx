'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Smartphone, RefreshCw, X, ShieldCheck, QrCode, Copy, Check, Sparkles } from 'lucide-react';
import QRCode from 'qrcode';

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
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [genError, setGenError] = useState('');

  const generateSession = async () => {
    setLoading(true);
    setGenError('');
    try {
      const res: any = await api.post('/devices/pairing-session');
      setPairingData(res);
      setTimeLeft(300);
    } catch (err: any) {
      setGenError(err?.message || 'Failed to generate pairing code');
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

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://dayaar-real-estate-consultant-5ahf.onrender.com/api';
  const pairingLink = pairingData
    ? `dayaarcrm://pair?code=${encodeURIComponent(pairingData.pairingCode)}&token=${encodeURIComponent(pairingData.pairingToken)}&api=${encodeURIComponent(apiBaseUrl)}`
    : '';

  useEffect(() => {
    if (!pairingLink) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(pairingLink, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
  }, [pairingLink]);

  const handleCopyLink = () => {
    if (!pairingLink) return;
    navigator.clipboard.writeText(pairingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col scale-100">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-100">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Pair Corporate Android Phone
              </h3>
              <p className="text-[11px] text-slate-500">
                Cellular calling gateway connection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-center">
          {genError && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">{genError}</div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
            Open the <strong>Dayaar Agent</strong> app on your Android smartphone and scan this secure QR code or enter the single-use PIN.
          </p>

          {/* QR Code Container */}
          {qrDataUrl && (
            <div className="flex justify-center">
              <div className="relative p-3 bg-white rounded-2xl border-2 border-slate-100 shadow-card">
                <img
                  src={qrDataUrl}
                  alt="Secure Android pairing QR"
                  width={200}
                  height={200}
                  className="rounded-xl"
                />
              </div>
            </div>
          )}

          {/* 6-Digit PIN Display */}
          <div className="p-5 bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Single-Use Gateway PIN
            </span>
            <div className="text-3xl font-extrabold font-mono tracking-widest text-slate-900">
              {loading ? '------' : pairingData?.pairingCode || '------'}
            </div>
            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <span>Code expires in:</span>
              <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>
                {mins}:{secs.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={generateSession}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Generate New Code</span>
            </button>
            <button
              type="button"
              disabled={!pairingLink}
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold rounded-xl transition-colors"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Security Guarantee */}
          <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-left flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky-900 leading-normal">
              PIN is salted, hashed, and single-use only. Once paired, heartbeats securely keep your cellular gateway active in real-time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

