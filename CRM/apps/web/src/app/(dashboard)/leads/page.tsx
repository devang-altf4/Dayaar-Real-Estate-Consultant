'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CsvImportModal } from '@/components/CsvImportModal';
import {
  Users,
  Search,
  Filter,
  Plus,
  Upload,
  ArrowUpDown,
  Phone,
  Eye,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { LeadStatus, Temperature, Role } from '@dayaar/shared';
import { formatIndianCurrency, formatDate } from '@/lib/utils';

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const { user, isAdmin, isManager } = useAuth();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // New Lead Form State
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    phone: '',
    alternatePhone: '',
    email: '',
    project: 'Dayaar Heights',
    source: 'Manual Entry',
    budgetMin: 12000000,
    budgetMax: 22000000,
    notes: '',
  });

  const { data: leadsData, isLoading, refetch } = useQuery({
    queryKey: ['leads', search, status, temperature, page],
    queryFn: () =>
      api.get<any>('/leads', {
        search: search || undefined,
        status: status || undefined,
        temperature: temperature || undefined,
        page,
        limit,
      }),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => api.get<any>('/users', { role: Role.EMPLOYEE }),
    enabled: isAdmin || isManager,
  });

  const leads = leadsData?.data || [];
  const meta = leadsData?.meta || { total: 0, totalPages: 1 };

  const createLeadMutation = useMutation({
    mutationFn: (payload: any) => api.post('/leads', payload),
    onSuccess: () => {
      setIsNewLeadModalOpen(false);
      setNewLeadForm({
        name: '',
        phone: '',
        alternatePhone: '',
        email: '',
        project: 'Dayaar Heights',
        source: 'Manual Entry',
        budgetMin: 12000000,
        budgetMax: 22000000,
        notes: '',
      });
      refetch();
    },
  });

  const bulkAssignMutation = useMutation({
    mutationFn: (payload: any) => api.post('/leads/bulk-assign', payload),
    onSuccess: () => {
      setIsAssignModalOpen(false);
      setSelectedLeadIds([]);
      refetch();
    },
  });

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l: any) => l._id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Leads Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage real estate buyers, contact attempts, and pipeline assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {(isAdmin || isManager) && (
            <>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors shadow-xs"
              >
                <Upload className="h-4 w-4" />
                <span>Bulk CSV Import</span>
              </button>

              {selectedLeadIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs animate-in fade-in"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Assign ({selectedLeadIds.length})</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Lead</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by lead name, phone, email, or project..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-1 focus:ring-sky-600 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            {Object.values(LeadStatus).map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={temperature}
            onChange={(e) => {
              setTemperature(e.target.value);
              setPage(1);
            }}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">All Temperatures</option>
            <option value={Temperature.HOT}>🔥 HOT</option>
            <option value={Temperature.WARM}>☀️ WARM</option>
            <option value={Temperature.COLD}>❄️ COLD</option>
            <option value={Temperature.UNQUALIFIED}>UNQUALIFIED</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider">
                {(isAdmin || isManager) && (
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                      onChange={toggleSelectAll}
                      className="rounded text-sky-700 focus:ring-sky-600 h-4 w-4"
                    />
                  </th>
                )}
                <th className="p-4">Lead Name & Phone</th>
                <th className="p-4">Project</th>
                <th className="p-4">Status</th>
                <th className="p-4">Temp</th>
                <th className="p-4">Attempts</th>
                <th className="p-4">Assigned To</th>
                <th className="p-4">Created</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No leads found matching your criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead: any) => (
                  <tr key={lead._id} className="hover:bg-slate-50/70 transition-colors">
                    {(isAdmin || isManager) && (
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedLeadIds.includes(lead._id)}
                          onChange={() => toggleSelectLead(lead._id)}
                          className="rounded text-sky-700 focus:ring-sky-600 h-4 w-4"
                        />
                      </td>
                    )}
                    <td className="p-4">
                      <Link
                        href={`/leads/${lead._id}`}
                        className="font-bold text-slate-900 hover:text-sky-700 flex items-center gap-1.5"
                      >
                        <span>{lead.name}</span>
                      </Link>
                      <span className="block font-mono text-[11px] text-slate-500 mt-0.5">
                        {lead.phone}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{lead.project}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {lead.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          lead.temperature === Temperature.HOT
                            ? 'bg-rose-100 text-rose-800'
                            : lead.temperature === Temperature.WARM
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {lead.temperature}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-700">
                      {lead.attemptCount || 0} / 4
                    </td>
                    <td className="p-4 text-slate-600">
                      {lead.assignedEmployeeId?.name || (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-400 text-[11px]">
                      {formatDate(lead.createdAt, 'dd MMM yyyy')}
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/leads/${lead._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-800 font-semibold text-xs transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing page <b>{meta.page}</b> of <b>{meta.totalPages}</b> ({meta.total} Total Leads)
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportComplete={() => refetch()}
      />

      {/* Bulk Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Bulk Assign {selectedLeadIds.length} Leads
            </h3>
            <p className="text-xs text-slate-500">
              Distribute selected leads across active telecallers using Round-Robin.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Select Strategy
              </label>
              <select className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white">
                <option value="ROUND_ROBIN">Round-Robin across all active callers</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const empIds = employees?.map((e: any) => e._id) || [];
                  bulkAssignMutation.mutate({
                    leadIds: selectedLeadIds,
                    employeeIds: empIds,
                    strategy: 'ROUND_ROBIN',
                  });
                }}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Confirm Round-Robin Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Create New Lead</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.phone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  placeholder="e.g. 9811002233"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone</label>
                <input
                  type="text"
                  value={newLeadForm.alternatePhone}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, alternatePhone: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  placeholder="e.g. 9822003344"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newLeadForm.email}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project *</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.project}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, project: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
                <input
                  type="text"
                  value={newLeadForm.source}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Notes</label>
              <textarea
                rows={2}
                value={newLeadForm.notes}
                onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300"
                placeholder="Inquiry notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewLeadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newLeadForm.name || !newLeadForm.phone || createLeadMutation.isPending}
                onClick={() => createLeadMutation.mutate(newLeadForm)}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                {createLeadMutation.isPending ? 'Saving...' : 'Save Lead'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
