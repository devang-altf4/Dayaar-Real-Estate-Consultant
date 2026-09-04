'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { LeadStatus, Temperature } from '@dayaar/shared';
import { formatIndianCurrency } from '@/lib/utils';
import { Kanban, Phone, Plus, Flame, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PipelineKanbanPage() {
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads-pipeline'],
    queryFn: () => api.get<any>('/leads', { limit: 100 }),
  });

  const leads = Array.isArray(leadsData) ? leadsData : leadsData?.data || [];

  const columns = [
    { id: LeadStatus.NEW, title: 'Fresh Leads', color: 'bg-sky-50 border-sky-200' },
    { id: LeadStatus.FOLLOW_UP, title: 'Follow-ups Due', color: 'bg-amber-50 border-amber-200' },
    { id: LeadStatus.INTERESTED, title: 'Interested Buyers', color: 'bg-emerald-50 border-emerald-200' },
    { id: LeadStatus.HOT, title: '🔥 Hot Prospects', color: 'bg-rose-50 border-rose-200' },
    { id: LeadStatus.SITE_VISIT, title: 'Site Visits', color: 'bg-purple-50 border-purple-200' },
    { id: LeadStatus.NEGOTIATION, title: 'Negotiation', color: 'bg-blue-50 border-blue-200' },
    { id: LeadStatus.BOOKED, title: 'Booked / Won', color: 'bg-emerald-100 border-emerald-300' },
    { id: LeadStatus.NOT_PICKED_UP, title: 'Not Picked Up (4x)', color: 'bg-slate-50 border-slate-200' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Pipeline Kanban</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real estate sales funnel, buyer intent & deal progression stages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-sky-800 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-200/70 shadow-subtle">
            {leads.length} Active Deals Tracked
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 font-medium">Loading pipeline board...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {columns.map((col) => {
            const colLeads = leads.filter((l: any) => l.status === col.id);
            return (
              <div
                key={col.id}
                className="w-72 flex-shrink-0 bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col max-h-[78vh] shadow-subtle"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-2 mb-2.5">
                  <span className="text-xs font-extrabold text-slate-800 tracking-tight">{col.title}</span>
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg bg-white border border-slate-200/90 text-slate-700 shadow-subtle">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {colLeads.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 italic">
                      No deals in this stage
                    </div>
                  ) : (
                    colLeads.map((lead: any) => (
                      <Link
                        key={lead._id}
                        href={`/leads/${lead._id}`}
                        className="block p-3.5 bg-white border border-slate-200/80 hover:border-sky-300 rounded-xl shadow-subtle hover:shadow-card transition-all space-y-2.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-1">
                            {lead.name}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase border shrink-0 ${
                              lead.temperature === Temperature.HOT
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : lead.temperature === Temperature.WARM
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {lead.temperature === Temperature.HOT ? '🔥 ' : ''}{lead.temperature}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-semibold">{lead.project}</div>

                        {lead.qualification?.budgetMax && (
                          <div className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded-md border border-emerald-100 inline-block">
                            {formatIndianCurrency(lead.qualification.budgetMin)} -{' '}
                            {formatIndianCurrency(lead.qualification.budgetMax)}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100 font-medium">
                          <span className="font-mono text-slate-600">{lead.phone}</span>
                          <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{lead.attemptCount || 0}/4 attempts</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
