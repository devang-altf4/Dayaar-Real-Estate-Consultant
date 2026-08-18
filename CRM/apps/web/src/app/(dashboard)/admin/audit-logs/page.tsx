'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Shield, User, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['admin-audit-logs', page],
    queryFn: () => api.get<any>('/audit', { page, limit: 30 }),
  });

  const logs = auditData?.data || [];
  const meta = auditData?.meta || { total: 0, totalPages: 1 };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-sky-700" />
          <h1 className="text-2xl font-black text-slate-900">Immutable Audit Trail</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Tamper-evident record of audio recording playback, dispositions, attendance, and logins
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Actor</th>
                <th className="p-4">Role</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Metadata Payload</th>
                <th className="p-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{log.actorName}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-sky-800">{log.action}</td>
                    <td className="p-4 text-slate-700">
                      <span className="font-semibold">{log.entityType}</span>
                      <span className="block font-mono text-[10px] text-slate-400">{log.entityId}</span>
                    </td>
                    <td className="p-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
