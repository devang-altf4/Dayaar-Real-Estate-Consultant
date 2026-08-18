'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Building,
  Check,
  X,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function AdminVerificationsPage() {
  const [selectedVerification, setSelectedVerification] = useState<any>(null);
  const [managerNotes, setManagerNotes] = useState('');

  const { data: verifications, isLoading, refetch } = useQuery({
    queryKey: ['secret-verifications-mismatches'],
    queryFn: () => api.get<any[]>('/verifications/mismatches'),
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { verificationId: string; action: string; notes: string }) =>
      api.post('/verifications/review', {
        verificationId: payload.verificationId,
        resolutionAction: payload.action,
        managerNotes: payload.notes,
      }),
    onSuccess: () => {
      setSelectedVerification(null);
      setManagerNotes('');
      refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-rose-600" />
          <h1 className="text-2xl font-black text-slate-900">Secret QA Verification & Mismatch Audits</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Detect employees falsely marking leads as "Not Interested" via blind secondary verification calls
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Lead Contact</th>
                <th className="p-4">Original Caller (A)</th>
                <th className="p-4">Original Disposition</th>
                <th className="p-4">Verifier Caller (B)</th>
                <th className="p-4">Verifier Outcome</th>
                <th className="p-4">Audit Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Loading QA verifications...
                  </td>
                </tr>
              ) : !verifications || verifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No pending QA mismatches requiring review.
                  </td>
                </tr>
              ) : (
                verifications.map((v: any) => (
                  <tr key={v._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <Link
                        href={`/leads/${v.leadId?._id || v.leadId}`}
                        className="font-bold text-slate-900 hover:text-sky-700 block"
                      >
                        {v.leadId?.name || 'Lead'}
                      </Link>
                      <span className="font-mono text-[11px] text-slate-500">
                        {v.leadId?.phone} • {v.leadId?.project}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">
                        {v.originalEmployeeId?.name || 'Employee A'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {v.originalEmployeeId?.employeeCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                        {v.originalDisposition}
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-0.5">
                        Reason: <b>{v.originalReason || 'BUDGET'}</b>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">
                        {v.verificationEmployeeId?.name || 'Verifier B'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {v.verificationEmployeeId?.employeeCode}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {v.verificationDisposition || 'PENDING'}
                      </span>
                    </td>
                    <td className="p-4">
                      {v.isMismatch ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>MISMATCH DETECTED</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {v.status}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {v.isMismatch && v.status !== 'CLOSED' && (
                        <button
                          type="button"
                          onClick={() => setSelectedVerification(v)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          Resolve Mismatch
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 font-bold">
                <AlertTriangle className="h-5 w-5" />
                <span>Audit & Resolve Telecaller Mismatch</span>
              </div>
              <button
                onClick={() => setSelectedVerification(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-xs border border-slate-200">
              <div className="flex justify-between">
                <span>Customer:</span>
                <b className="text-slate-800">{selectedVerification.leadId?.name}</b>
              </div>
              <div className="flex justify-between">
                <span>Employee A Claim:</span>
                <span className="text-rose-700 font-bold">
                  {selectedVerification.originalDisposition} ({selectedVerification.originalReason})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Verifier B Result:</span>
                <span className="text-emerald-700 font-bold">
                  {selectedVerification.verificationDisposition} (Interested & Qualified)
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Manager Review Notes
              </label>
              <textarea
                rows={3}
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300"
                placeholder="Disciplinary action or pipeline resolution notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    verificationId: selectedVerification._id,
                    action: 'CONFIRM_NOT_INTERESTED',
                    notes: managerNotes,
                  })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Uphold Not Interested
              </button>
              <button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() =>
                  reviewMutation.mutate({
                    verificationId: selectedVerification._id,
                    action: 'ACCEPT_VERIFIER',
                    notes: managerNotes,
                  })
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-colors"
              >
                Accept Verifier B & Reassign Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
