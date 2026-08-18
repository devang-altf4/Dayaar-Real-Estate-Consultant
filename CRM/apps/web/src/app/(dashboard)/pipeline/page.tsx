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

  const leads = leadsData?.data || [];

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
          <h1 className="text-2xl font-black text-slate-900">Pipeline Kanban</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real Estate Sales Funnel & Qualification Stages
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading pipeline board...</div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {columns.map((col) => {
            const colLeads = leads.filter((l: any) => l.status === col.id);
            return (
              <div
                key={col.id}
                className="w-72 flex-shrink-0 bg-slate-100/70 border border-slate-200 rounded-2xl p-3 flex flex-col max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                  <span className="text-xs font-bold text-slate-800">{col.title}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {colLeads.map((lead: any) => (
                    <Link
                      key={lead._id}
                      href={`/leads/${lead._id}`}
                      className="block p-3.5 bg-white border border-slate-200 hover:border-sky-300 rounded-xl shadow-xs hover:shadow transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-sky-700">
                          {lead.name}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                            lead.temperature === Temperature.HOT
                              ? 'bg-rose-100 text-rose-800'
                              : lead.temperature === Temperature.WARM
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {lead.temperature}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">{lead.project}</div>

                      {lead.qualification?.budgetMax && (
                        <div className="text-[11px] font-bold text-emerald-700">
                          {formatIndianCurrency(lead.qualification.budgetMin)} -{' '}
                          {formatIndianCurrency(lead.qualification.budgetMax)}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                        <span className="font-mono">{lead.phone}</span>
                        <span>{lead.attemptCount || 0}/4 attempts</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
